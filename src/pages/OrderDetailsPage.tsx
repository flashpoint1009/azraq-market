import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Printer, RotateCcw } from 'lucide-react';
import { MapPreview } from '../components/MapPreview';
import { OrderEditor } from '../components/OrderEditor';
import { StatusTimeline } from '../components/StatusTimeline';
import { Button, Card, ErrorState, LoadingState, PageHeader, SecondaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, formatDate, statusLabels, statusTone, unitLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Order, Product } from '../types/database';

export function OrderDetailsPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const { fillFromOrder } = useCart();
  const navigate = useNavigate();
  const { data: order, loading, error, reload } = useSupabaseQuery(async () => {
    if (!id) throw new Error('الطلب مش موجود');
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles(full_name,phone,address,latitude,longitude), order_items(*), order_status_history(*, profiles(full_name,role))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Order;
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !order) return <ErrorState message={error || 'الطلب مش موجود'} />;

  const repeat = async () => {
    const ids = order.order_items?.map((item) => item.product_id).filter(Boolean) as string[];
    const { data } = await supabase.from('products').select('*').in('id', ids);
    const products = (data || []) as Product[];
    fillFromOrder(
      (order.order_items || []).flatMap((item) => {
        const product = products.find((entry) => entry.id === item.product_id);
        return product ? [{ product, quantity: item.quantity }] : [];
      }),
    );
    toast.success('جهزنا طلبك القديم في السلة');
    navigate('/cart');
  };

  // ─── Customer view (read-only) ────────────────────────────────────────────
  if (role === 'customer') {
    return (
      <div className="space-y-4 pb-4">
        <PageHeader
          title={`طلب رقم #${order.id.slice(0, 8)}`}
          subtitle={formatDate(order.created_at)}
        />
        <Card className="bg-white">
          <h2 className="mb-3 font-display text-xl font-extrabold text-ink">حالة الطلب</h2>
          <div className={`rounded-[20px] border p-4 ${statusTone[order.status]}`}>
            <p className="text-xs font-bold opacity-70">الحالة الحالية</p>
            <p className="mt-1 font-display text-2xl font-extrabold">{statusLabels[order.status]}</p>
            <p className="mt-2 text-xs font-bold opacity-60">آخر تحديث: {formatDate(order.updated_at || order.created_at)}</p>
          </div>
        </Card>
        <Button onClick={repeat} className="w-full"><RotateCcw size={17} /> كرر الطلب</Button>
      </div>
    );
  }

  // ─── Admin / Warehouse / Delivery view ───────────────────────────────────
  const canEdit = role === 'admin' || role === 'warehouse';

  return (
    <div>
      <PageHeader
        title={`طلب رقم #${order.id.slice(0, 8)}`}
        subtitle={`${statusLabels[order.status]} - ${formatDate(order.created_at)}`}
        action={<SecondaryButton onClick={() => window.print()}><Printer size={17} /> اطبع</SecondaryButton>}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Left column */}
        <div className="space-y-5">

          {/* Status timeline */}
          <Card className="bg-white">
            <h2 className="mb-4 font-display text-2xl font-extrabold text-ink">تابع طلبك</h2>
            <StatusTimeline status={order.status} history={order.order_status_history || []} />
          </Card>

          {/* Order items table - scrollable on mobile */}
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">تفاصيل الفاتورة</h2>

            {/* Mobile cards view */}
            <div className="grid gap-2 sm:hidden">
              {order.order_items?.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                  <p className="font-bold text-slate-800">{item.product_name_snapshot}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>الوحدة: {unitLabels[item.unit_type_snapshot]}</span>
                    <span>الكمية: {item.quantity}</span>
                    <span>السعر: {formatCurrency(item.unit_price_snapshot)}</span>
                  </div>
                  <p className="mt-2 font-extrabold text-azraq-800">{formatCurrency(item.line_total)}</p>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[500px] text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-100 text-right">
                    <th className="py-3">المنتج</th>
                    <th>الوحدة</th>
                    <th>الكمية</th>
                    <th>سعر الوحدة</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="py-4 font-bold">{item.product_name_snapshot}</td>
                      <td>{unitLabels[item.unit_type_snapshot]}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price_snapshot)}</td>
                      <td className="font-extrabold text-azraq-800">{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-between rounded-2xl bg-azraq-50 p-4 font-display text-xl font-extrabold text-azraq-900">
              <span>الإجمالي</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>

            {/* ─── Order Editor: only for admin and warehouse ─── */}
            {canEdit && (
              <>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <h3 className="font-display text-lg font-extrabold text-slate-700">تعديل الطلب</h3>
                  <p className="mt-1 text-xs text-slate-400">يمكنك تعديل الكميات والأسعار وحالة الطلب.</p>
                </div>
                <OrderEditor order={order} onSaved={reload} />
              </>
            )}
          </Card>
        </div>

        {/* Right column: customer info + map */}
        <div className="space-y-5">
          <Card>
            <h2 className="font-display text-2xl font-extrabold">بيانات العميل</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span className="font-bold text-slate-400">الاسم</span>
                <span className="font-bold text-slate-800">{order.profiles?.full_name || 'مش محدد'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-400">الموبايل</span>
                {order.profiles?.phone
                  ? <a className="font-bold text-azraq-700 underline" href={`tel:${order.profiles.phone}`}>{order.profiles.phone}</a>
                  : <span className="font-bold text-slate-800">مش محدد</span>
                }
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-bold text-slate-400 shrink-0">العنوان</span>
                <span className="font-bold text-slate-800 text-left">{order.address || order.profiles?.address || 'مش محدد'}</span>
              </div>
              {order.notes && (
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
                  <p className="text-xs font-bold text-amber-600 mb-1">ملاحظات العميل</p>
                  <p className="text-sm text-amber-900">{order.notes}</p>
                </div>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">موقع العميل</h2>
            <MapPreview latitude={order.latitude ?? order.profiles?.latitude ?? null} longitude={order.longitude ?? order.profiles?.longitude ?? null} />
          </Card>
        </div>
      </div>
    </div>
  );
}
