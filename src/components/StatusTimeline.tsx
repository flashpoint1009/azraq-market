import { CheckCircle2, Circle, PackageCheck, PackageOpen, ShieldX, Truck } from 'lucide-react';
import { formatDate, statusFlow, statusLabels } from '../lib/labels';
import type { OrderStatus, OrderStatusHistory } from '../types/database';

const timelineIcons: Partial<Record<OrderStatus, typeof Circle>> = {
  new: Circle,
  preparing: PackageOpen,
  ready_for_delivery: PackageCheck,
  with_delivery: Truck,
  delivered: CheckCircle2,
};

export function StatusTimeline({ status, history = [] }: { status: OrderStatus; history?: OrderStatusHistory[] }) {
  const activeIndex = statusFlow.indexOf(status);
  const terminal = status === 'cancelled' || status === 'rejected';

  if (terminal) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5 text-rose-700">
        <ShieldX size={24} />
        <p className="mt-3 font-display text-xl font-extrabold">حالة الطلب: {statusLabels[status]}</p>
        <p className="mt-1 text-sm text-rose-500">الطلب وقف ومش هيخرج للتوصيل.</p>
      </div>
    );
  }

  return (
    <div className="relative grid gap-3 sm:grid-cols-5">
      {statusFlow.map((item, index) => {
        const active = index <= activeIndex;
        const Icon = timelineIcons[item] || Circle;
        const historyItem = history.find((entry) => entry.status === item);
        return (
          <div key={item} className={`relative overflow-hidden rounded-2xl border p-4 transition ${active ? 'border-azraq-100 bg-gradient-to-br from-azraq-50 to-white text-azraq-900 shadow-sm' : 'border-slate-100 bg-white text-slate-400'}`}>
            <div className={`grid h-11 w-11 place-items-center rounded-2xl ${active ? 'bg-azraq-700 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Icon size={20} />
            </div>
            <p className="mt-3 text-sm font-extrabold">{statusLabels[item]}</p>
            <p className="mt-1 min-h-8 text-[11px] leading-4 text-slate-400">{historyItem ? formatDate(historyItem.created_at) : active ? 'اتحدث' : 'مستني دوره'}</p>
            {active && <div className="absolute -left-8 -top-8 h-20 w-20 rounded-full bg-azraq-200/30" />}
          </div>
        );
      })}
    </div>
  );
}
