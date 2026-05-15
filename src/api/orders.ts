/**
 * Orders API — all Supabase queries for order data.
 */
import { supabase } from '../lib/supabase';
import type { Order, OrderStatus } from '../types/database';

export async function fetchCustomerOrders(customerId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Order[];
}

export async function fetchOrderById(orderId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), profiles(full_name, phone, address, latitude, longitude), order_status_history(*, profiles(full_name, role))')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data as unknown as Order;
}

export type OrderManagementFilters = {
  status?: string;
  limit?: number;
};

export async function fetchOrdersManagement(filters?: OrderManagementFilters): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select('*, order_items(*), profiles(full_name, phone, address, latitude, longitude)')
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as OrderStatus);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as Order[];
}

export type CreateOrderInput = {
  notes: string | null;
  items: Array<{ product_id: string; quantity: number }>;
};

export async function createOrder(input: CreateOrderInput): Promise<string> {
  const { data, error } = await supabase.rpc('customer_create_order', {
    notes_input: input.notes,
    items_input: input.items,
  });
  if (error) throw error;
  return data as string;
}

export async function changeOrderStatus(orderId: string, status: OrderStatus, actorId: string | null): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_change_order_status', {
    order_id_input: orderId,
    status_input: status,
    actor_id_input: actorId,
  });
  if (error) throw error;
  return data as boolean;
}
