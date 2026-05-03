import type { PermissionKey, Profile } from '../types/database';

export const permissionLabels: Record<PermissionKey, string> = {
  reports: 'التقارير واللوحة',
  products: 'إضافة وتعديل المنتجات',
  purchases: 'تسجيل فواتير المشتريات',
  categories: 'الأقسام والأقسام الفرعية',
  orders: 'إدارة الطلبات والحالات',
  users: 'إضافة المستخدمين والصلاحيات',
  developer: 'لوحة المطور والتحكم الكامل',
  settings: 'إعدادات الهوية والتطبيق',
  data: 'استعراض وتعديل بيانات المشروع',
};

export const allPermissions = Object.keys(permissionLabels) as PermissionKey[];
export const developerPermissions: PermissionKey[] = ['developer', 'settings', 'data'];
export const managerPermissions = allPermissions.filter((permission) => !developerPermissions.includes(permission));

export function hasPermission(profile: Profile | null | undefined, permission: PermissionKey) {
  if (!profile) return false;
  if (developerPermissions.includes(permission)) {
    return Boolean(profile.app_permissions?.includes('developer') || profile.app_permissions?.includes(permission));
  }
  if (profile.role === 'admin' && !profile.app_permissions?.length) return true;
  return Boolean(profile.app_permissions?.includes(permission));
}

export function isDeveloperProfile(profile: Profile | null | undefined) {
  return hasPermission(profile, 'developer');
}

export function hasAnyPermission(profile: Profile | null | undefined, permissions: PermissionKey[]) {
  return permissions.some((permission) => hasPermission(profile, permission));
}

export function homeForProfile(profile: Profile | null | undefined) {
  if (!profile) return '/login';
  if (profile.role === 'customer') return '/';
  if (profile.role === 'warehouse') return '/warehouse';
  if (profile.role === 'delivery') return '/delivery';
  if (hasPermission(profile, 'developer')) return '/admin';
  if (hasPermission(profile, 'reports')) return '/admin';
  if (hasPermission(profile, 'products')) return '/admin/products';
  if (hasPermission(profile, 'purchases')) return '/admin/purchases';
  if (hasPermission(profile, 'categories')) return '/admin/categories';
  if (hasPermission(profile, 'orders')) return '/admin/orders';
  if (hasPermission(profile, 'users')) return '/admin/customers';
  return '/admin';
}
