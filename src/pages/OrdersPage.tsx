import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, LoadingState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, statusLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Order, Product } from '../types/database';

export function OrdersPage() {
  const { profile } = useAuth();
  const { fillFromOrder } = useCart();
  const navigate = useNavigate();
  const { data: orders, loading, error } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('customer_id', profile?.id || '')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  }, [profile?.id]);

  const addProducts = async (order: Order) => {
    const ids = order.order_items?.map((item) => item.product_id).filter(Boolean) as string[];
    const { data } = await supabase.from('products').select('*').in('id', ids);
    const products = (data || []) as Product[];
    fillFromOrder(
      (order.order_items || []).flatMap((item) => {
        const product = products.find((entry) => entry.id === item.product_id);
        return product ? [{ product, quantity: item.quantity }] : [];
      }),
    );
    toast.success('منتجات الطلب اتضافت');
    navigate('/cart');
  };

  return (
    <div className="pb-24">
      <div className="mb-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">طلباتي</h1>
        <p className="text-xs font-bold text-slate-400">تابع حالة كل طلب بسرعة</p>
      </div>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && orders?.length === 0 && <EmptyState title="لسه مفيش طلبات" body="أول طلب هتبعته هيظهر هنا." />}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders?.map((order) => (
          <Card key={order.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-400">طلب #{order.id.slice(0, 8)}</p>
                <h2 className="mt-1 text-lg font-extrabold text-ink">{statusLabels[order.status]}</h2>
              </div>
              <strong className="text-azraq-800">{formatCurrency(order.total_amount)}</strong>
            </div>
            <p className="mt-3 text-xs font-bold text-slate-400">{new Date(order.created_at).toLocaleString('ar-EG')}</p>
            <div className="mt-4 grid gap-2">
              <Link to={`/orders/${order.id}`} className="inline-flex items-center justify-center gap-1 rounded-2xl bg-[#F4FAFF] px-4 py-2 text-sm font-extrabold text-azraq-700">
                عرض التفاصيل <ChevronLeft size={15} />
              </Link>
              {order.status === 'new' && (
                <Button type="button" onClick={() => addProducts(order)} className="py-2">
                  <Plus size={16} /> زوّد منتجات
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
