-- Azraq Market root RLS fix for roles, products, orders, purchases, debts, and product image uploads.
-- Run after schema.sql and operational migrations.

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin_or_warehouse()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role() in ('admin', 'warehouse'), false)
$$;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.purchase_invoices enable row level security;
alter table public.purchase_invoice_items enable row level security;
alter table public.customer_debts enable row level security;

drop policy if exists "categories_select" on public.categories;
drop policy if exists "categories_admin_all" on public.categories;
drop policy if exists "azraq_categories_roles_select" on public.categories;
drop policy if exists "azraq_categories_staff_select" on public.categories;
drop policy if exists "azraq_categories_read_roles_v2" on public.categories;
drop policy if exists "azraq_categories_admin_all_v2" on public.categories;
drop policy if exists "azraq_categories_warehouse_insert_v2" on public.categories;
drop policy if exists "azraq_categories_warehouse_update_v2" on public.categories;

create policy "fix_categories_select_roles" on public.categories
for select using (public.get_my_role() in ('customer', 'admin', 'warehouse', 'delivery'));
create policy "fix_categories_admin_warehouse_insert" on public.categories
for insert with check (public.is_admin_or_warehouse());
create policy "fix_categories_admin_warehouse_update" on public.categories
for update using (public.is_admin_or_warehouse()) with check (public.is_admin_or_warehouse());
create policy "fix_categories_admin_warehouse_delete" on public.categories
for delete using (public.is_admin_or_warehouse());

drop policy if exists "subcategories_select" on public.subcategories;
drop policy if exists "subcategories_admin_all" on public.subcategories;
drop policy if exists "azraq_subcategories_roles_select" on public.subcategories;
drop policy if exists "azraq_subcategories_staff_select" on public.subcategories;
drop policy if exists "azraq_subcategories_read_roles_v2" on public.subcategories;
drop policy if exists "azraq_subcategories_admin_all_v2" on public.subcategories;
drop policy if exists "azraq_subcategories_warehouse_insert_v2" on public.subcategories;
drop policy if exists "azraq_subcategories_warehouse_update_v2" on public.subcategories;

create policy "fix_subcategories_select_roles" on public.subcategories
for select using (public.get_my_role() in ('customer', 'admin', 'warehouse', 'delivery'));
create policy "fix_subcategories_admin_warehouse_insert" on public.subcategories
for insert with check (public.is_admin_or_warehouse());
create policy "fix_subcategories_admin_warehouse_update" on public.subcategories
for update using (public.is_admin_or_warehouse()) with check (public.is_admin_or_warehouse());
create policy "fix_subcategories_admin_warehouse_delete" on public.subcategories
for delete using (public.is_admin_or_warehouse());

drop policy if exists "products_select" on public.products;
drop policy if exists "products_admin_all" on public.products;
drop policy if exists "azraq_products_roles_select" on public.products;
drop policy if exists "azraq_products_admin_all" on public.products;
drop policy if exists "azraq_products_warehouse_insert" on public.products;
drop policy if exists "azraq_products_warehouse_update" on public.products;
drop policy if exists "azraq_products_staff_select" on public.products;
drop policy if exists "azraq_products_staff_insert" on public.products;
drop policy if exists "azraq_products_staff_update" on public.products;
drop policy if exists "azraq_products_read_roles_v2" on public.products;
drop policy if exists "azraq_products_admin_all_v2" on public.products;
drop policy if exists "azraq_products_warehouse_insert_v2" on public.products;
drop policy if exists "azraq_products_warehouse_update_v2" on public.products;

create policy "fix_products_customer_select_available" on public.products
for select using (public.get_my_role() = 'customer' and is_available = true and coalesce(stock_quantity, 0) > 0);
create policy "fix_products_staff_select" on public.products
for select using (public.get_my_role() in ('admin', 'warehouse', 'delivery'));
create policy "fix_products_admin_warehouse_insert" on public.products
for insert with check (public.is_admin_or_warehouse());
create policy "fix_products_admin_warehouse_update" on public.products
for update using (public.is_admin_or_warehouse()) with check (public.is_admin_or_warehouse());
create policy "fix_products_admin_delete" on public.products
for delete using (public.get_my_role() = 'admin');

drop policy if exists "orders_select" on public.orders;
drop policy if exists "orders_customer_insert" on public.orders;
drop policy if exists "orders_staff_update" on public.orders;
drop policy if exists "azraq_orders_staff_read_update_v2" on public.orders;
drop policy if exists "azraq_orders_staff_select_v2" on public.orders;
drop policy if exists "azraq_orders_staff_update_v2" on public.orders;

create policy "fix_orders_select_own_or_staff" on public.orders
for select using (customer_id = auth.uid() or public.get_my_role() in ('admin', 'warehouse', 'delivery'));
create policy "fix_orders_customer_insert_own" on public.orders
for insert with check (customer_id = auth.uid() and public.get_my_role() = 'customer');
create policy "fix_orders_staff_update" on public.orders
for update using (public.get_my_role() in ('admin', 'warehouse', 'delivery'))
with check (public.get_my_role() in ('admin', 'warehouse', 'delivery'));

drop policy if exists "order_items_select" on public.order_items;
drop policy if exists "order_items_insert" on public.order_items;
drop policy if exists "order_items_staff_update" on public.order_items;
drop policy if exists "azraq_order_items_staff_read_update_v2" on public.order_items;
drop policy if exists "azraq_order_items_staff_select_v2" on public.order_items;
drop policy if exists "azraq_order_items_staff_update_v2" on public.order_items;

create policy "fix_order_items_select_own_or_staff" on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or public.get_my_role() in ('admin', 'warehouse', 'delivery'))
  )
);
create policy "fix_order_items_customer_insert_own" on public.order_items
for insert with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.customer_id = auth.uid()
      and public.get_my_role() = 'customer'
  )
);
create policy "fix_order_items_staff_update" on public.order_items
for update using (public.get_my_role() in ('admin', 'warehouse'))
with check (public.get_my_role() in ('admin', 'warehouse'));

drop policy if exists "purchase_invoices_staff_select" on public.purchase_invoices;
drop policy if exists "purchase_invoices_staff_insert" on public.purchase_invoices;
drop policy if exists "azraq_purchase_invoices_staff_v2" on public.purchase_invoices;
drop policy if exists "azraq_purchase_invoices_staff_select_v2" on public.purchase_invoices;
drop policy if exists "azraq_purchase_invoices_staff_insert_v2" on public.purchase_invoices;
drop policy if exists "azraq_purchase_invoices_staff_update_v2" on public.purchase_invoices;

create policy "fix_purchase_invoices_staff_select" on public.purchase_invoices
for select using (public.is_admin_or_warehouse());
create policy "fix_purchase_invoices_staff_insert" on public.purchase_invoices
for insert with check (public.is_admin_or_warehouse());
create policy "fix_purchase_invoices_staff_update" on public.purchase_invoices
for update using (public.is_admin_or_warehouse()) with check (public.is_admin_or_warehouse());

drop policy if exists "purchase_invoice_items_staff_select" on public.purchase_invoice_items;
drop policy if exists "purchase_invoice_items_staff_insert" on public.purchase_invoice_items;
drop policy if exists "azraq_purchase_invoice_items_staff_v2" on public.purchase_invoice_items;
drop policy if exists "azraq_purchase_invoice_items_staff_select_v2" on public.purchase_invoice_items;
drop policy if exists "azraq_purchase_invoice_items_staff_insert_v2" on public.purchase_invoice_items;
drop policy if exists "azraq_purchase_invoice_items_staff_update_v2" on public.purchase_invoice_items;

create policy "fix_purchase_invoice_items_staff_select" on public.purchase_invoice_items
for select using (public.is_admin_or_warehouse());
create policy "fix_purchase_invoice_items_staff_insert" on public.purchase_invoice_items
for insert with check (public.is_admin_or_warehouse());
create policy "fix_purchase_invoice_items_staff_update" on public.purchase_invoice_items
for update using (public.is_admin_or_warehouse()) with check (public.is_admin_or_warehouse());

drop policy if exists "customer_debts_staff_select" on public.customer_debts;
drop policy if exists "customer_debts_staff_insert" on public.customer_debts;
drop policy if exists "azraq_customer_debts_staff_v2" on public.customer_debts;
drop policy if exists "azraq_customer_debts_staff_select_v2" on public.customer_debts;
drop policy if exists "azraq_customer_debts_staff_insert_v2" on public.customer_debts;
drop policy if exists "azraq_customer_debts_staff_update_v2" on public.customer_debts;

create policy "fix_customer_debts_select_customer_or_staff" on public.customer_debts
for select using (customer_id = auth.uid() or public.get_my_role() in ('admin', 'warehouse', 'delivery'));
create policy "fix_customer_debts_staff_insert" on public.customer_debts
for insert with check (public.get_my_role() in ('admin', 'warehouse', 'delivery'));
create policy "fix_customer_debts_staff_update" on public.customer_debts
for update using (public.get_my_role() in ('admin', 'warehouse', 'delivery'))
with check (public.get_my_role() in ('admin', 'warehouse', 'delivery'));

drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_admin_insert" on storage.objects;
drop policy if exists "product_images_admin_update" on storage.objects;
drop policy if exists "product_images_admin_delete" on storage.objects;
drop policy if exists "azraq_product_images_public_read" on storage.objects;
drop policy if exists "azraq_product_images_staff_insert" on storage.objects;
drop policy if exists "azraq_product_images_staff_update" on storage.objects;
drop policy if exists "azraq_product_images_staff_delete" on storage.objects;
drop policy if exists "azraq_product_images_roles_select" on storage.objects;
drop policy if exists "azraq_product_images_admin_all" on storage.objects;
drop policy if exists "azraq_product_images_warehouse_insert" on storage.objects;
drop policy if exists "azraq_product_images_warehouse_update" on storage.objects;
drop policy if exists "azraq_product_images_public_read_v2" on storage.objects;
drop policy if exists "azraq_product_images_admin_all_v2" on storage.objects;
drop policy if exists "azraq_product_images_warehouse_insert_v2" on storage.objects;
drop policy if exists "azraq_product_images_warehouse_update_v2" on storage.objects;

create policy "fix_product_images_select" on storage.objects
for select using (bucket_id = 'product-images');
create policy "fix_product_images_staff_insert" on storage.objects
for insert with check (bucket_id = 'product-images' and public.is_admin_or_warehouse());
create policy "fix_product_images_staff_update" on storage.objects
for update using (bucket_id = 'product-images' and public.is_admin_or_warehouse())
with check (bucket_id = 'product-images' and public.is_admin_or_warehouse());
create policy "fix_product_images_staff_delete" on storage.objects
for delete using (bucket_id = 'product-images' and public.is_admin_or_warehouse());

select id, phone, role, full_name from public.profiles;
