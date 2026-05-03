import type { Profile } from '../types/database';
import { hasPermission } from '../lib/permissions';

export type PlanId = 'free' | 'pro' | 'enterprise';

export type FeatureKey =
  | 'products'
  | 'orders'
  | 'branches'
  | 'sms'
  | 'analytics'
  | 'custom_domain'
  | 'developer';

export const SAAS_PLANS: Record<PlanId, { name: string; limits: Record<string, number | 'unlimited'>; features: FeatureKey[] }> = {
  free: {
    name: 'Free',
    limits: { products: 50, ordersPerMonth: 100, branches: 1 },
    features: ['products', 'orders', 'branches'],
  },
  pro: {
    name: 'Pro',
    limits: { products: 500, ordersPerMonth: 'unlimited', branches: 3 },
    features: ['products', 'orders', 'branches', 'sms', 'analytics'],
  },
  enterprise: {
    name: 'Enterprise',
    limits: { products: 'unlimited', ordersPerMonth: 'unlimited', branches: 'unlimited' },
    features: ['products', 'orders', 'branches', 'sms', 'analytics', 'custom_domain', 'developer'],
  },
};

export function planFromEnv(): PlanId {
  const value = (import.meta.env.VITE_PLAN_ID || 'enterprise') as PlanId;
  return value in SAAS_PLANS ? value : 'enterprise';
}

export function canUse(feature: FeatureKey, profile?: Profile | null, planId: PlanId = planFromEnv()) {
  if (profile && hasPermission(profile, 'developer')) return true;
  return SAAS_PLANS[planId].features.includes(feature);
}
