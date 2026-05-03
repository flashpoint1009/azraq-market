import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, ErrorState, Input, LoadingState, PageHeader, Textarea } from '../components/ui';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { AppAnnouncement, CustomerDebt, Order, OrderItem, Product } from '../types/database';
import { APP_VERSION, checkForUpdate } from '../lib/version';

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
    const { error } = await supabase.from('app_announcements').upsert({
      id: ANNOUNCEMENT_ID,
      title: form.title.trim(),
      body: form.body.trim(),
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      console.error('APP_ANNOUNCEMENT_SAVE_FAILED', error);
      toast.error('مش قادرين نحفظ الإعلان، شغل migration الأول');
      return;
    }
    toast.success('الإعلان اتحفظ وهيظهر للعملاء');
    reload();
  };

  return (
    <Card>
      <h2 className="font-display text-xl font-extrabold">إعلان العملاء</h2>
      <p className="mt-1 text-sm text-slate-500">رسالة عامة تظهر للعميل أول ما يفتح التطبيق.</p>
      {loading && <LoadingState label="بنحمّل الإعلان..." />}
      {error && <ErrorState message="جدول الإعلانات لسه مش متفعل. شغل migration الخاص بالعروض والإعلانات." />}
      {!loading && (
        <form onSubmit={submit} className="mt-3 grid gap-3">
          <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="مثال: عيد سعيد" />
          <Textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="اكتب نص الإعلان هنا..." rows={4} />
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            الإعلان نشط ويظهر للعملاء
          </label>
          <Button disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ الإعلان'}</Button>
        </form>
      )}
    </Card>
  );
}

export function AdminDashboard() {
  const [updateInfo, setUpdateInfo] = useState<{ version?: string; notes?: string; url?: string } | null>(null);
  useEffect(() => {
    checkForUpdate().then(setUpdateInfo).catch(() => setUpdateInfo(null));
  }, []);
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

    const productsResult = await supabase.from('products').select('*').order('stock_quantity', { ascending: true });
    if (productsResult.error) console.error('ADMIN_DASHBOARD_PRODUCTS_FETCH_FAILED', productsResult.error);

    const itemsResult = await supabase.from('order_items').select('*').limit(500);
    if (itemsResult.error) console.error('ADMIN_DASHBOARD_ITEMS_FETCH_FAILED', itemsResult.error);

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
    ['طلبات النهارده', data?.total ?? 0],
    ['طلبات جديدة', data?.new ?? 0],
    ['بنجّهزها', data?.preparing ?? 0],
    ['خرجت للتوصيل', data?.delivery ?? 0],
    ['اتسلمت', data?.delivered ?? 0],
    ['بيع النهارده', formatCurrency(data?.sales ?? 0)],
    ['بيع الشهر', formatCurrency(data?.monthSales ?? 0)],
    ['مديونيات مفتوحة', formatCurrency(data?.debts.reduce((sum, debt) => sum + debt.remaining_amount, 0) ?? 0)],
  ];

  const stockCards = [
    ['عدد وحدات المخزون', data?.stockUnits ?? 0],
    ['قيمة المخزون بالتكلفة', formatCurrency(data?.stockCostValue ?? 0)],
    ['قيمة المخزون بسعر البيع', formatCurrency(data?.stockSaleValue ?? 0)],
  ];

  return (
    <div>
      <PageHeader title="لوحة المشرف" subtitle="نظرة سريعة على الطلبات والبيع وحركة الشغل." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <>
          {updateInfo && (
            <Card className="mb-4 border-amber-100 bg-amber-50">
              <p className="text-sm font-extrabold text-amber-800">يوجد إصدار جديد {updateInfo.version}</p>
              {updateInfo.notes && <p className="mt-1 text-sm text-amber-700">{updateInfo.notes}</p>}
            </Card>
          )}
          <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            {orderCards.map(([label, value]) => (
              <Card key={label as string} className="min-h-[104px] p-4">
                <p className="text-xs font-bold text-slate-400 sm:text-sm">{label}</p>
                <p className="mt-2 break-words font-display text-2xl font-extrabold text-azraq-800 sm:text-3xl">{value}</p>
              </Card>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {stockCards.map(([label, value]) => (
              <Card key={label as string} className="p-4">
                <p className="text-xs font-bold text-slate-400 sm:text-sm">{label}</p>
                <p className="mt-2 break-words font-display text-2xl font-extrabold text-ink sm:text-3xl">{value}</p>
              </Card>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <AdminAnnouncementCard />
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
          <p className="mt-6 text-center text-xs font-bold text-slate-400">v{APP_VERSION}</p>
        </>
      )}
    </div>
  );
}
