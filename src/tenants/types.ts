/**
 * Multi-Tenant Configuration Types
 *
 * Each sold instance gets a TenantConfig that controls:
 * - Branding (name, logo, colors, fonts)
 * - Plan & Limits (features enabled, usage caps)
 * - Business Settings (currency, support, delivery)
 * - Domain & Deployment
 */

export type PlanId = 'free' | 'starter' | 'business' | 'enterprise';

export type FeatureKey =
  | 'products'
  | 'orders'
  | 'branches'
  | 'sms'
  | 'analytics'
  | 'custom_domain'
  | 'developer'
  | 'coupons'
  | 'promotions'
  | 'reviews'
  | 'wishlists'
  | 'chat'
  | 'internal_messaging'
  | 'live_tracking'
  | 'stock_management'
  | 'purchase_invoices'
  | 'pdf_export'
  | 'excel_export'
  | 'api_access';

export type TenantBranding = {
  name: string;
  subtitle: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: 'sm' | 'md' | 'lg' | 'xl';
  loginBackground?: string;
};

export type TenantLimits = {
  maxProducts: number | 'unlimited';
  maxOrdersPerMonth: number | 'unlimited';
  maxBranches: number | 'unlimited';
  maxStaff: number | 'unlimited';
  maxStorageMB: number | 'unlimited';
};

export type TenantPlan = {
  id: PlanId;
  name: string;
  features: FeatureKey[];
  limits: TenantLimits;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
};

export type TenantConfig = {
  // Identity
  id: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;

  // Branding
  branding: TenantBranding;

  // Plan & Features
  plan: TenantPlan;

  // Business Settings
  currency: string;
  currencySymbol: string;
  supportPhone: string;
  supportWhatsapp: string;
  deliveryFee: number;
  minOrderAmount: number;
  taxRate: number;

  // Domain
  customDomain: string | null;

  // Metadata
  ownerId: string | null;
  metadata: Record<string, unknown>;
};

/**
 * Default plan definitions for the SaaS.
 */
export const PLAN_DEFINITIONS: Record<PlanId, Omit<TenantPlan, 'id'>> = {
  free: {
    name: 'مجاني',
    features: ['products', 'orders', 'branches'],
    limits: { maxProducts: 50, maxOrdersPerMonth: 100, maxBranches: 1, maxStaff: 2, maxStorageMB: 100 },
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'EGP',
  },
  starter: {
    name: 'المبتدئ',
    features: ['products', 'orders', 'branches', 'coupons', 'promotions', 'reviews', 'pdf_export'],
    limits: { maxProducts: 200, maxOrdersPerMonth: 500, maxBranches: 1, maxStaff: 5, maxStorageMB: 500 },
    priceMonthly: 299,
    priceYearly: 2990,
    currency: 'EGP',
  },
  business: {
    name: 'الأعمال',
    features: [
      'products', 'orders', 'branches', 'sms', 'analytics', 'coupons', 'promotions',
      'reviews', 'wishlists', 'chat', 'internal_messaging', 'stock_management',
      'purchase_invoices', 'pdf_export', 'excel_export',
    ],
    limits: { maxProducts: 1000, maxOrdersPerMonth: 'unlimited', maxBranches: 3, maxStaff: 15, maxStorageMB: 2000 },
    priceMonthly: 799,
    priceYearly: 7990,
    currency: 'EGP',
  },
  enterprise: {
    name: 'المؤسسات',
    features: [
      'products', 'orders', 'branches', 'sms', 'analytics', 'custom_domain', 'developer',
      'coupons', 'promotions', 'reviews', 'wishlists', 'chat', 'internal_messaging',
      'live_tracking', 'stock_management', 'purchase_invoices', 'pdf_export',
      'excel_export', 'api_access',
    ],
    limits: { maxProducts: 'unlimited', maxOrdersPerMonth: 'unlimited', maxBranches: 'unlimited', maxStaff: 'unlimited', maxStorageMB: 'unlimited' },
    priceMonthly: 1999,
    priceYearly: 19990,
    currency: 'EGP',
  },
};
