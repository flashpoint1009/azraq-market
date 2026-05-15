/**
 * Advanced mutation hooks with optimistic updates.
 * These provide instant UI feedback before the server confirms the change.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queryKeys } from './keys';
import { changeOrderStatus, createOrder, type CreateOrderInput } from './orders';
import type { Order, OrderStatus } from '../types/database';

/**
 * Optimistic order status change.
 * Updates the order status in cache immediately, rolls back on error.
 */
export function useOptimisticOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { orderId: string; status: OrderStatus; actorId: string | null }) =>
      changeOrderStatus(params.orderId, params.status, params.actorId),

    onMutate: async ({ orderId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.all });

      // Snapshot current cache
      const previousOrders = queryClient.getQueriesData<Order[]>({ queryKey: queryKeys.orders.all });

      // Optimistically update all order lists in cache
      queryClient.setQueriesData<Order[]>(
        { queryKey: queryKeys.orders.all },
        (old) => old?.map((order) => order.id === orderId ? { ...order, status } : order),
      );

      // Also update the single order detail if cached
      const detailKey = queryKeys.orders.detail(orderId);
      const previousDetail = queryClient.getQueryData<Order>(detailKey);
      if (previousDetail) {
        queryClient.setQueryData<Order>(detailKey, { ...previousDetail, status });
      }

      return { previousOrders, previousDetail, detailKey };
    },

    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousOrders) {
        for (const [key, data] of context.previousOrders) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
      toast.error('فشل تحديث حالة الطلب');
    },

    onSettled: () => {
      // Refetch to ensure server state is reflected
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

/**
 * Create order with optimistic cart clear and rollback.
 */
export function useOptimisticCreateOrder(options?: {
  onSuccess?: (orderId: string) => void;
  clearCart?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),

    onMutate: () => {
      // Optimistically clear the cart (UI shows success state immediately)
      options?.clearCart?.();
    },

    onSuccess: (orderId) => {
      // Invalidate orders so the new order shows up
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      // Also refetch products (stock might have changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success('تم إرسال الطلب بنجاح');
      options?.onSuccess?.(orderId);
    },

    onError: () => {
      // Cart context handles rollback via its own state
      toast.error('فشل إرسال الطلب، حاول مرة تانية');
    },
  });
}
