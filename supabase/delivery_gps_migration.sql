-- ═══════════════════════════════════════════════════════════════════════
-- Delivery GPS Live Tracking Migration
-- Stores real-time driver locations, tracks history
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Driver live location (upserted frequently)
create table if not exists public.driver_locations (
  driver_id uuid primary key references public.profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision, -- GPS accuracy in meters
  heading double precision, -- direction in degrees
  speed double precision, -- speed in m/s
  is_online boolean not null default true,
  last_updated_at timestamptz not null default now()
);

-- 2. Location history (for route playback, optional)
create table if not exists public.driver_location_history (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  speed double precision,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_driver_location_history_driver on public.driver_location_history(driver_id, recorded_at desc);

-- RLS
alter table public.driver_locations enable row level security;
alter table public.driver_location_history enable row level security;

create policy "Authenticated full access" on public.driver_locations for all using (auth.uid() is not null);
create policy "Authenticated full access" on public.driver_location_history for all using (auth.uid() is not null);

-- Enable realtime on driver_locations
alter publication supabase_realtime add table public.driver_locations;
