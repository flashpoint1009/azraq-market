import { useEffect, useMemo, useState } from 'react';
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

function draftItemsFromOrder(order: Order): DraftItem[] {
  return (order.order_items || []).map((item) => ({
    id: item.id,
    product_name_snapshot: item.product_name_snapshot,
    quantity: String(item.quantity),
    unit_price_snapshot: String(item.unit_price_snapshot),
  }));
}

async function writeStatusHistory(orderId: string, status: OrderStatus, userId: string) {
  const history = await supabase.from('order_status_history').insert({
    order_id: orderId,
    status,
    changed_by: userId,
  });
  if (history.error) console.error('ORDER_STATUS_HISTORY_INSERT_FAILED', history.error);
}

async function saveOrderStatus(orderId: string, status: OrderStatus, userId: string | null, total: number, paid: number, debt: number) {
  const rpc = await supabase.rpc('admin_change_order_status', {
    order_id_input: orderId,
    status_input: status,
    actor_id_input: userId,
  });

  if (!rpc.error) return;
  console.warn('ADMIN_CHANGE_ORDER_STATUS_RPC_FAILED', rpc.error);

  const payload = {
    status,
    total_amount: total,
    updated_at: new Date().toISOString(),
    ...(status === 'delivered' ? { paid_amount: paid, debt_amount: debt } : {}),
  };

  let direct = await supabase.from('orders').update(payload).eq('id', orderId);

  if (direct.error) {
    direct = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
  }

  if (direct.error) throw direct.error;
}

async function syncDebt(order: Order, total: number, paid: number, debt: number) {
  if (debt <= 0) {
    const existing = await supabase.from('customer_debts').select('id').eq('order_id', order.id).maybeSingle();
    if (!existing.error && existing.data?.id) {
      const updated = await supabase
        .from('customer_debts')
        .update({ amount: total, paid_amount: paid, remaining_amount: 0, status: 'paid' })
        .eq('id', existing.data.id);
      if (updated.error) console.error('CUSTOMER_DEBT_MARK_PAID_FAILED', updated.error);
    }
    return;
  }

  const existing = await supabase.from('customer_debts').select('id').eq('order_id', order.id).maybeSingle();
  if (existing.error) {
    console.error('CUSTOMER_DEBT_LOOKUP_FAILED', existing.error);
    return;
  }

  const payload = {
    customer_id: order.customer_id,
    order_id: order.id,
    amount: total,
    paid_amount: paid,
    remaining_amount: debt,
    status: paid > 0 ? 'partial' as const : 'open' as const,
  };

  const result = existing.data?.id
    ? await supabase.from('customer_debts').update(payload).eq('id', existing.data.id)
    : await supabase.from('customer_debts').insert(payload);

  if (result.error) console.error('CUSTOMER_DEBT_SYNC_FAILED', result.error);
}

export function OrderEditor({ order, onSaved }: { order: Order; onSaved: () => void }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<DraftItem[]>(() => draftItemsFromOrder(order));
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paidAmount, setPaidAmount] = useState(String(order.paid_amount || 0));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(draftItemsFromOrder(order));
    setStatus(order.status);
    setPaidAmount(String(order.paid_amount || 0));
  }, [order.id, order.status, order.updated_at, order.paid_amount, order.order_items]);

  const itemsTotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price_snapshot) || 0), 0),
    [items],
  );
  const total = items.length ? itemsTotal : Number(order.total_amount || 0);
  const paid = status === 'delivered' ? Number(paidAmount) || 0 : Number(order.paid_amount || 0);
  const debt = status === 'delivered' ? Math.max(total - paid, 0) : Number(order.debt_amount || 0);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const itemErrors: unknown[] = [];
      for (const item of items) {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.unit_price_snapshot) || 0;
        if (quantity <= 0 || price < 0) {
          toast.error('راجع الكمية والسعر قبل الحفظ');
          return;
        }

        const { error } = await supabase
          .from('order_items')
          .update({ quantity, unit_price_snapshot: price, line_total: quantity * price })
          .eq('id', item.id);
        if (error) {
          console.error('ORDER_ITEM_SAVE_FAILED', error);
          itemErrors.push(error);
        }
      }

      await saveOrderStatus(order.id, status, profile.id, total, paid, debt);

      if (status !== order.status) await writeStatusHistory(order.id, status, profile.id);
      if (status === 'delivered') await syncDebt(order, total, paid, debt);

      toast.success(itemErrors.length ? 'حالة الطلب اتحفظت، وبعض تعديلات الأصناف محتاجة صلاحيات' : 'تم حفظ التعديل');
      await onSaved();
    } catch (error) {
      console.error('ORDER_EDITOR_SAVE_FAILED', error);
      toast.error(error instanceof Error ? error.message : 'مش قادرين نحفظ التعديل، حاول تاني');
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
