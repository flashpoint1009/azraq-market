import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Minus, Plus, Rocket, Send, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Input, PageHeader, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, unitLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';

export function CartPage() {
  const { items, total, count, updateQuantity, removeItem, clear } = useCart();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState(profile?.address || '');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState(profile?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(profile?.longitude?.toString() || '');
  const [loading, setLoading] = useState(false);
  const saving = useMemo(() => Math.round(total * 0.06), [total]);

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        toast.success('الموقع اتحدد');
      },
      () => toast.error('معرفناش نجيب الموقع'),
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || items.length === 0) return;
    setLoading(true);
    const paidAmount = 0;
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id: profile.id,
        status: 'new',
        total_amount: total,
        paid_amount: paidAmount,
        debt_amount: total - paidAmount,
        address,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        notes,
      })
      .select()
      .single();
    if (error || !order) {
      setLoading(false);
      toast.error(error?.message || 'إرسال الطلب منفعش');
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
      toast.error(itemsError.message);
      return;
    }
    clear();
    toast.success('طلبك وصلنا. الفاتورة جاهزة للمتابعة');
    navigate(`/orders/${order.id}`);
  };

  if (items.length === 0) return <EmptyState title="طلبك فاضي" body="زوّد منتجات من الرئيسية أو العروض وهتظهر هنا." />;

  return (
    <form onSubmit={submit} className="pb-32 lg:pb-8">
      <PageHeader title="طلبك" subtitle="راجع الأصناف والعنوان قبل ما تبعت الطلب." />
      <div className="grid gap-5 lg:grid-cols-[1fr_390px]">
        <Card className="p-4">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.product.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:grid-cols-[88px_1fr_auto] sm:items-center">
                <div className="h-20 overflow-hidden rounded-2xl bg-azraq-50">
                  {item.product.image_1_url ? <img src={item.product.image_1_url} alt={item.product.name} className="h-full w-full object-cover" /> : null}
                </div>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-ink">{item.product.name}</h3>
                  <p className="text-sm text-slate-500">{formatCurrency(item.product.price)} / {unitLabels[item.product.unit_type]}</p>
                  <p className="mt-1 text-xs font-bold text-emerald-600">توفير تقريبي {formatCurrency(item.product.price * item.quantity * 0.06)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><Minus size={15} /></button>
                  <strong className="min-w-8 text-center">{item.quantity}</strong>
                  <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="grid h-9 w-9 place-items-center rounded-xl bg-azraq-700 text-white"><Plus size={15} /></button>
                  <strong className="min-w-24 text-azraq-800">{formatCurrency(item.product.price * item.quantity)}</strong>
                  <button type="button" onClick={() => removeItem(item.product.id)} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="h-fit">
          <h2 className="font-display text-2xl font-extrabold">بيانات التوصيل</h2>
          <div className="mt-4 space-y-3">
            <Input value={profile?.full_name || ''} disabled placeholder="اسم العميل" />
            <Input value={profile?.phone || ''} disabled placeholder="رقم الموبايل" />
            <Textarea required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="العنوان بالتفصيل" rows={3} />
            <div className="grid grid-cols-2 gap-2">
              <Input dir="ltr" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="Latitude" />
              <Input dir="ltr" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="Longitude" />
            </div>
            <button type="button" onClick={locate} className="inline-flex items-center gap-2 text-sm font-bold text-azraq-700"><MapPin size={16} /> استخدم موقعي الحالي</button>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ملاحظات لو حابب" rows={3} />
          </div>
          <div className="my-5 rounded-2xl bg-gradient-to-br from-azraq-50 to-white p-4">
            <div className="flex justify-between text-sm font-bold text-slate-500"><span>عدد الأصناف</span><span>{count}</span></div>
            <div className="mt-2 flex justify-between text-sm font-bold text-emerald-600"><span>توفير تقريبي</span><span>{formatCurrency(saving)}</span></div>
            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-lg font-extrabold"><span>الإجمالي</span><span className="text-azraq-800">{formatCurrency(total)}</span></div>
          </div>
          <Button disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
            <Send size={18} />
            {loading ? 'بنبعت الطلب...' : 'ابعت الطلب'}
          </Button>
        </Card>
      </div>

      <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-white bg-white/95 p-3 shadow-glow backdrop-blur lg:hidden">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400">{count} صنف في طلبك</p>
            <p className="font-display text-xl font-extrabold text-azraq-900">{formatCurrency(total)}</p>
          </div>
          <p className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">وفرت {formatCurrency(saving)}</p>
        </div>
        <Button disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
          <Rocket size={18} />
          {loading ? 'بنبعت الطلب...' : 'اطلب الآن 🚀'}
        </Button>
      </div>
    </form>
  );
}
