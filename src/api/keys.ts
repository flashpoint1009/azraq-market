/**
 * Centralized query key factory for TanStack Query.
 * Every query in the app should reference keys from here to enable
 * precise invalidation, prefetching, and cache management.
 */

export const queryKeys = {
  // ─── Products ───
  products: {
    all: ['products'] as const,
    list: (filters?: { categoryId?: string; available?: boolean }) =>
      [...queryKeys.products.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
  },

  // ─── Categories ───
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
    withSubcategories: () => [...queryKeys.categories.all, 'with-subcategories'] as const,
  },

  // ─── Orders ───
  orders: {
    all: ['orders'] as const,
    list: (filters?: { customerId?: string; status?: string }) =>
      [...queryKeys.orders.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
    management: (filters?: { status?: string }) =>
      [...queryKeys.orders.all, 'management', filters] as const,
  },

  // ─── Customers / Profiles ───
  customers: {
    all: ['customers'] as const,
    list: () => [...queryKeys.customers.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.customers.all, 'detail', id] as const,
  },

  // ─── Notifications ───
  notifications: {
    all: ['notifications'] as const,
    list: (userId: string) => [...queryKeys.notifications.all, 'list', userId] as const,
    unreadCount: (userId: string) => [...queryKeys.notifications.all, 'unread', userId] as const,
  },

  // ─── Warehouse / Stock ───
  warehouse: {
    movements: (productId?: string) => ['warehouse', 'movements', productId] as const,
    lowStock: () => ['warehouse', 'low-stock'] as const,
    stocktakes: () => ['warehouse', 'stocktakes'] as const,
    returns: () => ['warehouse', 'returns'] as const,
    bins: () => ['warehouse', 'bins'] as const,
  },

  // ─── Developer / SaaS ───
  developer: {
    typography: () => ['developer', 'typography'] as const,
    labels: () => ['developer', 'labels'] as const,
    plans: () => ['developer', 'plans'] as const,
    auditLog: () => ['developer', 'audit-log'] as const,
    customCss: () => ['developer', 'custom-css'] as const,
    snapshots: () => ['developer', 'snapshots'] as const,
  },

  // ─── Promotions & Coupons ───
  promotions: {
    all: ['promotions'] as const,
    active: () => [...queryKeys.promotions.all, 'active'] as const,
  },
  coupons: {
    all: ['coupons'] as const,
  },

  // ─── Wishlists ───
  wishlists: {
    all: ['wishlists'] as const,
    user: (userId: string) => [...queryKeys.wishlists.all, userId] as const,
  },

  // ─── Reviews ───
  reviews: {
    all: ['reviews'] as const,
    product: (productId: string) => [...queryKeys.reviews.all, productId] as const,
  },
} as const;
