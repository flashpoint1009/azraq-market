import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, statusLabels, unitLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Order, Product } from '../types/database';

function SkeletonOrderCard() {
  return (
    <div className="animate-pulse rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full bg-slate-100" />
          <div className="h-5 w-32 rounded-full bg-slate-100" />
        </div>
        <div className="h-5 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="mt-3 h-3 w-36 rounded-full bg-slate-100" />
      <div className="mt-4 h-9 w-full rounded-2xl bg-slate-100" />
    </div>
  );
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  preparing: 'bg-amber-50 text-amber-700',
  ready_for_delivery: 'bg-purple-50 text-purple-700',
  with_delivery: 'bg-orange-50 text-orange-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

function OrderItemsInline({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const items = order.order_items || [];

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-xs font-extrabold text-azraq-700"
      >
        <span>الفاتورة ({items.length} {items.length === 1 ? 'صنف' : 'أصناف'})</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {open && (
        <div className="mt-2 grid gap-1.5">
          {items.map((item, i) => (
            <div key={item.id || i} className="flex items-center justify-between rounded-xl bg-[#F4FAFF] px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-700">{item.product_name_snapshot}</p>
                <p className="text-slate-400">
                  {item.quantity} {unitLabels[item.unit_type_snapshot]} × {formatCurrency(item.unit_price_snapshot)}
                </p>
              </div>
              <span className="mr-2 shrink-0 font-extrabold text-azraq-800">{formatCurrency(item.line_total)}</span>
            </div>
          ))}
          <div className="flex justify-between rounded-xl bg-azraq-700 px-3 py-2 text-xs font-extrabold text-white">
            <span>الإجمالي</span>
            <span>{formatCurrency(order.total_amount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrdersPage() {
  const { profile } = useAuth();
  const { fillFromOrder } = useCart();
  const navigate = useNavigate();
  const { data: orders, loading, error } = useSupabaseQuery(async () => {
    if (!profile?.id) return [] as Order[];
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('customer_id', profile.id)
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

      {loading && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <SkeletonOrderCard key={index} />)}
        </div>
      )}
      {error && <ErrorState message={error} />}
      {!loading && !error && orders?.length === 0 && <EmptyState title="لسه مفيش طلبات" body="أول طلب هتبعته هيظهر هنا." />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders?.map((order) => (
          <Card key={order.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-400">طلب #{order.id.slice(0, 8)}</p>
                <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-extrabold ${statusColors[order.status] || 'bg-slate-100 text-slate-500'}`}>
                  {statusLabels[order.status]}
                </span>
              </div>
              <strong className="text-lg font-extrabold text-azraq-800">{formatCurrency(order.total_amount)}</strong>
            </div>
            <p className="mt-2 text-xs font-bold text-slate-400">{new Date(order.created_at).toLocaleString('ar-EG')}</p>

            <OrderItemsInline order={order} />

            {order.status === 'new' && (
              <div className="mt-3">
                <Button type="button" onClick={() => addProducts(order)} className="w-full py-2">
                  <Plus size={16} /> زوّد منتجات
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
