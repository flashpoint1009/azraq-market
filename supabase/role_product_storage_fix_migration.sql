insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "azraq_product_images_public_read" on storage.objects;
create policy "azraq_product_images_public_read" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "azraq_product_images_staff_insert" on storage.objects;
create policy "azraq_product_images_staff_insert" on storage.objects
for insert with check (bucket_id = 'product-images' and public.is_staff());

drop policy if exists "azraq_product_images_staff_update" on storage.objects;
create policy "azraq_product_images_staff_update" on storage.objects
for update using (bucket_id = 'product-images' and public.is_staff())
with check (bucket_id = 'product-images' and public.is_staff());

drop policy if exists "azraq_product_images_staff_delete" on storage.objects;
create policy "azraq_product_images_staff_delete" on storage.objects
for delete using (bucket_id = 'product-images' and public.is_staff());

drop policy if exists "azraq_products_staff_select" on public.products;
create policy "azraq_products_staff_select" on public.products
for select using (public.is_staff());

drop policy if exists "azraq_products_staff_insert" on public.products;
create policy "azraq_products_staff_insert" on public.products
for insert with check (public.is_staff());

drop policy if exists "azraq_products_staff_update" on public.products;
create policy "azraq_products_staff_update" on public.products
for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "azraq_categories_staff_select" on public.categories;
create policy "azraq_categories_staff_select" on public.categories
for select using (public.is_staff());

drop policy if exists "azraq_subcategories_staff_select" on public.subcategories;
create policy "azraq_subcategories_staff_select" on public.subcategories
for select using (public.is_staff());
