import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { formatCurrency, formatDate, statusLabels, statusTone } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../api/keys';
import type { Order, OrderStatus } from '../types/database';

const allStatuses: OrderStatus[] = ['new', 'preparing', 'ready_for_delivery', 'with_delivery', 'delivered', 'cancelled', 'rejected'];

const dateRanges = [
  { label: 'الكل', value: 'all' },
  { label: 'النهارده', value: 'today' },
  { label: 'آخر 7 أيام', value: '7days' },
  { label: 'الشهر ده', value: 'month' },
] as const;
type DateRange = (typeof dateRanges)[number]['value'];

function exportCSV(orders: Order[]) {
  const header = ['رقم الطلب', 'العميل', 'الموبايل', 'الحالة', 'عدد المنتجات', 'الإجمالي', 'التاريخ'];
  const rows = orders.map((o) => [
    o.id.slice(0, 8),
    o.profiles?.full_name || '',
    o.profiles?.phone || '',
    statusLabels[o.status],
    String(o.order_items?.length || 0),
    String(o.total_amount),
    formatDate(o.created_at),
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function dateRangeFilter(order: Order, range: DateRange): boolean {
  const d = new Date(order.created_at);
  const now = new Date();
  if (range === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return d >= start;
  }
  if (range === '7days') {
    const start = new Date(now); start.setDate(now.getDate() - 7);
    return d >= start;
  }
  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return d >= start;
  }
  return true;
}

export function OrdersManagementPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: queryKeys.orders.management(),
    queryFn: async () => {
      const result = await supabase
        .from('orders')
        .select('*, profiles(full_name,phone), order_items(*)')
        .order('created_at', { ascending: false });
      if (result.error) {
        const fallback = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
        if (fallback.error) throw fallback.error;
        return fallback.data as unknown as Order[];
      }
      return result.data as unknown as Order[];
    },
  });
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'تعذر تحميل الطلبات') : null;

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (!dateRangeFilter(order, dateRange)) return false;
      if (q) {
        const name = (order.profiles?.full_name || '').toLowerCase();
        const phone = (order.profiles?.phone || '').toLowerCase();
        const id = order.id.toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !id.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, statusFilter, dateRange]);

  return (
    <div>
      <PageHeader
        title="الطلبات"
        subtitle={`${filtered.length} طلب${data ? ` من ${data.length}` : ''}`}
        action={
          <button
            onClick={() => filtered.length && exportCSV(filtered)}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-azraq-700 shadow-sm disabled:opacity-40"
            disabled={!filtered.length}
          >
            <Download size={16} /> تصدير CSV
          </button>
        }
      />

      {/* Search */}
      <div className="mb-3 relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم العميل أو الموبايل أو رقم الطلب..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-9 pl-9 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-azraq-400 focus:ring-2 focus:ring-azraq-100"
          dir="rtl"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Date range tabs */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {dateRanges.map((r) => (
          <button
            key={r.value}
            onClick={() => setDateRange(r.value)}
            className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-extrabold shadow-sm transition ${dateRange === r.value ? 'bg-azraq-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-extrabold shadow-sm transition ${statusFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
        >
          الكل
        </button>
        {allStatuses.map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(statusFilter === st ? 'all' : st)}
            className={`shrink-0 rounded-2xl border px-4 py-2 text-xs font-extrabold shadow-sm transition ${statusFilter === st ? statusTone[st] + ' ring-2 ring-offset-1' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-100'}`}
          >
            {statusLabels[st]}
          </button>
        ))}
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && filtered.length === 0 && (
        <EmptyState title="لا توجد طلبات" body={search || statusFilter !== 'all' ? 'جرب تغيير الفلتر أو البحث.' : 'أي طلب جديد من العملاء سيظهر هنا.'} />
      )}

      {filtered.length > 0 && (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="grid grid-cols-[120px_1fr_100px_120px_150px_130px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-500">
              <span>رقم الطلب</span>
              <span>اسم العميل</span>
              <span>المنتجات</span>
              <span>القيمة</span>
              <span>الحالة</span>
              <span>التاريخ</span>
            </div>
            <div className="divide-y divide-slate-50">
              {filtered.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="grid grid-cols-[120px_1fr_100px_120px_150px_130px] items-center gap-3 px-4 py-3 text-sm transition hover:bg-azraq-50/60"
                >
                  <span className="font-display font-extrabold text-ink">#{order.id.slice(0, 8)}</span>
                  <div>
                    <p className="font-bold text-slate-800">{order.profiles?.full_name || 'عميل'}</p>
                    {order.profiles?.phone && <p className="text-xs text-slate-400">{order.profiles.phone}</p>}
                  </div>
                  <span className="font-bold text-slate-600">{order.order_items?.length || 0} منتج</span>
                  <span className="font-display font-extrabold text-azraq-800">{formatCurrency(order.total_amount)}</span>
                  <span className={`w-fit rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone[order.status]}`}>{statusLabels[order.status]}</span>
                  <span className="text-xs text-slate-400">{formatDate(order.created_at)}</span>
                </Link>
              ))}
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="grid gap-2 md:hidden">
            {filtered.map((order) => (
              <Link key={order.id} to={`/orders/${order.id}`}>
                <Card className="p-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                    <span className="font-display text-sm font-extrabold text-ink">#{order.id.slice(0, 8)}</span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${statusTone[order.status]}`}>{statusLabels[order.status]}</span>
                  </div>
                  <div className="px-4 py-3 grid gap-1">
                    <p className="font-bold text-slate-800">{order.profiles?.full_name || 'عميل'}</p>
                    {order.profiles?.phone && <p className="text-xs text-slate-400">{order.profiles.phone}</p>}
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-slate-500">{order.order_items?.length || 0} منتجات</span>
                      <span className="font-display font-extrabold text-azraq-800">{formatCurrency(order.total_amount)}</span>
                    </div>
                    <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
