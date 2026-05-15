-- ============================================================
-- Migration 013: Multi-Tenant Architecture
-- ============================================================
-- Adds the `tenants` table and helper structures to support
-- selling the platform as separate isolated instances.
--
-- Deployment modes supported:
-- 1. Self-hosted (single-tenant): One row in `tenants` per deployment.
-- 2. Central SaaS: Multiple rows, each representing a customer's store.
--
-- In both modes, each tenant gets their own data namespace via RLS
-- using the `tenant_id` foreign key on all resource tables.
-- ============================================================

-- ─── Tenants Table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  logo_url TEXT DEFAULT '/icon-192.png',
  favicon_url TEXT DEFAULT '/favicon.ico',

  -- Branding
  primary_color TEXT DEFAULT '#2b5b74',
  secondary_color TEXT DEFAULT '#f4faff',
  accent_color TEXT DEFAULT '#f97316',
  font_family TEXT DEFAULT 'Cairo, sans-serif',
  border_radius TEXT DEFAULT 'xl',
  login_background TEXT,

  -- Plan & Features
  plan_id TEXT NOT NULL DEFAULT 'enterprise',
  features JSONB DEFAULT '["products","orders","branches","sms","analytics","custom_domain","developer","coupons","promotions","reviews","wishlists","chat","internal_messaging","live_tracking","stock_management","purchase_invoices","pdf_export","excel_export","api_access"]'::jsonb,
  limits JSONB DEFAULT '{"maxProducts":"unlimited","maxOrdersPerMonth":"unlimited","maxBranches":"unlimited","maxStaff":"unlimited","maxStorageMB":"unlimited"}'::jsonb,

  -- Business Settings
  currency TEXT DEFAULT 'EGP',
  currency_symbol TEXT DEFAULT 'ج.م',
  support_phone TEXT DEFAULT '',
  support_whatsapp TEXT DEFAULT '',
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,

  -- Domain
  custom_domain TEXT UNIQUE,

  -- Subscription
  is_active BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  owner_id UUID REFERENCES auth.users(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for domain lookup (used in multi-tenant routing)
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON public.tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_id);

-- ─── Tenant Subscriptions (Payment History) ─────────────────
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired, past_due
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  billing_cycle TEXT DEFAULT 'monthly', -- monthly, yearly
  payment_method TEXT, -- paymob, stripe, bank_transfer, manual
  payment_reference TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON public.tenant_subscriptions(tenant_id);

-- ─── Tenant Usage Tracking ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric TEXT NOT NULL, -- 'products_count', 'orders_this_month', 'storage_mb'
  value NUMERIC NOT NULL DEFAULT 0,
  period TEXT, -- '2025-05' for monthly metrics, NULL for absolute counts
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, metric, period)
);

CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant ON public.tenant_usage(tenant_id);

-- ─── Default Tenant (for existing single-tenant deployments) ─
-- Insert a default tenant row so existing data continues working
INSERT INTO public.tenants (id, slug, name, plan_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'أزرق ماركت', 'enterprise')
ON CONFLICT (slug) DO NOTHING;

-- ─── RLS Policies ───────────────────────────────────────────
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_usage ENABLE ROW LEVEL SECURITY;

-- Tenants: owners can read their own tenant
CREATE POLICY tenant_owner_read ON public.tenants
  FOR SELECT USING (owner_id = auth.uid() OR is_active = true);

-- Tenants: only owner or service_role can update
CREATE POLICY tenant_owner_update ON public.tenants
  FOR UPDATE USING (owner_id = auth.uid());

-- Subscriptions: tenant owner can view
CREATE POLICY subscription_owner_read ON public.tenant_subscriptions
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

-- Usage: tenant owner can view
CREATE POLICY usage_owner_read ON public.tenant_usage
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

-- ─── Helper Function: Get Current Tenant ID ─────────────────
-- In multi-tenant SaaS mode, this would resolve from JWT claims or domain.
-- For self-hosted, it returns the default tenant.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    -- Future: read from JWT claim
    -- (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  );
$$;

-- ─── Update Timestamp Trigger ───────────────────────────────
CREATE OR REPLACE FUNCTION public.update_tenant_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_tenant_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_timestamp();
