import toast from 'react-hot-toast';
import { MapPin, PhoneCall } from 'lucide-react';
import { MapPreview } from '../components/MapPreview';
import { OrderCard } from '../components/OrderCard';
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { updateOrderStatus } from '../lib/orders';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Order } from '../types/database';

export function DeliveryPage() {
  const { profile } = useAuth();
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles(full_name,phone,address,latitude,longitude), order_items(*)')
      .in('status', ['ready_for_delivery', 'with_delivery'])
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as Order[];
  }, []);

  const change = async (id: string, status: 'with_delivery' | 'delivered') => {
    if (!profile) return;
    try {
      await updateOrderStatus(id, status, profile.id);
      toast.success('حالة التوصيل اتحدثت');
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تحديث الحالة منفعش');
    }
  };

  return (
    <div>
      <PageHeader title="لوحة التوصيل" subtitle="طلبات جاهزة تخرج ومعاها بيانات العميل والموقع." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && data?.length === 0 && <EmptyState title="لسه مفيش طلبات جاهزة" body="طلبات التوصيل هتظهر هنا بعد ما المخزن يجهزها." />}
      <div className="grid gap-5 xl:grid-cols-2">
        {data?.map((order) => (
          <Card key={order.id}>
            <OrderCard order={order} to={`/orders/${order.id}`} />
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              <p><strong>العنوان:</strong> {order.address || order.profiles?.address || 'مش محدد'}</p>
              {order.profiles?.phone && <a href={`tel:${order.profiles.phone}`} className="inline-flex items-center gap-2 font-bold text-azraq-700"><PhoneCall size={16} /> اتصل بالعميل</a>}
            </div>
            <div className="mt-4">
              <MapPreview latitude={order.latitude ?? order.profiles?.latitude ?? null} longitude={order.longitude ?? order.profiles?.longitude ?? null} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => change(order.id, 'with_delivery')} className="flex-1"><MapPin size={17} /> خرج للعميل</Button>
              <Button onClick={() => change(order.id, 'delivered')} className="flex-1 bg-emerald-600 hover:bg-emerald-700">تم التسليم</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
