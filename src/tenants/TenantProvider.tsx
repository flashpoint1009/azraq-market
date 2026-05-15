/**
 * TenantProvider — React Context that provides tenant configuration to the entire app.
 *
 * Wraps the app and provides:
 * - Tenant branding (name, logo, colors)
 * - Plan & feature flags
 * - Business settings (currency, delivery fee, etc.)
 *
 * Usage:
 *   const { tenant, branding, plan, canUseFeature } = useTenant();
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { FeatureKey, TenantBranding, TenantConfig, TenantLimits, TenantPlan } from './types';
import { loadTenantFromEnv } from './tenantLoader';

type TenantContextValue = {
  tenant: TenantConfig;
  branding: TenantBranding;
  plan: TenantPlan;

  // Feature access helpers
  canUseFeature: (feature: FeatureKey) => boolean;
  getLimit: (key: keyof TenantLimits) => number | 'unlimited';
  isLimitReached: (key: keyof TenantLimits, currentUsage: number) => boolean;

  // Computed values
  isExpired: boolean;
  isPaid: boolean;
};

const TenantContext = createContext<TenantContextValue | null>(null);

// Load once at module level (synchronous from env vars)
const tenantConfig = loadTenantFromEnv();

export function TenantProvider({ children }: { children: ReactNode }) {
  const value = useMemo<TenantContextValue>(() => {
    const { branding, plan } = tenantConfig;

    const canUseFeature = (feature: FeatureKey): boolean => {
      return plan.features.includes(feature);
    };

    const getLimit = (key: keyof TenantLimits): number | 'unlimited' => {
      return plan.limits[key];
    };

    const isLimitReached = (key: keyof TenantLimits, currentUsage: number): boolean => {
      const limit = plan.limits[key];
      if (limit === 'unlimited') return false;
      return currentUsage >= limit;
    };

    const isExpired = tenantConfig.expiresAt
      ? new Date(tenantConfig.expiresAt) < new Date()
      : false;

    const isPaid = plan.id !== 'free';

    return {
      tenant: tenantConfig,
      branding,
      plan,
      canUseFeature,
      getLimit,
      isLimitReached,
      isExpired,
      isPaid,
    };
  }, []);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

/**
 * Hook to access tenant configuration anywhere in the app.
 */
export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
}
