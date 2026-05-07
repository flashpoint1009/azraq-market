# تعليمات تطبيق المرحلة الأولى — الأمان

## ما تم تعديله في الكود

### 1. `src/lib/auth.ts`
- **إزالة `role` من `options.data`** في دالة `signUpCustomer`
- المستخدم لم يعد قادراً على تمرير أي دور أثناء التسجيل
- الـ metadata تحتوي فقط على: `phone`, `full_name`, `address`

### 2. `src/context/AuthContext.tsx`
- **إزالة `metadataRoleForSession`** — دالة كانت تقرأ الدور من metadata
- الـ fallback profile يضبط الدور دائماً كـ `customer`
- لا يوجد أي مسار يسمح بقراءة دور من بيانات الـ token

### 3. `src/main.tsx`
- **تفعيل Sentry** — `initSentry()` يُستدعى عند بدء التطبيق
- لا يفعل شيئاً إذا لم تضع `VITE_SENTRY_DSN` في الـ env

### 4. `package.json`
- إضافة `@sentry/react ^8.0.0` للـ dependencies
- رفع الإصدار إلى `v1.1.0`

---

## خطوات مطلوبة في Supabase

### الخطوة 1: تشغيل Migration الأمان
افتح **SQL Editor** في Supabase وشغّل محتوى الملف:
```
supabase/migrations/010_security_hardening.sql
```

هذا الملف يعمل:
- تصحيح الـ trigger ليضبط الدور دائماً كـ `customer`
- سياسات RLS جديدة تمنع المستخدم من تعديل دوره أو صلاحياته
- تأمين عملية إنشاء الـ profile

### الخطوة 2: إضافة Sentry (اختياري لكن موصى به)
1. افتح [sentry.io](https://sentry.io) وأنشئ مشروع React جديد
2. انسخ الـ DSN
3. أضفه في Netlify:
   ```
   VITE_SENTRY_DSN=https://xxxxx@o0.ingest.sentry.io/xxxxx
   ```

### الخطوة 3: تشغيل Migration 007 (إذا لم تكن شغّلته)
```
supabase/migrations/007_rate_limiting_and_abuse_prevention.sql
```
يُفعّل Rate Limiting لمنع إساءة إنشاء الطلبات.

---

## التحقق من نجاح التطبيق

بعد تشغيل migration 010، افتح الـ SQL Editor وشغّل:

```sql
-- تأكد أن الـ trigger لا يقرأ الدور من metadata
select pg_get_functiondef(oid) 
from pg_proc 
where proname = 'handle_new_auth_user';
```

يجب أن ترى `'customer'` ثابتة في الكود، وليس `raw_user_meta_data->>'role'`.

---

## الخطوة التالية: رفع التغييرات على GitHub

```bash
git add .
git commit -m "fix: security hardening - remove role from signup metadata, fix trigger, enable Sentry"
git push origin main
```

بعد الـ push، Netlify سيعيد البناء تلقائياً.
