import type { PermissionKey, Profile } from '../types/database';

export const permissionLabels: Record<PermissionKey, string> = {
  reports: 'التقارير واللوحة',
  products: 'إضافة وتعديل المنتجات',
  purchases: 'فواتير المشتريات والمرتجعات',
  categories: 'الأقسام والأقسام الفرعية',
  orders: 'إدارة الطلبات والحالات',
  customers: 'إدارة العملاء',
  users: 'إضافة المستخدمين والصلاحيات',
  offers: 'إدارة العروض',
  developer: 'لوحة المطور والتحكم الكامل',
  settings: 'إعدادات الهوية والتطبيق',
  data: 'تصفح وتعديل بيانات المشروع',
};

export const allPermissions = Object.keys(permissionLabels) as PermissionKey[];
const developerOnlyPermissions: PermissionKey[] = ['developer', 'settings', 'data'];

export function hasPermission(profile: Profile | null | undefined, permission: PermissionKey) {
  if (!profile) return false;
  if (developerOnlyPermissions.includes(permission)) return Boolean(profile.app_permissions?.includes(permission) || profile.app_permissions?.includes('developer'));
  if (profile.app_permissions?.includes('developer')) return false;
  if (profile.role === 'admin' && !profile.app_permissions?.length) return true;
  return Boolean(profile.app_permissions?.includes(permission));
}

export function hasAnyPermission(profile: Profile | null | undefined, permissions: PermissionKey[]) {
  return permissions.some((permission) => hasPermission(profile, permission));
}

export function homeForProfile(profile: Profile | null | undefined) {
  if (!profile) return '/login';
  if (profile.role === 'customer') return '/';
  if (profile.role === 'warehouse') return '/warehouse';
  if (profile.role === 'delivery') return '/delivery';
  if (hasPermission(profile, 'developer')) return '/admin/developer';
  if (hasPermission(profile, 'reports')) return '/admin';
  if (hasPermission(profile, 'products')) return '/admin/products';
  if (hasPermission(profile, 'purchases')) return '/admin/purchases';
  if (hasPermission(profile, 'categories')) return '/admin/categories';
  if (hasPermission(profile, 'orders')) return '/admin/orders';
  if (hasPermission(profile, 'customers')) return '/admin/customers';
  if (hasPermission(profile, 'users')) return '/admin/users';
  if (hasPermission(profile, 'offers')) return '/admin/offers';
  return '/admin';
}
