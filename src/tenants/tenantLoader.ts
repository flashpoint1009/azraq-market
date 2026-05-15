/**
 * Tenant Configuration Loader
 *
 * Loads tenant config from:
 * 1. Environment variables (current mode — single-tenant deployment)
 * 2. Future: Supabase tenants table (multi-tenant SaaS mode)
 *
 * This allows a gradual migration path:
 * - Phase 1: Each buyer deploys with their own .env (current)
 * - Phase 2: Central SaaS loads config from DB per subdomain/slug
 */
import type { FeatureKey, PlanId, TenantConfig, TenantLimits } from './types';
import { PLAN_DEFINITIONS } from './types';

function envOrDefault(key: string, fallback: string): string {
  return (import.meta.env[key] as string | undefined) || fallback;
}

function resolvePlanId(): PlanId {
  const value = envOrDefault('VITE_PLAN_ID', 'enterprise') as PlanId;
  return value in PLAN_DEFINITIONS ? value : 'enterprise';
}

/**
 * Build a TenantConfig from environment variables.
 * This is the default mode for self-hosted / single-tenant deployments.
 */
export function loadTenantFromEnv(): TenantConfig {
  const planId = resolvePlanId();
  const planDef = PLAN_DEFINITIONS[planId];

  return {
    id: envOrDefault('VITE_TENANT_ID', 'default'),
    slug: envOrDefault('VITE_TENANT_SLUG', 'azraq'),
    isActive: true,
    createdAt: new Date().toISOString(),
    expiresAt: null,

    branding: {
      name: envOrDefault('VITE_BRAND_NAME', 'أزرق ماركت'),
      subtitle: envOrDefault('VITE_BRAND_SUBTITLE', 'Azraq Market'),
      logoUrl: envOrDefault('VITE_LOGO_URL', '/icon-192.png'),
      faviconUrl: '/favicon.ico',
      primaryColor: envOrDefault('VITE_PRIMARY_COLOR', '#2b5b74'),
      secondaryColor: envOrDefault('VITE_SECONDARY_COLOR', '#f4faff'),
      accentColor: envOrDefault('VITE_ACCENT_COLOR', '#f97316'),
      fontFamily: envOrDefault('VITE_FONT_FAMILY', 'Cairo, sans-serif'),
      borderRadius: 'xl',
    },

    plan: {
      id: planId,
      ...planDef,
    },

    currency: envOrDefault('VITE_CURRENCY', 'EGP'),
    currencySymbol: envOrDefault('VITE_CURRENCY_SYMBOL', 'ج.م'),
    supportPhone: envOrDefault('VITE_SUPPORT_PHONE', ''),
    supportWhatsapp: envOrDefault('VITE_SUPPORT_WHATSAPP', ''),
    deliveryFee: Number(envOrDefault('VITE_DELIVERY_FEE', '0')) || 0,
    minOrderAmount: Number(envOrDefault('VITE_MIN_ORDER_AMOUNT', '0')) || 0,
    taxRate: Number(envOrDefault('VITE_TAX_RATE', '0')) || 0,

    customDomain: envOrDefault('VITE_CUSTOM_DOMAIN', '') || null,
    ownerId: null,
    metadata: {},
  };
}

/**
 * Check if a feature is enabled for a given plan.
 */
export function isFeatureEnabled(feature: FeatureKey, planId: PlanId): boolean {
  const plan = PLAN_DEFINITIONS[planId];
  return plan.features.includes(feature);
}

/**
 * Get the limit value for a given plan.
 */
export function getPlanLimit(limitKey: keyof TenantLimits, planId: PlanId): number | 'unlimited' {
  return PLAN_DEFINITIONS[planId].limits[limitKey];
}
