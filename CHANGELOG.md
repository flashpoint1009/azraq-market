# Changelog

## v1.1.0 — Security Hardening

- **إصلاح ثغرة أمان حرجة**: إزالة `role` من `options.data` في `signUpCustomer` — المستخدم لم يعد قادراً على تحديد دوره أثناء التسجيل.
- **تحسين الـ Trigger**: `handle_new_auth_user` يضبط الدور دائماً كـ `customer` بغض النظر عن بيانات الـ metadata.
- **تشديد RLS**: سياسات جديدة تمنع المستخدم من تعديل `role` أو `app_permissions` الخاصة به.
- **تفعيل Sentry**: `initSentry()` يُستدعى عند بدء التطبيق لتتبع الأخطاء في الإنتاج.
- **تنظيف AuthContext**: إزالة `metadataRoleForSession` — الـ fallback profile دائماً يأخذ دور `customer`.
- **Migration 010**: `010_security_hardening.sql` يطبق كل إصلاحات الـ DB.

## v1.0.0

- Prepared the platform for white-label resale.
- Added tenant environment configuration.
- Added atomic purchase invoice, purchase return, and customer order RPC operations.
- Removed legacy NILCO project files.
- Improved environment variable safety and buyer documentation.
- Added commercial modules: reviews, wishlists, coupons, analytics, loyalty, branches, scheduled orders, and PDF invoices.
- Added optional integrations: Paymob, SMS Edge Function, Sentry, CI tests, Android Capacitor setup, setup wizard, SaaS plan configuration, demo mode, and documentation package.
