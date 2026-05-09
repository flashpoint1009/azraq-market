-- ============================================================
-- Real-time Order Notifications for Warehouse & Admin
-- Run this in your Supabase SQL Editor
-- ============================================================
-- This creates a trigger that inserts a row into the
-- `notifications` table (used by useRealtimeNotifications)
-- whenever a new order is placed, so warehouse/admin staff
-- see the bell badge light up automatically.
-- ============================================================

-- 1. Make sure Supabase Realtime is enabled for `orders` table
-- In Supabase Dashboard → Database → Replication, add `orders` table.
-- The useRealtimeOrders hook already handles new orders in real-time
-- without needing the notifications table.

-- 2. (Optional) Trigger to notify all warehouse & admin users
--    when a new order arrives via the notifications table.

CREATE OR REPLACE FUNCTION notify_staff_on_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  staff_id UUID;
BEGIN
  -- Insert a notification for every warehouse and admin user
  FOR staff_id IN
    SELECT id FROM profiles WHERE role IN ('admin', 'warehouse')
  LOOP
    INSERT INTO notifications (user_id, title, body, type, reference_id, is_read)
    VALUES (
      staff_id,
      '🛒 طلب جديد',
      'وصل طلب جديد - رقم #' || LEFT(NEW.id::text, 8),
      'new_order',
      NEW.id,
      false
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Drop if exists then recreate
DROP TRIGGER IF EXISTS on_new_order_notify_staff ON orders;

CREATE TRIGGER on_new_order_notify_staff
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'new')
  EXECUTE FUNCTION notify_staff_on_new_order();

-- ============================================================
-- NOTES:
-- • The notifications table must have columns:
--   id (uuid default gen_random_uuid()),
--   user_id (uuid references profiles),
--   title (text), body (text), type (text),
--   reference_id (uuid), is_read (bool default false),
--   created_at (timestamptz default now())
-- • Enable Realtime on the `notifications` table AND `orders` table
--   in: Supabase Dashboard → Database → Replication
-- • The useRealtimeOrders hook works independently without this SQL
--   (it listens to INSERT on orders directly).
-- ============================================================
