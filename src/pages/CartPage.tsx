import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Minus, Plus, Send, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, unitLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { getProductPricing } from '../lib/pricing';
import type { Promotion } from '../types/database';

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

  const { data: promotions } = useSupabaseQuery(async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now);
    if (error) {
      console.error('CART_PROMOTIONS_FETCH_FAILED', error);
      return [] as Promotion[];
    }
    return (data || []) as Promotion[];
  }, []);

  const discount = useMemo(() => {
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
  const finalTotal = Math.max(0, total - discount);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || items.length === 0) return;
    setLoading(true);

    const rpc = await supabase.rpc('customer_create_order', {
      notes_input: notes || null,
      items_input: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
    });

    if (!rpc.error && rpc.data) {
      setLoading(false);
      clear();
      setSuccessOrderId(String(rpc.data));
      toast.success('طلبك وصلنا');
      return;
    }

    setLoading(false);
    console.error('CUSTOMER_ORDER_RPC_FAILED', rpc.error);
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
          <div className="my-4 rounded-2xl bg-[#F4FAFF] p-4">
            <div className="flex justify-between text-sm font-bold text-slate-500"><span>عدد الأصناف</span><span>{count}</span></div>
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm font-bold text-slate-500"><span>قبل الخصم</span><span>{formatCurrency(total)}</span></div>
            {discount > 0 && <div className="mt-3 flex justify-between text-sm font-bold text-emerald-700"><span>خصم العروض</span><span>{formatCurrency(discount)}</span></div>}
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
