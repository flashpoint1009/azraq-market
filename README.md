# White-Label Commerce PWA

This is a white-label Arabic B2B commerce and delivery PWA for wholesalers, distributors, and local stores. It includes customer ordering, admin operations, warehouse handling, delivery tracking, purchase invoices, customer debts, promotions, and PWA/APK readiness.

## Features

- Arabic RTL customer storefront with cart, order history, offers, and PWA support.
- Admin dashboard for products, categories, purchases, orders, customers, and reports.
- Warehouse and delivery role flows.
- Supabase authentication, database, RLS policies, storage, notifications, and RPC operations.
- Atomic order creation and stock operations through database RPC functions.
- White-label tenant configuration through environment variables.
- Netlify/Vercel web deployment and Capacitor Android packaging support.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Capacitor-ready PWA assets

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project.

3. Copy environment variables:

```bash
cp .env.example .env
```

4. Fill `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_BRAND_NAME=أزرق ماركت
VITE_PRIMARY_COLOR=#2b5b74
VITE_SUPPORT_PHONE=
VITE_SUPPORT_WHATSAPP=
VITE_CURRENCY=EGP
VITE_CURRENCY_SYMBOL=ج.م
```

5. Run Supabase SQL files in order:

- `supabase/schema.sql`
- Existing SQL files in `supabase/` that match your installation needs.
- `supabase/migrations/005_atomic_stock_operations.sql`

6. Run locally:

```bash
npm run dev
```

7. Build:

```bash
npm run build
```

## Customization

- Brand name: `VITE_BRAND_NAME`
- Primary color: `VITE_PRIMARY_COLOR`
- Support phone: `VITE_SUPPORT_PHONE`
- WhatsApp number: `VITE_SUPPORT_WHATSAPP`
- Currency: `VITE_CURRENCY`
- Currency symbol: `VITE_CURRENCY_SYMBOL`
- Logo and app icons: replace files in `public/assets/brand/` and `public/icon-*.png`.
- PWA metadata: update `public/manifest.webmanifest`.

## Deployment

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Add all `VITE_*` environment variables in Netlify project settings.

### Vercel

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Add all `VITE_*` environment variables.

### Capacitor Android

1. Build the web app:

```bash
npm run build
```

2. Add/sync Android:

```bash
npm run apk:add-android
npm run apk:sync
npm run apk:open
```

3. Build the APK/AAB from Android Studio.

## Security Notes

- Never commit `.env`.
- Use `.env.example` for placeholders only.
- Keep Supabase service-role keys out of the frontend.
- All order and stock-changing operations should go through RPC functions.
