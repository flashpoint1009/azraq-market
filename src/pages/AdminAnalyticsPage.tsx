import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download } from 'lucide-react';
import { Button, Card, ErrorState, Input, LoadingState, PageHeader } from '../components/ui';
import { formatCurrency, statusLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Order, OrderItem, OrderStatus, Profile } from '../types/database';

const chartColors = ['#2b5b74', '#f97316', '#16a34a', '#7c3aed', '#dc2626', '#0891b2'];

function dayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function AdminAnalyticsPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, loading, error } = useSupabaseQuery(async () => {
    const [ordersResult, itemsResult, customersResult] = await Promise.all([
      supabase.from('orders').select('*').gte('created_at', `${from}T00:00:00`).lte('created_at', `${to}T23:59:59`),
      supabase.from('order_items').select('*'),
      supabase.from('profiles').select('*').eq('role', 'customer').gte('created_at', `${from}T00:00:00`).lte('created_at', `${to}T23:59:59`),
    ]);
    if (ordersResult.error) throw ordersResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (customersResult.error) throw customersResult.error;
    return {
      orders: (ordersResult.data || []) as Order[],
      items: (itemsResult.data || []) as OrderItem[],
      customers: (customersResult.data || []) as Profile[],
    };
  }, [from, to]);

  const analytics = useMemo(() => {
    const orders = data?.orders || [];
    const items = data?.items || [];
    const revenueByDay = new Map<string, { date: string; revenue: number; average: number; orders: number }>();
    orders.forEach((order) => {
      const key = dayKey(order.created_at);
      const current = revenueByDay.get(key) || { date: key, revenue: 0, average: 0, orders: 0 };
      current.revenue += Number(order.total_amount || 0);
      current.orders += 1;
      current.average = current.orders ? current.revenue / current.orders : 0;
      revenueByDay.set(key, current);
    });

    const orderIds = new Set(orders.map((order) => order.id));
    const topProducts = new Map<string, { name: string; quantity: number; revenue: number }>();
    items.filter((item) => orderIds.has(item.order_id)).forEach((item) => {
      const key = item.product_name_snapshot;
      const current = topProducts.get(key) || { name: key, quantity: 0, revenue: 0 };
      current.quantity += Number(item.quantity || 0);
      current.revenue += Number(item.line_total || 0);
      topProducts.set(key, current);
    });

    const statusMap = new Map<OrderStatus, { name: string; value: number }>();
    orders.forEach((order) => {
      const current = statusMap.get(order.status) || { name: statusLabels[order.status], value: 0 };
      current.value += 1;
      statusMap.set(order.status, current);
    });

    const customersByWeek = new Map<string, { date: string; customers: number }>();
    (data?.customers || []).forEach((profile) => {
      const key = dayKey(profile.created_at);
      const current = customersByWeek.get(key) || { date: key, customers: 0 };
      current.customers += 1;
      customersByWeek.set(key, current);
    });

    return {
      revenue: [...revenueByDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
      topProducts: [...topProducts.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
      statuses: [...statusMap.values()],
      customers: [...customersByWeek.values()].sort((a, b) => a.date.localeCompare(b.date)),
      totalRevenue: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      averageOrder: orders.length ? orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) / orders.length : 0,
    };
  }, [data]);

  const exportCsv = () => {
    const rows = [['date', 'revenue', 'orders', 'average'], ...analytics.revenue.map((row) => [row.date, row.revenue, row.orders, row.average])];
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `market-analytics-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pb-24">
      <PageHeader title="التحليلات والتقارير" subtitle="مؤشرات البيع والعملاء حسب الفترة." action={<Button type="button" onClick={exportCsv}><Download size={15} /> تصدير</Button>} />
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <p className="text-2xs font-bold text-slate-500">إجمالي الإيراد</p>
              <p className="mt-1 font-display text-base font-extrabold">{formatCurrency(analytics.totalRevenue)}</p>
            </Card>
            <Card>
              <p className="text-2xs font-bold text-slate-500">متوسط الطلب</p>
              <p className="mt-1 font-display text-base font-extrabold">{formatCurrency(analytics.averageOrder)}</p>
            </Card>
            <Card>
              <p className="text-2xs font-bold text-slate-500">عدد الطلبات</p>
              <p className="mt-1 font-display text-base font-extrabold">{data?.orders.length || 0}</p>
            </Card>
          </div>
          <Card className="h-56">
            <ResponsiveContainer>
              <LineChart data={analytics.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#2b5b74" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="average" stroke="#f97316" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <div className="grid gap-3 xl:grid-cols-2">
            <Card className="h-56">
              <ResponsiveContainer>
                <BarChart data={analytics.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#2b5b74" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={analytics.statuses} dataKey="value" nameKey="name">
                    {analytics.statuses.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card className="h-56">
            <ResponsiveContainer>
              <LineChart data={analytics.customers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Line type="monotone" dataKey="customers" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}
