create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '""'::jsonb,
  description text null,
  updated_by uuid null references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.developer_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  report_type text not null default 'custom' check (report_type in ('accounts', 'customers', 'orders', 'products', 'custom')),
  config jsonb not null default '{}'::jsonb,
  allowed_permissions text[] null default '{developer}'::text[],
  is_active boolean not null default true,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists developer_reports_title_key on public.developer_reports (title);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

alter table public.app_settings enable row level security;
alter table public.developer_reports enable row level security;

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
            case
              when permission_key in ('developer', 'settings', 'data') then
                app_permissions is not null
                and ('developer' = any(app_permissions) or permission_key = any(app_permissions))
              else
                app_permissions is null
                or cardinality(app_permissions) = 0
                or permission_key = any(app_permissions)
            end
          )
        )
    ),
    false
  )
$$;

drop policy if exists "app_settings_authenticated_select" on public.app_settings;
drop policy if exists "app_settings_developer_all" on public.app_settings;

create policy "app_settings_authenticated_select" on public.app_settings
for select using (auth.role() = 'authenticated');

create policy "app_settings_developer_all" on public.app_settings
for all using (public.has_permission('developer') or public.has_permission('settings'))
with check (public.has_permission('developer') or public.has_permission('settings'));

drop policy if exists "developer_reports_select" on public.developer_reports;
drop policy if exists "developer_reports_developer_all" on public.developer_reports;

create policy "developer_reports_select" on public.developer_reports
for select using (
  public.has_permission('developer')
  or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and (
        app_permissions is null
        or cardinality(app_permissions) = 0
        or app_permissions && coalesce(public.developer_reports.allowed_permissions, '{}'::text[])
      )
  )
);

create policy "developer_reports_developer_all" on public.developer_reports
for all using (public.has_permission('developer'))
with check (public.has_permission('developer'));

drop policy if exists "developer_brand_assets_public_read" on storage.objects;
drop policy if exists "developer_brand_assets_developer_all" on storage.objects;

create policy "developer_brand_assets_public_read" on storage.objects
for select using (bucket_id = 'product-images');

create policy "developer_brand_assets_developer_all" on storage.objects
for all using (
  bucket_id = 'product-images'
  and public.has_permission('developer')
) with check (
  bucket_id = 'product-images'
  and public.has_permission('developer')
);

insert into public.app_settings (key, value, description)
values
  ('company_name', to_jsonb('أزرق ماركت'::text), 'اسم الشركة'),
  ('company_subtitle', to_jsonb('Azraq Market'::text), 'الاسم الفرعي'),
  ('logo_url', to_jsonb('/assets/brand/azraq-market-logo.jpg'::text), 'رابط اللوجو'),
  ('login_hero_url', to_jsonb('/assets/brand/login-hero-720.jpg'::text), 'صورة الدخول'),
  ('support_phone', to_jsonb('01153338337'::text), 'رقم الدعم'),
  ('whatsapp_phone', to_jsonb('201153338337'::text), 'رقم واتساب بصيغة دولية'),
  ('app_description', to_jsonb('تطبيق طلبات الجملة وإدارة الطلبات'::text), 'وصف التطبيق'),
  ('primary_color', to_jsonb('#2b5b74'::text), 'لون الهوية الأساسي'),
  ('secondary_color', to_jsonb('#316f8d'::text), 'اللون المساعد'),
  ('accent_color', to_jsonb('#f97316'::text), 'لون العروض والتنبيهات'),
  ('background_color', to_jsonb('#eef6fa'::text), 'لون الخلفية')
on conflict (key) do nothing;

insert into public.developer_reports (title, description, report_type, config, allowed_permissions, is_active)
values
  ('مبيعات الفترة', 'متابعة آخر الطلبات وقيم البيع حسب التاريخ والحالة.', 'orders', '{"source":"orders","fields":["id","created_at","status","total_amount","paid_amount","debt_amount"]}'::jsonb, array['reports','orders']::text[], true),
  ('كشف حساب عميل', 'متابعة مديونية العميل والمدفوع والمتبقي.', 'accounts', '{"source":"customer_debts","fields":["id","customer_id","amount","paid_amount","remaining_amount","status","created_at"]}'::jsonb, array['reports','customers']::text[], true),
  ('أفضل المنتجات مبيعًا', 'قراءة سريعة للكميات وقيم البنود المباعة.', 'products', '{"source":"order_items","fields":["product_name_snapshot","unit_type_snapshot","quantity","unit_price_snapshot","line_total"]}'::jsonb, array['reports','products']::text[], true),
  ('حركة المخزون', 'مراجعة الكمية والسعر والتكلفة لكل منتج متاح.', 'products', '{"source":"products","fields":["name","unit_type","stock_quantity","price","cost_price","is_available"]}'::jsonb, array['reports','products']::text[], true),
  ('إشعارات العملاء', 'مراجعة الإشعارات المرسلة وحالة القراءة.', 'customers', '{"source":"notifications","fields":["user_id","title","body","is_read","created_at"]}'::jsonb, array['reports','customers']::text[], true)
on conflict (title) do update set
  description = excluded.description,
  report_type = excluded.report_type,
  config = excluded.config,
  allowed_permissions = excluded.allowed_permissions,
  is_active = excluded.is_active,
  updated_at = now();

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles',
    'products',
    'categories',
    'subcategories',
    'orders',
    'order_items',
    'promotions',
    'app_announcements',
    'customer_debts',
    'purchase_invoices',
    'purchase_returns',
    'notifications',
    'developer_reports'
  ]
  loop
    if to_regclass('public.' || target_table) is not null then
      execute format('drop policy if exists %I on public.%I', target_table || '_developer_select', target_table);
      execute format('drop policy if exists %I on public.%I', target_table || '_developer_update', target_table);
      execute format('drop policy if exists %I on public.%I', target_table || '_developer_delete', target_table);

      execute format(
        'create policy %I on public.%I for select using (public.has_permission(''developer'') or public.has_permission(''data''))',
        target_table || '_developer_select',
        target_table
      );
      execute format(
        'create policy %I on public.%I for update using (public.has_permission(''developer'') or public.has_permission(''data'')) with check (public.has_permission(''developer'') or public.has_permission(''data''))',
        target_table || '_developer_update',
        target_table
      );
      execute format(
        'create policy %I on public.%I for delete using (public.has_permission(''developer'') or public.has_permission(''data''))',
        target_table || '_developer_delete',
        target_table
      );
    end if;
  end loop;
end
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

  if permissions_input && array['developer', 'settings', 'data']::text[] and not public.has_permission('developer') then
    raise exception 'developer permission required';
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

grant execute on function public.admin_create_staff_user(text, text, text, public.user_role, text[]) to authenticated;

drop policy if exists "profiles_permission_update" on public.profiles;
create policy "profiles_permission_update" on public.profiles
for update using (
  id = auth.uid()
  or public.has_permission('developer')
  or (
    public.has_permission('users')
    and not (role = 'admin' and coalesce(app_permissions, '{}'::text[]) && array['developer', 'settings', 'data']::text[])
  )
)
with check (
  id = auth.uid()
  or public.has_permission('developer')
  or (
    public.has_permission('users')
    and not (role = 'admin' and coalesce(app_permissions, '{}'::text[]) && array['developer', 'settings', 'data']::text[])
  )
);
