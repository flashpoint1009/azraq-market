import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2, Minus, Plus, Send, Tag, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, unitLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { getProductPricing } from '../lib/pricing';
import type { Coupon, Promotion } from '../types/database';

function promotionDiscount(promotion: Promotion, amount: number) {
  const value = Number(promotion.discount_value || 0);
  return promotion.discount_type === 'percentage' ? Math.min(amount, amount * (value / 100)) : Math.min(amount, value);
}

export function CartPage() {
  const { items, total, count, updateQuantity, removeItem, clear } = useCart();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  const { data: promotions } = useSupabaseQuery(async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now);
    if (error) return [] as Promotion[];
    return (data || []) as Promotion[];
  }, []);

  const promotionDiscount_ = useMemo(() => {
    return (promotions || []).reduce((sum, promotion) => {
      if (promotion.promotion_type === 'order_total' && total >= Number(promotion.min_order_amount || 0)) return sum + promotionDiscount(promotion, total);
      if (promotion.promotion_type === 'product' && promotion.product_id) {
        const item = items.find((entry) => entry.product.id === promotion.product_id);
        return item ? sum + promotionDiscount(promotion, getProductPricing(item.product).finalPrice * item.quantity) : sum;
      }
      if (promotion.promotion_type === 'quantity' && promotion.product_id) {
        const item = items.find((entry) => entry.product.id === promotion.product_id);
        return item && item.quantity >= Number(promotion.min_quantity || 1) ? sum + promotionDiscount(promotion, getProductPricing(item.product).finalPrice * item.quantity) : sum;
      }
      if (promotion.promotion_type === 'bundle' && promotion.product_ids?.length) {
        const hasBundle = promotion.product_ids.every((id) => items.some((entry) => entry.product.id === id));
        const bundleAmount = items.filter((entry) => promotion.product_ids?.includes(entry.product.id)).reduce((next, entry) => next + getProductPricing(entry.product).finalPrice * entry.quantity, 0);
        return hasBundle ? sum + promotionDiscount(promotion, bundleAmount) : sum;
      }
      return sum;
    }, 0);
  }, [items, promotions, total]);

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const afterPromotion = Math.max(0, total - promotionDiscount_);
    if (appliedCoupon.type === 'percent') return Math.round(afterPromotion * (Number(appliedCoupon.value) / 100) * 100) / 100;
    return Math.min(afterPromotion, Number(appliedCoupon.value));
  }, [appliedCoupon, total, promotionDiscount_]);

  const finalTotal = Math.max(0, total - promotionDiscount_ - couponDiscount);

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponError('');
    setCouponLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();
    setCouponLoading(false);
    if (error || !data) { setCouponError('الكود غير صحيح أو منتهي'); return; }
    const coupon = data as Coupon;
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) { setCouponError('انتهت صلاحية الكود'); return; }
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) { setCouponError('الكود وصل للحد الأقصى من الاستخدام'); return; }
    if (total < Number(coupon.min_order || 0)) { setCouponError(`الطلب أقل من الحد الأدنى ${formatCurrency(coupon.min_order)}`); return; }
    setAppliedCoupon(coupon);
    toast.success(`تم تطبيق الكود — خصم ${coupon.type === 'percent' ? `${coupon.value}%` : formatCurrency(coupon.value)}`);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || items.length === 0) return;
    setLoading(true);

    const rpc = await supabase.rpc('customer_create_order', {
      notes_input: notes || null,
      items_input: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
    });

    if (!rpc.error && rpc.data) {
      const orderId = String(rpc.data);

      // Apply coupon discount on top of the server-calculated promotion discounts
      if (appliedCoupon && couponDiscount > 0) {
        const { data: orderRow } = await supabase.from('orders').select('total_amount, debt_amount').eq('id', orderId).single();
        if (orderRow) {
          const newTotal = Math.max(0, Number(orderRow.total_amount) - couponDiscount);
          await supabase.from('orders').update({
            discount_amount: couponDiscount,
            total_amount: newTotal,
            debt_amount: newTotal,
          }).eq('id', orderId);
        }
        await supabase.from('coupons').update({ used_count: appliedCoupon.used_count + 1 }).eq('id', appliedCoupon.id);
      }

      setLoading(false);
      clear();
      setSuccessOrderId(orderId);
      toast.success('طلبك وصلنا');
      return;
    }

    setLoading(false);
    toast.error(rpc.error?.message.includes('function') ? 'شغل ملف supabase/fix_customer_order_rpc.sql الأول' : rpc.error?.message || 'تعذر إرسال الطلب');
  };

  if (successOrderId) {
    return (
      <div className="grid min-h-[70vh] place-items-center pb-24">
        <Card className="max-w-md text-center">
          <h1 className="font-display text-3xl font-extrabold text-ink">طلبك وصلنا</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">تقدر تتابع حالة الطلب من صفحة طلباتي.</p>
          <div className="mt-6 grid gap-2">
            <Button type="button" onClick={() => navigate('/')}>زود منتجات</Button>
            <Link to="/orders" className="rounded-2xl border border-slate-100 bg-white px-5 py-3 text-sm font-extrabold text-azraq-700 shadow-sm">شوف طلباتي</Link>
          </div>
        </Card>
      </div>
    );
  }

  if (items.length === 0) return <EmptyState title="طلبك فاضي" body="زود منتجات من الرئيسية وهتظهر هنا." />;

  return (
    <form onSubmit={submit} className="pb-24">
      <div className="mb-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">طلبك</h1>
        <p className="text-xs font-bold text-slate-400">{count} أصناف في الطلب</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-2.5">
          {items.map((item) => (
            <Card key={item.product.id} className="grid grid-cols-[72px_1fr] gap-3 p-3">
              <div className="h-20 overflow-hidden rounded-2xl bg-[#F4FAFF]">
                {item.product.image_1_url ? <img src={item.product.image_1_url} alt={item.product.name} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-extrabold text-ink">{item.product.name}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">{formatCurrency(getProductPricing(item.product).finalPrice)} / {unitLabels[item.product.unit_type]}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600"><Minus size={14} /></button>
                    <strong className="min-w-6 text-center text-sm">{item.quantity}</strong>
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-xl bg-azraq-700 text-white"><Plus size={14} /></button>
                  </div>
                  <button type="button" onClick={() => removeItem(item.product.id)} className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={14} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="h-fit p-4">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="اكتب أي ملاحظة للطلب..." rows={3} />

          <div className="mt-4">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-700">
                  <CheckCircle2 size={16} />
                  <span>{appliedCoupon.code}</span>
                </div>
                <button type="button" onClick={removeCoupon} className="text-xs font-bold text-rose-500 hover:text-rose-700">إزالة</button>
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="relative">
                  <Tag size={15} className="absolute right-3 top-3.5 text-slate-400" />
                  <Input
                    value={couponCode}
                    onChange={(event) => { setCouponCode(event.target.value); setCouponError(''); }}
                    placeholder="كود الخصم"
                    dir="ltr"
                    className="pr-9"
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyCoupon(); }}}
                  />
                </div>
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-azraq-50 px-4 py-2.5 text-sm font-extrabold text-azraq-700 transition hover:bg-azraq-100 disabled:opacity-50"
                >
                  {couponLoading ? <Loader2 size={15} className="animate-spin" /> : 'تطبيق'}
                </button>
              </div>
            )}
            {couponError && <p className="mt-1.5 text-xs font-bold text-rose-500">{couponError}</p>}
          </div>

          <div className="my-4 rounded-2xl bg-[#F4FAFF] p-4">
            <div className="flex justify-between text-sm font-bold text-slate-500"><span>عدد الأصناف</span><span>{count}</span></div>
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm font-bold text-slate-500"><span>قبل الخصم</span><span>{formatCurrency(total)}</span></div>
            {promotionDiscount_ > 0 && <div className="mt-3 flex justify-between text-sm font-bold text-emerald-700"><span>خصم العروض</span><span>- {formatCurrency(promotionDiscount_)}</span></div>}
            {couponDiscount > 0 && <div className="mt-3 flex justify-between text-sm font-bold text-azraq-700"><span>خصم الكوبون ({appliedCoupon?.code})</span><span>- {formatCurrency(couponDiscount)}</span></div>}
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-lg font-extrabold"><span>الإجمالي</span><span className="text-azraq-800">{formatCurrency(finalTotal)}</span></div>
          </div>
          {loading && <div className="mb-3"><ErrorState message="جاري إرسال الطلب، لا تغلق الصفحة." /></div>}
          <Button disabled={loading} className="w-full">
            <Send size={18} />
            {loading ? 'جاري الإرسال...' : 'ابعت الطلب'}
          </Button>
        </Card>
      </div>
    </form>
  );
}
