-- ═══════════════════════════════════════════════════════════════════════
-- Developer SaaS Control Panel - Extended Migration
-- Features: Audit Log, App Labels, Font/Typography Config, Plan Management
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Audit Log — track every important change
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null, -- 'create', 'update', 'delete', 'login', 'export', 'import', etc.
  entity_type text not null, -- 'product', 'order', 'profile', 'setting', 'report', etc.
  entity_id text, -- the id of the affected record
  changes jsonb, -- { field: { old: ..., new: ... } }
  metadata jsonb, -- extra context like IP, user-agent, page
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_actor on public.audit_log(actor_id, created_at desc);
create index if not exists idx_audit_log_entity on public.audit_log(entity_type, entity_id, created_at desc);
create index if not exists idx_audit_log_action on public.audit_log(action, created_at desc);

-- 2. App Labels — every text in the app is customizable
create table if not exists public.app_labels (
  key text primary key, -- e.g., 'nav.home', 'cart.empty_title', 'order.status.new'
  value text not null, -- the current label text
  default_value text not null, -- original default
  category text not null default 'general', -- 'navigation', 'cart', 'orders', 'auth', 'general'
  description text, -- for the developer to understand context
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 3. Typography Configuration
create table if not exists public.app_typography (
  key text primary key, -- e.g., 'font_family_primary', 'font_size_body', 'font_weight_heading'
  value text not null,
  category text not null default 'font', -- 'font', 'size', 'weight', 'spacing'
  label text not null, -- Arabic label for the UI
  css_variable text, -- e.g., '--font-display', '--text-base'
  updated_at timestamptz not null default now()
);

-- Seed default typography values
insert into public.app_typography (key, value, category, label, css_variable) values
  ('font_family_primary', 'Cairo, sans-serif', 'font', 'الخط الأساسي', '--font-primary'),
  ('font_family_display', 'Cairo, sans-serif', 'font', 'خط العناوين', '--font-display'),
  ('font_family_mono', 'IBM Plex Mono, monospace', 'font', 'خط الأكواد', '--font-mono'),
  ('font_size_xs', '0.75rem', 'size', 'حجم صغير جدًا', '--text-xs'),
  ('font_size_sm', '0.875rem', 'size', 'حجم صغير', '--text-sm'),
  ('font_size_base', '1rem', 'size', 'حجم عادي', '--text-base'),
  ('font_size_lg', '1.125rem', 'size', 'حجم كبير', '--text-lg'),
  ('font_size_xl', '1.25rem', 'size', 'حجم كبير جدًا', '--text-xl'),
  ('font_size_2xl', '1.5rem', 'size', 'حجم عنوان', '--text-2xl'),
  ('font_size_3xl', '1.875rem', 'size', 'حجم عنوان كبير', '--text-3xl'),
  ('font_weight_normal', '400', 'weight', 'وزن عادي', '--font-normal'),
  ('font_weight_medium', '500', 'weight', 'وزن متوسط', '--font-medium'),
  ('font_weight_bold', '700', 'weight', 'وزن ثقيل', '--font-bold'),
  ('font_weight_extrabold', '800', 'weight', 'وزن ثقيل جدًا', '--font-extrabold'),
  ('line_height_tight', '1.25', 'spacing', 'تباعد أسطر ضيق', '--leading-tight'),
  ('line_height_normal', '1.5', 'spacing', 'تباعد أسطر عادي', '--leading-normal'),
  ('line_height_relaxed', '1.75', 'spacing', 'تباعد أسطر مريح', '--leading-relaxed'),
  ('letter_spacing_tight', '-0.025em', 'spacing', 'تقارب حروف', '--tracking-tight'),
  ('letter_spacing_normal', '0em', 'spacing', 'مسافة حروف عادية', '--tracking-normal'),
  ('letter_spacing_wide', '0.025em', 'spacing', 'تباعد حروف', '--tracking-wide'),
  ('border_radius_sm', '0.5rem', 'spacing', 'استدارة صغيرة', '--radius-sm'),
  ('border_radius_md', '1rem', 'spacing', 'استدارة متوسطة', '--radius-md'),
  ('border_radius_lg', '1.5rem', 'spacing', 'استدارة كبيرة', '--radius-lg'),
  ('border_radius_full', '9999px', 'spacing', 'استدارة كاملة', '--radius-full')
on conflict (key) do nothing;

-- 4. Plan Configuration (editable from the developer panel)
create table if not exists public.plan_config (
  id text primary key, -- 'free', 'pro', 'enterprise'
  name text not null,
  name_ar text not null,
  price_monthly numeric(10,2) default 0,
  price_yearly numeric(10,2) default 0,
  currency text default 'EGP',
  limits jsonb not null default '{}', -- { "products": 50, "ordersPerMonth": 100, "branches": 1 }
  features jsonb not null default '[]', -- ["products", "orders", "analytics"]
  is_active boolean not null default true,
  sort_order integer not null default 0,
  badge_text text, -- e.g., 'الأكثر شيوعًا', 'للشركات'
  updated_at timestamptz not null default now()
);

-- Seed default plans
insert into public.plan_config (id, name, name_ar, price_monthly, price_yearly, limits, features, sort_order, badge_text) values
  ('free', 'Free', 'مجاني', 0, 0, '{"products": 50, "ordersPerMonth": 100, "branches": 1}', '["products", "orders", "branches"]', 1, null),
  ('pro', 'Pro', 'احترافي', 299, 2990, '{"products": 500, "ordersPerMonth": "unlimited", "branches": 3}', '["products", "orders", "branches", "sms", "analytics"]', 2, 'الأكثر شيوعًا'),
  ('enterprise', 'Enterprise', 'مؤسسات', 799, 7990, '{"products": "unlimited", "ordersPerMonth": "unlimited", "branches": "unlimited"}', '["products", "orders", "branches", "sms", "analytics", "custom_domain", "developer"]', 3, 'للشركات')
on conflict (id) do nothing;

-- 5. Custom CSS (inject arbitrary CSS for deep customization)
create table if not exists public.app_custom_css (
  id text primary key default 'global', -- only one row
  css_content text not null default '',
  is_active boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_custom_css (id, css_content, is_active)
values ('global', '/* Custom CSS — add your overrides here */\n', false)
on conflict (id) do nothing;

-- 6. App Snapshots (for export/import of full app state)
create table if not exists public.app_snapshots (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  snapshot_data jsonb not null, -- full export of settings, labels, typography, plans, features
  version text not null default '1.0',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.audit_log enable row level security;
alter table public.app_labels enable row level security;
alter table public.app_typography enable row level security;
alter table public.plan_config enable row level security;
alter table public.app_custom_css enable row level security;
alter table public.app_snapshots enable row level security;

create policy "Authenticated full access" on public.audit_log for all using (auth.uid() is not null);
create policy "Authenticated full access" on public.app_labels for all using (auth.uid() is not null);
create policy "Authenticated full access" on public.app_typography for all using (auth.uid() is not null);
create policy "Authenticated full access" on public.plan_config for all using (auth.uid() is not null);
create policy "Authenticated full access" on public.app_custom_css for all using (auth.uid() is not null);
create policy "Authenticated full access" on public.app_snapshots for all using (auth.uid() is not null);

-- 7. Helper function: log audit entry
create or replace function public.log_audit(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_changes jsonb default null,
  p_metadata jsonb default null
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, changes, metadata)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, p_changes, p_metadata)
  returning id into v_id;
  return v_id;
end;
$$;
