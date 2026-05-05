-- Keep customer checkout atomic and make product inline discounts part of the saved order total.

create or replace function public.customer_create_order(notes_input text, items_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  subtotal numeric;
  discount numeric;
  final_total numeric;
  order_line jsonb;
  product_row public.products%rowtype;
  line_price numeric;
  line_qty integer;
begin
  if public.current_role() <> 'customer' then
    raise exception 'not allowed';
  end if;

  if items_input is null or jsonb_array_length(items_input) = 0 then
    raise exception 'empty order';
  end if;

  select coalesce(sum((cart_item->>'quantity')::numeric * greatest(0, p.price - case
    when coalesce(p.discount_type, 'none') = 'percent' then least(p.price, p.price * least(coalesce(p.discount_value, 0), 100) / 100)
    when coalesce(p.discount_type, 'none') = 'amount' then least(p.price, coalesce(p.discount_value, 0))
    else 0
  end)), 0)
  into subtotal
  from jsonb_array_elements(items_input) as cart_items(cart_item)
  join public.products p on p.id = (cart_item->>'product_id')::uuid
  where p.is_available = true;

  discount := public.apply_active_promotions(items_input, subtotal);
  final_total := greatest(0, subtotal - discount);

  insert into public.orders (customer_id, status, total_amount, paid_amount, debt_amount, address, latitude, longitude, notes)
  select id, 'new', final_total, 0, final_total, address, latitude, longitude, notes_input
  from public.profiles
  where id = auth.uid()
  returning id into new_order_id;

  for order_line in select * from jsonb_array_elements(items_input)
  loop
    select * into product_row
    from public.products
    where id = (order_line->>'product_id')::uuid
    for update;

    line_qty := (order_line->>'quantity')::integer;

    if product_row.id is null or product_row.is_available = false then
      raise exception 'product unavailable';
    end if;

    if product_row.stock_quantity < line_qty then
      raise exception 'stock is not enough for %', product_row.name;
    end if;

    line_price := greatest(0, product_row.price - case
      when coalesce(product_row.discount_type, 'none') = 'percent' then least(product_row.price, product_row.price * least(coalesce(product_row.discount_value, 0), 100) / 100)
      when coalesce(product_row.discount_type, 'none') = 'amount' then least(product_row.price, coalesce(product_row.discount_value, 0))
      else 0
    end);

    insert into public.order_items (order_id, product_id, product_name_snapshot, unit_type_snapshot, unit_price_snapshot, quantity, line_total)
    values (
      new_order_id,
      product_row.id,
      product_row.name,
      product_row.unit_type,
      line_price,
      line_qty,
      line_price * line_qty
    );

    update public.products
    set stock_quantity = stock_quantity - line_qty,
        is_available = (stock_quantity - line_qty) > 0,
        updated_at = now()
    where id = product_row.id;
  end loop;

  return new_order_id;
end;
$$;

grant execute on function public.customer_create_order(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
