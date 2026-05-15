/**
 * FeatureGate — wrapper component that conditionally renders children
 * based on whether a feature is enabled for the current tenant plan.
 *
 * If the feature is blocked, it shows the UpgradeBanner instead.
 *
 * Usage:
 *   <FeatureGate feature="analytics">
 *     <AnalyticsDashboard />
 *   </FeatureGate>
 *
 *   <FeatureGate feature="stock_management" fallback={<CustomFallback />}>
 *     <StockModule />
 *   </FeatureGate>
 */
import type { ReactNode } from 'react';
import { useTenant } from '../tenants';
import { UpgradeBanner } from './UpgradeBanner';
import type { FeatureKey, TenantLimits } from '../tenants/types';

type FeatureGateProps = {
  feature: FeatureKey;
  children: ReactNode;
  /** Custom fallback instead of the default UpgradeBanner */
  fallback?: ReactNode;
  /** If true, render nothing instead of the upgrade banner */
  hideIfBlocked?: boolean;
};

export function FeatureGate({ feature, children, fallback, hideIfBlocked }: FeatureGateProps) {
  const { canUseFeature } = useTenant();

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  if (hideIfBlocked) return null;
  if (fallback) return <>{fallback}</>;

  return (
    <div className="mx-auto max-w-lg py-8">
      <UpgradeBanner feature={feature} />
    </div>
  );
}

/**
 * LimitGate — wrapper that checks usage limits.
 *
 * Usage:
 *   <LimitGate limitKey="maxProducts" currentUsage={products.length}>
 *     <AddProductButton />
 *   </LimitGate>
 */
type LimitGateProps = {
  limitKey: keyof TenantLimits;
  currentUsage: number;
  children: ReactNode;
  /** Custom fallback */
  fallback?: ReactNode;
  /** If true, render nothing when limit reached */
  hideIfReached?: boolean;
};

export function LimitGate({ limitKey, currentUsage, children, fallback, hideIfReached }: LimitGateProps) {
  const { isLimitReached, getLimit } = useTenant();

  if (!isLimitReached(limitKey, currentUsage)) {
    return <>{children}</>;
  }

  if (hideIfReached) return null;
  if (fallback) return <>{fallback}</>;

  const limit = getLimit(limitKey);
  if (limit === 'unlimited') return <>{children}</>;

  return (
    <div className="mx-auto max-w-lg py-4">
      <UpgradeBanner variant="limit" limitName={limitKey} currentUsage={currentUsage} limit={limit} />
    </div>
  );
}
