create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  event_type text not null,
  created_at timestamptz not null default now()
);

alter table public.rate_limit_events enable row level security;

drop policy if exists "rate_limit_admin_read" on public.rate_limit_events;
create policy "rate_limit_admin_read" on public.rate_limit_events
for select using (public.current_role() = 'admin');

create index if not exists rate_limit_events_key_type_created_idx
on public.rate_limit_events(key, event_type, created_at desc);

create or replace function public.check_rate_limit(rate_key text, event_name text, max_events integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  delete from public.rate_limit_events
  where created_at < now() - interval '24 hours';

  select count(*) into recent_count
  from public.rate_limit_events
  where key = rate_key
    and event_type = event_name
    and created_at > now() - make_interval(secs => window_seconds);

  if recent_count >= max_events then
    return false;
  end if;

  insert into public.rate_limit_events(key, event_type)
  values (rate_key, event_name);

  return true;
end;
$$;

create or replace function public.can_create_order()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.check_rate_limit(auth.uid()::text, 'order_create', 5, 3600)
$$;

create or replace function public.validate_order_amount(amount_input numeric)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select amount_input between
    coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'min_order_amount'), 0)
    and
    coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'max_order_amount'), 1000000)
$$;

insert into public.app_settings(key, value, description)
values
  ('min_order_amount', to_jsonb(0::numeric), 'Minimum accepted order amount'),
  ('max_order_amount', to_jsonb(1000000::numeric), 'Maximum accepted order amount')
on conflict (key) do nothing;

grant execute on function public.check_rate_limit(text, text, integer, integer) to authenticated;
grant execute on function public.can_create_order() to authenticated;
grant execute on function public.validate_order_amount(numeric) to authenticated;
