/**
 * Feature Gate Hook
 *
 * Checks if a specific feature is enabled for the current tenant's plan.
 * Returns access info + upgrade prompt helpers.
 *
 * Usage:
 *   const { isAllowed, isLimitReached, remaining, UpgradePrompt } = useFeatureGate('analytics');
 *   if (!isAllowed) return <UpgradePrompt />;
 */
import { useTenant } from './TenantProvider';
import type { FeatureKey, TenantLimits } from './types';

export type FeatureGateResult = {
  /** Whether the feature is included in the current plan */
  isAllowed: boolean;
  /** Name of the feature for display */
  featureName: FeatureKey;
  /** Current plan name */
  planName: string;
  /** Suggested upgrade path */
  upgradeUrl: string;
};

export type LimitGateResult = {
  /** Whether the limit has been reached */
  isLimitReached: boolean;
  /** Current usage count */
  currentUsage: number;
  /** Maximum allowed by plan */
  limit: number | 'unlimited';
  /** Remaining before limit */
  remaining: number | 'unlimited';
  /** Name of the limit */
  limitName: keyof TenantLimits;
};

/**
 * Check if a feature is accessible for the current tenant plan.
 */
export function useFeatureGate(feature: FeatureKey): FeatureGateResult {
  const { canUseFeature, plan } = useTenant();

  return {
    isAllowed: canUseFeature(feature),
    featureName: feature,
    planName: plan.name,
    upgradeUrl: `/admin/developer/saas?upgrade=true&feature=${feature}`,
  };
}

/**
 * Check if a usage limit has been reached for the current tenant plan.
 */
export function useLimitGate(limitKey: keyof TenantLimits, currentUsage: number): LimitGateResult {
  const { getLimit, isLimitReached } = useTenant();
  const limit = getLimit(limitKey);

  return {
    isLimitReached: isLimitReached(limitKey, currentUsage),
    currentUsage,
    limit,
    remaining: limit === 'unlimited' ? 'unlimited' : Math.max(0, limit - currentUsage),
    limitName: limitKey,
  };
}
