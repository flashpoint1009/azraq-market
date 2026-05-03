insert into public.app_settings(key, value, description)
values
  ('setup_completed', to_jsonb(false), 'First-run setup wizard completion flag'),
  ('plan_id', to_jsonb('enterprise'::text), 'Current SaaS plan id'),
  ('enabled_features', to_jsonb(array['products','orders','branches','sms','analytics','developer']::text[]), 'Feature switches controlled by developer'),
  ('latest_version_url', to_jsonb(''::text), 'Optional version manifest URL for update checks')
on conflict (key) do nothing;

create table if not exists public.feature_flags (
  key text primary key,
  is_enabled boolean not null default true,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

drop policy if exists "feature_flags_read" on public.feature_flags;
create policy "feature_flags_read" on public.feature_flags for select using (auth.role() = 'authenticated');
drop policy if exists "feature_flags_developer_all" on public.feature_flags;
create policy "feature_flags_developer_all" on public.feature_flags
for all using (public.has_permission('developer') or public.has_permission('settings'))
with check (public.has_permission('developer') or public.has_permission('settings'));

insert into public.feature_flags(key, is_enabled, description)
values
  ('analytics', true, 'Advanced reports and charts'),
  ('coupons', true, 'Coupon codes'),
  ('loyalty', true, 'Loyalty points'),
  ('reviews', true, 'Product reviews'),
  ('wishlist', true, 'Customer favorites'),
  ('payments', false, 'Online payment providers'),
  ('sms', false, 'SMS notifications')
on conflict (key) do nothing;
