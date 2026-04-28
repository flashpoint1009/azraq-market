import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, statusLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { Button, Input, Select } from './ui';
import type { Order, OrderItem, OrderStatus } from '../types/database';

const allStatuses: OrderStatus[] = ['new', 'preparing', 'ready_for_delivery', 'with_delivery', 'delivered', 'cancelled', 'rejected'];

type DraftItem = Pick<OrderItem, 'id' | 'product_name_snapshot'> & {
  quantity: string;
  unit_price_snapshot: string;
};

export function OrderEditor({ order, onSaved }: { order: Order; onSaved: () => void }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<DraftItem[]>(
    (order.order_items || []).map((item) => ({
      id: item.id,
      product_name_snapshot: item.product_name_snapshot,
      quantity: String(item.quantity),
      unit_price_snapshot: String(item.unit_price_snapshot),
    })),
  );
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paidAmount, setPaidAmount] = useState(String(order.paid_amount || 0));
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price_snapshot) || 0), 0),
    [items],
  );
  const paid = status === 'delivered' ? Number(paidAmount) || 0 : Number(order.paid_amount || 0);
  const debt = status === 'delivered' ? Math.max(total - paid, 0) : Number(order.debt_amount || 0);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      for (const item of items) {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.unit_price_snapshot) || 0;
        const { error } = await supabase
          .from('order_items')
          .update({ quantity, unit_price_snapshot: price, line_total: quantity * price })
          .eq('id', item.id);
        if (error) throw error;
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status,
          total_amount: total,
          paid_amount: status === 'delivered' ? paid : order.paid_amount || 0,
          debt_amount: status === 'delivered' ? debt : order.debt_amount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
      if (orderError) throw orderError;

      if (status !== order.status) {
        const history = await supabase.from('order_status_history').insert({
          order_id: order.id,
          status,
          changed_by: profile.id,
        });
        if (history.error) console.error('ORDER_STATUS_HISTORY_INSERT_FAILED', history.error);
      }

      if (status === 'delivered' && debt > 0) {
        const debtInsert = await supabase.from('customer_debts').insert({
          customer_id: order.customer_id,
          order_id: order.id,
          amount: total,
          paid_amount: paid,
          remaining_amount: debt,
          status: paid > 0 ? 'partial' : 'open',
        });
        if (debtInsert.error) console.error('CUSTOMER_DEBT_INSERT_FAILED', debtInsert.error);
      }

      toast.success('تم حفظ التعديل');
      onSaved();
    } catch (error) {
      console.error('ORDER_EDITOR_SAVE_FAILED', error);
      toast.error('تعذر تحميل البيانات، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl bg-slate-50 p-3">
      <div className="grid gap-2">
        {items.map((item, index) => (
          <div key={item.id} className="grid gap-2 rounded-2xl bg-white p-2 text-sm md:grid-cols-[1fr_90px_120px_120px] md:items-center">
            <strong className="text-slate-700">{item.product_name_snapshot}</strong>
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              الكمية
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(event) => setItems(items.map((entry, i) => (i === index ? { ...entry, quantity: event.target.value } : entry)))}
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              سعر المنتج
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.unit_price_snapshot}
                onChange={(event) => setItems(items.map((entry, i) => (i === index ? { ...entry, unit_price_snapshot: event.target.value } : entry)))}
              />
            </label>
            <span className="rounded-2xl bg-azraq-50 px-3 py-3 text-center font-extrabold text-azraq-800">
              {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price_snapshot) || 0))}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_160px_160px_auto] md:items-end">
        <label className="grid gap-1 text-xs font-bold text-slate-500">
          حالة الطلب
          <Select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus)}>
            {allStatuses.map((item) => (
              <option key={item} value={item}>
                {statusLabels[item]}
              </option>
            ))}
          </Select>
        </label>
        {status === 'delivered' && (
          <label className="grid gap-1 text-xs font-bold text-slate-500">
            المدفوع
            <Input type="number" min="0" step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} />
          </label>
        )}
        <div className="rounded-2xl bg-white p-3 text-sm font-extrabold text-slate-700">
          الإجمالي: {formatCurrency(total)}
          {status === 'delivered' && <span className="block text-rose-600">الباقي: {formatCurrency(debt)}</span>}
        </div>
        <Button type="button" onClick={save} disabled={saving}>
          <Save size={16} /> {saving ? 'جاري الحفظ...' : 'احفظ التعديل'}
        </Button>
      </div>
    </div>
  );
}
