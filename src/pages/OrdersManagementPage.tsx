import { Link } from 'react-router-dom';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { formatCurrency, statusLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Order } from '../types/database';

export function OrdersManagementPage() {
  const { data, loading, error } = useSupabaseQuery(async () => {
    const result = await supabase
      .from('orders')
      .select('*, profiles(full_name,phone), order_items(*)')
      .order('created_at', { ascending: false });
    if (result.error) {
      const fallbackResult = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      if (fallbackResult.error) throw fallbackResult.error;
      return fallbackResult.data as Order[];
    }
    return result.data as Order[];
  }, []);

  return (
    <div>
      <PageHeader title="الطلبات" subtitle="قائمة منظمة للطلب والعميل وعدد المنتجات والقيمة والحالة." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && data?.length === 0 && <EmptyState title="لا توجد طلبات" body="أي طلب جديد من العملاء سيظهر هنا." />}
      {!!data?.length && (
        <Card className="overflow-hidden p-0">
          <div className="hidden grid-cols-[120px_1fr_110px_130px_140px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-500 md:grid">
            <span>رقم الطلب</span>
            <span>اسم العميل</span>
            <span>عدد المنتجات</span>
            <span>القيمة</span>
            <span>الحالة</span>
          </div>
          <div className="divide-y divide-slate-100">
            {data.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block px-4 py-3 transition hover:bg-azraq-50/60 md:grid md:grid-cols-[120px_1fr_110px_130px_140px] md:items-center md:gap-3"
              >
                <div className="grid gap-2 md:contents">
                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="font-display text-sm font-extrabold text-ink">#{order.id.slice(0, 8)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 md:hidden">{statusLabels[order.status]}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{order.profiles?.full_name || order.profiles?.phone || 'عميل'}</span>
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500 md:contents md:text-sm">
                    <span>{order.order_items?.length || 0} منتج</span>
                    <span className="font-display text-base font-extrabold text-azraq-800 md:text-sm">{formatCurrency(order.total_amount)}</span>
                  </div>
                  <span className="hidden w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 md:inline-flex">
                    {statusLabels[order.status]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
