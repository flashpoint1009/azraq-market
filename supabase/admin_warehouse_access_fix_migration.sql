-- Safe RLS + Storage policy fix for Azraq Market admin/warehouse flows.
-- Run this file in Supabase SQL Editor after the base schema/migrations.

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

drop policy if exists "azraq_categories_read_roles_v2" on public.categories;
create policy "azraq_categories_read_roles_v2" on public.categories
for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('customer', 'admin', 'warehouse', 'delivery'))
);

drop policy if exists "azraq_categories_admin_all_v2" on public.categories;
create policy "azraq_categories_admin_all_v2" on public.categories
for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "azraq_categories_warehouse_insert_v2" on public.categories;
create policy "azraq_categories_warehouse_insert_v2" on public.categories
for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
);

drop policy if exists "azraq_categories_warehouse_update_v2" on public.categories;
create policy "azraq_categories_warehouse_update_v2" on public.categories
for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
);

drop policy if exists "azraq_subcategories_read_roles_v2" on public.subcategories;
create policy "azraq_subcategories_read_roles_v2" on public.subcategories
for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('customer', 'admin', 'warehouse', 'delivery'))
);

drop policy if exists "azraq_subcategories_admin_all_v2" on public.subcategories;
create policy "azraq_subcategories_admin_all_v2" on public.subcategories
for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "azraq_subcategories_warehouse_insert_v2" on public.subcategories;
create policy "azraq_subcategories_warehouse_insert_v2" on public.subcategories
for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
);

drop policy if exists "azraq_subcategories_warehouse_update_v2" on public.subcategories;
create policy "azraq_subcategories_warehouse_update_v2" on public.subcategories
for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
);

drop policy if exists "azraq_products_read_roles_v2" on public.products;
create policy "azraq_products_read_roles_v2" on public.products
for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('customer', 'admin', 'warehouse', 'delivery'))
);

drop policy if exists "azraq_products_admin_all_v2" on public.products;
create policy "azraq_products_admin_all_v2" on public.products
for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "azraq_products_warehouse_insert_v2" on public.products;
create policy "azraq_products_warehouse_insert_v2" on public.products
for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
);

drop policy if exists "azraq_products_warehouse_update_v2" on public.products;
create policy "azraq_products_warehouse_update_v2" on public.products
for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
);

drop policy if exists "azraq_orders_staff_select_v2" on public.orders;
create policy "azraq_orders_staff_select_v2" on public.orders
for select using (
  customer_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse', 'delivery'))
);

drop policy if exists "azraq_orders_staff_update_v2" on public.orders;
create policy "azraq_orders_staff_update_v2" on public.orders
for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse', 'delivery'))
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse', 'delivery'))
);

drop policy if exists "azraq_order_items_staff_select_v2" on public.order_items;
create policy "azraq_order_items_staff_select_v2" on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (
        o.customer_id = auth.uid()
        or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse', 'delivery'))
      )
  )
);

drop policy if exists "azraq_order_items_staff_update_v2" on public.order_items;
create policy "azraq_order_items_staff_update_v2" on public.order_items
for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse'))
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse'))
);

drop policy if exists "azraq_purchase_invoices_staff_select_v2" on public.purchase_invoices;
create policy "azraq_purchase_invoices_staff_select_v2" on public.purchase_invoices
for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse'))
);

drop policy if exists "azraq_purchase_invoices_staff_insert_v2" on public.purchase_invoices;
create policy "azraq_purchase_invoices_staff_insert_v2" on public.purchase_invoices
for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse'))
);

drop policy if exists "azraq_purchase_invoices_staff_update_v2" on public.purchase_invoices;
create policy "azraq_purchase_invoices_staff_update_v2" on public.purchase_invoices
for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse'))
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse'))
);

drop policy if exists "azraq_purchase_invoice_items_staff_select_v2" on public.purchase_invoice_items;
create policy "azraq_purchase_invoice_items_staff_select_v2" on public.purchase_invoice_items
for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse'))
);

drop policy if exists "azraq_purchase_invoice_items_staff_insert_v2" on public.purchase_invoice_items;
create policy "azraq_purchase_invoice_items_staff_insert_v2" on public.purchase_invoice_items
for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse'))
);

drop policy if exists "azraq_purchase_invoice_items_staff_update_v2" on public.purchase_invoice_items;
create policy "azraq_purchase_invoice_items_staff_update_v2" on public.purchase_invoice_items
for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse'))
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse'))
);

drop policy if exists "azraq_customer_debts_staff_select_v2" on public.customer_debts;
create policy "azraq_customer_debts_staff_select_v2" on public.customer_debts
for select using (
  customer_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse', 'delivery'))
);

drop policy if exists "azraq_customer_debts_staff_insert_v2" on public.customer_debts;
create policy "azraq_customer_debts_staff_insert_v2" on public.customer_debts
for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse', 'delivery'))
);

drop policy if exists "azraq_customer_debts_staff_update_v2" on public.customer_debts;
create policy "azraq_customer_debts_staff_update_v2" on public.customer_debts
for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse', 'delivery'))
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'warehouse', 'delivery'))
);

drop policy if exists "azraq_product_images_public_read_v2" on storage.objects;
create policy "azraq_product_images_public_read_v2" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "azraq_product_images_admin_all_v2" on storage.objects;
create policy "azraq_product_images_admin_all_v2" on storage.objects
for all using (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
) with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "azraq_product_images_warehouse_insert_v2" on storage.objects;
create policy "azraq_product_images_warehouse_insert_v2" on storage.objects
for insert with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
);

drop policy if exists "azraq_product_images_warehouse_update_v2" on storage.objects;
create policy "azraq_product_images_warehouse_update_v2" on storage.objects
for update using (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
) with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'warehouse')
);

-- Manual role assignment examples. Keep these commented; replace the UUID before running one line.
-- select id, phone, full_name, role from public.profiles order by created_at desc;
-- update public.profiles set role = 'admin' where id = '<ACTUAL_AUTH_USER_UUID>';
-- update public.profiles set role = 'warehouse' where id = '<ACTUAL_AUTH_USER_UUID>';
-- update public.profiles set role = 'delivery' where id = '<ACTUAL_AUTH_USER_UUID>';
