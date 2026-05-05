import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, Percent, Plus, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select } from '../components/ui';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category, DiscountType, Product, Promotion, PromotionType } from '../types/database';

const emptyForm = {
  title: '',
  promotion_type: 'product' as PromotionType,
  category_id: 'all',
  applies_to_all_products: false,
  product_id: '',
  product_ids: [] as string[],
  min_quantity: '2',
  min_order_amount: '0',
  discount_type: 'percentage' as DiscountType,
  discount_value: '10',
  starts_at: new Date().toISOString().slice(0, 10),
  ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  is_active: true,
};

function describePromotion(promotion: Promotion) {
  const discount = promotion.discount_type === 'percentage'
    ? `${promotion.discount_value}%`
    : formatCurrency(promotion.discount_value);
  if (promotion.promotion_type === 'order_total') return `خصم ${discount} عند طلب بقيمة ${formatCurrency(promotion.min_order_amount || 0)}`;
  if (promotion.promotion_type === 'quantity') {
    const scope = promotion.product_id ? 'على منتج محدد' : 'على كل المنتجات';
    return `خصم ${discount} عند شراء ${promotion.min_quantity || 1} قطع ${scope}`;
  }
  if (promotion.promotion_type === 'bundle') {
    const scope = promotion.product_ids?.length ? 'على مجموعة محددة' : 'على أي مجموعة منتجات';
    return `خصم ${discount} ${scope}`;
  }
  return `خصم ${discount} على منتج محدد`;
}

export function AdminOffersPage() {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const [categories, products, promotions] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('id,name,price,image_1_url,unit_type,category_id').order('name'),
      supabase.from('promotions').select('*, products(id,name,price,image_1_url,unit_type)').order('created_at', { ascending: false }),
    ]);
    if (categories.error) throw categories.error;
    if (products.error) throw products.error;
    if (promotions.error) throw promotions.error;
    return {
      categories: (categories.data || []) as Category[],
      products: (products.data || []) as Product[],
      promotions: (promotions.data || []) as Promotion[],
    };
  }, []);

  const allowAllProducts = form.promotion_type === 'quantity' || form.promotion_type === 'bundle';
  const filteredProducts = useMemo(
    () => (data?.products || []).filter((product) => form.category_id === 'all' || product.category_id === form.category_id),
    [data?.products, form.category_id],
  );
  const selectedProducts = useMemo(
    () => (data?.products || []).filter((product) => form.product_ids.includes(product.id)),
    [data?.products, form.product_ids],
  );

  const updateType = (promotionType: PromotionType) => {
    setForm({
      ...form,
      promotion_type: promotionType,
      applies_to_all_products: false,
      product_id: '',
      product_ids: [],
      min_quantity: promotionType === 'bundle' ? '2' : form.min_quantity,
    });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error('اكتب اسم العرض');
      return;
    }
    if (form.promotion_type === 'product' && !form.product_id) {
      toast.error('اختر المنتج');
      return;
    }
    if (form.promotion_type === 'quantity' && !form.applies_to_all_products && !form.product_id) {
      toast.error('اختر المنتج أو فعل كل المنتجات');
      return;
    }
    if (form.promotion_type === 'bundle' && !form.applies_to_all_products && form.product_ids.length < 2) {
      toast.error('اختر منتجين أو أكثر للعرض المجمع');
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      promotion_type: form.promotion_type,
      product_id: form.promotion_type === 'product' || (form.promotion_type === 'quantity' && !form.applies_to_all_products) ? form.product_id : null,
      product_ids: form.promotion_type === 'bundle' && !form.applies_to_all_products ? form.product_ids : null,
      min_quantity: form.promotion_type === 'quantity' || form.promotion_type === 'bundle' ? Number(form.min_quantity) || 1 : null,
      min_order_amount: form.promotion_type === 'order_total' ? Number(form.min_order_amount) || 0 : null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value) || 0,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(`${form.ends_at}T23:59:59`).toISOString(),
      is_active: form.is_active,
    };
    const { error: saveError } = await supabase.from('promotions').insert(payload);
    setSaving(false);
    if (saveError) {
      console.error('PROMOTION_SAVE_FAILED', saveError);
      toast.error(saveError.message.includes('promotions') ? 'شغل ملف supabase/business_features_migration.sql الأول' : saveError.message);
      return;
    }
    toast.success('تم حفظ العرض');
    setForm(emptyForm);
    reload();
  };

  const remove = async (promotion: Promotion) => {
    const { error: removeError } = await supabase.from('promotions').delete().eq('id', promotion.id);
    if (removeError) toast.error(removeError.message);
    else {
      toast.success('تم حذف العرض');
      reload();
    }
  };

  return (
    <div>
      <PageHeader title="العروض" subtitle="أنشئ عروض بمدة محددة على منتج، كمية، مجموعة منتجات، أو إجمالي طلب." />
      <div className="grid gap-5 xl:grid-cols-[440px_1fr]">
        <Card className="h-fit">
          <h2 className="mb-4 font-display text-2xl font-extrabold">عرض جديد</h2>
          <form onSubmit={save} className="space-y-3">
            <Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="اسم العرض" />
            <Select value={form.promotion_type} onChange={(event) => updateType(event.target.value as PromotionType)}>
              <option value="product">خصم على منتج محدد</option>
              <option value="quantity">خصم عند شراء كمية</option>
              <option value="bundle">عرض مجمع على منتجات مختلفة</option>
              <option value="order_total">خصم على إجمالي مشتريات</option>
            </Select>

            {form.promotion_type !== 'order_total' && (
              <Select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value, product_id: '', product_ids: [] })}>
                <option value="all">كل الأقسام</option>
                {data?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
            )}

            {allowAllProducts && (
              <label className="flex items-center gap-2 rounded-2xl bg-azraq-50 px-3 py-2 text-sm font-bold text-azraq-800">
                <input
                  type="checkbox"
                  checked={form.applies_to_all_products}
                  onChange={(event) => setForm({ ...form, applies_to_all_products: event.target.checked, product_id: '', product_ids: [] })}
                />
                طبق العرض على كل المنتجات
              </label>
            )}

            {(form.promotion_type === 'product' || (form.promotion_type === 'quantity' && !form.applies_to_all_products)) && (
              <Select required value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })}>
                <option value="">اختر المنتج</option>
                {filteredProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </Select>
            )}

            {form.promotion_type === 'bundle' && !form.applies_to_all_products && (
              <div className="grid gap-2 rounded-2xl bg-slate-50 p-3">
                <Select value="" onChange={(event) => {
                  const productId = event.target.value;
                  if (productId && !form.product_ids.includes(productId)) setForm({ ...form, product_ids: [...form.product_ids, productId] });
                }}>
                  <option value="">أضف منتج للعرض المجمع</option>
                  {filteredProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </Select>
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map((product) => (
                    <button key={product.id} type="button" onClick={() => setForm({ ...form, product_ids: form.product_ids.filter((id) => id !== product.id) })} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                      {product.name} ×
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(form.promotion_type === 'quantity' || form.promotion_type === 'bundle') && (
              <Input type="number" min="1" value={form.min_quantity} onChange={(event) => setForm({ ...form, min_quantity: event.target.value })} placeholder={form.promotion_type === 'bundle' ? 'عدد المنتجات المختلفة المطلوب' : 'الكمية المطلوبة'} />
            )}
            {form.promotion_type === 'order_total' && <Input type="number" min="0" value={form.min_order_amount} onChange={(event) => setForm({ ...form, min_order_amount: event.target.value })} placeholder="أقل قيمة طلب" />}
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.discount_type} onChange={(event) => setForm({ ...form, discount_type: event.target.value as DiscountType })}>
                <option value="percentage">نسبة</option>
                <option value="fixed">قيمة ثابتة</option>
              </Select>
              <Input required type="number" min="0" step="0.01" value={form.discount_value} onChange={(event) => setForm({ ...form, discount_value: event.target.value })} placeholder="قيمة الخصم" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input required type="date" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} />
              <Input required type="date" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              العرض نشط
            </label>
            <Button disabled={saving} className="w-full"><Plus size={17} /> {saving ? 'جاري الحفظ...' : 'احفظ العرض'}</Button>
          </form>
        </Card>

        <div className="grid content-start gap-3">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && data?.promotions.length === 0 && <EmptyState title="لا توجد عروض" body="العروض النشطة ستظهر للعميل في صفحة العروض والرئيسية." />}
          {data?.promotions.map((promotion) => (
            <Card key={promotion.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-azraq-50 px-3 py-1 text-xs font-extrabold text-azraq-700">
                    <Percent size={13} /> {promotion.is_active ? 'نشط' : 'متوقف'}
                  </div>
                  <h3 className="font-display text-lg font-extrabold">{promotion.title}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">{describePromotion(promotion)}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                    <CalendarDays size={13} />
                    {new Date(promotion.starts_at).toLocaleDateString('ar-EG')} - {new Date(promotion.ends_at).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                <button type="button" onClick={() => remove(promotion)} className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
