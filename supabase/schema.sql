create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('customer', 'admin', 'warehouse', 'delivery');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.unit_type as enum ('carton', 'dozen', 'piece');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('new', 'preparing', 'ready_for_delivery', 'with_delivery', 'delivered', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  full_name text,
  role public.user_role not null default 'customer',
  address text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  discount_type text not null default 'none' check (discount_type in ('none', 'percent', 'amount')),
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  unit_type public.unit_type not null default 'carton',
  image_1_url text,
  image_2_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'new',
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  payment_method text not null default 'cash_on_delivery',
  address text,
  latitude double precision,
  longitude double precision,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  unit_type_snapshot public.unit_type not null,
  unit_price_snapshot numeric(12,2) not null default 0,
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null default 0
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  related_order_id uuid references public.orders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_orders_customer_status on public.orders(customer_id, status);
create index if not exists idx_orders_status_created on public.orders(status, created_at desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders for each row execute function public.touch_updated_at();

drop trigger if exists app_announcements_touch_updated_at on public.app_announcements;
create trigger app_announcements_touch_updated_at before update on public.app_announcements for each row execute function public.touch_updated_at();

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin', 'warehouse', 'delivery'), false)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false)
$$;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, full_name, role, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'phone', new.phone),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'customer'),
    new.raw_user_meta_data->>'address'
  )
  on conflict (id) do update set
    phone = coalesce(excluded.phone, public.profiles.phone),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    address = coalesce(excluded.address, public.profiles.address);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.notify_roles(target_roles public.user_role[], notification_title text, notification_body text, order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, related_order_id)
  select id, notification_title, notification_body, order_id
  from public.profiles
  where role = any(target_roles);
end;
$$;

create or replace function public.handle_order_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, status, changed_by)
    values (new.id, new.status, new.customer_id);
    perform public.notify_roles(array['admin'::public.user_role, 'warehouse'::public.user_role], 'طلب جديد', 'وصل طلب جديد يحتاج للمراجعة والتجهيز.', new.id);
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.notifications(user_id, title, body, related_order_id)
    values (new.customer_id, 'تحديث حالة الطلب', 'أصبحت حالة طلبك: ' || new.status::text, new.id);
    if new.status = 'ready_for_delivery' then
      perform public.notify_roles(array['delivery'::public.user_role], 'طلب جاهز للتوصيل', 'يوجد طلب جاهز للاستلام من المخزن.', new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_notifications on public.orders;
create trigger orders_notifications
after insert or update of status on public.orders
for each row execute function public.handle_order_notifications();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notifications enable row level security;
alter table public.order_status_history enable row level security;
alter table public.app_announcements enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (id = auth.uid() or public.is_staff());
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert with check (public.is_admin() or id = auth.uid());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories for select using (auth.role() = 'authenticated');
drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all" on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products for select using (auth.role() = 'authenticated');
drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "app_announcements_customer_select" on public.app_announcements;
create policy "app_announcements_customer_select" on public.app_announcements for select using ((auth.role() = 'authenticated' and is_active = true) or public.is_staff());
drop policy if exists "app_announcements_admin_all" on public.app_announcements;
create policy "app_announcements_admin_all" on public.app_announcements for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders for select using (customer_id = auth.uid() or public.is_staff());
drop policy if exists "orders_customer_insert" on public.orders;
create policy "orders_customer_insert" on public.orders for insert with check (customer_id = auth.uid() and public.current_role() = 'customer');
drop policy if exists "orders_staff_update" on public.orders;
create policy "orders_staff_update" on public.orders for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff()))
);
drop policy if exists "order_items_insert" on public.order_items;
create policy "order_items_insert" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff()))
);
drop policy if exists "order_items_staff_update" on public.order_items;
create policy "order_items_staff_update" on public.order_items for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "history_select" on public.order_status_history;
create policy "history_select" on public.order_status_history for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff()))
);
drop policy if exists "history_insert_staff" on public.order_status_history;
create policy "history_insert_staff" on public.order_status_history for insert with check (public.is_staff() or changed_by = auth.uid());

insert into public.categories (name, sort_order) values
  ('منظفات الغسيل', 1),
  ('منظفات الأسطح', 2),
  ('العناية الشخصية', 3),
  ('منتجات الضيافة', 4)
on conflict do nothing;

with c as (select id, name from public.categories)
insert into public.products (category_id, name, description, price, unit_type, image_1_url, image_2_url, is_available)
select c.id, p.name, p.description, p.price, p.unit_type::public.unit_type, p.image_1_url, p.image_2_url, true
from (values
  ('منظفات الغسيل','مسحوق غسيل أزرق 10 كجم','مسحوق اقتصادي قوي مناسب للاستخدام التجاري.',620,'carton','https://placehold.co/800x600/0f78d2/ffffff?text=Azraq+Powder','https://placehold.co/800x600/eaf5ff/0f528c?text=Laundry'),
  ('منظفات الغسيل','جل غسيل مركز 4 لتر','جل غسيل برائحة منعشة وحماية للألوان.',310,'carton','https://placehold.co/800x600/2697f2/ffffff?text=Wash+Gel','https://placehold.co/800x600/f7fbff/0f78d2?text=4L'),
  ('منظفات الغسيل','منعم أقمشة أزرق','نعومة ورائحة ثابتة للفنادق والمغاسل.',280,'dozen','https://placehold.co/800x600/51b6ff/ffffff?text=Softener','https://placehold.co/800x600/d7efff/124573?text=Fresh'),
  ('منظفات الغسيل','مزيل بقع احترافي','تركيبة مركزة للبقع الصعبة.',190,'dozen','https://placehold.co/800x600/0c61aa/ffffff?text=Stain+Remover','https://placehold.co/800x600/edf7ff/0c61aa?text=Pro'),
  ('منظفات الغسيل','كلور ألوان آمن','تنظيف عميق دون بهتان الألوان.',240,'carton','https://placehold.co/800x600/124573/ffffff?text=Color+Bleach','https://placehold.co/800x600/b8e2ff/0b2b49?text=Safe'),
  ('منظفات الأسطح','مطهر أرضيات أزرق','مطهر يومي بروائح فاخرة للمساحات الكبيرة.',210,'carton','https://placehold.co/800x600/0f78d2/ffffff?text=Floor+Cleaner','https://placehold.co/800x600/eaf5ff/0f528c?text=Disinfectant'),
  ('منظفات الأسطح','منظف زجاج لامع','لمعان سريع بدون آثار أو خطوط.',150,'dozen','https://placehold.co/800x600/2697f2/ffffff?text=Glass','https://placehold.co/800x600/f7fbff/0f78d2?text=Shine'),
  ('منظفات الأسطح','منظف مطابخ قوي','إزالة دهون للمطاعم والكافيهات.',265,'carton','https://placehold.co/800x600/51b6ff/ffffff?text=Kitchen','https://placehold.co/800x600/d7efff/124573?text=Degreaser'),
  ('منظفات الأسطح','منظف حمامات مركز','إزالة ترسبات ورائحة منعشة.',230,'carton','https://placehold.co/800x600/0c61aa/ffffff?text=Bathroom','https://placehold.co/800x600/edf7ff/0c61aa?text=Clean'),
  ('منظفات الأسطح','مطهر متعدد الاستخدام','مناسب للأسطح والأدوات اليومية.',175,'dozen','https://placehold.co/800x600/124573/ffffff?text=Multi+Use','https://placehold.co/800x600/b8e2ff/0b2b49?text=Hygiene'),
  ('العناية الشخصية','صابون سائل فاخر','صابون يدين مناسب للمنشآت والضيافة.',260,'carton','https://placehold.co/800x600/0f78d2/ffffff?text=Hand+Soap','https://placehold.co/800x600/eaf5ff/0f528c?text=Luxury'),
  ('العناية الشخصية','شامبو ضيافة','عبوات عملية للفنادق والشقق المفروشة.',320,'carton','https://placehold.co/800x600/2697f2/ffffff?text=Shampoo','https://placehold.co/800x600/f7fbff/0f78d2?text=Hotel'),
  ('العناية الشخصية','معقم يدين 500 مل','كحول مناسب للمكاتب ونقاط البيع.',180,'dozen','https://placehold.co/800x600/51b6ff/ffffff?text=Sanitizer','https://placehold.co/800x600/d7efff/124573?text=500ml'),
  ('العناية الشخصية','مناديل مبللة','تغليف عملي للاستخدام اليومي.',95,'dozen','https://placehold.co/800x600/0c61aa/ffffff?text=Wipes','https://placehold.co/800x600/edf7ff/0c61aa?text=Soft'),
  ('العناية الشخصية','كريم يدين','عناية وترطيب للعاملين والضيوف.',140,'dozen','https://placehold.co/800x600/124573/ffffff?text=Hand+Cream','https://placehold.co/800x600/b8e2ff/0b2b49?text=Care'),
  ('منتجات الضيافة','مناديل ورقية كرتون','مناديل عالية الامتصاص للمطاعم.',360,'carton','https://placehold.co/800x600/0f78d2/ffffff?text=Tissues','https://placehold.co/800x600/eaf5ff/0f528c?text=Carton'),
  ('منتجات الضيافة','أكواب ورقية','أكواب مناسبة للمشروبات الساخنة.',220,'carton','https://placehold.co/800x600/2697f2/ffffff?text=Paper+Cups','https://placehold.co/800x600/f7fbff/0f78d2?text=Hot'),
  ('منتجات الضيافة','أطباق فوم','أطباق عملية لخدمات الطعام.',185,'carton','https://placehold.co/800x600/51b6ff/ffffff?text=Foam+Plates','https://placehold.co/800x600/d7efff/124573?text=Food'),
  ('منتجات الضيافة','أكياس قمامة سوداء','تحمل عالي للمخازن والمطاعم.',155,'carton','https://placehold.co/800x600/0c61aa/ffffff?text=Trash+Bags','https://placehold.co/800x600/edf7ff/0c61aa?text=Strong'),
  ('منتجات الضيافة','قفازات استخدام واحد','قفازات آمنة للمطابخ والتنظيف.',125,'piece','https://placehold.co/800x600/124573/ffffff?text=Gloves','https://placehold.co/800x600/b8e2ff/0b2b49?text=Disposable')
) as p(category_name, name, description, price, unit_type, image_1_url, image_2_url)
join c on c.name = p.category_name
where not exists (select 1 from public.products);

-- حسابات الأدوار التجريبية:
-- أنشئ مستخدمين من Authentication في Supabase بأرقام هاتفك التجريبية، ثم حدّث أدوارهم:
-- update public.profiles set role = 'admin', full_name = 'مشرف تجريبي' where phone = '+201000000001';
-- update public.profiles set role = 'warehouse', full_name = 'مخزن تجريبي' where phone = '+201000000002';
-- update public.profiles set role = 'delivery', full_name = 'حركة تجريبية' where phone = '+201000000003';
