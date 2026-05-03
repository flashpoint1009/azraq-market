create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (product_id, customer_id)
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(12,2) not null check (value > 0),
  min_order numeric(12,2) not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  discount_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (coupon_id, user_id, order_id)
);

create table if not exists public.loyalty_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null,
  reason text not null,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.branch_staff (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (branch_id, staff_id)
);

create table if not exists public.product_branches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (product_id, branch_id)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '""'::jsonb,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists delivery_latitude double precision;
alter table public.orders add column if not exists delivery_longitude double precision;
alter table public.orders add column if not exists scheduled_at timestamptz;
alter table public.orders add column if not exists coupon_id uuid references public.coupons(id) on delete set null;
alter table public.orders add column if not exists discount_amount numeric(12,2) not null default 0;
alter table public.orders add column if not exists delivery_fee numeric(12,2) not null default 0;
alter table public.orders add column if not exists loyalty_points_redeemed integer not null default 0;
alter table public.orders add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.product_reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usage enable row level security;
alter table public.loyalty_points enable row level security;
alter table public.branches enable row level security;
alter table public.branch_staff enable row level security;
alter table public.product_branches enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "product_reviews_read" on public.product_reviews;
create policy "product_reviews_read" on public.product_reviews for select using (true);
drop policy if exists "product_reviews_customer_insert" on public.product_reviews;
create policy "product_reviews_customer_insert" on public.product_reviews for insert with check (
  customer_id = auth.uid()
  and exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.customer_id = auth.uid()
      and o.status = 'delivered'
      and oi.product_id = product_id
  )
);
drop policy if exists "product_reviews_customer_update" on public.product_reviews;
create policy "product_reviews_customer_update" on public.product_reviews for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());
drop policy if exists "product_reviews_admin_delete" on public.product_reviews;
create policy "product_reviews_admin_delete" on public.product_reviews for delete using (public.has_permission('products') or public.current_role() = 'admin');

drop policy if exists "wishlists_own_all" on public.wishlists;
create policy "wishlists_own_all" on public.wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "coupons_customer_read" on public.coupons;
create policy "coupons_customer_read" on public.coupons for select using (is_active = true or public.has_permission('orders') or public.current_role() = 'admin');
drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all" on public.coupons for all using (public.has_permission('orders') or public.current_role() = 'admin') with check (public.has_permission('orders') or public.current_role() = 'admin');

drop policy if exists "coupon_usage_own_or_staff" on public.coupon_usage;
create policy "coupon_usage_own_or_staff" on public.coupon_usage for select using (user_id = auth.uid() or public.has_permission('reports') or public.current_role() = 'admin');

drop policy if exists "loyalty_points_own_or_staff" on public.loyalty_points;
create policy "loyalty_points_own_or_staff" on public.loyalty_points for select using (user_id = auth.uid() or public.has_permission('reports') or public.current_role() = 'admin');

drop policy if exists "branches_read" on public.branches;
create policy "branches_read" on public.branches for select using (is_active = true or public.current_role() in ('admin', 'warehouse'));
drop policy if exists "branches_admin_all" on public.branches;
create policy "branches_admin_all" on public.branches for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
drop policy if exists "branch_staff_admin_all" on public.branch_staff;
create policy "branch_staff_admin_all" on public.branch_staff for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
drop policy if exists "product_branches_staff_all" on public.product_branches;
create policy "product_branches_staff_all" on public.product_branches for all using (public.current_role() in ('admin', 'warehouse')) with check (public.current_role() in ('admin', 'warehouse'));

drop policy if exists "app_settings_read" on public.app_settings;
create policy "app_settings_read" on public.app_settings for select using (auth.role() = 'authenticated');
drop policy if exists "app_settings_admin_all" on public.app_settings;
create policy "app_settings_admin_all" on public.app_settings for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

insert into public.app_settings (key, value, description)
values
  ('loyalty_earn_per_egp', to_jsonb(0.1::numeric), 'Earn 1 point per 10 EGP'),
  ('loyalty_redeem_egp_per_100_points', to_jsonb(10::numeric), 'Redeem 100 points as 10 EGP')
on conflict (key) do nothing;

create or replace function public.customer_create_order(
  notes_input text,
  items_input jsonb,
  coupon_code_input text default null,
  loyalty_points_input integer default 0,
  scheduled_at_input timestamptz default null,
  branch_id_input uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid := gen_random_uuid();
  order_total numeric(12,2) := 0;
  final_total numeric(12,2) := 0;
  discount_total numeric(12,2) := 0;
  loyalty_discount numeric(12,2) := 0;
  coupon_row public.coupons%rowtype;
  item jsonb;
  product_row public.products%rowtype;
  qty integer;
  available_points integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if jsonb_typeof(items_input) <> 'array' or jsonb_array_length(items_input) = 0 then
    raise exception 'empty order';
  end if;

  for item in select * from jsonb_array_elements(items_input)
  loop
    qty := greatest(coalesce((item->>'quantity')::integer, 0), 0);
    if qty <= 0 then
      raise exception 'invalid quantity';
    end if;

    select * into product_row
    from public.products
    where id = (item->>'product_id')::uuid
    for update;

    if product_row.id is null or not product_row.is_available or product_row.stock_quantity < qty then
      raise exception 'product unavailable';
    end if;

    order_total := order_total + (product_row.price * qty);
  end loop;

  if coupon_code_input is not null and btrim(coupon_code_input) <> '' then
    select * into coupon_row
    from public.coupons
    where lower(code) = lower(btrim(coupon_code_input))
      and is_active = true
      and (expires_at is null or expires_at > now())
      and (max_uses is null or used_count < max_uses)
    for update;

    if coupon_row.id is null then
      raise exception 'coupon invalid';
    end if;
    if order_total < coupon_row.min_order then
      raise exception 'coupon minimum not reached';
    end if;

    if coupon_row.type = 'percent' then
      discount_total := round(order_total * coupon_row.value / 100, 2);
    else
      discount_total := least(coupon_row.value, order_total);
    end if;
  end if;

  if loyalty_points_input > 0 then
    select coalesce(sum(points), 0) into available_points
    from public.loyalty_points
    where user_id = auth.uid();

    if loyalty_points_input > available_points then
      raise exception 'not enough loyalty points';
    end if;
    loyalty_discount := floor(loyalty_points_input / 100) * 10;
    loyalty_discount := least(loyalty_discount, greatest(order_total - discount_total, 0));
  end if;

  final_total := greatest(order_total - discount_total - loyalty_discount, 0);

  insert into public.orders (
    id, customer_id, status, total_amount, paid_amount, debt_amount, payment_method,
    address, latitude, longitude, notes, scheduled_at, branch_id, coupon_id, discount_amount, loyalty_points_redeemed
  )
  select
    new_order_id, p.id, 'new', final_total, 0, final_total, 'cash_on_delivery',
    p.address, p.latitude, p.longitude, notes_input, scheduled_at_input, branch_id_input, coupon_row.id, discount_total + loyalty_discount, greatest(loyalty_points_input, 0)
  from public.profiles p
  where p.id = auth.uid();

  for item in select * from jsonb_array_elements(items_input)
  loop
    qty := (item->>'quantity')::integer;
    select * into product_row from public.products where id = (item->>'product_id')::uuid for update;

    insert into public.order_items(order_id, product_id, product_name_snapshot, unit_type_snapshot, unit_price_snapshot, quantity, line_total)
    values (new_order_id, product_row.id, product_row.name, product_row.unit_type, product_row.price, qty, product_row.price * qty);

    update public.products
    set stock_quantity = stock_quantity - qty,
        is_available = case when stock_quantity - qty <= 0 then false else is_available end,
        updated_at = now()
    where id = product_row.id;
  end loop;

  if coupon_row.id is not null then
    update public.coupons set used_count = used_count + 1 where id = coupon_row.id;
    insert into public.coupon_usage(coupon_id, user_id, order_id, discount_amount)
    values (coupon_row.id, auth.uid(), new_order_id, discount_total);
  end if;

  if loyalty_points_input > 0 then
    insert into public.loyalty_points(user_id, points, reason, order_id)
    values (auth.uid(), -loyalty_points_input, 'redeemed', new_order_id);
  end if;

  return new_order_id;
end;
$$;

create or replace function public.update_delivery_location(order_id_input uuid, latitude_input double precision, longitude_input double precision)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'delivery' and public.current_role() <> 'admin' then
    raise exception 'not allowed';
  end if;

  update public.orders
  set delivery_latitude = latitude_input,
      delivery_longitude = longitude_input,
      updated_at = now()
  where id = order_id_input
    and status = 'with_delivery';

  return found;
end;
$$;

create or replace function public.award_loyalty_points_for_delivered_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  earned_points integer;
begin
  if new.status = 'delivered' and old.status is distinct from new.status then
    earned_points := floor(new.total_amount / 10);
    if earned_points > 0 then
      insert into public.loyalty_points(user_id, points, reason, order_id)
      values (new.customer_id, earned_points, 'delivered_order', new.id)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists award_loyalty_points_for_delivered_order_trigger on public.orders;
create trigger award_loyalty_points_for_delivered_order_trigger
after update of status on public.orders
for each row execute function public.award_loyalty_points_for_delivered_order();

grant execute on function public.customer_create_order(text, jsonb, text, integer, timestamptz, uuid) to authenticated;
grant execute on function public.update_delivery_location(uuid, double precision, double precision) to authenticated;
