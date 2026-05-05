import { FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { Boxes, PackagePlus, Plus, ReceiptText } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, Textarea } from '../components/ui';
import { formatCurrency, statusLabels, unitLabels } from '../lib/labels';
import { saveProductPayload } from '../lib/productMutations';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category, Order, Product, Subcategory, UnitType } from '../types/database';

type Tab = 'orders' | 'products' | 'categories';

const emptyProduct = {
  name: '',
  category_id: '',
  subcategory_id: '',
  description: '',
  price: '0',
  cost_price: '0',
  unit_type: 'carton' as UnitType,
  image_1_url: '',
  image_2_url: '',
  stock_quantity: '0',
  is_available: true,
};

async function readRows<T>(label: string, query: PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> {
  const result = await query;
  if (result.error) {
    console.error(label, result.error);
    return fallback;
  }
  return (result.data as T) ?? fallback;
}

function tabFromPath(pathname: string): Tab {
  if (pathname.includes('/products')) return 'products';
  if (pathname.includes('/categories')) return 'categories';
  return 'orders';
}

export function WarehousePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<Tab>(() => tabFromPath(location.pathname));
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', sort_order: '0', is_active: true });
  const [subcategoryForm, setSubcategoryForm] = useState({ id: '', category_id: '', name: '', sort_order: '0', is_active: true });
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  useEffect(() => {
    setTab(tabFromPath(location.pathname));
  }, [location.pathname]);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const [orders, categories, subcategories, products] = await Promise.all([
      readRows<Order[]>(
        'WAREHOUSE_ORDERS_FETCH_FAILED',
        supabase
          .from('orders')
          .select('*, profiles(full_name,phone,address), order_items(*)')
          .in('status', ['new', 'preparing', 'ready_for_delivery', 'with_delivery'])
          .order('created_at', { ascending: true }),
        [],
      ),
      readRows<Category[]>('WAREHOUSE_CATEGORIES_FETCH_FAILED', supabase.from('categories').select('*').order('sort_order'), []),
      readRows<Subcategory[]>('WAREHOUSE_SUBCATEGORIES_FETCH_FAILED', supabase.from('subcategories').select('*, categories(id,name)').order('sort_order'), []),
      readRows<Product[]>('WAREHOUSE_PRODUCTS_FETCH_FAILED', supabase.from('products').select('*, categories(id,name), subcategories(id,name)').order('created_at', { ascending: false }), []),
    ]);

    return { orders, categories, subcategories, products };
  }, []);

  const filteredSubcategories = useMemo(
    () => (data?.subcategories || []).filter((item) => !productForm.category_id || item.category_id === productForm.category_id),
    [data?.subcategories, productForm.category_id],
  );

  const openTab = (next: Tab) => {
    setTab(next);
    navigate(next === 'orders' ? '/warehouse/orders' : next === 'products' ? '/warehouse/products' : '/warehouse/categories');
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { name: categoryForm.name.trim(), sort_order: Number(categoryForm.sort_order) || 0, is_active: categoryForm.is_active };
    const result = categoryForm.id ? await supabase.from('categories').update(payload).eq('id', categoryForm.id) : await supabase.from('categories').insert(payload);
    if (result.error) toast.error(result.error.message);
    else {
      toast.success(categoryForm.id ? 'تم تعديل القسم' : 'تم إضافة القسم');
      setCategoryForm({ id: '', name: '', sort_order: '0', is_active: true });
      reload();
    }
  };

  const saveSubcategory = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      category_id: subcategoryForm.category_id,
      name: subcategoryForm.name.trim(),
      sort_order: Number(subcategoryForm.sort_order) || 0,
      is_active: subcategoryForm.is_active,
    };
    const result = subcategoryForm.id ? await supabase.from('subcategories').update(payload).eq('id', subcategoryForm.id) : await supabase.from('subcategories').insert(payload);
    if (result.error) toast.error(result.error.message);
    else {
      toast.success(subcategoryForm.id ? 'تم تعديل القسم الفرعي' : 'تم إضافة القسم الفرعي');
      setSubcategoryForm({ id: '', category_id: '', name: '', sort_order: '0', is_active: true });
      reload();
    }
  };

  const startProductEdit = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      category_id: product.category_id || '',
      subcategory_id: product.subcategory_id || '',
      description: product.description || '',
      price: String(product.price),
      cost_price: String(product.cost_price ?? 0),
      unit_type: product.unit_type,
      image_1_url: product.image_1_url || '',
      image_2_url: product.image_2_url || '',
      stock_quantity: String(product.stock_quantity ?? 0),
      is_available: product.is_available,
    });
    openTab('products');
  };

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!productForm.name.trim() || !productForm.category_id || Number(productForm.price) < 0 || Number(productForm.stock_quantity) < 0) {
      toast.error('راجع بيانات المنتج قبل الحفظ');
      return;
    }
    const stockQuantity = Number(productForm.stock_quantity) || 0;
    const payload = {
      name: productForm.name.trim(),
      category_id: productForm.category_id || null,
      subcategory_id: productForm.subcategory_id || null,
      description: productForm.description,
      price: Number(productForm.price) || 0,
      cost_price: Number(productForm.cost_price) || 0,
      unit_type: productForm.unit_type,
      image_1_url: productForm.image_1_url || null,
      image_2_url: productForm.image_2_url || null,
      stock_quantity: stockQuantity,
      is_available: productForm.is_available && stockQuantity > 0,
    };
    const result = await saveProductPayload(payload, editingProductId);
    if (result.error) toast.error(result.error.message);
    else {
      toast.success(editingProductId ? 'تم تعديل المنتج' : 'تم إضافة المنتج');
      setEditingProductId(null);
      setProductForm(emptyProduct);
      reload();
    }
  };

  return (
    <div>
      <PageHeader title="لوحة المخزن" subtitle="إدارة الطلبات والأصناف والأقسام من مكان واحد." />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {[
          ['orders', 'الطلبات', ReceiptText],
          ['products', 'الأصناف', PackagePlus],
          ['categories', 'الأقسام', Boxes],
        ].map(([value, label, Icon]) => (
          <button key={value as string} onClick={() => openTab(value as Tab)} className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm ${tab === value ? 'bg-azraq-700 text-white' : 'bg-white text-slate-600'}`}>
            <Icon size={17} />
            {label as string}
          </button>
        ))}
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && tab === 'orders' && (
        <div className="grid gap-3">
          {data?.orders.length === 0 && <EmptyState title="لا توجد طلبات للمخزن" body="أي طلب جديد سيظهر هنا فورًا." />}
          {data?.orders.map((order) => (
            <Card key={order.id} className="p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-display text-base font-extrabold text-ink">طلب #{order.id.slice(0, 8)}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{order.profiles?.full_name || order.profiles?.phone || 'عميل'}</p>
                  <p className="mt-1 text-xs text-slate-400">{order.order_items?.length || 0} منتجات - {formatCurrency(order.total_amount)}</p>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">{statusLabels[order.status]}</span>
                  <button onClick={() => navigate(`/orders/${order.id}`)} className="rounded-2xl bg-azraq-700 px-4 py-2 text-sm font-extrabold text-white">فتح</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && tab === 'categories' && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">قسم رئيسي</h2>
            <form onSubmit={saveCategory} className="space-y-3">
              <Input required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="اسم القسم" />
              <Input type="number" value={categoryForm.sort_order} onChange={(event) => setCategoryForm({ ...categoryForm, sort_order: event.target.value })} placeholder="الترتيب" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={categoryForm.is_active} onChange={(event) => setCategoryForm({ ...categoryForm, is_active: event.target.checked })} />
                القسم نشط
              </label>
              <Button><Plus size={17} /> {categoryForm.id ? 'احفظ التعديل' : 'ضيف قسم'}</Button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">قسم فرعي</h2>
            <form onSubmit={saveSubcategory} className="space-y-3">
              <Select required value={subcategoryForm.category_id} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, category_id: event.target.value })}>
                <option value="">اختر القسم الرئيسي</option>
                {data?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
              <Input required value={subcategoryForm.name} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, name: event.target.value })} placeholder="اسم القسم الفرعي" />
              <Input type="number" value={subcategoryForm.sort_order} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, sort_order: event.target.value })} placeholder="الترتيب" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={subcategoryForm.is_active} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, is_active: event.target.checked })} />
                القسم الفرعي نشط
              </label>
              <Button><Plus size={17} /> {subcategoryForm.id ? 'احفظ التعديل' : 'ضيف قسم فرعي'}</Button>
            </form>
          </Card>
        </div>
      )}

      {!loading && !error && tab === 'products' && (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">{editingProductId ? 'تعديل منتج' : 'منتج جديد'}</h2>
            <form onSubmit={saveProduct} className="space-y-3">
              <Input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="اسم المنتج" />
              <Select value={productForm.category_id} onChange={(event) => setProductForm({ ...productForm, category_id: event.target.value, subcategory_id: '' })}>
                <option value="">اختر القسم</option>
                {data?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
              <Select value={productForm.subcategory_id} onChange={(event) => setProductForm({ ...productForm, subcategory_id: event.target.value })}>
                <option value="">اختر القسم الفرعي</option>
                {filteredSubcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
              <Input required type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} placeholder="سعر البيع" />
              <Input required type="number" min="0" step="0.01" value={productForm.cost_price} onChange={(event) => setProductForm({ ...productForm, cost_price: event.target.value })} placeholder="سعر التكلفة" />
              <Input required type="number" min="0" value={productForm.stock_quantity} onChange={(event) => setProductForm({ ...productForm, stock_quantity: event.target.value })} placeholder="الكمية المتاحة" />
              <Select value={productForm.unit_type} onChange={(event) => setProductForm({ ...productForm, unit_type: event.target.value as UnitType })}>
                {Object.entries(unitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <Input dir="ltr" value={productForm.image_1_url} onChange={(event) => setProductForm({ ...productForm, image_1_url: event.target.value })} placeholder="رابط الصورة الأولى" />
              <Input dir="ltr" value={productForm.image_2_url} onChange={(event) => setProductForm({ ...productForm, image_2_url: event.target.value })} placeholder="رابط الصورة الثانية" />
              <Textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="الوصف" rows={3} />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={productForm.is_available} onChange={(event) => setProductForm({ ...productForm, is_available: event.target.checked })} />
                متاح
              </label>
              <Button className="w-full">{editingProductId ? 'احفظ المنتج' : 'ضيف المنتج'}</Button>
            </form>
          </Card>
          <div className="grid gap-3">
            {data?.products.map((product) => (
              <Card key={product.id} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <h3 className="font-display text-lg font-extrabold">{product.name}</h3>
                  <p className="text-sm text-slate-500">{product.categories?.name || 'بدون قسم'} / {product.subcategories?.name || 'بدون فرعي'}</p>
                  <p className="text-sm font-bold text-azraq-800">{formatCurrency(product.price)} - المخزون: {product.stock_quantity ?? 0}</p>
                </div>
                <Button onClick={() => startProductEdit(product)}>تعديل</Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
