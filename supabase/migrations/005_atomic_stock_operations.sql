create table if not exists public.purchase_returns (
  id uuid primary key default gen_random_uuid(),
  supplier_name text,
  notes text,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.purchase_returns(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0),
  line_total numeric(12,2) not null default 0 check (line_total >= 0)
);

alter table public.purchase_invoices add column if not exists notes text;
alter table public.purchase_returns enable row level security;
alter table public.purchase_return_items enable row level security;

drop policy if exists "purchase_returns_staff_all" on public.purchase_returns;
create policy "purchase_returns_staff_all" on public.purchase_returns
for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "purchase_return_items_staff_all" on public.purchase_return_items;
create policy "purchase_return_items_staff_all" on public.purchase_return_items
for all using (public.is_staff()) with check (public.is_staff());

create index if not exists idx_purchase_return_items_return_id on public.purchase_return_items(return_id);

drop trigger if exists purchase_invoice_stock_after_insert on public.purchase_invoice_items;

create or replace function public.process_purchase_invoice(items jsonb, supplier text, notes text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_id uuid;
  item jsonb;
  product_id_value uuid;
  quantity_value integer;
  purchase_price_value numeric(12,2);
  total_value numeric(12,2) := 0;
begin
  if not public.is_staff() then
    raise exception 'not allowed';
  end if;

  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'items must be a non-empty array';
  end if;

  for item in select * from jsonb_array_elements(items)
  loop
    quantity_value := coalesce((item->>'quantity')::integer, 0);
    purchase_price_value := coalesce((item->>'purchase_price')::numeric, 0);
    if quantity_value <= 0 or purchase_price_value < 0 or nullif(item->>'product_id', '') is null then
      raise exception 'invalid purchase invoice item';
    end if;
    total_value := total_value + (quantity_value * purchase_price_value);
  end loop;

  insert into public.purchase_invoices (supplier_name, notes, total_amount, created_by)
  values (nullif(supplier, ''), nullif(notes, ''), total_value, auth.uid())
  returning id into invoice_id;

  for item in select * from jsonb_array_elements(items)
  loop
    product_id_value := (item->>'product_id')::uuid;
    quantity_value := (item->>'quantity')::integer;
    purchase_price_value := (item->>'purchase_price')::numeric;

    insert into public.purchase_invoice_items (invoice_id, product_id, quantity, purchase_price, line_total)
    values (invoice_id, product_id_value, quantity_value, purchase_price_value, quantity_value * purchase_price_value);

    update public.products
    set stock_quantity = coalesce(stock_quantity, 0) + quantity_value,
        cost_price = purchase_price_value,
        is_available = true,
        updated_at = now()
    where id = product_id_value;

    if not found then
      raise exception 'product not found: %', product_id_value;
    end if;
  end loop;

  return invoice_id;
end;
$$;

create or replace function public.process_purchase_return(items jsonb, supplier text, notes text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  return_id uuid;
  item jsonb;
  product_id_value uuid;
  quantity_value integer;
  purchase_price_value numeric(12,2);
  total_value numeric(12,2) := 0;
begin
  if not public.is_staff() then
    raise exception 'not allowed';
  end if;

  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'items must be a non-empty array';
  end if;

  for item in select * from jsonb_array_elements(items)
  loop
    quantity_value := coalesce((item->>'quantity')::integer, 0);
    purchase_price_value := coalesce((item->>'purchase_price')::numeric, 0);
    if quantity_value <= 0 or purchase_price_value < 0 or nullif(item->>'product_id', '') is null then
      raise exception 'invalid purchase return item';
    end if;
    total_value := total_value + (quantity_value * purchase_price_value);
  end loop;

  insert into public.purchase_returns (supplier_name, notes, total_amount, created_by)
  values (nullif(supplier, ''), nullif(notes, ''), total_value, auth.uid())
  returning id into return_id;

  for item in select * from jsonb_array_elements(items)
  loop
    product_id_value := (item->>'product_id')::uuid;
    quantity_value := (item->>'quantity')::integer;
    purchase_price_value := (item->>'purchase_price')::numeric;

    update public.products
    set stock_quantity = greatest(coalesce(stock_quantity, 0) - quantity_value, 0),
        updated_at = now()
    where id = product_id_value;

    if not found then
      raise exception 'product not found: %', product_id_value;
    end if;

    insert into public.purchase_return_items (return_id, product_id, quantity, purchase_price, line_total)
    values (return_id, product_id_value, quantity_value, purchase_price_value, quantity_value * purchase_price_value);
  end loop;

  return return_id;
end;
$$;

create or replace function public.customer_create_order(notes_input text, items_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_id uuid;
  item jsonb;
  product_row public.products%rowtype;
  quantity_value integer;
  unit_price_value numeric(12,2);
  line_total_value numeric(12,2);
  total_value numeric(12,2) := 0;
  customer_row public.profiles%rowtype;
begin
  select * into customer_row from public.profiles where id = auth.uid() and role = 'customer';
  if not found then
    raise exception 'customer profile not found';
  end if;

  if jsonb_typeof(items_input) <> 'array' or jsonb_array_length(items_input) = 0 then
    raise exception 'items must be a non-empty array';
  end if;

  for item in select * from jsonb_array_elements(items_input)
  loop
    quantity_value := coalesce((item->>'quantity')::integer, 0);
    if quantity_value <= 0 or nullif(item->>'product_id', '') is null then
      raise exception 'invalid order item';
    end if;

    select * into product_row
    from public.products
    where id = (item->>'product_id')::uuid
      and is_available = true
    for update;

    if not found then
      raise exception 'product not found or unavailable';
    end if;

    if coalesce(product_row.stock_quantity, 0) < quantity_value then
      raise exception 'insufficient stock for product %', product_row.id;
    end if;

    unit_price_value := product_row.price;
    line_total_value := unit_price_value * quantity_value;
    total_value := total_value + line_total_value;
  end loop;

  insert into public.orders (customer_id, status, total_amount, paid_amount, debt_amount, address, latitude, longitude, notes)
  values (customer_row.id, 'new', total_value, 0, total_value, customer_row.address, customer_row.latitude, customer_row.longitude, nullif(notes_input, ''))
  returning id into order_id;

  for item in select * from jsonb_array_elements(items_input)
  loop
    quantity_value := (item->>'quantity')::integer;

    select * into product_row
    from public.products
    where id = (item->>'product_id')::uuid
    for update;

    unit_price_value := product_row.price;
    line_total_value := unit_price_value * quantity_value;

    insert into public.order_items (order_id, product_id, product_name_snapshot, unit_type_snapshot, unit_price_snapshot, quantity, line_total)
    values (order_id, product_row.id, product_row.name, product_row.unit_type, unit_price_value, quantity_value, line_total_value);

    update public.products
    set stock_quantity = stock_quantity - quantity_value,
        is_available = (stock_quantity - quantity_value) > 0,
        updated_at = now()
    where id = product_row.id;
  end loop;

  return order_id;
end;
$$;

grant execute on function public.process_purchase_invoice(jsonb, text, text) to authenticated;
grant execute on function public.process_purchase_return(jsonb, text, text) to authenticated;
grant execute on function public.customer_create_order(text, jsonb) to authenticated;
