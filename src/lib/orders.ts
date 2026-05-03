import { supabase } from './supabase';
import type { OrderStatus } from '../types/database';

export async function updateOrderStatus(orderId: string, status: OrderStatus, userId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) throw error;

  const history = await supabase.from('order_status_history').insert({
    order_id: orderId,
    status,
    changed_by: userId,
  });

  if (history.error) console.error('ORDER_STATUS_HISTORY_INSERT_FAILED', history.error);
}
