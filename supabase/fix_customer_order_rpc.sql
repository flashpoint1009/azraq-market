-- Run this if customer checkout shows: column reference "item" is ambiguous.

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
begin
  if public.current_role() <> 'customer' then
    raise exception 'not allowed';
  end if;

  if jsonb_array_length(items_input) = 0 then
    raise exception 'empty order';
  end if;

  select coalesce(sum((cart_item->>'quantity')::numeric * p.price), 0)
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

    if product_row.id is null or product_row.is_available = false then
      raise exception 'product unavailable';
    end if;

    if product_row.stock_quantity < (order_line->>'quantity')::integer then
      raise exception 'stock is not enough for %', product_row.name;
    end if;

    insert into public.order_items (order_id, product_id, product_name_snapshot, unit_type_snapshot, unit_price_snapshot, quantity, line_total)
    values (
      new_order_id,
      product_row.id,
      product_row.name,
      product_row.unit_type,
      product_row.price,
      (order_line->>'quantity')::integer,
      product_row.price * (order_line->>'quantity')::integer
    );

    update public.products
    set stock_quantity = stock_quantity - (order_line->>'quantity')::integer,
        is_available = (stock_quantity - (order_line->>'quantity')::integer) > 0
    where id = product_row.id;
  end loop;

  return new_order_id;
end;
$$;

grant execute on function public.customer_create_order(text, jsonb) to authenticated;

create table if not exists public.customer_reservations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  reserved_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.customer_reservations enable row level security;

drop policy if exists "customer_reservations_permission_all" on public.customer_reservations;
create policy "customer_reservations_permission_all" on public.customer_reservations
for all using (public.has_permission('customers') or public.current_role() = 'admin')
with check (public.has_permission('customers') or public.current_role() = 'admin');

create or replace function public.admin_create_customer_user(
  phone_input text,
  password_input text,
  full_name_input text,
  address_input text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_phone text;
  user_email text;
  new_user_id uuid := gen_random_uuid();
  created_profile public.profiles%rowtype;
begin
  if not (public.has_permission('customers') or public.current_role() = 'admin') then
    raise exception 'not allowed';
  end if;

  normalized_phone := regexp_replace(coalesce(phone_input, ''), '[^0-9+]', '', 'g');
  if normalized_phone = '' or length(password_input) < 6 then
    raise exception 'invalid phone or password';
  end if;

  user_email := 'phone' || regexp_replace(normalized_phone, '[^0-9]', '', 'g') || '@azraqmarket.app';

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    user_email,
    crypt(password_input, gen_salt('bf')),
    now(),
    jsonb_build_object('phone', normalized_phone, 'full_name', full_name_input, 'role', 'customer', 'address', address_input),
    now(),
    now()
  );

  insert into public.profiles (id, phone, full_name, role, address)
  values (new_user_id, normalized_phone, nullif(full_name_input, ''), 'customer', address_input)
  returning * into created_profile;

  return created_profile;
exception
  when unique_violation then
    raise exception 'المستخدم موجود بالفعل';
end;
$$;

grant execute on function public.admin_create_customer_user(text, text, text, text) to authenticated;
notify pgrst, 'reload schema';
