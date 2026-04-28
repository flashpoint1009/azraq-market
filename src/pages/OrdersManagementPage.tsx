import { OrderCard } from '../components/OrderCard';
import { OrderEditor } from '../components/OrderEditor';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Order } from '../types/database';

export function OrdersManagementPage() {
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles(full_name,phone,address,latitude,longitude), order_items(*)')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('ADMIN_ORDERS_FETCH_FAILED', error);
      throw error;
    }
    return data as Order[];
  }, []);

  return (
    <div>
      <PageHeader title="الطلبات" subtitle="شوف كل الطلبات والفواتير وعدّل الحالة والكمية والسعر بسهولة." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && data?.length === 0 && <EmptyState title="لسه مفيش طلبات" body="أي طلب جديد من العملاء هيظهر هنا." />}
      <div className="grid gap-4 xl:grid-cols-2">
        {data?.map((order) => (
          <Card key={order.id}>
            <OrderCard order={order} to={`/orders/${order.id}`} />
            <div className="mt-3 grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600 sm:grid-cols-3">
              <span>الإجمالي: {formatCurrency(order.total_amount)}</span>
              <span>المدفوع: {formatCurrency(order.paid_amount || 0)}</span>
              <span>مديونية: {formatCurrency(order.debt_amount || 0)}</span>
            </div>
            <OrderEditor order={order} onSaved={reload} />
          </Card>
        ))}
      </div>
    </div>
  );
}
