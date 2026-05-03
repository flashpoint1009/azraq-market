alter table public.categories add column if not exists is_active boolean not null default true;

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists subcategory_id uuid references public.subcategories(id) on delete set null;
alter table public.products add column if not exists stock_quantity integer not null default 0 check (stock_quantity >= 0);
alter table public.products add column if not exists cost_price numeric(12,2) not null default 0 check (cost_price >= 0);
alter table public.products add column if not exists is_active boolean not null default true;
alter table public.products alter column is_available set default true;

alter table public.orders add column if not exists paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0);
alter table public.orders add column if not exists debt_amount numeric(12,2) not null default 0 check (debt_amount >= 0);
alter table public.orders add column if not exists delivery_user_id uuid references public.profiles(id) on delete set null;

create table if not exists public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  supplier_name text,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0),
  line_total numeric(12,2) not null default 0 check (line_total >= 0)
);

create table if not exists public.customer_debts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  remaining_amount numeric(12,2) not null default 0 check (remaining_amount >= 0),
  status text not null default 'open' check (status in ('open', 'paid', 'partial')),
  created_at timestamptz not null default now()
);

create index if not exists idx_subcategories_category_id on public.subcategories(category_id);
create index if not exists idx_products_subcategory_id on public.products(subcategory_id);
create index if not exists idx_products_stock_available on public.products(is_available, stock_quantity);
create index if not exists idx_purchase_items_invoice_id on public.purchase_invoice_items(invoice_id);
create index if not exists idx_customer_debts_customer_id on public.customer_debts(customer_id, status);

alter table public.subcategories enable row level security;
alter table public.purchase_invoices enable row level security;
alter table public.purchase_invoice_items enable row level security;
alter table public.customer_debts enable row level security;

drop policy if exists "subcategories_select" on public.subcategories;
create policy "subcategories_select" on public.subcategories for select using (auth.role() = 'authenticated');
drop policy if exists "subcategories_staff_all" on public.subcategories;
create policy "subcategories_staff_all" on public.subcategories for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "purchase_invoices_staff_all" on public.purchase_invoices;
create policy "purchase_invoices_staff_all" on public.purchase_invoices for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "purchase_invoice_items_staff_all" on public.purchase_invoice_items;
create policy "purchase_invoice_items_staff_all" on public.purchase_invoice_items for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "customer_debts_select" on public.customer_debts;
create policy "customer_debts_select" on public.customer_debts for select using (customer_id = auth.uid() or public.is_staff());
drop policy if exists "customer_debts_staff_all" on public.customer_debts;
create policy "customer_debts_staff_all" on public.customer_debts for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "categories_staff_all" on public.categories;
create policy "categories_staff_all" on public.categories for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "products_staff_all" on public.products;
create policy "products_staff_all" on public.products for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "orders_staff_update" on public.orders;
create policy "orders_staff_update" on public.orders for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists "order_items_staff_all" on public.order_items;
create policy "order_items_staff_all" on public.order_items for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.apply_purchase_invoice_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set stock_quantity = coalesce(stock_quantity, 0) + new.quantity,
      cost_price = new.purchase_price,
      is_available = true
  where id = new.product_id;
  return new;
end;
$$;

drop trigger if exists purchase_invoice_stock_after_insert on public.purchase_invoice_items;
create trigger purchase_invoice_stock_after_insert
after insert on public.purchase_invoice_items
for each row execute function public.apply_purchase_invoice_stock();

create or replace function public.record_order_payment(order_id_input uuid, paid_amount_input numeric, actor_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  remaining numeric(12,2);
begin
  select * into order_row from public.orders where id = order_id_input;
  if not found then
    raise exception 'order not found';
  end if;

  remaining := greatest(order_row.total_amount - paid_amount_input, 0);

  update public.orders
  set paid_amount = paid_amount_input,
      debt_amount = remaining,
      status = 'delivered',
      delivery_user_id = actor_id_input,
      updated_at = now()
  where id = order_id_input;

  insert into public.order_status_history(order_id, status, changed_by)
  values (order_id_input, 'delivered', actor_id_input);

  if remaining > 0 then
    insert into public.customer_debts(customer_id, order_id, amount, paid_amount, remaining_amount, status)
    values (order_row.customer_id, order_id_input, order_row.total_amount, paid_amount_input, remaining, 'open')
    on conflict do nothing;
  end if;
end;
$$;
