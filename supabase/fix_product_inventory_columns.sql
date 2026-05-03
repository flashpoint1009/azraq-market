-- Fix product inventory columns required by Admin/Warehouse product forms.
-- Run this in Supabase SQL Editor if stock is not saved or products show unavailable.

alter table public.products
  add column if not exists stock_quantity integer not null default 0 check (stock_quantity >= 0);

alter table public.products
  add column if not exists is_available boolean not null default true;

alter table public.products
  add column if not exists cost_price numeric(12,2) not null default 0 check (cost_price >= 0);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists subcategory_id uuid null references public.subcategories(id) on delete set null;

alter table public.products
  add column if not exists image_1_url text;

alter table public.products
  add column if not exists image_2_url text;

update public.products
set stock_quantity = 0
where stock_quantity is null;

update public.products
set is_available = true
where is_available is null;

select id, name, stock_quantity, is_available, cost_price
from public.products
order by created_at desc;

notify pgrst, 'reload schema';
