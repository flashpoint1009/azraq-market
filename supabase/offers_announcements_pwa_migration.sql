-- Offers + customer announcement panel
-- discount_type is text on purpose so older databases with a different enum
-- named public.discount_type do not fail this migration.

alter table public.products
  add column if not exists discount_type text,
  add column if not exists discount_value numeric(12,2) not null default 0;

alter table public.products
  alter column discount_type type text using discount_type::text;

update public.products
set discount_type = 'none'
where discount_type is null or discount_type not in ('none', 'percent', 'amount');

alter table public.products
  alter column discount_type set default 'none',
  alter column discount_type set not null;

alter table public.products
  drop constraint if exists products_discount_type_check,
  add constraint products_discount_type_check check (discount_type in ('none', 'percent', 'amount')),
  drop constraint if exists products_discount_value_check,
  add constraint products_discount_value_check check (
    discount_value >= 0
    and (discount_type <> 'percent' or discount_value <= 100)
  );

create table if not exists public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists app_announcements_touch_updated_at on public.app_announcements;
create trigger app_announcements_touch_updated_at before update on public.app_announcements for each row execute function public.touch_updated_at();

alter table public.app_announcements enable row level security;

drop policy if exists "app_announcements_customer_select" on public.app_announcements;
create policy "app_announcements_customer_select" on public.app_announcements
for select using (auth.role() = 'authenticated' and is_active = true or public.is_staff());

drop policy if exists "app_announcements_admin_all" on public.app_announcements;
create policy "app_announcements_admin_all" on public.app_announcements
for all using (public.is_admin()) with check (public.is_admin());

insert into public.app_announcements (id, title, body, is_active)
values ('00000000-0000-0000-0000-000000000001', 'أهلا بيك في أزرق ماركت', 'تابع العروض الجديدة من صفحة العروض.', false)
on conflict (id) do nothing;
