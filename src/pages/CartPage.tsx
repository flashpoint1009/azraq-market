import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Minus, Plus, Send, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Input, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, unitLabels } from '../lib/labels';
import { getProductPricing } from '../lib/pricing';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Coupon } from '../types/database';

export function CartPage() {
  const { items, total, count, updateQuantity, removeItem, clear } = useCart();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [redeemPoints, setRedeemPoints] = useState('0');
  const [loading, setLoading] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const { data: pointsBalance } = useSupabaseQuery(async () => {
    if (!profile?.id) return 0;
    const { data } = await supabase.from('loyalty_points').select('points').eq('user_id', profile.id);
    return (data || []).reduce((sum, item) => sum + Number(item.points || 0), 0);
  }, [profile?.id]);
  const couponDiscount = appliedCoupon ? (appliedCoupon.type === 'percent' ? Math.round((total * appliedCoupon.value / 100) * 100) / 100 : Math.min(appliedCoupon.value, total)) : 0;
  const pointsToRedeem = Math.max(0, Math.min(Number(redeemPoints) || 0, pointsBalance || 0));
  const loyaltyDiscount = Math.min(Math.floor(pointsToRedeem / 100) * 10, Math.max(total - couponDiscount, 0));
  const finalTotal = Math.max(total - couponDiscount - loyaltyDiscount, 0);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    const { data, error } = await supabase.from('coupons').select('*').eq('code', couponCode.trim().toUpperCase()).eq('is_active', true).maybeSingle();
    if (error || !data) {
      toast.error('الكوبون غير صحيح');
      return;
    }
    const coupon = data as Coupon;
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      toast.error('الكوبون منتهي');
      return;
    }
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      toast.error('الكوبون استنفد عدد الاستخدامات');
      return;
    }
    if (total < coupon.min_order) {
      toast.error(`أقل طلب للكوبون ${formatCurrency(coupon.min_order)}`);
      return;
    }
    setAppliedCoupon(coupon);
    toast.success('تم تطبيق الكوبون');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || items.length === 0) return;
    setLoading(true);
    const { data: orderId, error } = await supabase.rpc('customer_create_order', {
      notes_input: notes || null,
      items_input: items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      coupon_code_input: appliedCoupon?.code ?? null,
      loyalty_points_input: pointsToRedeem,
      scheduled_at_input: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      branch_id_input: null,
    });

    if (error || !orderId) {
      setLoading(false);
      console.error('CUSTOMER_ORDER_CREATE_FAILED', error);
      toast.error('تعذر تحميل البيانات، حاول مرة أخرى');
      return;
    }

    setLoading(false);
    clear();
    setSuccessOrderId(orderId);
    toast.success('طلبك وصلنا');
  };

  if (successOrderId) {
    return (
      <div className="grid min-h-[70vh] place-items-center pb-24">
        <Card className="max-w-md text-center">
          <h1 className="font-display text-3xl font-extrabold text-ink">طلبك وصلنا ✅</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            لو حابب تضيف منتج معاك، لسه قدامك ساعتين
            <br />
            قبل ما نحضر الطلب.
          </p>
          <div className="mt-6 grid gap-2">
            <Button type="button" onClick={() => navigate('/')}>زوّد منتجات</Button>
            <Link to="/orders" className="rounded-2xl border border-slate-100 bg-white px-5 py-3 text-sm font-extrabold text-azraq-700 shadow-sm">شوف طلباتي</Link>
          </div>
        </Card>
      </div>
    );
  }

  if (items.length === 0) return <EmptyState title="طلبك فاضي" body="زوّد منتجات من الرئيسية وهتظهر هنا." />;

  return (
    <form onSubmit={submit} className="pb-24">
      <div className="mb-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">طلبك</h1>
        <p className="text-xs font-bold text-slate-400">{count} أصناف في الطلب</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-2.5">
          {items.map((item) => {
            const pricing = getProductPricing(item.product);
            return (
            <Card key={item.product.id} className="grid grid-cols-[72px_1fr] gap-3 p-3">
              <div className="h-20 overflow-hidden rounded-2xl bg-[#F4FAFF]">
                {item.product.image_1_url ? <img src={item.product.image_1_url} alt={item.product.name} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-extrabold text-ink">{item.product.name}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">{formatCurrency(pricing.finalPrice)} / {unitLabels[item.product.unit_type]}</p>
                {pricing.hasDiscount && <p className="mt-1 text-[11px] font-extrabold text-orange-600">العرض وفر لك {formatCurrency(pricing.saving * item.quantity)}</p>}
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
            );
          })}
        </div>

        <Card className="h-fit p-4">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="اكتب أي ملاحظة للطلب..." rows={3} />
          <div className="mt-3 grid gap-2">
            <div className="flex gap-2">
              <Input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="كود الخصم" dir="ltr" />
              <Button type="button" onClick={applyCoupon} className="w-28">تطبيق</Button>
            </div>
            <Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
            {(pointsBalance || 0) > 0 && (
              <Input type="number" min="0" max={pointsBalance || 0} value={redeemPoints} onChange={(event) => setRedeemPoints(event.target.value)} placeholder={`نقاط الولاء المتاحة: ${pointsBalance || 0}`} />
            )}
          </div>
          <div className="my-4 rounded-2xl bg-[#F4FAFF] p-4">
            <div className="flex justify-between text-sm font-bold text-slate-500"><span>عدد الأصناف</span><span>{count}</span></div>
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm font-bold text-slate-500"><span>قبل الخصم</span><span>{formatCurrency(total)}</span></div>
            {couponDiscount > 0 && <div className="mt-2 flex justify-between text-sm font-bold text-orange-600"><span>خصم الكوبون</span><span>-{formatCurrency(couponDiscount)}</span></div>}
            {loyaltyDiscount > 0 && <div className="mt-2 flex justify-between text-sm font-bold text-emerald-600"><span>خصم النقاط</span><span>-{formatCurrency(loyaltyDiscount)}</span></div>}
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-lg font-extrabold"><span>الإجمالي</span><span className="text-azraq-800">{formatCurrency(finalTotal)}</span></div>
          </div>
          <Button disabled={loading} className="w-full">
            <Send size={18} />
            {loading ? 'جاري الإرسال...' : 'ابعت الطلب'}
          </Button>
        </Card>
      </div>
    </form>
  );
}
