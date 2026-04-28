import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Minus, Plus, Send, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, unitLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';

export function CartPage() {
  const { items, total, count, updateQuantity, removeItem, clear } = useCart();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || items.length === 0) return;
    setLoading(true);
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id: profile.id,
        status: 'new',
        total_amount: total,
        paid_amount: 0,
        debt_amount: total,
        address: profile.address,
        latitude: profile.latitude,
        longitude: profile.longitude,
        notes,
      })
      .select()
      .single();

    if (error || !order) {
      setLoading(false);
      console.error('CUSTOMER_ORDER_CREATE_FAILED', error);
      toast.error('تعذر تحميل البيانات، حاول مرة أخرى');
      return;
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name_snapshot: item.product.name,
        unit_type_snapshot: item.product.unit_type,
        unit_price_snapshot: item.product.price,
        quantity: item.quantity,
        line_total: item.product.price * item.quantity,
      })),
    );
    setLoading(false);
    if (itemsError) {
      console.error('CUSTOMER_ORDER_ITEMS_CREATE_FAILED', itemsError);
      toast.error('تعذر تحميل البيانات، حاول مرة أخرى');
      return;
    }

    clear();
    setSuccessOrderId(order.id);
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
          {items.map((item) => (
            <Card key={item.product.id} className="grid grid-cols-[72px_1fr] gap-3 p-3">
              <div className="h-20 overflow-hidden rounded-2xl bg-[#F4FAFF]">
                {item.product.image_1_url ? <img src={item.product.image_1_url} alt={item.product.name} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-extrabold text-ink">{item.product.name}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">{formatCurrency(item.product.price)} / {unitLabels[item.product.unit_type]}</p>
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
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-lg font-extrabold"><span>الإجمالي</span><span className="text-azraq-800">{formatCurrency(total)}</span></div>
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
