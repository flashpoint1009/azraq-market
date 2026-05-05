-- Atomic purchase and return operations.
-- Run this in Supabase SQL Editor before using Admin > Purchases.

create or replace function public.process_purchase_invoice(items jsonb, supplier text, notes text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_id uuid;
  line jsonb;
  product_row public.products%rowtype;
  qty numeric;
  unit_cost numeric;
  total numeric := 0;
begin
  if not (public.has_permission('purchases') or public.current_role() = 'admin') then
    raise exception 'not allowed';
  end if;

  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'empty purchase invoice';
  end if;

  for line in select * from jsonb_array_elements(items)
  loop
    qty := greatest(0, coalesce((line->>'quantity')::numeric, 0));
    unit_cost := greatest(0, coalesce((line->>'purchase_price')::numeric, 0));
    total := total + qty * unit_cost;
  end loop;

  insert into public.purchase_invoices (supplier_name, total_amount, created_by)
  values (nullif(supplier, ''), total, auth.uid())
  returning id into invoice_id;

  for line in select * from jsonb_array_elements(items)
  loop
    qty := greatest(0, coalesce((line->>'quantity')::numeric, 0));
    unit_cost := greatest(0, coalesce((line->>'purchase_price')::numeric, 0));

    if qty <= 0 then
      continue;
    end if;

    select * into product_row
    from public.products
    where id = (line->>'product_id')::uuid
    for update;

    if product_row.id is null then
      raise exception 'product not found';
    end if;

    insert into public.purchase_invoice_items (invoice_id, product_id, quantity, purchase_price, line_total)
    values (invoice_id, product_row.id, qty, unit_cost, qty * unit_cost);

    update public.products
    set stock_quantity = coalesce(stock_quantity, 0) + qty,
        cost_price = unit_cost,
        is_available = true,
        updated_at = now()
    where id = product_row.id;
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
  line jsonb;
  product_row public.products%rowtype;
  qty numeric;
  unit_cost numeric;
  total numeric := 0;
  next_stock numeric;
begin
  if not (public.has_permission('purchases') or public.current_role() = 'admin') then
    raise exception 'not allowed';
  end if;

  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'empty purchase return';
  end if;

  for line in select * from jsonb_array_elements(items)
  loop
    qty := greatest(0, coalesce((line->>'quantity')::numeric, 0));
    unit_cost := greatest(0, coalesce((line->>'purchase_price')::numeric, 0));
    total := total + qty * unit_cost;
  end loop;

  insert into public.purchase_returns (supplier_name, total_amount, created_by)
  values (nullif(supplier, ''), total, auth.uid())
  returning id into return_id;

  for line in select * from jsonb_array_elements(items)
  loop
    qty := greatest(0, coalesce((line->>'quantity')::numeric, 0));
    unit_cost := greatest(0, coalesce((line->>'purchase_price')::numeric, 0));

    if qty <= 0 then
      continue;
    end if;

    select * into product_row
    from public.products
    where id = (line->>'product_id')::uuid
    for update;

    if product_row.id is null then
      raise exception 'product not found';
    end if;

    next_stock := greatest(0, coalesce(product_row.stock_quantity, 0) - qty);

    insert into public.purchase_return_items (return_id, product_id, quantity, purchase_price, line_total)
    values (return_id, product_row.id, qty, unit_cost, qty * unit_cost);

    update public.products
    set stock_quantity = next_stock,
        is_available = next_stock > 0,
        updated_at = now()
    where id = product_row.id;
  end loop;

  return return_id;
end;
$$;

grant execute on function public.process_purchase_invoice(jsonb, text, text) to authenticated;
grant execute on function public.process_purchase_return(jsonb, text, text) to authenticated;

notify pgrst, 'reload schema';
