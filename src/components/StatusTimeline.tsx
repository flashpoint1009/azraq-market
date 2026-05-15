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
      <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-rose-700">
        <div className="flex items-center gap-2">
          <ShieldX size={18} />
          <p className="font-display text-sm font-extrabold">الطلب {statusLabels[status]}</p>
        </div>
        <p className="mt-1 text-xs text-rose-500">الطلب وقف ومش هيخرج للتوصيل.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: compact vertical list */}
      <div className="grid gap-2 sm:hidden">
        {statusFlow.map((item, index) => {
          const active = index <= activeIndex;
          const Icon = timelineIcons[item] || Circle;
          const historyItem = history.find((entry) => entry.status === item);
          const isCurrent = index === activeIndex;
          return (
            <div
              key={item}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${active ? 'bg-azraq-50 border border-azraq-100' : 'bg-slate-50 border border-transparent'}`}
            >
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${active ? 'bg-azraq-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <Icon size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-extrabold ${active ? 'text-azraq-900' : 'text-slate-500'}`}>{statusLabels[item]}</p>
                {historyItem ? (
                  <p className="text-2xs text-slate-500">{formatDate(historyItem.created_at)}</p>
                ) : active ? (
                  <p className="text-2xs text-azraq-400">الحالة الحالية</p>
                ) : null}
              </div>
              {isCurrent && (
                <span className="shrink-0 rounded-full bg-azraq-700 px-2 py-0.5 text-2xs font-extrabold text-white">الآن</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: horizontal grid */}
      <div className="hidden gap-2 sm:grid sm:grid-cols-5">
        {statusFlow.map((item, index) => {
          const active = index <= activeIndex;
          const Icon = timelineIcons[item] || Circle;
          const historyItem = history.find((entry) => entry.status === item);
          return (
            <div key={item} className={`relative overflow-hidden rounded-2xl border p-3 transition ${active ? 'border-azraq-100 bg-gradient-to-br from-azraq-50 to-white text-azraq-900 shadow-sm' : 'border-slate-100 bg-white text-slate-500'}`}>
              <div className={`grid h-9 w-9 place-items-center rounded-xl ${active ? 'bg-azraq-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Icon size={17} />
              </div>
              <p className="mt-2 text-xs font-extrabold">{statusLabels[item]}</p>
              <p className="mt-0.5 text-2xs leading-4 text-slate-500">{historyItem ? formatDate(historyItem.created_at) : active ? 'اتحدث' : 'مستني'}</p>
              {active && <div className="absolute -left-6 -top-6 h-14 w-14 rounded-full bg-azraq-200/30" />}
            </div>
          );
        })}
      </div>
    </>
  );
}
