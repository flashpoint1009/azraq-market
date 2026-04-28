# أزرق ماركت | Azraq Market

تطبيق عربي RTL لإدارة طلبات المنتجات بين العميل والمشرف والمخزن والحركة. مبني بـ React + Vite + TypeScript + Tailwind CSS، ويستخدم Supabase للـ Auth وDatabase وRealtime وStorage.

## التشغيل المحلي

```bash
npm install
copy .env.example .env
npm run dev
```

ضع القيم التالية في `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Supabase Setup

1. أنشئ مشروع Supabase.
2. افتح SQL Editor وشغّل الملف `supabase/schema.sql`.
3. لو عندك قاعدة قديمة، شغّل بعدها `supabase/password_auth_migration.sql`.
4. من Authentication > Providers > Email فعّل Email/Password.
5. عطّل Confirm email حتى يعمل التسجيل والدخول التلقائي برقم الهاتف وكلمة المرور.
6. تأكد أن bucket باسم `product-images` موجود وPublic. ملف SQL ينشئه تلقائيًا إن لم يكن موجودًا.

## نظام التسجيل والدخول

التطبيق يستخدم رقم الهاتف + كلمة مرور فقط. لا يوجد OTP، ولا SMS، ولا اعتماد على Email confirmation.

تحويل الهاتف إلى بريد داخلي:

```text
01014099991   -> phone201014099991@azraqmarket.app
201014099991  -> phone201014099991@azraqmarket.app
+201014099991 -> phone201014099991@azraqmarket.app
```

لو Supabase رفض دومين `azraqmarket.app` برسالة invalid email بسبب إعدادات التحقق أو allow-list، التطبيق يجرب تلقائيًا بريدًا داخليًا احتياطيًا على `example.com` لنفس الرقم، والدخول يجرب الصيغتين.

لو ظهر خطأ بعد إنشاء الحساب يقول إن تسجيل الدخول التلقائي لم يتم، فهذا يعني غالبًا أن Confirm email مفعّل في Supabase. عطّله أو فعّل المستخدم يدويًا من لوحة Supabase.

## الأدوار والتوجيه

- `customer` -> `/`
- `admin` -> `/admin`
- `warehouse` -> `/warehouse`
- `delivery` -> `/delivery`

بعد `signUp` يتم إنشاء profile تلقائيًا عبر trigger في Supabase، ثم يحاول التطبيق تسجيل دخول المستخدم مباشرة. بعد `signInWithPassword` يتم تحميل profile حسب `user.id` ثم التوجيه حسب الدور.

## إنشاء Admin يدويًا

من Supabase Dashboard:

1. افتح Authentication > Users.
2. اختر Add user.
3. ضع البريد الداخلي مثل:

```text
phone201000000001@azraqmarket.app
```

4. ضع كلمة مرور.
5. افتح SQL Editor وعدّل الدور:

```sql
update public.profiles
set role = 'admin', full_name = 'مشرف أزرق', phone = '201000000001'
where id = 'USER_UUID';

update public.profiles
set role = 'warehouse', full_name = 'مسؤول المخزن', phone = '201000000002'
where id = 'USER_UUID';

update public.profiles
set role = 'delivery', full_name = 'مسؤول الحركة', phone = '201000000003'
where id = 'USER_UUID';
```

يمكن أيضًا تعديل الدور من لوحة المشرف بعد ظهور profile. لا تضع `service_role` في الواجهة الأمامية أبدًا.

## الوظائف

- العميل: منتجات، أقسام، شبكة/قائمة، تفاصيل منتج، سلة، فاتورة، إرسال طلب، طلباتي، تكرار طلب، وتتبع الحالة.
- المشرف: Dashboard، إدارة المنتجات، رفع صورتين لكل منتج، إدارة الأقسام، إدارة العملاء والأدوار، إدارة الطلبات، تغيير الحالة، عرض/طباعة الفاتورة.
- المخزن: الطلبات الجديدة، تفاصيل الطلب، تغيير الحالة إلى قيد التحضير، وتحويل الطلب إلى الحركة.
- الحركة: الطلبات الجاهزة، بيانات العميل، العنوان، رابط الخرائط، تغيير الحالة إلى مع الحركة أو تم التسليم.

## Netlify

إعدادات النشر:

```text
Build command: npm run build
Publish directory: dist
```

Environment variables في Netlify:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

ملفات `_redirects` و`netlify.toml` تحتوي استثناءات لـ `sw.js` و`manifest.webmanifest` والأيقونات قبل catch-all الخاص بتطبيق SPA. أثناء التطوير، الـ service worker الحالي يعطل نفسه ويمسح caches لتجنب مشاكل النسخ القديمة.

## أوامر الفحص

```bash
npm install
npm run build
```

بعد البناء تأكد من وجود:

```text
dist/index.html
dist/_redirects
dist/_headers
dist/sw.js
dist/manifest.webmanifest
dist/icon-192.png
dist/icon-512.png
dist/assets/
```

## مشاكل شائعة

- `Email not confirmed`: عطّل Confirm email في Supabase أو فعّل المستخدم يدويًا.
- `Invalid login credentials`: تأكد من رقم الهاتف وكلمة المرور، وأن البريد الداخلي في Supabase بنفس صيغة `phone201...@azraqmarket.app`.
- الصور لا ترفع: تأكد من bucket `product-images` ومن سياسات Storage في `schema.sql`.
- صفحات Netlify ترجع 404 عند التحديث: تأكد من رفع `_redirects` داخل `dist`.
- صفحة فارغة بعد تحديث كبير: افتح `/sw.js` أو امسح بيانات الموقع؛ الـ service worker الحالي مصمم لإلغاء نفسه ومسح الكاش.
