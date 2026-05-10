import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, Textarea } from '../components/ui';
import { formatCurrency, unitLabels } from '../lib/labels';
import { saveProductPayload } from '../lib/productMutations';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category, Product, Subcategory, UnitType } from '../types/database';

const emptyProduct = {
  name: '', category_id: '', subcategory_id: '', description: '',
  price: '0', cost_price: '0', unit_type: 'carton' as UnitType,
  image_1_url: '', image_2_url: '', stock_quantity: '0', is_available: true,
};

export function AdminProductsPage() {
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const [categories, subcategories, products] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('subcategories').select('*, categories(id,name)').order('sort_order'),
      supabase.from('products').select('*, categories(id,name), subcategories(id,name)').order('created_at', { ascending: false }),
    ]);
    if (categories.error) throw categories.error;
    if (subcategories.error) throw subcategories.error;
    if (products.error) throw products.error;
    return { categories: categories.data as Category[], subcategories: subcategories.data as Subcategory[], products: products.data as Product[] };
  }, []);

  const filteredSubcategories = (data?.subcategories || []).filter((item) => !form.category_id || item.category_id === form.category_id);

  const startEdit = (product: Product) => {
    setEditing(product);
    setForm({ name: product.name, category_id: product.category_id || '', subcategory_id: product.subcategory_id || '', description: product.description || '', price: String(product.price), cost_price: String(product.cost_price ?? 0), unit_type: product.unit_type, image_1_url: product.image_1_url || '', image_2_url: product.image_2_url || '', stock_quantity: String(product.stock_quantity ?? 0), is_available: product.is_available });
    setImage1(null); setImage2(null);
  };

  const uploadImage = async (file: File, slot: 'first' | 'second') => {
    const safeName = file.name.replace(/[^\w.-]+/g, '-');
    const path = `products/${Date.now()}-${slot}-${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.category_id || Number(form.price) < 0 || Number(form.cost_price) < 0 || Number(form.stock_quantity) < 0) { toast.error('راجع بيانات المنتج'); return; }
    let image1Url = form.image_1_url || null;
    let image2Url = form.image_2_url || null;
    try {
      if (image1) image1Url = await uploadImage(image1, 'first');
      if (image2) image2Url = await uploadImage(image2, 'second');
    } catch { toast.error('مش قادرين نرفع الصورة'); return; }
    const stockQuantity = Number(form.stock_quantity) || 0;
    const result = await saveProductPayload({ name: form.name, category_id: form.category_id || null, subcategory_id: form.subcategory_id || null, description: form.description, price: Number(form.price) || 0, cost_price: Number(form.cost_price) || 0, unit_type: form.unit_type, image_1_url: image1Url, image_2_url: image2Url, stock_quantity: stockQuantity, is_available: form.is_available && stockQuantity > 0 }, editing?.id);
    if (result.error) { toast.error(editing ? 'مش قادرين نعدل المنتج' : 'مش قادرين نضيف المنتج'); return; }
    toast.success(editing ? 'المنتج اتعدل' : 'المنتج اتضاف');
    setEditing(null); setForm(emptyProduct); setImage1(null); setImage2(null); reload();
  };

  const remove = async (id: string) => {
    if (!confirm('تحذف المنتج؟')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast.error('تعذر حذف المنتج');
    else { toast.success('المنتج اتحذف'); reload(); }
  };

  return (
    <div className="pb-24">
      <PageHeader title="المنتجات" subtitle="ضيف وعدّل المنتجات والأسعار والمخزون." />
      <div className="grid gap-3 xl:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="mb-2 font-display text-base font-extrabold">{editing ? 'تعديل منتج' : 'منتج جديد'}</h2>
          <form onSubmit={submit} className="grid gap-2">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم المنتج" />
            <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value, subcategory_id: '' })}>
              <option value="">القسم</option>
              {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={form.subcategory_id} onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}>
              <option value="">القسم الفرعي</option>
              {filteredSubcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs font-bold text-slate-500">سعر البيع<Input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">سعر التكلفة<Input required type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs font-bold text-slate-500">الكمية<Input required type="number" min="0" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">وحدة البيع<Select value={form.unit_type} onChange={(e) => setForm({ ...form, unit_type: e.target.value as UnitType })}>{Object.entries(unitLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></label>
            </div>
            <Input dir="ltr" value={form.image_1_url} onChange={(e) => setForm({ ...form, image_1_url: e.target.value })} placeholder="رابط الصورة الأولى" />
            <Input dir="ltr" value={form.image_2_url} onChange={(e) => setForm({ ...form, image_2_url: e.target.value })} placeholder="رابط الصورة الثانية" />
            <label className="block rounded-xl border border-dashed border-azraq-200 bg-azraq-50/60 px-3 py-2 text-xs font-bold text-azraq-800">
              ارفع الصورة الأولى
              <input type="file" accept="image/*" onChange={(e) => setImage1(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs text-slate-500" />
            </label>
            <label className="block rounded-xl border border-dashed border-azraq-200 bg-azraq-50/60 px-3 py-2 text-xs font-bold text-azraq-800">
              ارفع الصورة الثانية
              <input type="file" accept="image/*" onChange={(e) => setImage2(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs text-slate-500" />
            </label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="الوصف" rows={3} />
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
              المنتج متاح
            </label>
            <Button className="w-full"><Plus size={15} /> {editing ? 'حفظ التعديل' : 'إضافة المنتج'}</Button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyProduct); }} className="w-full rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600">إلغاء</button>}
          </form>
        </Card>

        <div>
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && data?.products.length === 0 && <EmptyState title="مفيش منتجات" body="ضيف أول منتج من النموذج." />}
          <div className="grid gap-2">
            {data?.products.map((product) => (
              <Card key={product.id} className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-azraq-50">
                  {product.image_1_url && <img src={product.image_1_url} alt={product.name} className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-extrabold">{product.name}</h3>
                  <p className="truncate text-[11px] text-slate-500">{product.categories?.name || 'بدون قسم'} · {formatCurrency(product.price)} / {unitLabels[product.unit_type]}</p>
                  <p className={`text-[11px] font-bold ${(product.is_available && (product.stock_quantity == null || product.stock_quantity > 0)) ? 'text-emerald-600' : 'text-rose-600'}`}>
                    مخزون: {product.stock_quantity ?? 0} · {(product.is_available && (product.stock_quantity == null || product.stock_quantity > 0)) ? 'متاح' : 'غير متاح'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button onClick={() => startEdit(product)} className="rounded-xl bg-azraq-50 px-2.5 py-1.5 text-xs font-bold text-azraq-800">تعديل</button>
                  <button onClick={() => remove(product.id)} className="rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700">حذف</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
