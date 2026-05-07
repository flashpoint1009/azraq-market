-- Phase 3: Add discount_amount and delivery_fee columns to orders table
-- Run this in Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee   numeric(10,2) DEFAULT 0;

COMMENT ON COLUMN orders.discount_amount IS 'Coupon or manual discount applied to this order';
COMMENT ON COLUMN orders.delivery_fee    IS 'Delivery fee charged for this order';
