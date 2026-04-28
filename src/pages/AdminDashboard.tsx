import { Card, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { CustomerDebt, Order, OrderItem, Product } from '../types/database';

export function AdminDashboard() {
  const { data, loading, error } = useSupabaseQuery(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const month = new Date();
    month.setDate(1);
    month.setHours(0, 0, 0, 0);

    const ordersResult = await supabase.from('orders').select('*, profiles(full_name,phone)').gte('created_at', month.toISOString());
    if (ordersResult.error) {
      console.error('ADMIN_DASHBOARD_ORDERS_FETCH_FAILED', ordersResult.error);
      throw ordersResult.error;
    }

    const debtsResult = await supabase.from('customer_debts').select('*, profiles(full_name,phone)').order('created_at', { ascending: false }).limit(8);
    if (debtsResult.error) console.error('ADMIN_DASHBOARD_DEBTS_FETCH_FAILED', debtsResult.error);

    const productsResult = await supabase.from('products').select('*').order('stock_quantity', { ascending: true }).limit(8);
    if (productsResult.error) console.error('ADMIN_DASHBOARD_PRODUCTS_FETCH_FAILED', productsResult.error);

    const itemsResult = await supabase.from('order_items').select('*').limit(500);
    if (itemsResult.error) console.error('ADMIN_DASHBOARD_ITEMS_FETCH_FAILED', itemsResult.error);

    const orders = (ordersResult.data || []) as Order[];
    const todayOrders = orders.filter((order) => new Date(order.created_at) >= today);
    const monthOrders = orders.filter((order) => new Date(order.created_at) >= month);
    const itemCount = new Map<string, number>();
    ((itemsResult.data || []) as OrderItem[]).forEach((item) => itemCount.set(item.product_name_snapshot, (itemCount.get(item.product_name_snapshot) || 0) + item.quantity));

    return {
      total: todayOrders.length,
      new: todayOrders.filter((order) => order.status === 'new').length,
      preparing: todayOrders.filter((order) => order.status === 'preparing').length,
      delivery: todayOrders.filter((order) => order.status === 'with_delivery').length,
      delivered: todayOrders.filter((order) => order.status === 'delivered').length,
      sales: todayOrders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      monthSales: monthOrders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      debts: (debtsResult.data || []) as CustomerDebt[],
      unavailable: ((productsResult.data || []) as Product[]).filter((product) => !product.is_available || (product.stock_quantity ?? 0) <= 0),
      topProducts: [...itemCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, []);

  const cards = [
    ['طلبات النهارده', data?.total ?? 0],
    ['طلبات جديدة', data?.new ?? 0],
    ['بنجهزها', data?.preparing ?? 0],
    ['خرجت للتوصيل', data?.delivery ?? 0],
    ['اتسلمت', data?.delivered ?? 0],
    ['بيع النهارده', formatCurrency(data?.sales ?? 0)],
    ['بيع الشهر', formatCurrency(data?.monthSales ?? 0)],
    ['مديونيات مفتوحة', formatCurrency(data?.debts.reduce((sum, debt) => sum + debt.remaining_amount, 0) ?? 0)],
  ];

  return (
    <div>
      <PageHeader title="لوحة المشرف" subtitle="نظرة سريعة على الطلبات والبيع وحركة الشغل." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-sm font-bold text-slate-400">{label}</p>
            <p className="mt-3 font-display text-4xl font-extrabold text-azraq-800">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card>
          <h2 className="font-display text-xl font-extrabold">المديونيات</h2>
          <div className="mt-3 space-y-2">
            {data?.debts.length ? data.debts.map((debt) => (
              <div key={debt.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                <p className="font-bold">{debt.profiles?.full_name || 'عميل'}</p>
                <p className="text-rose-600">الباقي: {formatCurrency(debt.remaining_amount)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">مفيش مديونيات مفتوحة.</p>}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-extrabold">الأكثر طلبًا</h2>
          <div className="mt-3 space-y-2">
            {data?.topProducts.length ? data.topProducts.map(([name, qty]) => (
              <div key={name} className="flex justify-between rounded-2xl bg-slate-50 p-3 text-sm font-bold">
                <span>{name}</span>
                <span>{qty}</span>
              </div>
            )) : <p className="text-sm text-slate-500">لسه مفيش بيانات كفاية.</p>}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-extrabold">غير متاح</h2>
          <div className="mt-3 space-y-2">
            {data?.unavailable.length ? data.unavailable.map((product) => (
              <div key={product.id} className="rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700">
                {product.name} - المخزون {product.stock_quantity ?? 0}
              </div>
            )) : <p className="text-sm text-slate-500">كل المنتجات متاحة.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
