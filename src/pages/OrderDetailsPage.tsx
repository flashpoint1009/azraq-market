import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Printer, RotateCcw } from 'lucide-react';
import { MapPreview } from '../components/MapPreview';
import { StatusTimeline } from '../components/StatusTimeline';
import { Button, Card, ErrorState, LoadingState, PageHeader, SecondaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, formatDate, statusLabels, unitLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Order, Product } from '../types/database';

export function OrderDetailsPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const { fillFromOrder } = useCart();
  const navigate = useNavigate();
  const { data: order, loading, error } = useSupabaseQuery(async () => {
    if (!id) throw new Error('الطلب مش موجود');
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles(full_name,phone,address,latitude,longitude), order_items(*), order_status_history(*, profiles(full_name,role))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Order;
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !order) return <ErrorState message={error || 'الطلب مش موجود'} />;

  const repeat = async () => {
    const ids = order.order_items?.map((item) => item.product_id).filter(Boolean) as string[];
    const { data } = await supabase.from('products').select('*').in('id', ids);
    const products = (data || []) as Product[];
    fillFromOrder(
      (order.order_items || []).flatMap((item) => {
        const product = products.find((entry) => entry.id === item.product_id);
        return product ? [{ product, quantity: item.quantity }] : [];
      }),
    );
    toast.success('جهزنا طلبك القديم في السلة');
    navigate('/cart');
  };

  return (
    <div>
      <PageHeader
        title={`طلب رقم #${order.id.slice(0, 8)}`}
        subtitle={`${statusLabels[order.status]} - ${formatDate(order.created_at)}`}
        action={<SecondaryButton onClick={() => window.print()}><Printer size={17} /> اطبع</SecondaryButton>}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card className="bg-white">
            <h2 className="mb-4 font-display text-2xl font-extrabold text-ink">تابع طلبك</h2>
            <StatusTimeline status={order.status} history={order.order_status_history || []} />
          </Card>
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">تفاصيل الفاتورة</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-100 text-right">
                    <th className="py-3">المنتج</th>
                    <th>الوحدة</th>
                    <th>الكمية</th>
                    <th>سعر الوحدة</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="py-4 font-bold">{item.product_name_snapshot}</td>
                      <td>{unitLabels[item.unit_type_snapshot]}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price_snapshot)}</td>
                      <td className="font-extrabold text-azraq-800">{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-between rounded-2xl bg-azraq-50 p-4 font-display text-xl font-extrabold text-azraq-900">
              <span>الإجمالي</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </Card>
          {role === 'customer' && <Button onClick={repeat}><RotateCcw size={17} /> كرر الطلب</Button>}
        </div>
        <div className="space-y-5">
          <Card>
            <h2 className="font-display text-2xl font-extrabold">بيانات العميل</h2>
            <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
              <p><strong>الاسم:</strong> {order.profiles?.full_name || 'مش محدد'}</p>
              <p><strong>الموبايل:</strong> {order.profiles?.phone || 'مش محدد'}</p>
              <p><strong>العنوان:</strong> {order.address || order.profiles?.address || 'مش محدد'}</p>
              {order.profiles?.phone && <a className="font-bold text-azraq-700" href={`tel:${order.profiles.phone}`}>اتصل بالعميل</a>}
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">موقع العميل</h2>
            <MapPreview latitude={order.latitude ?? order.profiles?.latitude ?? null} longitude={order.longitude ?? order.profiles?.longitude ?? null} />
          </Card>
        </div>
      </div>
    </div>
  );
}
