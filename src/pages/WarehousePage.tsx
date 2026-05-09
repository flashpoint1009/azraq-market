import { FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { Boxes, ChevronRight, PackagePlus, Phone, Plus, ReceiptText } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, Textarea } from '../components/ui';
import { formatCurrency, statusLabels, statusTone, unitLabels } from '../lib/labels';
import { saveProductPayload } from '../lib/productMutations';
import { supabase } from '../lib/supabase';
import { useRealtimeOrders } from '../hooks/useRealtimeOrders';
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

// Quick status badge with color
function StatusBadge({ status }: { status: Order['status'] }) {
  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

// A single order card for the warehouse orders tab
function WarehouseOrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  return (
    <Card className="p-0 overflow-hidden">
      {/* Top strip: order number + status */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <span className="font-display text-sm font-extrabold text-ink">طلب #{order.id.slice(0, 8)}</span>
        <StatusBadge status={order.status} />
      </div>

      {/* Body */}
      <div className="px-4 py-3 grid gap-2">
        {/* Customer info */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">
              {order.profiles?.full_name || 'عميل'}
            </p>
            {order.profiles?.phone && (
              <a
                href={`tel:${order.profiles.phone}`}
                className="inline-flex items-center gap-1 mt-0.5 text-xs font-bold text-azraq-600"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone size={12} />
                {order.profiles.phone}
              </a>
            )}
          </div>
          <div className="text-left shrink-0">
            <p className="text-xs font-bold text-slate-400">
              {order.order_items?.length || 0} منتجات
            </p>
            <p className="text-sm font-extrabold text-azraq-800">
              {formatCurrency(order.total_amount)}
            </p>
          </div>
        </div>

        {/* Address */}
        {(order.profiles?.address) && (
          <p className="text-xs text-slate-400 truncate">
            📍 {order.profiles.address}
          </p>
        )}

        {/* Order items preview */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="mt-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 space-y-1">
            {order.order_items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="truncate font-bold text-slate-600">{item.product_name_snapshot}</span>
                <span className="shrink-0 mr-2">{item.quantity} {unitLabels[item.unit_type_snapshot]}</span>
              </div>
            ))}
            {order.order_items.length > 3 && (
              <p className="text-slate-400">+{order.order_items.length - 3} منتجات أخرى</p>
            )}
          </div>
        )}

        {/* Open button */}
        <button
          onClick={onOpen}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-azraq-700 px-4 py-2.5 text-sm font-extrabold text-white active:scale-[0.98] transition"
        >
          فتح وتعديل الطلب
          <ChevronRight size={16} />
        </button>
      </div>
    </Card>
  );
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

  // Real-time: auto-refresh + badge when a new order arrives
  const { newOrderCount, resetCount } = useRealtimeOrders(() => reload());

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

  // Group orders by status for better display
  const ordersByStatus = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    for (const order of (data?.orders || [])) {
      if (!groups[order.status]) groups[order.status] = [];
      groups[order.status].push(order);
    }
    return groups;
  }, [data?.orders]);

  const statusOrder = ['new', 'preparing', 'ready_for_delivery', 'with_delivery'];

  return (
    <div>
      <PageHeader title="لوحة المخزن" subtitle="إدارة الطلبات والأصناف والأقسام من مكان واحد." />

      {/* Tab navigation - scrollable on small screens */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {([
          ['orders', `الطلبات`, ReceiptText],
          ['products', 'الأصناف', PackagePlus],
          ['categories', 'الأقسام', Boxes],
        ] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            onClick={() => { openTab(value); if (value === 'orders') resetCount(); }}
            className={`relative inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm transition ${tab === value ? 'bg-azraq-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <Icon size={17} />
            {label}
            {value === 'orders' && data?.orders.length ? (
              <span className={`rounded-full px-2 text-xs ${tab === 'orders' ? 'bg-white/20' : 'bg-azraq-50 text-azraq-700'}`}>
                {data.orders.length}
              </span>
            ) : null}
            {value === 'orders' && newOrderCount > 0 && tab !== 'orders' && (
              <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {newOrderCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {/* ─── Orders Tab ─────────────────────────────────────────── */}
      {!loading && !error && tab === 'orders' && (
        <div>
          {data?.orders.length === 0 && (
            <EmptyState title="لا توجد طلبات للمخزن" body="أي طلب جديد سيظهر هنا فوراً." />
          )}

          {/* Orders grouped by status */}
          {statusOrder.map((st) => {
            const groupOrders = ordersByStatus[st];
            if (!groupOrders?.length) return null;
            return (
              <div key={st} className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className={`inline-block rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone[st as Order['status']]}`}>
                    {statusLabels[st as Order['status']]}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{groupOrders.length} طلبات</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupOrders.map((order) => (
                    <WarehouseOrderCard
                      key={order.id}
                      order={order}
                      onOpen={() => navigate(`/orders/${order.id}`)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Categories Tab ──────────────────────────────────────── */}
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

            {/* Existing categories list */}
            {data?.categories && data.categories.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-400">الأقسام الحالية</p>
                {data.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryForm({ id: cat.id, name: cat.name, sort_order: String(cat.sort_order), is_active: cat.is_active ?? true })}
                    className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-right text-sm font-bold text-slate-700 hover:bg-azraq-50 transition"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
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

      {/* ─── Products Tab ────────────────────────────────────────── */}
      {!loading && !error && tab === 'products' && (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          {/* Product form */}
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
              <Select value={productForm.unit_type} onChange={(event) => setProductForm({ ...productForm, unit_type: event.target.value as UnitType })}>
                {Object.entries(unitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs font-bold text-slate-500">
                  السعر
                  <Input required type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} placeholder="0" />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-500">
                  سعر التكلفة
                  <Input type="number" min="0" step="0.01" value={productForm.cost_price} onChange={(event) => setProductForm({ ...productForm, cost_price: event.target.value })} placeholder="0" />
                </label>
              </div>

              <label className="grid gap-1 text-xs font-bold text-slate-500">
                الكمية في المخزن
                <Input type="number" min="0" value={productForm.stock_quantity} onChange={(event) => setProductForm({ ...productForm, stock_quantity: event.target.value })} placeholder="0" />
              </label>

              <Input value={productForm.image_1_url} onChange={(event) => setProductForm({ ...productForm, image_1_url: event.target.value })} placeholder="رابط الصورة الأولى" />
              <Input value={productForm.image_2_url} onChange={(event) => setProductForm({ ...productForm, image_2_url: event.target.value })} placeholder="رابط الصورة الثانية" />

              <Textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="وصف المنتج (اختياري)" rows={3} />

              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={productForm.is_available} onChange={(event) => setProductForm({ ...productForm, is_available: event.target.checked })} />
                المنتج متاح للبيع
              </label>

              <div className="flex gap-2">
                <Button className="flex-1"><Plus size={17} /> {editingProductId ? 'احفظ التعديل' : 'ضيف منتج'}</Button>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={() => { setEditingProductId(null); setProductForm(emptyProduct); }}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-600"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          </Card>

          {/* Products list */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-display text-xl font-extrabold">الأصناف الحالية</h2>
              <p className="text-xs text-slate-400 mt-0.5">{data?.products.length || 0} صنف</p>
            </div>
            <div className="divide-y divide-slate-50 max-h-[70vh] overflow-y-auto">
              {data?.products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => startProductEdit(product)}
                >
                  {product.image_1_url && (
                    <img src={product.image_1_url} alt={product.name} className="w-10 h-10 rounded-xl object-cover shrink-0 bg-slate-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.categories?.name} - {unitLabels[product.unit_type]}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-extrabold text-azraq-800">{formatCurrency(product.price)}</p>
                    <p className={`text-xs font-bold ${product.stock_quantity === 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {product.stock_quantity} في المخزن
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
