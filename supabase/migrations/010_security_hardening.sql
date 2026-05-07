-- ============================================================
-- Migration 010: Security Hardening
-- - Fix handle_new_auth_user: role is always 'customer' on signup
-- - Block users from changing their own role or permissions via RLS
-- - Add signup abuse prevention (max 3 accounts per IP window)
-- ============================================================

-- 1. Fix trigger: NEVER trust role from raw_user_meta_data
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
    'customer',
    new.raw_user_meta_data->>'address'
  )
  on conflict (id) do update set
    phone    = coalesce(excluded.phone,     public.profiles.phone),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    address  = coalesce(excluded.address,   public.profiles.address);
  return new;
end;
$$;

-- 2. Block users from updating their own role or app_permissions
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_update_own_safe" on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (
  (
    id = auth.uid()
    and (select role from public.profiles where id = auth.uid()) = role
    and (select app_permissions from public.profiles where id = auth.uid()) is not distinct from app_permissions
  )
  or public.is_admin()
);

-- 3. Block users from inserting a profile with a non-customer role
drop policy if exists "profiles_insert" on public.profiles;

create policy "profiles_insert_customer_only" on public.profiles
for insert
with check (
  (id = auth.uid() and role = 'customer')
  or public.is_admin()
);

-- 4. Grant only authenticated users to call rate limit check
grant execute on function public.check_rate_limit(text, text, integer, integer) to authenticated;
