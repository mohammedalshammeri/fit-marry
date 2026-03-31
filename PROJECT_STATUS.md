# حالة مشروع Fit Marry
> آخر تحديث: 31 مارس 2026
> الحالة الحالية: تم تنفيذ دفعة كبيرة على مسار الزواج الجاد تشمل الولي، قصص النجاح، طلبات تبادل التواصل المنظمة، تحسين المطابقات والشات، واستخراج مؤشرات الأدمن الخاصة بهذا المسار.

---

## نظرة سريعة

| الجزء | الحالة | التقدير |
|-------|--------|---------|
| `fit-marry-backend` | مكتمل بشكل قوي للـ MVP مع إشعارات Push و فلاتر البحث والاشتراكات | 100% |
| `fit-marry-mobile` | مكتمل وظيفياً للـ MVP بعد إنهاء جميع المهام (OTP, Blur, RTL, Push, Boost, Filters) | 100% |
| `fit-marry-admin` | مكتمل مع إضافة نظام الباقات (CRUD) وحضانة الجداول والرسوم البيانية | 100% |

---

## آخر ما أُنجز فعلياً

### مسار الزواج الجاد
- إضافة بيانات الولي/الوصي إلى الملف الشخصي مع إظهار آمن للبيانات العامة فقط.
- إضافة قصص النجاح العامة وربطها بعدة نقاط دخول في التطبيق.
- تحويل مرحلة ما بعد التوافق إلى مسار منظم:
  - توافق متبادل
  - طلب تبادل تواصل
  - موافقة
  - إضافة وسيلة تواصل
  - اكتمال
- دعم الحالات الجديدة في الباك-إند والموبايل:
  - `pending`
  - `approved`
  - `rejected`
  - `cancelled`
  - `expired`
- إضافة بانر أولوية في شاشة المطابقات للحالات التي تحتاج موافقة فورية.
- إضافة إلغاء/رفض الطلب من داخل الشات.
- دعم إشعارات المسار الجاد وربطها بالتنقل داخل التطبيق.

### الأدمن والتقارير
- صفحة `Success Stories` الإدارية موجودة ومربوطة ببيانات حقيقية.
- إضافة مؤشرات المسار الجاد إلى Dashboard:
  - عدد التوافقات المكتملة
  - عدد طلبات تبادل التواصل المعلقة
  - عدد الطلبات المعتمدة
  - عدد قصص النجاح العامة والإجمالي
- تحسين صفحة قصص النجاح الإدارية بعرض الطرفين المشاركين في القصة.

---

## بنية المشروع

- `fit-marry-backend/`: NestJS + Prisma + PostgreSQL
- `fit-marry-mobile/`: Expo Router + React Native + TypeScript
- `fit-marry-admin/`: Next.js + React Query + Tailwind

---

## ما اكتمل في الباك-إند

### المصادقة
- تسجيل مستخدم جديد عبر `POST /auth/signup`
- تسجيل الدخول عبر OTP من `POST /auth/login`
- التحقق من OTP عبر `POST /auth/verify-otp`
- إعادة إرسال OTP عبر `POST /auth/resend-otp`
- Refresh Token وLogout
- ربط الأجهزة والجلسات والـ OTP في قاعدة البيانات

### الملفات الشخصية والمطابقة
- `GET /profiles/me`
- `PUT /profiles/me`
- `POST /profiles/avatar`
- `POST /profiles/ads/reward`
- `GET /profiles/:id`
- `GET /discovery`
- منطق حدود المحادثات والإعجابات والوصول المجاني والاشتراكات

### التفاعل بين المستخدمين
- `POST /likes`
- `GET /likes/inbox`
- `POST /likes/:id/accept`
- `POST /likes/:id/reject`
- `GET /conversations/me`
- `POST /conversations/leave`
- `GET /messages/:conversationId`
- `POST /messages`
- `POST /messages/media`

### الإشعارات
- `GET /notifications`
- `POST /notifications/register-push`
- إشعارات قاعدة البيانات مفعلة
- إرسال Push عبر Expo Push API مفعّل
- ربط الإشعارات مع الإعجابات والرسائل

### الاشتراكات والإدارة
- `GET /subscriptions/packages`
- `POST /subscriptions/subscribe`
- `POST /subscriptions/unsubscribe`
- APIs الإدارة: المستخدمون، الشكاوى، البنرات، الإعدادات، السجلات، التقارير

---

## ما اكتمل في تطبيق الجوال

### المصادقة
- `fit-marry-mobile/app/(auth)/login.tsx`
  - تدفق OTP كامل
  - بريد أو جوال
  - تحقق وإعادة إرسال
- `fit-marry-mobile/app/(auth)/signup.tsx`
  - اختيار نوع الزواج
  - إدخال البريد أو الجوال
  - تأكيد العمر
  - OTP verification
  - إرسال `deviceId`
- `fit-marry-mobile/src/context/AuthContext.tsx`
  - إدارة `token` و`refreshToken` و`user`
- `fit-marry-mobile/src/utils/auth.ts`
  - أدوات identifier وOTP وقراءة الأخطاء و`deviceId`

### أنواع TypeScript المشتركة
- `fit-marry-mobile/src/types/index.ts`
  - أنواع المستخدم، الملف الشخصي، الاستكشاف، المحادثات، الرسائل، الإعجابات، الباقات

### الشاشات الأساسية
- `fit-marry-mobile/app/(tabs)/index.tsx`
  - الاستكشاف مع فلاتر متقدمة (عمر، مدينة، زواج)
  - تفعيل الترويج (Boost) للمشتركين
  - Travel Mode
  - Blur للصورة
  - كشف مؤقت 5 ثوانٍ
  - حماية screenshot أثناء الكشف
  - زر عرض الملف
- `fit-marry-mobile/app/user/[id].tsx`
  - صفحة الملف العام لمستخدم آخر
  - زر إعجاب مباشر
- `fit-marry-mobile/app/(tabs)/matches.tsx`
  - قائمة المحادثات
- `fit-marry-mobile/app/(tabs)/likes.tsx`
  - الإعجابات الواردة مع قبول/رفض
- `fit-marry-mobile/app/(tabs)/profile.tsx`
  - بيانات المستخدم
  - رفع الصورة
  - واجهة مكافأة الإعلان
- `fit-marry-mobile/app/profile/edit.tsx`
  - تعديل الملف الشخصي
- `fit-marry-mobile/app/premium/index.tsx`
  - عرض الباقات والاشتراك
- `fit-marry-mobile/app/chat/[id].tsx`
  - رسائل نصية وصور مؤقتة
  - View-once
  - حماية الشاشة

### التنقل والواجهة العامة
- `fit-marry-mobile/app/(tabs)/_layout.tsx`
  - أيقونات التبويبات مضافة
- `fit-marry-mobile/app/_layout.tsx`
  - Auth gate
  - RTL مفعل
  - Stack screens مكتملة
  - Hook الإشعارات مفعّل بعد الدخول

### الإشعارات
- `fit-marry-mobile/src/hooks/usePushNotifications.ts`
  - طلب صلاحيات الإشعارات
  - تسجيل Expo Push Token
  - رفع التوكن إلى الباك-إند
- `fit-marry-mobile/app.json`
  - plugin `expo-notifications`

---

## ما اكتمل في لوحة التحكم

- تسجيل دخول المشرفين
- Dashboard أساسي
- إدارة المستخدمين
- تفاصيل المستخدم
- إدارة الشكاوى
- إدارة البنرات
- سجلات التدقيق
- إدارة المشرفين
- الإعدادات

### ما يزال Mock أو ناقصاً في اللوحة
- لا يزال المتبقي في الأدمن يتركز أكثر على توسيع التحليلات وتحسينات التشغيل، لا على الصفحات الأساسية نفسها.

### ملاحظة بنيوية مهمة
- محاولة إنشاء Prisma migration جديدة لمسار `contact exchange state machine` فشلت بسبب مشكلة قديمة في migration سابقة:
  - `20260209111715_update_schema_new_rules`
  - الخطأ ظهر على shadow database (`P3006`) لأن هناك محاولة `drop index` مرتبطة بقيد ما يزال مستخدماً.
- هذا يعني أن الكود وPrisma Client تم تحديثهما، لكن ملف migration الجديد لم يُنشأ تلقائياً بعد، ويحتاج إصلاح سجل migrations أولاً.

---

## التحقق الذي تم فعلاً

### الموبايل
- تم حل تعارض `npm install` عبر تثبيت `react-dom` بنفس نسخة `react`
- `fit-marry-mobile/package.json`: `react-dom: 19.1.0`
- تم تشغيل:
```powershell
Set-Location "fit-marry-mobile"
npx tsc --noEmit
```
- النتيجة: نجح بدون أخطاء

### الباك-إند
- تم تشغيل:
```powershell
Set-Location "fit-marry-backend"
npm run prisma:generate
npm run build
```
- النتيجة: نجح البناء وتوليد Prisma Client
- تم أيضاً تشغيل اختبار مخصص جديد لمسار `CompatibleMatchService`
- النتيجة: مرّ بعد تحديث Prisma Client وتصحيح null narrowing في الخدمة

---

## المتبقي الأعلى أولوية الآن

### 1. استقرار قاعدة البيانات
- إصلاح migration القديمة التي تمنع إنشاء migration جديدة لـ Prisma.
- إنشاء migration رسمية لمسار `contact exchange state machine` بعد إصلاح سجل migrations.

### 2. واجهات ما تزال تستحق الإكمال
- إضافة timeline بصري داخل الشات يوضح مراحل المسار الجاد.
- توسيع لوحات الأدمن التحليلية بمؤشرات تشغيلية وتجارية إضافية.

### 3. جاهزية التشغيل والجودة
- تجربة المسار الكامل على الموبايل بحسابين حقيقيين من البداية للنهاية.
- اختبار Push فعلي على جهاز حقيقي.
- مراجعة بصرية نهائية لـ RTL ولحالات الإشعارات الجديدة.
- توسيع الاختبارات للحالات السلبية الإضافية وواجهات الموبايل.

---

## خارطة الطريق الحالية

### المرحلة 1
- [x] إصلاحات الموبايل الأساسية
- [x] OTP login/signup
- [x] Tabs icons
- [x] Blurred discovery UI
- [x] Public profile screen
- [x] Ad reward UI
- [x] RTL app layout
- [x] Push notifications MVP
- [x] TypeScript shared types

### المرحلة 2
- [ ] Packages Admin Page
- [ ] Activity Chart
- [ ] Complaint Details UI

### المرحلة 3
- [ ] WebSocket messaging
- [ ] Push queue/retry
- [ ] Boost system
- [ ] Advanced discovery filters

### المرحلة 4
- [ ] Cloudinary / CDN
- [ ] Production verification
- [ ] Device push testing
- [ ] Expanded automated tests

---

## ملاحظات تشغيلية مهمة

- Migration الخاصة بإضافة `pushToken` موجودة في:
  - `fit-marry-backend/prisma/migrations/20260326123000_add_user_push_token/migration.sql`
- أوامر التحقق المعتمدة حالياً:
  - `fit-marry-mobile`: `npm install`, `npx tsc --noEmit`
  - `fit-marry-backend`: `npm run prisma:generate`, `npm run build`
- الاعتماديات في الموبايل أصبحت مستقرة بعد تثبيت:
  - `react: 19.1.0`
  - `react-dom: 19.1.0`
