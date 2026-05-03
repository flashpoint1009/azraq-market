create extension if not exists "pgcrypto";

alter table public.categories add column if not exists is_active boolean not null default true;

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.subcategories add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists app_permissions text[] null;
alter table public.orders add column if not exists paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0);
alter table public.orders add column if not exists debt_amount numeric(12,2) not null default 0 check (debt_amount >= 0);

create or replace function public.has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and (
          role = 'admin'
          and (
            app_permissions is null
            or cardinality(app_permissions) = 0
            or permission_key = any(app_permissions)
          )
        )
    ),
    false
  )
$$;

create or replace function public.admin_change_order_status(order_id_input uuid, status_input public.order_status, actor_id_input uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.has_permission('orders') or public.current_role() in ('admin', 'warehouse', 'delivery')) then
    raise exception 'not allowed';
  end if;

  update public.orders
  set status = status_input,
      updated_at = now()
  where id = order_id_input;

  insert into public.order_status_history(order_id, status, changed_by)
  values (order_id_input, status_input, actor_id_input)
  on conflict do nothing;

  return true;
end;
$$;

create or replace function public.admin_create_staff_user(
  phone_input text,
  password_input text,
  full_name_input text,
  role_input public.user_role,
  permissions_input text[] default '{}'
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
  if not public.has_permission('users') then
    raise exception 'not allowed';
  end if;

  if role_input = 'customer' then
    raise exception 'staff role required';
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
    jsonb_build_object('phone', normalized_phone, 'full_name', full_name_input, 'role', role_input),
    now(),
    now()
  );

  insert into public.profiles (id, phone, full_name, role, app_permissions)
  values (
    new_user_id,
    normalized_phone,
    nullif(full_name_input, ''),
    role_input,
    case when role_input = 'admin' then permissions_input else '{}'::text[] end
  )
  returning * into created_profile;

  return created_profile;
exception
  when unique_violation then
    raise exception 'المستخدم موجود بالفعل';
end;
$$;

grant execute on function public.admin_change_order_status(uuid, public.order_status, uuid) to authenticated;
grant execute on function public.admin_create_staff_user(text, text, text, public.user_role, text[]) to authenticated;

drop policy if exists "categories_admin_all" on public.categories;
drop policy if exists "categories_staff_all" on public.categories;
create policy "categories_permission_all" on public.categories
for all using (public.has_permission('categories') or public.has_permission('products') or public.current_role() in ('admin', 'warehouse'))
with check (public.has_permission('categories') or public.has_permission('products') or public.current_role() in ('admin', 'warehouse'));

alter table public.subcategories enable row level security;
drop policy if exists "subcategories_select" on public.subcategories;
drop policy if exists "subcategories_staff_all" on public.subcategories;
create policy "subcategories_select_authenticated" on public.subcategories
for select using (auth.role() = 'authenticated');
create policy "subcategories_permission_all" on public.subcategories
for all using (public.has_permission('categories') or public.has_permission('products') or public.current_role() in ('admin', 'warehouse'))
with check (public.has_permission('categories') or public.has_permission('products') or public.current_role() in ('admin', 'warehouse'));

drop policy if exists "products_admin_all" on public.products;
drop policy if exists "products_staff_all" on public.products;
create policy "products_permission_insert" on public.products
for insert with check (public.has_permission('products') or public.current_role() in ('admin', 'warehouse'));
create policy "products_permission_update" on public.products
for update using (public.has_permission('products') or public.current_role() in ('admin', 'warehouse'))
with check (public.has_permission('products') or public.current_role() in ('admin', 'warehouse'));
create policy "products_permission_delete" on public.products
for delete using (public.has_permission('products') or public.current_role() in ('admin', 'warehouse'));

do $$
begin
  if to_regclass('public.purchase_invoices') is not null then
    drop policy if exists "purchase_invoices_staff_all" on public.purchase_invoices;
    drop policy if exists "purchase_invoices_permission_all" on public.purchase_invoices;
    create policy "purchase_invoices_permission_all" on public.purchase_invoices
    for all using (public.has_permission('purchases') or public.current_role() in ('admin', 'warehouse'))
    with check (public.has_permission('purchases') or public.current_role() in ('admin', 'warehouse'));
  end if;

  if to_regclass('public.purchase_invoice_items') is not null then
    drop policy if exists "purchase_invoice_items_staff_all" on public.purchase_invoice_items;
    drop policy if exists "purchase_invoice_items_permission_all" on public.purchase_invoice_items;
    create policy "purchase_invoice_items_permission_all" on public.purchase_invoice_items
    for all using (public.has_permission('purchases') or public.current_role() in ('admin', 'warehouse'))
    with check (public.has_permission('purchases') or public.current_role() in ('admin', 'warehouse'));
  end if;
end
$$;

drop policy if exists "orders_staff_update" on public.orders;
create policy "orders_permission_update" on public.orders
for update using (public.has_permission('orders') or public.current_role() in ('admin', 'warehouse', 'delivery'))
with check (public.has_permission('orders') or public.current_role() in ('admin', 'warehouse', 'delivery'));

drop policy if exists "order_items_staff_update" on public.order_items;
drop policy if exists "order_items_staff_all" on public.order_items;
create policy "order_items_permission_update" on public.order_items
for update using (public.has_permission('orders') or public.current_role() in ('admin', 'warehouse'))
with check (public.has_permission('orders') or public.current_role() in ('admin', 'warehouse'));

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_permission_update" on public.profiles
for update using (id = auth.uid() or public.has_permission('users') or public.current_role() = 'admin')
with check (id = auth.uid() or public.has_permission('users') or public.current_role() = 'admin');
