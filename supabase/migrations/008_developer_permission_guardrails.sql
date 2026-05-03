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
        and role = 'admin'
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
    ),
    false
  )
$$;

create or replace function public.is_developer_profile(profile_permissions text[])
returns boolean
language sql
immutable
as $$
  select coalesce(profile_permissions && array['developer', 'settings', 'data']::text[], false)
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
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at
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
    and not public.is_developer_profile(coalesce(app_permissions, '{}'::text[]))
  )
)
with check (
  id = auth.uid()
  or public.has_permission('developer')
  or (
    public.has_permission('users')
    and not public.is_developer_profile(coalesce(app_permissions, '{}'::text[]))
  )
);
