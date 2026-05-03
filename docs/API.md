# API and Database

The backend uses Supabase tables, RLS policies, and RPC functions.

Important RPCs:

- `customer_create_order`
- `process_purchase_invoice`
- `process_purchase_return`
- `admin_create_staff_user`
- `update_delivery_location`
- `check_rate_limit`

Important Edge Functions:

- `send-sms`

Run migrations in order from `supabase/migrations`.
