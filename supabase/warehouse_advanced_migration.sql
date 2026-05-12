-- ═══════════════════════════════════════════════════════════════════════
-- Warehouse Advanced System Migration
-- Features: Stock Movements, Stocktakes, Low Stock Alerts, Returns,
--           Bin Locations, Barcode Support
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Stock Movement Log (every add/subtract with reason)
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment', 'return', 'damage', 'transfer')),
  quantity integer not null,
  previous_quantity integer not null default 0,
  new_quantity integer not null default 0,
  reason text,
  reference_id uuid, -- optional: order_id, invoice_id, stocktake_id, etc.
  reference_type text, -- 'order', 'purchase_invoice', 'stocktake', 'return', 'manual'
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_product on public.stock_movements(product_id, created_at desc);
create index if not exists idx_stock_movements_type on public.stock_movements(movement_type, created_at desc);

-- 2. Stocktakes (Inventory Count Sessions)
create table if not exists public.stocktakes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed', 'cancelled')),
  notes text,
  total_items integer not null default 0,
  discrepancies integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. Stocktake Items (per-product count)
create table if not exists public.stocktake_items (
  id uuid primary key default gen_random_uuid(),
  stocktake_id uuid not null references public.stocktakes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  system_quantity integer not null default 0,
  counted_quantity integer,
  discrepancy integer generated always as (coalesce(counted_quantity, 0) - system_quantity) stored,
  notes text,
  counted_at timestamptz,
  counted_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_stocktake_items_stocktake on public.stocktake_items(stocktake_id);

-- 4. Low Stock Alerts Configuration
create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade unique,
  min_quantity integer not null default 5,
  is_active boolean not null default true,
  last_alerted_at timestamptz,
  created_at timestamptz not null default now()
);

-- 5. Customer Returns
create table if not exists public.customer_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  reason text not null,
  total_amount numeric(12,2) not null default 0,
  notes text,
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.customer_returns(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  condition text default 'good' check (condition in ('good', 'damaged', 'expired'))
);

-- 6. Bin/Shelf Locations
create table if not exists public.bin_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- e.g., 'A1-01', 'B2-03'
  name text not null, -- e.g., 'رف A1 - الرف الأول'
  zone text, -- e.g., 'مبردات', 'مجمدات', 'عادي'
  capacity integer, -- max items this bin can hold
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Product-to-bin mapping (a product can be in multiple bins)
create table if not exists public.product_locations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  bin_location_id uuid not null references public.bin_locations(id) on delete cascade,
  quantity integer not null default 0,
  is_primary boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(product_id, bin_location_id)
);

-- 7. Add barcode/SKU columns to products (if not exist)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'barcode') then
    alter table public.products add column barcode text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'sku') then
    alter table public.products add column sku text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'min_stock_level') then
    alter table public.products add column min_stock_level integer default 5;
  end if;
end $$;

create index if not exists idx_products_barcode on public.products(barcode) where barcode is not null;
create index if not exists idx_products_sku on public.products(sku) where sku is not null;

-- 8. RLS Policies
alter table public.stock_movements enable row level security;
alter table public.stocktakes enable row level security;
alter table public.stocktake_items enable row level security;
alter table public.stock_alerts enable row level security;
alter table public.customer_returns enable row level security;
alter table public.customer_return_items enable row level security;
alter table public.bin_locations enable row level security;
alter table public.product_locations enable row level security;

-- Allow authenticated users to read/write (admin/warehouse enforce in app layer)
create policy "Authenticated users full access" on public.stock_movements for all using (auth.uid() is not null);
create policy "Authenticated users full access" on public.stocktakes for all using (auth.uid() is not null);
create policy "Authenticated users full access" on public.stocktake_items for all using (auth.uid() is not null);
create policy "Authenticated users full access" on public.stock_alerts for all using (auth.uid() is not null);
create policy "Authenticated users full access" on public.customer_returns for all using (auth.uid() is not null);
create policy "Authenticated users full access" on public.customer_return_items for all using (auth.uid() is not null);
create policy "Authenticated users full access" on public.bin_locations for all using (auth.uid() is not null);
create policy "Authenticated users full access" on public.product_locations for all using (auth.uid() is not null);

-- 9. Function: Record stock movement and update product quantity
create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_reason text default null,
  p_reference_id uuid default null,
  p_reference_type text default null,
  p_actor_id uuid default null
) returns uuid
language plpgsql
as $$
declare
  v_current_qty integer;
  v_new_qty integer;
  v_movement_id uuid;
begin
  select stock_quantity into v_current_qty from public.products where id = p_product_id for update;
  if v_current_qty is null then
    raise exception 'Product not found';
  end if;

  if p_movement_type in ('in', 'return') then
    v_new_qty := v_current_qty + p_quantity;
  elsif p_movement_type in ('out', 'damage') then
    v_new_qty := greatest(0, v_current_qty - p_quantity);
  else -- adjustment, transfer
    v_new_qty := p_quantity; -- absolute value for adjustments
  end if;

  update public.products set stock_quantity = v_new_qty, updated_at = now() where id = p_product_id;

  insert into public.stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, reason, reference_id, reference_type, created_by)
  values (p_product_id, p_movement_type, p_quantity, v_current_qty, v_new_qty, p_reason, p_reference_id, p_reference_type, p_actor_id)
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;
