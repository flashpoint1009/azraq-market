/**
 * Ready-to-use React Query hooks for common data fetching patterns.
 * These wrap the raw API functions with proper query keys and options.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { fetchProducts, fetchAvailableProducts, fetchProductById, fetchAllProductsAdmin, type ProductListFilters } from './products';
import { fetchCategories, fetchCategoriesWithSubcategories } from './categories';
import { fetchCustomerOrders, fetchOrderById, fetchOrdersManagement, createOrder, changeOrderStatus, type CreateOrderInput, type OrderManagementFilters } from './orders';
import { fetchCustomers, fetchAllProfiles, updateProfile } from './customers';
import type { OrderStatus, Profile } from '../types/database';

// ─── Products ───

export function useProducts(filters?: ProductListFilters) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => fetchProducts(filters),
  });
}

export function useAvailableProducts(limit = 24) {
  return useQuery({
    queryKey: queryKeys.products.list({ available: true }),
    queryFn: () => fetchAvailableProducts(limit),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id!),
    queryFn: () => fetchProductById(id!),
    enabled: !!id,
  });
}

export function useAdminProducts() {
  return useQuery({
    queryKey: [...queryKeys.products.all, 'admin'],
    queryFn: fetchAllProductsAdmin,
  });
}

// ─── Categories ───

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: fetchCategories,
    staleTime: 5 * 60_000, // categories change rarely
  });
}

export function useCategoriesWithSubcategories() {
  return useQuery({
    queryKey: queryKeys.categories.withSubcategories(),
    queryFn: fetchCategoriesWithSubcategories,
    staleTime: 5 * 60_000,
  });
}

// ─── Orders ───

export function useCustomerOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.list({ customerId }),
    queryFn: () => fetchCustomerOrders(customerId!),
    enabled: !!customerId,
  });
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId!),
    queryFn: () => fetchOrderById(orderId!),
    enabled: !!orderId,
  });
}

export function useOrdersManagement(filters?: OrderManagementFilters) {
  return useQuery({
    queryKey: queryKeys.orders.management(filters),
    queryFn: () => fetchOrdersManagement(filters),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useChangeOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { orderId: string; status: OrderStatus; actorId: string | null }) =>
      changeOrderStatus(params.orderId, params.status, params.actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

// ─── Customers ───

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.list(),
    queryFn: fetchCustomers,
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: fetchAllProfiles,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; updates: Partial<Profile> }) =>
      updateProfile(params.id, params.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}
