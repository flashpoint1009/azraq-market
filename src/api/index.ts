/**
 * API Layer — barrel export for all API modules.
 *
 * Usage:
 *   import { fetchProducts, queryKeys } from '@/api';
 *   import { createOrder } from '@/api/orders';
 *   import { useProducts, useCreateOrder } from '@/api/hooks';
 */
export { queryKeys } from './keys';
export * from './products';
export * from './categories';
export * from './orders';
export * from './customers';
export * from './hooks';
export * from './mutations';
