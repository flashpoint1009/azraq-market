import { Card, EmptyState, ErrorState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, statusLabels, unitLabels } from '../lib/labels';
import { useCustomerOrders } from '../api/hooks';

function SkeletonOrderCard() {
  return (
    <div className="animate-pulse rounded-[1.75rem] border border-white/80 bg-white/90 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full bg-slate-100" />
          <div className="h-5 w-32 rounded-full bg-slate-100" />
        </div>
        <div className="h-5 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="mt-3 h-3 w-36 rounded-full bg-slate-100" />
      <div className="mt-3 h-16 w-full rounded-2xl bg-slate-100" />
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

export function OrdersPage() {
  const { profile } = useAuth();
  const { data: orders, isLoading, error } = useCustomerOrders(profile?.id);

  return (
    <div className="pb-24">
      <div className="mb-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">طلباتي</h1>
        <p className="text-xs font-bold text-slate-400">تابع حالة كل طلب بسرعة</p>
      </div>

      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => <SkeletonOrderCard key={index} />)}
        </div>
      )}
      {error && <ErrorState message={error instanceof Error ? error.message : 'تعذر تحميل الطلبات'} />}
      {!isLoading && !error && orders?.length === 0 && (
        <EmptyState title="لسه مفيش طلبات" body="أول طلب هتبعته هيظهر هنا." />
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders?.map((order) => {
          const items = order.order_items || [];
          return (
            <Card key={order.id} className="overflow-hidden p-0">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div>
                  <p className="text-[11px] font-bold text-slate-400">طلب #{order.id.slice(0, 8)}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                    {new Date(order.created_at).toLocaleString('ar-EG')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${statusColors[order.status] || 'bg-slate-100 text-slate-500'}`}>
                    {statusLabels[order.status]}
                  </span>
                  <strong className="text-sm font-extrabold text-azraq-800">{formatCurrency(order.total_amount)}</strong>
                </div>
              </div>

              {/* Invoice items — always visible */}
              <div className="px-4 py-3">
                <p className="mb-2 text-[11px] font-extrabold text-slate-400">
                  الفاتورة ({items.length} {items.length === 1 ? 'صنف' : 'أصناف'})
                </p>
                <div className="grid gap-1.5">
                  {items.map((item, i) => (
                    <div key={item.id || i} className="flex items-center justify-between gap-2 rounded-xl bg-[#F4FAFF] px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-700">{item.product_name_snapshot}</p>
                        <p className="text-[10px] text-slate-400">
                          {item.quantity} {unitLabels[item.unit_type_snapshot]} × {formatCurrency(item.unit_price_snapshot)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-extrabold text-azraq-800">{formatCurrency(item.line_total)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between rounded-xl bg-azraq-700 px-3 py-2 text-xs font-extrabold text-white">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
