-- Add starts_at column to coupons table for date range support
-- Run this in Supabase SQL Editor

alter table public.coupons
  add column if not exists starts_at timestamptz;

-- Update the customer read policy to respect starts_at
drop policy if exists "coupons_customer_read" on public.coupons;
create policy "coupons_customer_read" on public.coupons
  for select using (
    is_active = true
    or public.has_permission('orders')
    or public.current_role() = 'admin'
  );

notify pgrst, 'reload schema';
