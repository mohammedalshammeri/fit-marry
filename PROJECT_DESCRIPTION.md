# توصيف مشروع Fit Marry — مبني على قراءة كل ملف في المشروع

> هذا الملف مكتوب بعد قراءة كل ملف في المشروع كاملاً: سيرفر NestJS، تطبيق Expo، لوحة Next.js، وسكيما Prisma.
> لا توصيفات تنظيرية — كل سطر هنا من الكود الفعلي.

---

## ما هو التطبيق؟

**Fit Marry** هو تطبيق زواج عربي إسلامي يعمل على iOS وAndroid، مصمم لربط الأشخاص الراغبين في الزواج. يدعم نوعين من الزواج:
- **زواج دائم** (PERMANENT): ملف شخصي كامل، لايك متبادل ينشئ محادثة.
- **زواج مسيار** (MISYAR): خصوصية عالية — يظهر في الاستكشاف فقط الاسم، نوع الزواج، الصورة، الجنسية والبلد. لا يمكنه إرسال لايك لأحد أو استقبال لايك (النظام يرفض ذلك صراحة في likes.service.ts).

يتكون من 3 أجزاء:
1. **الخادم**: NestJS (TypeScript) — المنفذ 4000 — PostgreSQL عبر Prisma
2. **التطبيق المحمول**: Expo React Native (TypeScript)
3. **لوحة الإدارة**: Next.js 15 (TypeScript)

---

## البنية التقنية — من main.ts وapp.module.ts مباشرة

### السيرفر (NestJS)
- **المنفذ**: 4000
- **نظام التسجيل**: pino (تسجيل منظم بصيغة JSON)
- **الأمان**: Helmet، ValidationPipe (whitelist + forbidNonWhitelisted + transform)، CORS مفتوح لكل الأصول
- **تحديد معدل الطلبات**: ThrottlerGuard عام — 30 طلب كل 60 ثانية لكل عنوان IP
- **معالجة الأخطاء**: AllExceptionsFilter عام يُرجع { statusCode, message, path, timestamp }
- **توثيق الواجهة البرمجية**: Swagger متاح على /docs
- **الملفات الثابتة**: GET /uploads/avatars/:filename يخدم ملفات الصور من الديسك

### 14 موديول في السيرفر:
Auth، Profiles، Matching، Likes، Conversations، Messages، Calls، Wallet، Transactions، Subscriptions، Referrals، Notifications، Complaints، Admin، AccessControl، Health

### قاعدة البيانات (Prisma Schema — 650 سطر)
**19 Enum**: UserStatus، Gender، SubscriptionTier، MarriageType، OTPChannel، OTPPurpose، AdminStatus، RoleType، DeviceStatus، LikeStatus، ConversationStatus، LeaveReason، MessageType، CallStatus، TransactionType، TransactionStatus، ReferralStatus، ComplaintStatus، ComplaintActionType، BannerStatus، NotificationStatus

**النماذج الرئيسية**: User، Device، UserProfile، UserSubscription، Session، AdminUser، AdminSession، Role، AdminRole، Permission، RolePermission، Like، Conversation، ConversationParticipant، Message، TempMedia، MessageView، CallSession، Wallet، Transaction، Referral، ReferralEvent، OTP، Notification، Complaint، ComplaintAttachment، ComplaintAction، Banner، Setting، AuditLog

---

## نظام المصادقة — من auth.service.ts كاملاً

### تسجيل المستخدم الجديد (POST /auth/signup)
يستقبل: email? أو phone?، deviceId (حد أدنى 10 أحرف)، marriageType (PERMANENT|MISYAR)، ageConfirmed (boolean إجباري).

الخطوات بالترتيب:
1. يتحقق من أن deviceId غير مستخدم من قبل (Device.hash unique)
2. يتحقق من عدم وجود مستخدم بنفس الإيميل/الهاتف
3. يتحقق أن ageConfirmed = true
4. ينشئ: User + Device + Wallet (بدون رصيد) + كود إحالة (5 بايت عشوائية hex)
5. يرسل OTP مكون من 6 أرقام (مخزن مشفر SHA-256 في DB)

### تسجيل الدخول (POST /auth/login)
يستقبل: email? أو phone? فقط — **لا يوجد حقل password في المشروع**.
- يتحقق من وجود المستخدم وأن حالته ACTIVE
- يرسل OTP للتحقق
- لا يُرجع accessToken هنا — فقط { userId, otpSent, channel }

### التحقق من OTP (POST /auth/verify-otp)
بعد إدخال كود OTP الصحيح:
- مدة صلاحية OTP: OTP_TTL_SECONDS من env (افتراضي 10 دقائق)
- عدد المحاولات المسموحة: OTP_MAX_ATTEMPTS من env (افتراضي 5)
- إذا نجح: يُصدر accessToken + refreshToken
- **هنا فقط** تحصل على accessToken

### رمز التجديد (Refresh Token)
- مخزن في قاعدة البيانات كـ SHA-256 hash (في جدول Session)
- عند التجديد: يُلغى القديم ويُصدر جديد (تدوير التوكنات)
- مدة صلاحية refresh: 30 يوم
- JWT_SECRET (افتراضي "dev_secret")، JWT_REFRESH_SECRET (افتراضي "dev_refresh")

### استراتيجية JWT
يُرجع: { userId: payload.sub } — هذا الاسم المستخدم في كل المتحكمات.

---

## نظام المشرفين — مستقل تماماً

### تسجيل دخول المشرف (POST /admin/auth/login)
يستقبل: email + password — المشرفون يستخدمون كلمة مرور (bcrypt hash، 12 rounds).
- JWT payload: { sub: adminId, type: "admin" }
- يُخزن في المتصفح كـ cookie اسمها admin_token لمدة 7 أيام

### صلاحيات المشرفين (Roles & Permissions)
- نوعان: SUPER_ADMIN، SUB_ADMIN
- نظام أدوار ديناميكي: Role → RolePermission → Permission (بكود نصي)
- RolesGuard: يتحقق من نوع المشرف (SUPER_ADMIN/SUB_ADMIN)
- PermissionsGuard: يتحقق من كودات الصلاحيات المحددة في @Permissions()

---

## الملف الشخصي — من profiles.service.ts وschema.prisma

### الحقول الكاملة لـ UserProfile (36 حقل اختياري):
nickname (max80)، avatarUrl، religion، sect، nationalities[]، nationalityPrimary، residenceCountry، region، age، height، weight، skinColor، eyeColor، hairColor، educationLevel، jobStatus، maritalStatus، childrenCount، custodyInfo، smoking، alcohol، healthStatus، healthCondition، wantChildren، womenWorkStudy، interests[]، aboutMe (max1000)، partnerPrefs (max1000)، mahrMin، mahrMax، dowryMin، dowryMax، showMeTo، preferences (JSON)

### تحديث الملف الشخصي
- المستخدم الأول يُحدث مجاناً (editCount=0 → يصبح 1)
- بعد ذلك: يُحدد profileRequiresRepayment=true (لا يُطبق شيء فعلياً في الكود حالياً)
- PREMIUM لا يدفع لتحديث ملفه

### رفع الصورة الشخصية
- POST /profiles/avatar — يستقبل ملف صورة
- صيغ مسموحة: jpeg, jpg, png — حد أقصى: 5MB
- يُحفظ على الديسك: /uploads/avatars/{userId}-{uuid}.{ext}
- يُرجع URL النسبي

### getPublicProfile — قواعد الخصوصية
- **MISYAR**: يُرجع فقط 5 حقول: userId، marriageType، nickname، avatarUrl، nationalityPrimary، residenceCountry
- **PERMANENT**: يُرجع الملف كاملاً

---

## نظام الاشتراكات — من subscriptions.service.ts

### الباقتان الموجودتان في السيرفر (تُنشأن تلقائياً عند بدء التشغيل):
| الباقة | السعر | المدة | الميزات |
|--------|-------|-------|---------|
| Gold Monthly | $29.99 | 30 يوم | travelMode، unlimitedLikes، profileBoost: false |
| Platinum Annual | $199.99 | 365 يوم | all: true |

### الاشتراك والإلغاء
- POST /subscriptions/subscribe { packageId } — دفع وهمي
- POST /subscriptions/unsubscribe — يُلغي كل الاشتراكات النشطة + يُعيد subscriptionTier → FREE
- عند الاشتراك الناجح: يُضبط user.subscriptionTier = 'PREMIUM'

---

## نظام التحكم بالوصول (AccessControl) — من access-control.service.ts

كل عملية تتطلب ensureAccess() (إرسال لايك، فتح محادثة، مكالمة):
1. **إذا المستخدم أُنشئ منذ أقل من 3 أيام**: يمر مجاناً (فترة تجريبية)
2. **إذا لديه اشتراك نشط**: يمر
3. **غير ذلك**: يُرمى ForbiddenException: "Free trial ended. Please subscribe to continue."

---

## نظام الاستكشاف والمطابقة — من matching.service.ts

### كيف يعمل getDiscovery:
1. يقرأ إعدادات من قاعدة البيانات: maxInboundLikes (افتراضي 9)، inactivityDays (افتراضي 30)
2. يجلب المستخدمين ACTIVE بنفس marriageType
3. **وضع السفر** (تصفية بالبلد): متاح للـ PREMIUM فقط
4. يُستثنى من النتائج:
   - من ليس لديه ملف شخصي
   - من وصل عدد محادثاته النشطة لحد PREMIUM (5) أو FREE (3)
   - من وصل inboundLikes >= maxInboundLikes (لـ PERMANENT فقط)
5. ترقيم الصفحات بالمؤشر

### ما يظهر لمستخدم MISYAR في الاستكشاف:
فقط: userId، marriageType، nickname، avatarUrl، nationalityPrimary، residenceCountry

---

## نظام اللايك — من likes.service.ts (380 سطر)

### إرسال لايك (POST /likes):
1. ensureAccess() — تحقق من الوصول
2. **كلا المستخدمين يجب أن يكونا PERMANENT** — المسيار لا يُرسل ولا يستقبل لايك
3. تحقق من عدم الإعجاب بالنفس
4. تحقق من حد inboundLikes للمُستقبِل
5. تحقق من عدم وجود لايك مكرر

### حصص اللايكات (checkLikePermission):
- **PREMIUM**: غير محدود
- **أنثى بدون مكافأة إعلان**: محظور (throw)
- **ذكر**: حد 15 لايك يومياً (يُحسب من بداية اليوم)
- **مكافأة الإعلان** (claimAdReward): تصبح adRewardExpiresAt = now + 1 ساعة

### متى تنشأ المحادثة؟
فقط عند **اللايك المتبادل**:
- إذا أرسل A لايك لـ B وB سبق أن أرسل لايك لـ A → يتحول إلى ACCEPTED + تنشأ Conversation + 2 ConversationParticipant

### حد المحادثات (checkConversationLimit):
- **PREMIUM**: ما يُجيز 5 محادثات نشطة
- **FREE**: ما يُجيز 3 محادثات نشطة

---

## المحادثات — من conversations.service.ts

### قاعدة مهمة: ترك المحادثة = إغلاقها للطرفين
عند POST /conversations/leave:
- يُعيّن participant.isActive = false، leftAt = now، leaveReason = reason
- **يُعيّن conversation.status = 'CLOSED'** — يخسر الطرفان المحادثة

أسباب المغادرة (LeaveReason enum): NOT_COMPATIBLE، BLOCK
- POST /conversations/block يستدعي leave مع reason=BLOCK

### جلب المحادثات (GET /conversations/me):
- فقط status=ACTIVE + participant.isActive=true
- يشمل: ملف شخصي الطرف الآخر + آخر رسالة

---

## الرسائل — من messages.service.ts (290 سطر) ومessages.controller.ts

### أنواع الرسائل (MessageType): TEXT، IMAGE، VOICE

### إرسال رسالة (POST /messages):
1. ensureAccess() -> ensureParticipant() (تحقق أنك في المحادثة)
2. **TEXT**: يجب أن يحتوي على text field
3. **IMAGE**:
   - يتحقق من imageWaitDays من Setting (افتراضي 7 أيام من conversation.startedAt)
   - يتحقق من TempMedia (موجود، غير منتهي، غير مستخدم)
   - ينشئ Message بـ viewOnce=true، sensitive=true

### رفع صورة مؤقتة (POST /messages/media):
- يفك تشفير base64
- حد أقصى: MEDIA_MAX_BYTES من env (افتراضي 2MB)
- يُخزن البيانات الخام في قاعدة البيانات كـ Bytes في جدول TempMedia

### عرض صورة (GET /messages/:messageId/media):
- ensureParticipant() → يتحقق من MessageView.consumedAt
- إذا consumedAt مضبوطة → "Media already viewed" (عرض مرة واحدة فقط)
- يُضبط expiresAt = now + TEMP_MEDIA_VIEW_SECONDS (افتراضي 3 ثوانٍ)
- يُرجع { contentType, expiresAt, base64 }

### الرسالة التي رُئيت = تختفي:
- toMessageDto(): إذا viewOnce AND consumedAt → يُرجع null لـ mediaUrl وtempMediaId

---

## المكالمات — من calls.service.ts وcalls.controller.ts

- POST /calls/start: يتحقق من المشاركة → ينشئ CallSession (status=STARTED)
- POST /calls/end: يحسب الدقائق = max(1, ceil(durationMs/60000)) → **خصم المحفظة مُعطّل في الكود (COMMENTED OUT)**
- GET /calls/status/:id: يُرجع حالة الجلسة

**المكالمات مجانية حالياً** — تعليق في الكود: "Policy Change: Calls are free if access is allowed. No wallet deduction."

---

## المحفظة والمعاملات — من wallet.service.ts وtransactions.service.ts

### المحفظة (Wallet):
- حقول: balanceMinutes، balanceCredits، usedMinutes، remainingMinutes، currency
- GET /wallet: يُرجع سجل المحفظة
- POST /wallet/topup { amount?, minutes? }: ينشئ معاملة COMPLETED + يزيد الرصيد

### deductMinutes():
موجودة في wallet.service.ts لكن **غير مستدعاة حالياً** (المكالمات مجانية).

### المعاملات:
- GET /transactions: يُرجع كل معاملات المستخدم مرتبة بـ createdAt desc

---

## الإحالات — من referrals.service.ts

- GET /referrals/code: يُرجع كود الإحالة الخاص بالمستخدم
- POST /referrals/invite { referralCode }: يُسجل ReferralEvent
  - لا يمكن إحالة النفس
  - لا يمكن تطبيق نفس الكود مرتين
- GET /referrals/status: يُرجع { code, totalInvites, verifiedCount, eligibleForFeeWaiver: verifiedCount >= 3 }

---

## الإشعارات — من notifications.service.ts

- createNotification(): يُنشئ سجل في قاعدة البيانات فقط
- GET /notifications: يُرجع كل إشعارات المستخدم
- **لا يوجد FCM / APNs / Push Notifications من أي نوع** — فقط تخزين في قاعدة البيانات

---

## الشكاوى — من complaints.service.ts وcomplaints.controller.ts

- POST /complaints: يُنشئ شكوى — category نص حر (ليس enum)
  - لا يمكن الإبلاغ عن نفسك
  - يمكن إرفاق conversationId (مع التحقق من المشاركة)
  - يمكن إرفاق attachmentUrl
- GET /complaints/me: يُرجع شكاوى المستخدم

---

## لوحة التحكم الإدارية — من admin.service.ts (260 سطر) وكل الـ Controllers

### المسارات الكاملة للمشرفين:

**المصادقة**: POST /admin/auth/login، POST /admin/auth/refresh، POST /admin/auth/logout

**المستخدمون**: GET /admin/users، GET /admin/users/:id، POST /admin/users/:id/ban، POST /admin/users/:id/suspend، POST /admin/users/:id/unban

**الشكاوى**: GET /admin/complaints، GET /admin/complaints/:id، POST /admin/complaints/:id/actions
- إجراءات الشكوى (ComplaintActionType — 5 قيم): WARN، SUSPEND، BAN، MESSAGE_DELETE، CONVERSATION_CLOSE

**الرسائل (للشكاوى)**: GET /admin/complaints/messages/:conversationId
- TEXT: يُظهر النص
- IMAGE: يُخفي كل شيء (null mediaUrl/text) — لخصوصية الصور أمام المشرفين

**البانرات**: GET/POST /admin/banners، PATCH/DELETE /admin/banners/:id

**الإعدادات**: GET /admin/settings، PUT /admin/settings (مفتاح/قيمة)

**التقارير**: GET /admin/reports → { usersCount, complaintsCount, transactionsCount }

**سجلات التدقيق**: GET /admin/audit-logs
- يُسجل: actorAdminId، actionType، entityType، entityId، before(JSON)، after(JSON)، ip، userAgent

**المشرفون**: GET /admin/admins، POST /admin/admins (SUPER_ADMIN فقط)

**الأدوار**: GET/POST /admin/roles، PATCH /admin/roles/:id، DELETE /admin/roles/:id، GET /admin/permissions

---

## واجهة المستخدم — التطبيق المحمول (Expo)

### المصادقة في التطبيق (AuthContext + api.ts):
- baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000'
- معترض الطلبات: يقرأ token من SecureStore مع كل طلب
- AuthContext يُخزن: user، isLoading، login(token, userData)، logout()
- **token غير مُصدَّر** من AuthContext — const { token } = useAuth() في شاشة الاستكشاف يُرجع undefined دائماً (خطأ في الكود)

### شاشة تسجيل الدخول (app/(auth)/login.tsx):
يُرسل { email, password } إلى POST /auth/login — **هذا خطأ**:
- الخادم لا يستقبل password في LoginDto (حقل غير موجود)
- الخادم يُرجع { userId, otpSent, channel } — لا accessToken
- التطبيق يحفظ res.data.accessToken الذي سيكون undefined
- **لا توجد شاشة OTP في التطبيق — تدفق تسجيل الدخول مكسور بالكامل**

### شاشة التسجيل (app/(auth)/signup.tsx):
4 أسطر فقط: return <View><Text>Sign Up Screen (Coming Soon)</Text></View>
**واجهة فارغة — التسجيل غير موجود**

### شاشة الاستكشاف (app/(tabs)/index.tsx — 250 سطر):
- GET /discovery?country=X
- تصفية بـ 10 دول: السعودية، الإمارات، الكويت، مصر، الأردن، البحرين، قطر، عُمان، المغرب، تونس
- إرسال لايك: POST /likes { toUserId } → يُزيل المستخدم من القائمة
- تجاوز (Pass): يُزيل من القائمة محلياً فقط (لا API call)
- 403 → تنبيه بالعربية "ترقية الحساب" → توجيه لـ /premium
- استعلام دوري كل 3 ثوانٍ (لا WebSocket)
- الصور تظهر بدون تشويش

### شاشة المطابقين (app/(tabs)/matches.tsx):
- GET /conversations/me عند كل focus
- يُعرض: صورة، اسم، آخر رسالة أو 'صورة 📷'، الوقت بالعربية (date-fns)
- النقر → /chat/[id]
- يجد الطرف الآخر عبر: currentUser?.id || currentUser?.sub

### شاشة الإعجابات (app/(tabs)/likes.tsx):
- GET /likes/inbox
- قبول: POST /likes/:id/accept → تنبيه نجاح → توجيه لـ matches
- رفض: POST /likes/:id/reject

### شاشة الملف الشخصي (app/(tabs)/profile.tsx):
- GET /profiles/me + GET /wallet (بالتوازي)
- يعرض: صورة (نقر للرفع)، اسم مستعار، شارة Premium
- إحصاء: wallet.balance — **هذا خطأ**، المحفظة تحتوي balanceMinutes و balanceCredits وليس balance → يعرض 0 دائماً
- زر "ترقية" إذا subscriptionTier ≠ PREMIUM
- قائمة: تعديل الملف، إعدادات الخصوصية (غير مفعلة)، شحن رصيد (غير مفعل)، تسجيل خروج

### شاشة الدردشة (app/chat/[id].tsx — 400 سطر):
- استعلام دوري كل 3000 مللي ثانية
- نص: POST /messages { conversationId, type:'TEXT', text }
- صورة: POST /messages/media (base64) → tempMediaId → POST /messages { conversationId, type:'IMAGE', tempMediaId }
- عرض صورة: GET /messages/:messageId/media → base64 → modal
- **View-Once**: عداد 5 ثوانٍ → إغلاق تلقائي + useScreenProtection (expo-screen-capture)
- FlatList مقلوب (آخر رسالة في الأسفل)

### شاشة Premium (app/premium/index.tsx):
- GET /subscriptions/packages → يُعرض باقات حقيقية من الخادم
- POST /subscriptions/subscribe { packageId }
- تدرج لوني في التصميم

### شاشة تعديل الملف (app/profile/edit.tsx):
- GET /profiles/me → يملأ 10 حقول: nickname، aboutMe، partnerPrefs، age، height، weight، residenceCountry، nationalityPrimary، maritalStatus، jobStatus
- PUT /profiles/me مع تحويل أرقام لـ age/height/weight

---

## لوحة التحكم — واجهة الإدارة (Next.js)

### الاتصال بالخادم (lib/axios.ts):
- baseURL: 'http://localhost:3000' — **خطأ: الخادم يعمل على المنفذ 4000**
- تسجيل الخروج التلقائي عند الخطأ 401 مُعطَّل (معطل بتعليق في الكود)

### صفحة الرئيسية:
- GET /admin/reports → 3 بطاقات: عدد المستخدمين، عدد الشكاوى، عدد المعاملات
- مخطط النشاط: **عنصر مؤقت** — "سيتم إضافة الرسم البياني للنشاط قريباً"

### صفحة المستخدمين:
- جدول: الاسم، الإيميل/الهاتف، الحالة (ACTIVE/SUSPENDED/BANNED)، تاريخ التسجيل، أزرار ban/unban
- صفحة التفاصيل: 3 تبويبات — ملف شخصي (30+ حقل)، محفظة (balanceMinutes + balanceCredits + سجل معاملات فارغ مؤقت)، النشاط (فارغ مؤقت)

### صفحة الشكاوى:
- WARN/SUSPEND/BAN فقط (لا يُظهر MESSAGE_DELETE أو CONVERSATION_CLOSE رغم وجودهما في الـ Backend)

### صفحة الباقات (app/(dashboard)/packages/page.tsx):
بيانات وهمية بالكامل — مُثبَّتة في الكود مباشرة:
| الباقة | السعر |
|--------|-------|
| Basic | $9.99 |
| Gold | $29.99 |
| Diamond | $49.99 |

الـ Backend يحتوي فعلياً على: Gold Monthly ($29.99) وPlatinum Annual ($199.99)
كل الأزرار غير مفعلة — الصفحة للعرض فقط.

### بقية الصفحات:
- **البانرات**: إضافة وقراءة وتعديل وحذف كامل — الحقول: title، imageUrl، startAt، endAt، targetCountries
- **الإعدادات**: جدول قابل للتعديل مباشرة (مفتاح/قيمة)
- **فريق العمل**: POST لإنشاء مشرف جديد — يظهر 403 برسالة "غير مصرح لك" لغير SUPER_ADMIN
- **سجلات النظام**: جدول: actorAdmin.email، actionType، entityType، entityId، createdAt

---

## الأخطاء الموجودة في الكود — مُكتشَفة من القراءة الكاملة

### 1. تدفق تسجيل الدخول مكسور تماماً (ملف login.tsx في التطبيق)
- المشكلة: التطبيق يُرسل { email, password } لكن الخادم يتجاهل password ويُرجع فقط { userId, otpSent, channel } — لا accessToken.
- التطبيق يحاول حفظ res.data.accessToken = undefined.
- لا توجد شاشة OTP للتحقق.
- **النتيجة**: لا يمكن لأي مستخدم تسجيل الدخول فعلياً.

### 2. تسجيل المستخدم الجديد غير موجود (ملف signup.tsx في التطبيق)
- الملف يحتوي فقط على نص مؤقت فارغ.
- **النتيجة**: لا يمكن إنشاء حساب جديد.

### 3. لوحة التحكم لا تتصل بالخادم (ملف lib/axios.ts في لوحة الإدارة)
- baseURL: 'http://localhost:3000' — الخادم يعمل على المنفذ 4000.
- **النتيجة**: كل طلبات لوحة التحكم تفشل برفض الاتصال.

### 4. الاشتراك لا يعمل (subscriptions.controller.ts)
- req.user.id — لكن JWT strategy تُرجع { userId: payload.sub }.
- يجب أن يكون req.user.userId.
- **النتيجة**: POST /subscriptions/subscribe يرمي خطأ.

### 5. رصيد المحفظة لا يظهر (mobile profile.tsx)
- الكود يقرأ wallet.balance — لا يوجد هذا الحقل.
- الحقول الصحيحة: wallet.balanceMinutes، wallet.balanceCredits.
- **النتيجة**: يُعرض 0 دائماً.

### 6. token غير موجود في AuthContext (ملف index.tsx في التطبيق)
- const { token } = useAuth() — AuthContext لا يُصدر token.
- **النتيجة**: كود غير مُستخدم لا تأثير له.

### 7. صفحة الباقات في لوحة التحكم وهمية بالكامل
- بيانات مُثبَّتة في الكود مباشرة ولا تطابق الخادم.

### 8. لا يوجد إشعارات فورية (Push Notifications)
- notifications.service.ts يخزن في قاعدة البيانات فقط — لا FCM، لا APNs.

### 9. المكالمات مجانية (calls.service.ts)
- خصم المحفظة مُعطَّل في الكود عن قصد.

---

## ما يعمل فعلياً مقابل ما لا يعمل

| الميزة | Backend | Mobile | Admin |
|--------|---------|--------|-------|
| تسجيل دخول | OTP كامل | مكسور | يعمل |
| تسجيل جديد | كامل | placeholder فارغ | — |
| الملف الشخصي | كامل | جزئي (10 حقل فقط) | قراءة كاملة |
| الاستكشاف | كامل | يعمل | — |
| اللايكات | كامل | يعمل | — |
| المحادثات | كامل | يعمل | — |
| الرسائل النصية | كامل | يعمل | — |
| الرسائل الصورة | كامل | يعمل | — |
| المكالمات | كامل (مجانية) | غير مربوطة بواجهة المستخدم | — |
| الاشتراك | كامل | شاشة موجودة | خطأ في المتحكم |
| المحفظة | كامل | عرض خاطئ | placeholder |
| الإحالات | كامل | غير موجود | — |
| الإشعارات | DB فقط | غير موجود | — |
| لوحة التحكم | كامل | — | port خاطئ يمنع الاتصال |
| صفحة الباقات Admin | كامل | يقرأ Backend | بيانات وهمية |

---

## ملخص نهائي

**الخادم**: متكامل تقريباً — معظم المسارات مكتوبة، منطق الأعمال موجود، الأمان موجود (Helmet، JWT، تحديد معدل الطلبات، الصلاحيات، bcrypt للمشرفين، SHA-256 للـ OTP ورموز التجديد).

**التطبيق المحمول**: لا يمكن تجربته — تسجيل الدخول مكسور، التسجيل غير موجود. بدون حساب لا يمكن رؤية أي ميزة. باقي الشاشات (الاستكشاف، الدردشة، الاشتراك) مكتوبة ومنطقية.

**لوحة التحكم**: لا تتصل بالخادم بسبب منفذ خاطئ. الصفحات مكتوبة بشكل جيد لكن بعضها فارغ مؤقت وبعضها يحتوي بيانات وهمية.

**المشكلة الأكبر**: أساس التطبيق (تسجيل/دخول المستخدم) غير مكتمل في التطبيق المحمول، ومنفذ خاطئ في لوحة التحكم يمنع كل الوظائف الإدارية.

