insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "azraq_products_roles_select" on public.products;
create policy "azraq_products_roles_select" on public.products
for select using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('customer', 'admin', 'warehouse', 'delivery')
  )
);

drop policy if exists "azraq_products_admin_all" on public.products;
create policy "azraq_products_admin_all" on public.products
for all using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
) with check (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "azraq_products_warehouse_insert" on public.products;
create policy "azraq_products_warehouse_insert" on public.products
for insert with check (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'warehouse')
);

drop policy if exists "azraq_products_warehouse_update" on public.products;
create policy "azraq_products_warehouse_update" on public.products
for update using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'warehouse')
) with check (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'warehouse')
);

drop policy if exists "azraq_categories_roles_select" on public.categories;
create policy "azraq_categories_roles_select" on public.categories
for select using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('customer', 'admin', 'warehouse', 'delivery')
  )
);

drop policy if exists "azraq_subcategories_roles_select" on public.subcategories;
create policy "azraq_subcategories_roles_select" on public.subcategories
for select using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('customer', 'admin', 'warehouse', 'delivery')
  )
);

drop policy if exists "azraq_product_images_roles_select" on storage.objects;
create policy "azraq_product_images_roles_select" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "azraq_product_images_admin_all" on storage.objects;
create policy "azraq_product_images_admin_all" on storage.objects
for all using (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
) with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "azraq_product_images_warehouse_insert" on storage.objects;
create policy "azraq_product_images_warehouse_insert" on storage.objects
for insert with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'warehouse')
);

drop policy if exists "azraq_product_images_warehouse_update" on storage.objects;
create policy "azraq_product_images_warehouse_update" on storage.objects
for update using (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'warehouse')
) with check (
  bucket_id = 'product-images'
  and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'warehouse')
);
