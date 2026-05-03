import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, Textarea } from '../components/ui';
import { formatCurrency, unitLabels } from '../lib/labels';
import { getProductPricing } from '../lib/pricing';
import { saveProductPayload } from '../lib/productMutations';
import { optimizeProductImage } from '../lib/imageOptimization';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category, DiscountType, Product, Subcategory, UnitType } from '../types/database';

const emptyProduct = {
  name: '',
  category_id: '',
  subcategory_id: '',
  description: '',
  price: '0',
  cost_price: '0',
  discount_type: 'none' as DiscountType,
  discount_value: '0',
  unit_type: 'carton' as UnitType,
  image_1_url: '',
  image_2_url: '',
  stock_quantity: '0',
  is_available: true,
};

export function AdminProductsPage() {
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const categories = await supabase.from('categories').select('*').order('sort_order');
    if (categories.error) {
      console.error('CATEGORIES_FETCH_ERROR', categories.error);
      throw categories.error;
    }

    const subcategories = await supabase.from('subcategories').select('*, categories(id,name)').order('sort_order');
    if (subcategories.error) {
      console.error('SUBCATEGORIES_FETCH_ERROR', subcategories.error);
      throw subcategories.error;
    }

    const products = await supabase.from('products').select('*, categories(id,name), subcategories(id,name)').order('created_at', { ascending: false });
    if (products.error) {
      console.error('ADMIN_PRODUCTS_FETCH_FAILED', products.error);
    }
    if (products.error) {
      console.error('ADMIN_PRODUCTS_FETCH_FAILED', products.error);
      throw products.error;
    }

    return {
      categories: categories.data as Category[],
      subcategories: subcategories.data as Subcategory[],
      products: products.data as Product[],
    };
  }, []);

  const filteredSubcategories = (data?.subcategories || []).filter((item) => !form.category_id || item.category_id === form.category_id);

  const startEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      category_id: product.category_id || '',
      subcategory_id: product.subcategory_id || '',
      description: product.description || '',
      price: String(product.price),
      cost_price: String(product.cost_price ?? 0),
      discount_type: product.discount_type || 'none',
      discount_value: String(product.discount_value ?? 0),
      unit_type: product.unit_type,
      image_1_url: product.image_1_url || '',
      image_2_url: product.image_2_url || '',
      stock_quantity: String(product.stock_quantity ?? 0),
      is_available: product.is_available,
    });
    setImage1(null);
    setImage2(null);
  };

  const uploadImage = async (file: File, slot: 'first' | 'second') => {
    const optimized = await optimizeProductImage(file);
    const safeName = optimized.full.name.replace(/[^\w.-]+/g, '-');
    const basePath = `products/${Date.now()}-${slot}-${crypto.randomUUID()}`;
    const path = `${basePath}-${safeName}`;
    const thumbPath = `${basePath}-${optimized.thumbnail.name.replace(/[^\w.-]+/g, '-')}`;
    console.info('STORAGE_UPLOAD_START', { slot, path, thumbPath });
    const { error } = await supabase.storage.from('product-images').upload(path, optimized.full);
    if (error) throw error;
    await supabase.storage.from('product-images').upload(thumbPath, optimized.thumbnail, { upsert: true });
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    console.info('STORAGE_UPLOAD_SUCCESS', { slot, path, publicUrl: data.publicUrl });
    return data.publicUrl;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const discountValue = Number(form.discount_value) || 0;
    if (!form.name.trim() || !form.category_id || Number(form.price) < 0 || Number(form.cost_price) < 0 || Number(form.stock_quantity) < 0 || discountValue < 0 || (form.discount_type === 'percent' && discountValue > 100)) {
      toast.error('راجع بيانات المنتج قبل الحفظ');
      return;
    }
    let image1Url = form.image_1_url || null;
    let image2Url = form.image_2_url || null;
    try {
      if (image1) image1Url = await uploadImage(image1, 'first');
      if (image2) image2Url = await uploadImage(image2, 'second');
    } catch (error) {
      console.error('STORAGE_UPLOAD_ERROR', error);
      toast.error('مش قادرين نضيف المنتج، راجع البيانات أو الصلاحيات');
      return;
    }

    const stockQuantity = Number(form.stock_quantity) || 0;
    const payload = {
      name: form.name,
      category_id: form.category_id || null,
      subcategory_id: form.subcategory_id || null,
      description: form.description,
      price: Number(form.price) || 0,
      cost_price: Number(form.cost_price) || 0,
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'none' ? 0 : discountValue,
      unit_type: form.unit_type,
      image_1_url: image1Url,
      image_2_url: image2Url,
      stock_quantity: stockQuantity,
      is_available: form.is_available && stockQuantity > 0,
    };

    const result = await saveProductPayload(payload, editing?.id);
    if (result.error) {
      console.error('PRODUCT_CREATE_ERROR', result.error);
      const missingInventoryColumn = result.error.message.includes('stock_quantity') || result.error.message.includes('cost_price');
      toast.error(missingInventoryColumn ? 'المخزون أو سعر التكلفة مش متفعلين في Supabase. شغّل ملف fix_product_inventory_columns.sql' : editing ? 'مش قادرين نعدل المنتج، حاول تاني' : 'مش قادرين نضيف المنتج، راجع البيانات أو الصلاحيات');
      return;
    }

    toast.success(editing ? 'المنتج اتعدل' : 'المنتج اتضاف');
    setEditing(null);
    setForm(emptyProduct);
    setImage1(null);
    setImage2(null);
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm('تحذف المنتج؟')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('ADMIN_PRODUCT_DELETE_FAILED', error);
      toast.error('تعذر تحميل البيانات، حاول مرة أخرى');
    } else {
      toast.success('المنتج اتحذف');
      reload();
    }
  };

  return (
    <div>
      <PageHeader title="المنتجات" subtitle="ضيف وعدّل المنتجات والصور والأسعار والأقسام." />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <h2 className="mb-4 font-display text-2xl font-extrabold">{editing ? 'تعديل منتج' : 'منتج جديد'}</h2>
          <form onSubmit={submit} className="space-y-3">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم المنتج" />
            <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value, subcategory_id: '' })}>
              <option value="">اختار القسم</option>
              {data?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
            <Select value={form.subcategory_id} onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}>
              <option value="">اختار القسم الفرعي</option>
              {filteredSubcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            {form.category_id && filteredSubcategories.length === 0 && <p className="text-xs font-bold text-slate-500">مفيش أقسام فرعية للقسم ده</p>}
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              سعر البيع
              <Input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              سعر التكلفة
              <Input required type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
            </label>
            <div className="grid gap-2 rounded-2xl border border-orange-100 bg-orange-50/60 p-3">
              <label className="grid gap-1 text-xs font-bold text-slate-600">
                نوع العرض
                <Select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as DiscountType })}>
                  <option value="none">بدون عرض</option>
                  <option value="percent">خصم نسبة %</option>
                  <option value="amount">خصم قيمة</option>
                </Select>
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">
                قيمة الخصم
                <Input type="number" min="0" max={form.discount_type === 'percent' ? 100 : undefined} step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} disabled={form.discount_type === 'none'} />
              </label>
              {form.discount_type !== 'none' && Number(form.discount_value) > 0 && (
                <p className="text-xs font-extrabold text-orange-700">
                  السعر بعد العرض: {formatCurrency(getProductPricing({ ...emptyProduct, ...form, id: editing?.id || '', price: Number(form.price) || 0, cost_price: Number(form.cost_price) || 0, discount_value: Number(form.discount_value) || 0, created_at: '', updated_at: '', stock_quantity: Number(form.stock_quantity) || 0 }).finalPrice)}
                </p>
              )}
            </div>
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              الكمية المتاحة
              <Input required type="number" min="0" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              وحدة البيع
              <Select value={form.unit_type} onChange={(e) => setForm({ ...form, unit_type: e.target.value as UnitType })}>
                {Object.entries(unitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </label>
            <Input dir="ltr" value={form.image_1_url} onChange={(e) => setForm({ ...form, image_1_url: e.target.value })} placeholder="رابط الصورة الأولى أو Storage public URL" />
            <Input dir="ltr" value={form.image_2_url} onChange={(e) => setForm({ ...form, image_2_url: e.target.value })} placeholder="رابط الصورة الثانية" />
            <label className="block rounded-2xl border border-dashed border-azraq-200 bg-azraq-50/60 p-3 text-sm font-bold text-azraq-800">
              ارفع الصورة الأولى على Supabase Storage
              <input type="file" accept="image/*" onChange={(e) => setImage1(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs text-slate-500" />
            </label>
            <label className="block rounded-2xl border border-dashed border-azraq-200 bg-azraq-50/60 p-3 text-sm font-bold text-azraq-800">
              ارفع الصورة الثانية على Supabase Storage
              <input type="file" accept="image/*" onChange={(e) => setImage2(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs text-slate-500" />
            </label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="الوصف" rows={4} />
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
              المنتج متاح
            </label>
            <Button className="w-full"><Plus size={17} /> {editing ? 'حفظ التعديل' : 'إضافة المنتج'}</Button>
          </form>
        </Card>
        <div>
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && data?.products.length === 0 && <EmptyState title="مفيش منتجات دلوقتي" body="ضيف أول منتج من النموذج." />}
          <div className="grid gap-3">
            {data?.products.map((product) => (
              <Card key={product.id} className="grid gap-4 md:grid-cols-[88px_1fr_auto] md:items-center">
                <div className="h-20 overflow-hidden rounded-2xl bg-azraq-50">
                  {product.image_1_url && <img src={product.image_1_url} alt={product.name} className="h-full w-full object-cover" />}
                </div>
                <div>
                  <h3 className="font-display text-lg font-extrabold">{product.name}</h3>
                  <p className="text-sm text-slate-500">{product.categories?.name || 'بدون قسم'} / {product.subcategories?.name || 'بدون فرعي'} - {formatCurrency(getProductPricing(product).finalPrice)} / {unitLabels[product.unit_type]}</p>
                  {getProductPricing(product).hasDiscount && <p className="text-xs font-extrabold text-orange-600">العرض وفر لك {formatCurrency(getProductPricing(product).saving)}</p>}
                  <p className="text-xs font-bold text-slate-500">المخزون: {product.stock_quantity ?? 'غير محفوظ'} - التكلفة: {formatCurrency(product.cost_price ?? 0)}</p>
                  <p className={(product.is_available && (product.stock_quantity == null || product.stock_quantity > 0)) ? 'text-xs font-bold text-emerald-600' : 'text-xs font-bold text-rose-600'}>{(product.is_available && (product.stock_quantity == null || product.stock_quantity > 0)) ? 'متاح' : 'مش متاح دلوقتي'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(product)} className="rounded-2xl bg-azraq-50 px-4 py-2 text-sm font-bold text-azraq-800">تعديل</button>
                  <button onClick={() => remove(product.id)} className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">حذف</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
