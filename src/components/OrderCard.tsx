import { Link } from 'react-router-dom';
import { formatCurrency, formatDate, statusLabels, statusTone } from '../lib/labels';
import type { Order } from '../types/database';
import { Card } from './ui';

export function OrderCard({ order, to }: { order: Order; to?: string }) {
  return (
    <Link to={to || `/orders/${order.id}`}>
      <Card className="transition hover:-translate-y-0.5 hover:border-azraq-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-extrabold text-ink">طلب #{order.id.slice(0, 8)}</p>
            <p className="mt-1 text-xs text-slate-500">{formatDate(order.created_at)}</p>
            {order.profiles?.full_name && <p className="mt-2 text-sm font-semibold text-slate-600">{order.profiles.full_name}</p>}
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone[order.status]}`}>{statusLabels[order.status]}</span>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">{order.order_items?.length ?? 0} صنف</span>
          <strong className="text-azraq-800">{formatCurrency(order.total_amount)}</strong>
        </div>
      </Card>
    </Link>
  );
}
