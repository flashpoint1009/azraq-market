-- ============================================================
-- Migration 011: Phase 2 Tables
-- - coupons: discount codes for customers
-- - product_reviews: customer ratings and comments
-- - wishlists: saved products per customer
-- ============================================================

-- 1. Coupons table
create table if not exists public.coupons (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  type        text not null check (type in ('percent', 'fixed')),
  value       numeric(12,2) not null default 0 check (value >= 0),
  min_order   numeric(12,2) not null default 0 check (min_order >= 0),
  max_uses    integer check (max_uses is null or max_uses > 0),
  used_count  integer not null default 0,
  expires_at  timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.coupons enable row level security;

drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "coupons_customer_read" on public.coupons;
create policy "coupons_customer_read" on public.coupons
  for select using (is_active = true and (expires_at is null or expires_at > now()));

create index if not exists idx_coupons_code on public.coupons(code);

-- 2. Product reviews table
create table if not exists public.product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (product_id, user_id)
);

alter table public.product_reviews enable row level security;

drop policy if exists "reviews_select" on public.product_reviews;
create policy "reviews_select" on public.product_reviews
  for select using (auth.role() = 'authenticated');

drop policy if exists "reviews_insert_customer" on public.product_reviews;
create policy "reviews_insert_customer" on public.product_reviews
  for insert with check (
    user_id = auth.uid()
    and public.current_role() = 'customer'
  );

drop policy if exists "reviews_delete_own" on public.product_reviews;
create policy "reviews_delete_own" on public.product_reviews
  for delete using (user_id = auth.uid() or public.is_admin());

create index if not exists idx_reviews_product on public.product_reviews(product_id);
create index if not exists idx_reviews_user on public.product_reviews(user_id);

-- 3. Wishlists table
create table if not exists public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.wishlists enable row level security;

drop policy if exists "wishlists_own" on public.wishlists;
create policy "wishlists_own" on public.wishlists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_wishlists_user on public.wishlists(user_id);
