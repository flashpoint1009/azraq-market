/**
 * UpgradeBanner — shown when a feature is blocked or a usage limit is reached.
 *
 * Two variants:
 * 1. Feature blocked: "هذه الميزة غير متاحة في خطتك الحالية"
 * 2. Limit reached: "وصلت للحد الأقصى (50/50 منتج)"
 *
 * Usage:
 *   <UpgradeBanner feature="analytics" />
 *   <UpgradeBanner limitName="maxProducts" currentUsage={50} limit={50} />
 */
import { Link } from 'react-router-dom';
import { Crown, Lock, TrendingUp } from 'lucide-react';
import { useTenant } from '../tenants';
import type { FeatureKey, TenantLimits } from '../tenants/types';

type FeatureBlockedProps = {
  variant?: 'feature';
  feature: FeatureKey;
  title?: string;
  description?: string;
};

type LimitReachedProps = {
  variant: 'limit';
  limitName: keyof TenantLimits;
  currentUsage: number;
  limit: number;
  title?: string;
  description?: string;
};

type UpgradeBannerProps = FeatureBlockedProps | LimitReachedProps;

const featureLabels: Partial<Record<FeatureKey, string>> = {
  analytics: 'التحليلات المتقدمة',
  sms: 'إشعارات SMS',
  custom_domain: 'دومين مخصص',
  developer: 'لوحة المطور',
  coupons: 'الكوبونات',
  promotions: 'العروض',
  reviews: 'التقييمات',
  wishlists: 'المفضلة',
  chat: 'الشات',
  internal_messaging: 'المراسلات الداخلية',
  live_tracking: 'تتبع المندوبين',
  stock_management: 'إدارة المخزون المتقدمة',
  purchase_invoices: 'فواتير المشتريات',
  pdf_export: 'تصدير PDF',
  excel_export: 'تصدير Excel',
  api_access: 'الوصول عبر API',
};

const limitLabels: Record<keyof TenantLimits, string> = {
  maxProducts: 'المنتجات',
  maxOrdersPerMonth: 'الطلبات الشهرية',
  maxBranches: 'الفروع',
  maxStaff: 'المستخدمين',
  maxStorageMB: 'مساحة التخزين (MB)',
};

export function UpgradeBanner(props: UpgradeBannerProps) {
  const { plan } = useTenant();

  if (props.variant === 'limit') {
    const { limitName, currentUsage, limit, title, description } = props;
    return (
      <div className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm" dir="rtl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600">
            <TrendingUp size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-extrabold text-amber-900">
              {title || `وصلت للحد الأقصى من ${limitLabels[limitName]}`}
            </h3>
            <p className="mt-1 text-sm leading-6 text-amber-700">
              {description || `استخدمت ${currentUsage} من أصل ${limit} في خطة "${plan.name}". ارقِ خطتك لزيادة الحد.`}
            </p>
            {/* Progress bar */}
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-amber-200">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${Math.min(100, (currentUsage / limit) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-bold text-amber-600">
              {currentUsage} / {limit}
            </p>
          </div>
        </div>
        <Link
          to="/admin/billing"
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-500 to-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Crown size={16} />
          ارقِ خطتك الآن
        </Link>
      </div>
    );
  }

  // Feature blocked variant
  const { feature, title, description } = props;
  const featureLabel = featureLabels[feature] || feature;

  return (
    <div className="overflow-hidden rounded-3xl border border-azraq-200 bg-gradient-to-br from-azraq-50 to-indigo-50 p-5 shadow-sm" dir="rtl">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-azraq-100 text-azraq-700">
          <Lock size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-extrabold text-azraq-900">
            {title || `${featureLabel} غير متاحة`}
          </h3>
          <p className="mt-1 text-sm leading-6 text-azraq-700">
            {description || `ميزة "${featureLabel}" غير متاحة في خطة "${plan.name}". ارقِ خطتك للوصول الكامل.`}
          </p>
        </div>
      </div>
      <Link
        to="/admin/billing"
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-azraq-600 to-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <Crown size={16} />
        شوف الخطط المتاحة
      </Link>
    </div>
  );
}

/**
 * Inline small upgrade badge (for use inside cards/lists).
 */
export function UpgradeBadge({ feature }: { feature: FeatureKey }) {
  const featureLabel = featureLabels[feature] || feature;
  return (
    <Link
      to="/admin/billing"
      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-amber-100 to-orange-100 px-2.5 py-1 text-2xs font-extrabold text-amber-700 transition hover:shadow-sm"
      title={`${featureLabel} — ارقِ خطتك`}
    >
      <Crown size={10} />
      PRO
    </Link>
  );
}
