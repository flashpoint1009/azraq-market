-- Run this after business_features_migration.sql to support "all products" quantity and bundle promotions.

create or replace function public.apply_active_promotions(items_input jsonb, subtotal numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  discount numeric := 0;
  promo record;
  line_amount numeric;
  bundle_amount numeric;
begin
  for promo in
    select *
    from public.promotions
    where is_active = true and starts_at <= now() and ends_at >= now()
  loop
    if promo.promotion_type = 'order_total' and subtotal >= coalesce(promo.min_order_amount, 0) then
      discount := discount + case when promo.discount_type = 'percentage' then subtotal * promo.discount_value / 100 else promo.discount_value end;
    elsif promo.promotion_type = 'product' then
      select coalesce(sum((cart_item->>'quantity')::numeric * p.price), 0)
      into line_amount
      from jsonb_array_elements(items_input) as cart_items(cart_item)
      join public.products p on p.id = (cart_item->>'product_id')::uuid
      where p.id = promo.product_id;
      discount := discount + case when promo.discount_type = 'percentage' then line_amount * promo.discount_value / 100 else least(line_amount, promo.discount_value) end;
    elsif promo.promotion_type = 'quantity' then
      select coalesce(sum((cart_item->>'quantity')::numeric * p.price), 0)
      into line_amount
      from jsonb_array_elements(items_input) as cart_items(cart_item)
      join public.products p on p.id = (cart_item->>'product_id')::uuid
      where (promo.product_id is null or p.id = promo.product_id)
        and (cart_item->>'quantity')::integer >= coalesce(promo.min_quantity, 1);
      discount := discount + case when promo.discount_type = 'percentage' then line_amount * promo.discount_value / 100 else least(line_amount, promo.discount_value) end;
    elsif promo.promotion_type = 'bundle' then
      if promo.product_ids is null or array_length(promo.product_ids, 1) is null then
        if (
          select count(distinct (cart_item->>'product_id')::uuid)
          from jsonb_array_elements(items_input) as cart_items(cart_item)
        ) >= coalesce(promo.min_quantity, 2) then
          bundle_amount := subtotal;
          discount := discount + case when promo.discount_type = 'percentage' then bundle_amount * promo.discount_value / 100 else least(bundle_amount, promo.discount_value) end;
        end if;
      elsif promo.product_ids is not null then
        if (
          select bool_and(exists (
            select 1 from jsonb_array_elements(items_input) as cart_items(cart_item) where (cart_item->>'product_id')::uuid = pid
          ))
          from unnest(promo.product_ids) pid
        ) then
          select coalesce(sum((cart_item->>'quantity')::numeric * p.price), 0)
          into bundle_amount
          from jsonb_array_elements(items_input) as cart_items(cart_item)
          join public.products p on p.id = (cart_item->>'product_id')::uuid
          where p.id = any(promo.product_ids);
          discount := discount + case when promo.discount_type = 'percentage' then bundle_amount * promo.discount_value / 100 else least(bundle_amount, promo.discount_value) end;
        end if;
      end if;
    end if;
  end loop;

  return least(subtotal, coalesce(discount, 0));
end;
$$;
