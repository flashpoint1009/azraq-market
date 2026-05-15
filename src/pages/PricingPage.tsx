/**
 * PricingPage — public-facing plan comparison page.
 * Shows all available plans with features, limits, and pricing.
 * Accessible without login at /pricing.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Crown, Sparkles, X, Zap } from 'lucide-react';
import { useTenant } from '../tenants';
import { PLAN_DEFINITIONS, type FeatureKey, type PlanId } from '../tenants/types';

type BillingCycle = 'monthly' | 'yearly';

const planOrder: PlanId[] = ['free', 'starter', 'business', 'enterprise'];

const planIcons: Record<PlanId, typeof Zap> = {
  free: Zap,
  starter: Sparkles,
  business: Crown,
  enterprise: Crown,
};

const planColors: Record<PlanId, { bg: string; border: string; badge: string; button: string }> = {
  free: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600', button: 'bg-slate-700 hover:bg-slate-800' },
  starter: { bg: 'bg-blue-50/50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', button: 'bg-blue-600 hover:bg-blue-700' },
  business: { bg: 'bg-azraq-50/50', border: 'border-azraq-200', badge: 'bg-azraq-100 text-azraq-700', button: 'bg-azraq-700 hover:bg-azraq-800' },
  enterprise: { bg: 'bg-gradient-to-br from-amber-50 to-orange-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', button: 'bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' },
};

const allFeatureLabels: Record<FeatureKey, string> = {
  products: 'إدارة المنتجات',
  orders: 'إدارة الطلبات',
  branches: 'فروع متعددة',
  sms: 'إشعارات SMS',
  analytics: 'التحليلات المتقدمة',
  custom_domain: 'دومين مخصص',
  developer: 'لوحة المطور',
  coupons: 'الكوبونات والخصومات',
  promotions: 'العروض والحملات',
  reviews: 'تقييمات العملاء',
  wishlists: 'قائمة المفضلة',
  chat: 'شات العملاء',
  internal_messaging: 'المراسلات الداخلية',
  live_tracking: 'تتبع المندوبين',
  stock_management: 'إدارة المخزون المتقدمة',
  purchase_invoices: 'فواتير المشتريات',
  pdf_export: 'تصدير PDF',
  excel_export: 'تصدير Excel',
  api_access: 'الوصول عبر API',
};

const featureDisplayOrder: FeatureKey[] = [
  'products', 'orders', 'branches', 'coupons', 'promotions', 'reviews',
  'wishlists', 'pdf_export', 'excel_export', 'sms', 'analytics', 'chat',
  'internal_messaging', 'stock_management', 'purchase_invoices',
  'live_tracking', 'custom_domain', 'developer', 'api_access',
];

export function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const { plan: currentPlan } = useTenant();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10" dir="rtl">
      {/* Header */}
      <div className="mx-auto max-w-4xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-azraq-50 px-4 py-1.5 text-xs font-extrabold text-azraq-700">
          <Crown size={14} /> خطط الاشتراك
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold text-ink sm:text-4xl">
          اختر الخطة المناسبة لمشروعك
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
          ابدأ مجانًا وارقِ خطتك في أي وقت. كل الخطط تشمل دعم فني ونسخة احتياطية يومية.
        </p>

        {/* Billing cycle toggle */}
        <div className="mt-6 inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setCycle('monthly')}
            className={`rounded-xl px-5 py-2.5 text-sm font-extrabold transition ${
              cycle === 'monthly' ? 'bg-azraq-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            شهري
          </button>
          <button
            onClick={() => setCycle('yearly')}
            className={`rounded-xl px-5 py-2.5 text-sm font-extrabold transition ${
              cycle === 'yearly' ? 'bg-azraq-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            سنوي
            <span className="mr-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              وفّر 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {planOrder.map((planId) => {
          const def = PLAN_DEFINITIONS[planId];
          const colors = planColors[planId];
          const Icon = planIcons[planId];
          const price = cycle === 'monthly' ? def.priceMonthly : def.priceYearly;
          const perMonth = cycle === 'yearly' && def.priceYearly > 0 ? Math.round(def.priceYearly / 12) : def.priceMonthly;
          const isCurrent = currentPlan.id === planId;
          const isPopular = planId === 'business';

          return (
            <div
              key={planId}
              className={`relative flex flex-col overflow-hidden rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${colors.border} ${colors.bg} ${isPopular ? 'ring-2 ring-azraq-400 ring-offset-2' : ''}`}
            >
              {isPopular && (
                <div className="absolute -left-8 top-5 rotate-[-45deg] bg-azraq-700 px-10 py-1 text-[10px] font-extrabold text-white shadow-sm">
                  الأكثر شيوعًا
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-center gap-2">
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${colors.badge}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-ink">{def.name}</h3>
                </div>
              </div>

              {/* Price */}
              <div className="mt-4">
                {price === 0 ? (
                  <p className="font-display text-3xl font-extrabold text-ink">مجاني</p>
                ) : (
                  <>
                    <p className="font-display text-3xl font-extrabold text-ink">
                      {perMonth.toLocaleString('ar-EG')}
                      <span className="mr-1 text-base font-bold text-slate-400">ج.م/شهر</span>
                    </p>
                    {cycle === 'yearly' && (
                      <p className="mt-1 text-xs text-slate-400">
                        يُدفع {price.toLocaleString('ar-EG')} ج.م سنويًا
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Limits summary */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/60 p-3">
                <div className="text-center">
                  <p className="text-lg font-extrabold text-ink">
                    {def.limits.maxProducts === 'unlimited' ? '∞' : def.limits.maxProducts}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">منتج</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-extrabold text-ink">
                    {def.limits.maxOrdersPerMonth === 'unlimited' ? '∞' : def.limits.maxOrdersPerMonth}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">طلب/شهر</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-extrabold text-ink">
                    {def.limits.maxBranches === 'unlimited' ? '∞' : def.limits.maxBranches}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">فرع</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-extrabold text-ink">
                    {def.limits.maxStaff === 'unlimited' ? '∞' : def.limits.maxStaff}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">مستخدم</p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4">
                {isCurrent ? (
                  <div className="w-full rounded-2xl border-2 border-emerald-300 bg-emerald-50 py-3 text-center text-sm font-extrabold text-emerald-700">
                    خطتك الحالية
                  </div>
                ) : (
                  <Link
                    to={`/admin/billing?plan=${planId}&cycle=${cycle}`}
                    className={`block w-full rounded-2xl py-3 text-center text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 ${colors.button}`}
                  >
                    {price === 0 ? 'ابدأ مجانًا' : 'اشترك الآن'}
                  </Link>
                )}
              </div>

              {/* Features list */}
              <ul className="mt-4 flex-1 space-y-2 border-t border-slate-100 pt-4">
                {featureDisplayOrder.slice(0, planId === 'enterprise' ? undefined : planId === 'business' ? 15 : planId === 'starter' ? 8 : 4).map((feat) => {
                  const included = def.features.includes(feat);
                  return (
                    <li key={feat} className={`flex items-center gap-2 text-xs ${included ? 'text-slate-700' : 'text-slate-300'}`}>
                      {included ? (
                        <Check size={14} className="shrink-0 text-emerald-500" />
                      ) : (
                        <X size={14} className="shrink-0 text-slate-300" />
                      )}
                      <span className={included ? 'font-bold' : 'line-through'}>{allFeatureLabels[feat]}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* FAQ / CTA */}
      <div className="mx-auto mt-12 max-w-2xl text-center">
        <p className="text-sm text-slate-500">
          محتاج خطة مخصصة أو عدد منتجات أكبر؟{' '}
          <a href="https://wa.me/201153338337" target="_blank" rel="noreferrer" className="font-extrabold text-azraq-700 hover:underline">
            تواصل معانا
          </a>
        </p>
      </div>
    </div>
  );
}
