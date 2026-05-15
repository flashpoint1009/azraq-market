import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, ErrorState, Input, LoadingState, PageHeader, Textarea } from '../components/ui';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { AppAnnouncement, CustomerDebt, Order, OrderItem, Product } from '../types/database';

const ANNOUNCEMENT_ID = '00000000-0000-0000-0000-000000000001';

function AdminAnnouncementCard() {
  const [form, setForm] = useState({ title: '', body: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const result = await supabase.from('app_announcements').select('*').eq('id', ANNOUNCEMENT_ID).maybeSingle();
    if (result.error) throw result.error;
    return result.data as AppAnnouncement | null;
  }, []);

  useEffect(() => {
    if (!data) return;
    setForm({ title: data.title || '', body: data.body || '', is_active: data.is_active });
  }, [data]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('اكتب عنوان ونص الإعلان قبل الحفظ');
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase.from('app_announcements').upsert({
      id: ANNOUNCEMENT_ID,
      title: form.title.trim(),
      body: form.body.trim(),
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (saveError) {
      toast.error('شغل migration الخاص بإعلانات العملاء الأول');
      return;
    }
    toast.success('الإعلان اتحفظ وهيظهر للعملاء');
    reload();
  };

  return (
    <Card className="p-3">
      <h2 className="mb-1 font-display text-base font-extrabold">إعلان العملاء</h2>
      <p className="mb-3 text-xs text-slate-500">رسالة تظهر للعميل أول ما يفتح التطبيق.</p>
      {loading && <LoadingState label="بنحمّل الإعلان..." />}
      {error && <ErrorState message="جدول الإعلانات لسه مش متفعل." />}
      {!loading && (
        <form onSubmit={submit} className="grid gap-2">
          <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="عنوان الإعلان" />
          <Textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="نص الإعلان..." rows={3} />
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            نشط ويظهر للعملاء
          </label>
          <Button disabled={saving} className="py-2 text-xs">{saving ? 'جاري الحفظ...' : 'حفظ الإعلان'}</Button>
        </form>
      )}
    </Card>
  );
}

export function AdminDashboard() {
  const { data, loading, error } = useSupabaseQuery(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const month = new Date();
    month.setDate(1);
    month.setHours(0, 0, 0, 0);

    const ordersResult = await supabase.from('orders').select('*, profiles(full_name,phone)').gte('created_at', month.toISOString());
    if (ordersResult.error) throw ordersResult.error;

    const debtsResult = await supabase.from('customer_debts').select('*, profiles(full_name,phone)').order('created_at', { ascending: false }).limit(8);
    const productsResult = await supabase.from('products').select('*').order('stock_quantity', { ascending: true });
    const itemsResult = await supabase.from('order_items').select('*').limit(500);

    const orders = (ordersResult.data || []) as Order[];
    const products = (productsResult.data || []) as Product[];
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
      stockUnits: products.reduce((sum, product) => sum + Number(product.stock_quantity || 0), 0),
      stockCostValue: products.reduce((sum, product) => sum + Number(product.stock_quantity || 0) * Number(product.cost_price || 0), 0),
      stockSaleValue: products.reduce((sum, product) => sum + Number(product.stock_quantity || 0) * Number(product.price || 0), 0),
      debts: (debtsResult.data || []) as CustomerDebt[],
      unavailable: products.filter((product) => !product.is_available || (product.stock_quantity ?? 0) <= 0).slice(0, 6),
      topProducts: [...itemCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, []);

  const orderCards = [
    { label: 'طلبات النهارده', value: data?.total ?? 0, color: 'text-azraq-800' },
    { label: 'طلبات جديدة', value: data?.new ?? 0, color: 'text-blue-700' },
    { label: 'بنجّهزها', value: data?.preparing ?? 0, color: 'text-amber-700' },
    { label: 'خرجت للتوصيل', value: data?.delivery ?? 0, color: 'text-purple-700' },
    { label: 'اتسلمت', value: data?.delivered ?? 0, color: 'text-emerald-700' },
    { label: 'بيع النهارده', value: formatCurrency(data?.sales ?? 0), color: 'text-azraq-800' },
    { label: 'بيع الشهر', value: formatCurrency(data?.monthSales ?? 0), color: 'text-azraq-800' },
    { label: 'مديونيات مفتوحة', value: formatCurrency(data?.debts.reduce((sum, debt) => sum + debt.remaining_amount, 0) ?? 0), color: 'text-rose-700' },
  ];

  const stockCards = [
    { label: 'وحدات المخزون', value: data?.stockUnits ?? 0 },
    { label: 'قيمة المخزون بالتكلفة', value: formatCurrency(data?.stockCostValue ?? 0) },
    { label: 'قيمة المخزون بالبيع', value: formatCurrency(data?.stockSaleValue ?? 0) },
  ];

  return (
    <div className="pb-24">
      <PageHeader title="لوحة المشرف" subtitle="نظرة سريعة على الطلبات والبيع وحركة الشغل." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <>
          {/* Stat cards — compact on mobile */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {orderCards.map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl border border-white/80 bg-white p-3 shadow-sm">
                <p className="text-xs font-bold text-slate-500 leading-4">{label}</p>
                <p className={`mt-1 break-words font-display text-xl font-extrabold sm:text-2xl ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Stock cards */}
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {stockCards.map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-white/80 bg-white p-3 shadow-sm">
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-1 break-words font-display text-xl font-extrabold text-ink sm:text-2xl">{value}</p>
              </div>
            ))}
          </div>

          {/* Bottom section */}
          <div className="mt-3 grid gap-3 xl:grid-cols-3">
            <AdminAnnouncementCard />

            <Card className="p-3">
              <h2 className="mb-2 font-display text-base font-extrabold">المديونيات</h2>
              <div className="grid gap-1.5">
                {data?.debts.length ? data.debts.map((debt) => (
                  <div key={debt.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
                    <p className="font-bold text-slate-700">{debt.profiles?.full_name || 'عميل'}</p>
                    <p className="text-rose-600 font-bold">الباقي: {formatCurrency(debt.remaining_amount)}</p>
                  </div>
                )) : <p className="text-xs text-slate-500">مفيش مديونيات مفتوحة.</p>}
              </div>
            </Card>

            <Card className="p-3">
              <h2 className="mb-2 font-display text-base font-extrabold">الأكثر طلبًا</h2>
              <div className="grid gap-1.5">
                {data?.topProducts.length ? data.topProducts.map(([name, qty]) => (
                  <div key={name} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold">
                    <span className="truncate">{name}</span>
                    <span className="shrink-0 font-extrabold text-azraq-700">{qty}</span>
                  </div>
                )) : <p className="text-xs text-slate-500">لسه مفيش بيانات كفاية.</p>}
              </div>
            </Card>

            <Card className="p-3">
              <h2 className="mb-2 font-display text-base font-extrabold">غير متاح</h2>
              <div className="grid gap-1.5">
                {data?.unavailable.length ? data.unavailable.map((product) => (
                  <div key={product.id} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                    {product.name} — {product.stock_quantity ?? 0} وحدة
                  </div>
                )) : <p className="text-xs text-slate-500">كل المنتجات متاحة.</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
