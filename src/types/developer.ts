/**
 * Developer SaaS Control Panel Types
 */

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'toggle' | 'change_status';

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, { old?: unknown; new?: unknown }> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles?: { full_name: string | null; role: string | null } | null;
};

export type AppLabel = {
  key: string;
  value: string;
  default_value: string;
  category: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type AppTypography = {
  key: string;
  value: string;
  category: 'font' | 'size' | 'weight' | 'spacing';
  label: string;
  css_variable: string | null;
  updated_at: string;
};

export type PlanConfig = {
  id: string;
  name: string;
  name_ar: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  limits: Record<string, number | string>;
  features: string[];
  is_active: boolean;
  sort_order: number;
  badge_text: string | null;
  updated_at: string;
};

export type AppCustomCSS = {
  id: string;
  css_content: string;
  is_active: boolean;
  updated_by: string | null;
  updated_at: string;
};

export type AppSnapshot = {
  id: string;
  title: string;
  description: string | null;
  snapshot_data: Record<string, unknown>;
  version: string;
  created_by: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

// Category labels for app_labels
export const labelCategories: Record<string, string> = {
  navigation: 'التنقل',
  cart: 'السلة',
  orders: 'الطلبات',
  auth: 'تسجيل الدخول',
  products: 'المنتجات',
  general: 'عام',
  errors: 'رسائل الخطأ',
  notifications: 'الإشعارات',
};

// Typography category labels
export const typographyCategories: Record<string, string> = {
  font: 'الخطوط',
  size: 'الأحجام',
  weight: 'الأوزان',
  spacing: 'التباعد والاستدارة',
};

// Audit action labels
export const auditActionLabels: Record<string, string> = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  login: 'دخول',
  logout: 'خروج',
  export: 'تصدير',
  import: 'استيراد',
  toggle: 'تفعيل/إيقاف',
  change_status: 'تغيير حالة',
};

// Audit entity type labels
export const auditEntityLabels: Record<string, string> = {
  product: 'منتج',
  order: 'طلب',
  profile: 'مستخدم',
  setting: 'إعداد',
  report: 'تقرير',
  category: 'قسم',
  label: 'نص',
  typography: 'خط',
  plan: 'خطة',
  feature: 'ميزة',
  css: 'تصميم',
  snapshot: 'نسخة احتياطية',
};
