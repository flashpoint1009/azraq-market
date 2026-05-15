/**
 * Billing API — subscription management, checkout, and usage tracking.
 *
 * Supports two modes:
 * 1. Self-hosted: Manual plan switching via admin panel
 * 2. SaaS: Paymob/Stripe integration for automated billing
 */
import { supabase } from '../lib/supabase';
import type { PlanId } from '../tenants/types';

// ─── Types ───

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing';
export type BillingCycle = 'monthly' | 'yearly';

export type Subscription = {
  id: string;
  tenant_id: string;
  plan_id: PlanId;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  payment_method: string | null;
  payment_reference: string | null;
  starts_at: string;
  ends_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

export type UsageMetric = {
  id: string;
  tenant_id: string;
  metric: string;
  value: number;
  period: string | null;
  updated_at: string;
};

export type CheckoutInput = {
  planId: PlanId;
  billingCycle: BillingCycle;
  tenantId: string;
};

export type Invoice = {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  paid_at: string | null;
  created_at: string;
};

// ─── Fetch Functions ───

export async function fetchCurrentSubscription(tenantId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Subscription | null;
}

export async function fetchSubscriptionHistory(tenantId: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data || []) as Subscription[];
}

export async function fetchUsageMetrics(tenantId: string): Promise<UsageMetric[]> {
  const { data, error } = await supabase
    .from('tenant_usage')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []) as UsageMetric[];
}

// ─── Mutations ───

/**
 * Create a new subscription (for manual/admin plan changes).
 * In production SaaS mode, this would be triggered by a payment webhook.
 */
export async function createSubscription(input: {
  tenantId: string;
  planId: PlanId;
  billingCycle: BillingCycle;
  amount: number;
  paymentMethod?: string;
  paymentReference?: string;
}): Promise<Subscription> {
  const now = new Date();
  const endsAt = new Date(now);
  if (input.billingCycle === 'monthly') {
    endsAt.setMonth(endsAt.getMonth() + 1);
  } else {
    endsAt.setFullYear(endsAt.getFullYear() + 1);
  }

  // Cancel any existing active subscriptions
  await supabase
    .from('tenant_subscriptions')
    .update({ status: 'cancelled', cancelled_at: now.toISOString() })
    .eq('tenant_id', input.tenantId)
    .in('status', ['active', 'trialing']);

  // Create new subscription
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .insert({
      tenant_id: input.tenantId,
      plan_id: input.planId,
      status: 'active',
      amount: input.amount,
      billing_cycle: input.billingCycle,
      payment_method: input.paymentMethod || null,
      payment_reference: input.paymentReference || null,
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;

  // Update tenant plan
  await supabase
    .from('tenants')
    .update({
      plan_id: input.planId,
      expires_at: endsAt.toISOString(),
      is_active: true,
    })
    .eq('id', input.tenantId);

  return data as Subscription;
}

/**
 * Cancel the current subscription.
 * The tenant keeps access until the end of the billing period.
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('tenant_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) throw error;
}

/**
 * Start a free trial for a tenant.
 */
export async function startFreeTrial(tenantId: string, planId: PlanId, durationDays = 14): Promise<Subscription> {
  const now = new Date();
  const trialEnds = new Date(now);
  trialEnds.setDate(trialEnds.getDate() + durationDays);

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .insert({
      tenant_id: tenantId,
      plan_id: planId,
      status: 'trialing',
      amount: 0,
      billing_cycle: 'monthly',
      starts_at: now.toISOString(),
      ends_at: trialEnds.toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;

  // Update tenant
  await supabase
    .from('tenants')
    .update({
      plan_id: planId,
      trial_ends_at: trialEnds.toISOString(),
      is_active: true,
    })
    .eq('id', tenantId);

  return data as Subscription;
}

/**
 * Update usage metric for a tenant.
 * Called by backend/edge functions after order creation, product addition, etc.
 */
export async function updateUsageMetric(
  tenantId: string,
  metric: string,
  value: number,
  period?: string
): Promise<void> {
  const { error } = await supabase
    .from('tenant_usage')
    .upsert(
      {
        tenant_id: tenantId,
        metric,
        value,
        period: period || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,metric,period' }
    );

  if (error) throw error;
}

/**
 * Generate a checkout URL (placeholder for Paymob/Stripe integration).
 * In production, this calls the payment gateway API.
 */
export async function createCheckoutSession(input: CheckoutInput): Promise<{ url: string; sessionId: string }> {
  // TODO: Integrate with Paymob or Stripe
  // For now, return a placeholder that the admin can use for manual activation
  const sessionId = crypto.randomUUID();
  return {
    url: `/admin/billing/confirm?session=${sessionId}&plan=${input.planId}&cycle=${input.billingCycle}`,
    sessionId,
  };
}
