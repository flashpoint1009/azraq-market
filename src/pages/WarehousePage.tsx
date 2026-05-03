import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { Boxes, PackagePlus, Plus, ReceiptText } from 'lucide-react';
import { OrderCard } from '../components/OrderCard';
import { OrderEditor } from '../components/OrderEditor';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, Textarea } from '../components/ui';
import { formatCurrency, unitLabels } from '../lib/labels';
import { optimizeProductImage } from '../lib/imageOptimization';
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
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const [orders, categories, subcategories] = await Promise.all([
      readRows<Order[]>(
        'WAREHOUSE_ORDERS_FETCH_FAILED',
        supabase
          .from('orders')
          .select('*, profiles(full_name,phone,address), order_items(*)')
          .in('status', ['new', 'preparing', 'ready_for_delivery', 'with_delivery'])
          .order('created_at', { ascending: true }),
        [],
      ),
      readRows<Category[]>('CATEGORIES_FETCH_ERROR', supabase.from('categories').select('*').order('sort_order'), []),
      readRows<Subcategory[]>('SUBCATEGORIES_FETCH_ERROR', supabase.from('subcategories').select('*, categories(id,name)').order('sort_order'), []),
    ]);

    let products = await readRows<Product[]>(
      'WAREHOUSE_PRODUCTS_FETCH_FAILED',
      supabase.from('products').select('*, categories(id,name), subcategories(id,name)').order('created_at', { ascending: false }),
      [],
    );
    if (!products.length) {
      products = await readRows<Product[]>('WAREHOUSE_PRODUCTS_FALLBACK_FETCH_FAILED', supabase.from('products').select('*, categories(id,name)').order('created_at', { ascending: false }), []);
    }

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
    const payload = { name: categoryForm.name, sort_order: Number(categoryForm.sort_order) || 0, is_active: categoryForm.is_active };
    const result = categoryForm.id ? await supabase.from('categories').update(payload).eq('id', categoryForm.id) : await supabase.from('categories').insert(payload);
    if (result.error) {
      console.error('WAREHOUSE_CATEGORY_SAVE_FAILED', result.error);
      toast.error('تعذر تحميل البيانات، حاول مرة أخرى');
    } else {
      toast.success(categoryForm.id ? 'القسم اتعدل' : 'القسم اتضاف');
      setCategoryForm({ id: '', name: '', sort_order: '0', is_active: true });
      reload();
    }
  };

  const saveSubcategory = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      category_id: subcategoryForm.category_id,
      name: subcategoryForm.name,
      sort_order: Number(subcategoryForm.sort_order) || 0,
      is_active: subcategoryForm.is_active,
    };
    const result = subcategoryForm.id ? await supabase.from('subcategories').update(payload).eq('id', subcategoryForm.id) : await supabase.from('subcategories').insert(payload);
    if (result.error) {
      console.error('WAREHOUSE_SUBCATEGORY_SAVE_FAILED', result.error);
      toast.error('تعذر تحميل البيانات، حاول مرة أخرى');
    } else {
      toast.success(subcategoryForm.id ? 'القسم الفرعي اتعدل' : 'القسم الفرعي اتضاف');
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
    setImage1(null);
    setImage2(null);
    openTab('products');
  };

  const uploadImage = async (file: File, slot: 'first' | 'second') => {
    const optimized = await optimizeProductImage(file);
    const safeName = optimized.full.name.replace(/[^\w.-]+/g, '-');
    const path = `products/${Date.now()}-${slot}-${crypto.randomUUID()}-${safeName}`;
    console.info('STORAGE_UPLOAD_START', { slot, path });
    const { error } = await supabase.storage.from('product-images').upload(path, optimized.full);
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    console.info('STORAGE_UPLOAD_SUCCESS', { slot, path, publicUrl: data.publicUrl });
    return data.publicUrl;
  };

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!productForm.name.trim() || !productForm.category_id || Number(productForm.price) < 0 || Number(productForm.cost_price) < 0 || Number(productForm.stock_quantity) < 0) {
      toast.error('راجع بيانات المنتج قبل الحفظ');
      return;
    }
    let image1Url = productForm.image_1_url || null;
    let image2Url = productForm.image_2_url || null;
    try {
      if (image1) image1Url = await uploadImage(image1, 'first');
      if (image2) image2Url = await uploadImage(image2, 'second');
    } catch (error) {
      console.error('STORAGE_UPLOAD_ERROR', error);
      toast.error('مش قادرين نضيف المنتج، راجع البيانات أو الصلاحيات');
      return;
    }
    const stockQuantity = Number(productForm.stock_quantity) || 0;
    const payload = {
      name: productForm.name,
      category_id: productForm.category_id || null,
      subcategory_id: productForm.subcategory_id || null,
      description: productForm.description,
      price: Number(productForm.price) || 0,
      cost_price: Number(productForm.cost_price) || 0,
      unit_type: productForm.unit_type,
      image_1_url: image1Url,
      image_2_url: image2Url,
      stock_quantity: stockQuantity,
      is_available: productForm.is_available && stockQuantity > 0,
    };
    const result = await saveProductPayload(payload, editingProductId);
    if (result.error) {
      console.error('PRODUCT_CREATE_ERROR', result.error);
      const missingInventoryColumn = result.error.message.includes('stock_quantity') || result.error.message.includes('cost_price');
      toast.error(missingInventoryColumn ? 'المخزون أو سعر التكلفة مش متفعلين في Supabase. شغّل ملف fix_product_inventory_columns.sql' : editingProductId ? 'مش قادرين نعدل المنتج، حاول تاني' : 'مش قادرين نضيف المنتج، راجع البيانات أو الصلاحيات');
    } else {
      toast.success(editingProductId ? 'المنتج اتعدل' : 'المنتج اتضاف');
      setEditingProductId(null);
      setProductForm(emptyProduct);
      setImage1(null);
      setImage2(null);
      reload();
    }
  };

  return (
    <div>
      <PageHeader title="لوحة المخزن" subtitle="إدارة الطلبات، الأقسام، الأقسام الفرعية، والمنتجات من مكان واحد." />
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
        <div className="grid gap-4 xl:grid-cols-2">
          {data?.orders.length === 0 && <EmptyState title="لسه مفيش طلبات للمخزن" body="أي طلب جديد هيظهر هنا فورًا." />}
          {data?.orders.map((order) => (
            <Card key={order.id}>
              <OrderCard order={order} to={`/orders/${order.id}`} />
              <OrderEditor order={order} onSaved={reload} />
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
                القسم شغال
              </label>
              <Button><Plus size={17} /> {categoryForm.id ? 'احفظ التعديل' : 'ضيف قسم'}</Button>
            </form>
            <div className="mt-4 grid gap-2">
              {data?.categories.map((category) => (
                <button key={category.id} onClick={() => setCategoryForm({ id: category.id, name: category.name, sort_order: String(category.sort_order), is_active: category.is_active ?? true })} className="rounded-2xl bg-slate-50 p-3 text-right text-sm font-bold text-slate-700">
                  {category.name} - {category.is_active === false ? 'متوقف' : 'شغال'}
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">قسم فرعي</h2>
            <form onSubmit={saveSubcategory} className="space-y-3">
              <Select required value={subcategoryForm.category_id} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, category_id: event.target.value })}>
                <option value="">اختار القسم الرئيسي</option>
                {data?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
              <Input required value={subcategoryForm.name} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, name: event.target.value })} placeholder="اسم القسم الفرعي" />
              <Input type="number" value={subcategoryForm.sort_order} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, sort_order: event.target.value })} placeholder="الترتيب" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={subcategoryForm.is_active} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, is_active: event.target.checked })} />
                القسم الفرعي شغال
              </label>
              <Button><Plus size={17} /> {subcategoryForm.id ? 'احفظ التعديل' : 'ضيف قسم فرعي'}</Button>
            </form>
            <div className="mt-4 grid gap-2">
              {data?.subcategories.map((item) => (
                <button key={item.id} onClick={() => setSubcategoryForm({ id: item.id, category_id: item.category_id, name: item.name, sort_order: String(item.sort_order), is_active: item.is_active ?? true })} className="rounded-2xl bg-slate-50 p-3 text-right text-sm font-bold text-slate-700">
                  {item.name} - {item.categories?.name || 'بدون قسم'} - {item.is_active === false ? 'متوقف' : 'شغال'}
                </button>
              ))}
            </div>
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
                <option value="">اختار القسم</option>
                {data?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
              <Select value={productForm.subcategory_id} onChange={(event) => setProductForm({ ...productForm, subcategory_id: event.target.value })}>
                <option value="">اختار القسم الفرعي</option>
                {filteredSubcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
              {productForm.category_id && filteredSubcategories.length === 0 && <p className="text-xs font-bold text-slate-500">مفيش أقسام فرعية للقسم ده</p>}
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                سعر البيع
                <Input required type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                سعر التكلفة
                <Input required type="number" min="0" step="0.01" value={productForm.cost_price} onChange={(event) => setProductForm({ ...productForm, cost_price: event.target.value })} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                الكمية المتاحة
                <Input required type="number" min="0" value={productForm.stock_quantity} onChange={(event) => setProductForm({ ...productForm, stock_quantity: event.target.value })} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                وحدة البيع
                <Select value={productForm.unit_type} onChange={(event) => setProductForm({ ...productForm, unit_type: event.target.value as UnitType })}>
                  {Object.entries(unitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </label>
              <Input dir="ltr" value={productForm.image_1_url} onChange={(event) => setProductForm({ ...productForm, image_1_url: event.target.value })} placeholder="رابط الصورة الأولى" />
              <Input dir="ltr" value={productForm.image_2_url} onChange={(event) => setProductForm({ ...productForm, image_2_url: event.target.value })} placeholder="رابط الصورة الثانية" />
              <label className="block rounded-2xl border border-dashed border-azraq-200 bg-azraq-50/60 p-3 text-sm font-bold text-azraq-800">
                ارفع الصورة الأولى
                <input type="file" accept="image/*" onChange={(event) => setImage1(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs text-slate-500" />
              </label>
              <label className="block rounded-2xl border border-dashed border-azraq-200 bg-azraq-50/60 p-3 text-sm font-bold text-azraq-800">
                ارفع الصورة الثانية
                <input type="file" accept="image/*" onChange={(event) => setImage2(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs text-slate-500" />
              </label>
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
                  <p className="text-sm font-bold text-azraq-800">{formatCurrency(product.price)} - المخزون: {product.stock_quantity ?? 'غير محفوظ'}</p>
                  <p className={(product.is_available && (product.stock_quantity == null || product.stock_quantity > 0)) ? 'text-xs font-bold text-emerald-600' : 'text-xs font-bold text-rose-600'}>
                    {(product.is_available && (product.stock_quantity == null || product.stock_quantity > 0)) ? 'متاح' : 'مش متاح دلوقتي'}
                  </p>
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
