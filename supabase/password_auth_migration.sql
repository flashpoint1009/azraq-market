-- Migration آمن للانتقال من نظام الدخول السابق إلى Phone + Password عبر email داخلي.
-- شغله مرة واحدة على مشروع Supabase الموجود قبل استخدام النسخة الجديدة.

alter table public.profiles
  alter column id drop default;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_auth_users_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_id_auth_users_fkey
      foreign key (id) references auth.users(id) on delete cascade not valid;
  end if;
end $$;

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
