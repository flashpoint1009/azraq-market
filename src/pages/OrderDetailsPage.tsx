import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Printer, RotateCcw } from 'lucide-react';
import { MapPreview } from '../components/MapPreview';
import { OrderEditor } from '../components/OrderEditor';
import { StatusTimeline } from '../components/StatusTimeline';
import { Button, Card, ErrorState, LoadingState, SecondaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency, formatDate, statusLabels, unitLabels } from '../lib/labels';
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

  // ─── Customer view ─────────────────────────────────────────────────────────
  if (role === 'customer') {
    return (
      <div className="space-y-3 pb-4">
        <div>
          <p className="text-[11px] font-bold text-slate-400">طلب #{order.id.slice(0, 8)}</p>
          <h1 className="font-display text-xl font-extrabold text-ink">{statusLabels[order.status]}</h1>
          <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
        </div>

        {/* Status */}
        <Card className="p-3">
          <h2 className="mb-2 font-display text-sm font-extrabold text-ink">تابع طلبك</h2>
          <StatusTimeline status={order.status} history={order.order_status_history || []} />
        </Card>

        {/* Invoice */}
        <Card className="p-3">
          <h2 className="mb-2 font-display text-sm font-extrabold text-ink">فاتورة طلبك</h2>
          <div className="grid gap-1.5">
            {order.order_items?.map((item) => (
              <div key={item.id} className="rounded-xl bg-[#F4FAFF] px-3 py-2 text-xs">
                <p className="font-bold text-slate-800">{item.product_name_snapshot}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-slate-500">
                  <span>{unitLabels[item.unit_type_snapshot]}</span>
                  <span>الكمية: {item.quantity}</span>
                  <span>{formatCurrency(item.unit_price_snapshot)}</span>
                </div>
                <p className="mt-1 font-extrabold text-azraq-800">{formatCurrency(item.line_total)}</p>
              </div>
            ))}
          </div>

          <div className="mt-2 space-y-1.5 rounded-xl bg-[#F4FAFF] p-3 text-xs">
            <div className="flex justify-between font-bold text-slate-500">
              <span>مجموع الأصناف</span>
              <span>{order.order_items?.length || 0} صنف</span>
            </div>
            {order.discount_amount != null && order.discount_amount > 0 && (
              <div className="flex justify-between font-bold text-emerald-700">
                <span>الخصم المطبّق</span>
                <span>- {formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-display text-base font-extrabold text-azraq-900">
              <span>الإجمالي</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </Card>

        {order.notes && (
          <Card className="p-3">
            <p className="mb-1 text-[11px] font-bold text-slate-400">ملاحظاتك</p>
            <p className="text-xs font-bold text-slate-700">{order.notes}</p>
          </Card>
        )}

        <Button onClick={repeat} className="w-full py-3 text-sm"><RotateCcw size={15} /> كرر الطلب</Button>
      </div>
    );
  }

  // ─── Admin / Warehouse / Delivery view ───────────────────────────────────
  const canEdit = role === 'admin' || role === 'warehouse';

  return (
    <div className="pb-24">
      {/* Compact header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-slate-400">طلب #{order.id.slice(0, 8)}</p>
          <h1 className="font-display text-lg font-extrabold text-ink">{statusLabels[order.status]}</h1>
          <p className="text-[11px] text-slate-400">{formatDate(order.created_at)}</p>
        </div>
        <SecondaryButton onClick={() => window.print()} className="shrink-0 py-2 text-xs">
          <Printer size={14} /> اطبع
        </SecondaryButton>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="space-y-3">

          {/* Status timeline */}
          <Card className="p-3">
            <h2 className="mb-2 font-display text-sm font-extrabold text-ink">تابع طلبك</h2>
            <StatusTimeline status={order.status} history={order.order_status_history || []} />
          </Card>

          {/* Order items */}
          <Card className="p-3">
            <h2 className="mb-2 font-display text-sm font-extrabold">تفاصيل الفاتورة</h2>

            {/* Mobile: card per item */}
            <div className="grid gap-1.5 sm:hidden">
              {order.order_items?.map((item) => (
                <div key={item.id} className="rounded-xl bg-[#F4FAFF] px-3 py-2 text-xs">
                  <p className="font-bold text-slate-800">{item.product_name_snapshot}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-slate-500">
                    <span>{unitLabels[item.unit_type_snapshot]}</span>
                    <span>× {item.quantity}</span>
                    <span>@ {formatCurrency(item.unit_price_snapshot)}</span>
                  </div>
                  <p className="mt-1 font-extrabold text-azraq-800">{formatCurrency(item.line_total)}</p>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[480px] text-xs">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-100 text-right">
                    <th className="py-2.5 font-extrabold">المنتج</th>
                    <th className="font-extrabold">الوحدة</th>
                    <th className="font-extrabold">الكمية</th>
                    <th className="font-extrabold">سعر الوحدة</th>
                    <th className="font-extrabold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="py-2.5 font-bold text-slate-800">{item.product_name_snapshot}</td>
                      <td className="text-slate-500">{unitLabels[item.unit_type_snapshot]}</td>
                      <td className="text-slate-500">{item.quantity}</td>
                      <td className="text-slate-500">{formatCurrency(item.unit_price_snapshot)}</td>
                      <td className="font-extrabold text-azraq-800">{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex justify-between rounded-xl bg-azraq-700 px-3 py-2.5 font-display text-sm font-extrabold text-white">
              <span>الإجمالي</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>

            {canEdit && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <h3 className="mb-1 font-display text-sm font-extrabold text-slate-700">تعديل الطلب</h3>
                <p className="mb-2 text-[11px] text-slate-400">يمكنك تعديل الكميات والأسعار وحالة الطلب.</p>
                <OrderEditor order={order} onSaved={reload} />
              </div>
            )}
          </Card>
        </div>

        {/* Right column: customer info + map */}
        <div className="space-y-3">
          <Card className="p-3">
            <h2 className="mb-2 font-display text-sm font-extrabold">بيانات العميل</h2>
            <div className="grid gap-1.5 text-xs">
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-bold text-slate-400">الاسم</span>
                <span className="font-bold text-slate-800">{order.profiles?.full_name || 'مش محدد'}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="font-bold text-slate-400">الموبايل</span>
                {order.profiles?.phone
                  ? <a className="font-bold text-azraq-700 underline" href={`tel:${order.profiles.phone}`}>{order.profiles.phone}</a>
                  : <span className="font-bold text-slate-800">مش محدد</span>
                }
              </div>
              <div className="flex justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="shrink-0 font-bold text-slate-400">العنوان</span>
                <span className="text-left font-bold text-slate-800">{order.address || order.profiles?.address || 'مش محدد'}</span>
              </div>
              {order.notes && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                  <p className="mb-0.5 text-[10px] font-bold text-amber-600">ملاحظات العميل</p>
                  <p className="text-xs text-amber-900">{order.notes}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-3">
            <h2 className="mb-2 font-display text-sm font-extrabold">موقع العميل</h2>
            <MapPreview latitude={order.latitude ?? order.profiles?.latitude ?? null} longitude={order.longitude ?? order.profiles?.longitude ?? null} />
          </Card>
        </div>
      </div>
    </div>
  );
}
