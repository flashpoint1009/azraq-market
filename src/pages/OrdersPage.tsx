import toast from 'react-hot-toast';
import { OrderCard } from '../components/OrderCard';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Order, Product } from '../types/database';

export function OrdersPage() {
  const { profile } = useAuth();
  const { fillFromOrder } = useCart();
  const { data: orders, loading, error } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('customer_id', profile?.id || '')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  }, [profile?.id]);

  const repeatLast = async (order: Order) => {
    const ids = order.order_items?.map((item) => item.product_id).filter(Boolean) as string[];
    const { data } = await supabase.from('products').select('*').in('id', ids);
    const products = (data || []) as Product[];
    fillFromOrder(
      (order.order_items || []).flatMap((item) => {
        const product = products.find((entry) => entry.id === item.product_id);
        return product ? [{ product, quantity: item.quantity }] : [];
      }),
    );
    toast.success('منتجات الطلب القديم اتضافت لطلبك');
  };

  return (
    <div>
      <PageHeader title="طلباتي" subtitle="تابع طلباتك وكرر أي طلب بضغطة." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && orders?.length === 0 && <EmptyState title="لسه مفيش طلبات" body="أول طلب هتبعته هيظهر هنا مع الفاتورة والمتابعة." />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orders?.map((order) => (
          <div key={order.id} className="space-y-2">
            <OrderCard order={order} />
            <button onClick={() => repeatLast(order)} className="w-full rounded-2xl bg-white px-4 py-2 text-sm font-bold text-azraq-700 shadow-sm">كرر الطلب</button>
          </div>
        ))}
      </div>
    </div>
  );
}
