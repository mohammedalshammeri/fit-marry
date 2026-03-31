# خطة تطوير fit-marry — التفوق 10 أضعاف على المنافسين

> هذه الخطة مبنية على تحليل كامل لكل سطر كود في المشروع، وليست نظرية.
> كل بند يوضح: الملف المطلوب تعديله، ماذا يوجد حالياً، وماذا يجب إضافته.

---

## المرحلة 1: سد الفجوات الحرجة (أولوية قصوى)

### 1.1 فلاتر الاستكشاف المتقدمة
**المشكلة**: `matching.service.ts` → `getDiscovery()` يفلتر فقط على `age`, `city`, `marriageType`, `country`.
الـ schema يحوي 20+ حقل بالبروفايل لا يُستخدم أي منها بالفلترة.

**المطلوب — Backend**:
- `matching.service.ts` → إضافة فلاتر على:
  - `religion` / `sect` (دين / مذهب)
  - `nationalityPrimary` (الجنسية)
  - `educationLevel` (مستوى التعليم)
  - `maritalStatus` (الحالة الاجتماعية)
  - `smoking` / `alcohol` (تدخين / كحول)
  - `childrenCount` (عدد الأطفال)
  - `jobStatus` (الوظيفة)
  - `height` (min/max)
  - `skinColor` / `eyeColor`
  - `wantChildren` (يريد أطفال)
- `discovery-query.dto.ts` → إضافة كل الحقول الجديدة كـ optional params

**المطلوب — Mobile**:
- `app/(tabs)/index.tsx` → الفلتر الحالي يحوي فقط 3 حقول. يجب توسيعه لـ modal كامل مع sections

**الأثر**: Muzz و خطابة تدعم هذه الفلاتر. بدونها المستخدم يضيع وقته بتصفح بروفايلات غير مناسبة.

---

### 1.2 مؤشر "متصل الآن" + آخر ظهور
**المشكلة**: `lastSeenAt` مخزن بالـ schema ويتحدث، لكن لا يُعرض أبداً للمستخدم.

**المطلوب — Backend**:
- `profiles.service.ts` → `getPublicProfile()` يجب أن يرجع `lastSeenAt` و `isOnline` (آخر 5 دقائق)
- `messages.gateway.ts` أو `chat.gateway.ts` → بث حدث `user:online` / `user:offline` عند الاتصال/الانقطاع

**المطلوب — Mobile**:
- `app/chat/[id].tsx` → عرض نقطة خضراء + "متصل الآن" أو "آخر ظهور منذ ..."
- `app/(tabs)/matches.tsx` → نقطة خضراء على صورة المحادثة
- `app/(tabs)/index.tsx` → بطاقة الاستكشاف تعرض "متصل" أو "آخر ظهور"

**الأثر**: كل تطبيقات المحادثة تعرض هذا. غيابه يجعل التطبيق يبدو غير مكتمل.

---

### 1.3 مؤشر الكتابة (Typing Indicator)
**المشكلة**: لا يوجد أي تطبيق له بالكود.

**المطلوب — Backend**:
- `messages.gateway.ts` → إضافة حدثين:
  - `typing:start` → يبث للمحادثة
  - `typing:stop` → يبث للمحادثة

**المطلوب — Mobile**:
- `app/chat/[id].tsx` → عند بدء الكتابة يرسل `typing:start`، عند التوقف 3 ثواني `typing:stop`
- عرض "يكتب..." تحت اسم المستخدم

---

### 1.4 تم القراءة (Read Receipts)
**المشكلة**: `MessageView` model موجود ويسجل `viewedAt`، لكن لا يُرسل الحدث للمرسل.

**المطلوب — Backend**:
- `messages.gateway.ts` → حدث `message:read` يُبث عند تسجيل قراءة
- `messages.service.ts` → `markViewed()` يجب أن يبث الحدث

**المطلوب — Mobile**:
- `app/chat/[id].tsx` → علامتين زرقاوين ✓✓ على الرسائل المقروءة
- الاستماع لحدث `message:read` وتحديث الواجهة

---

### 1.5 Apple IAP + Google Play Billing
**المشكلة**: الاشتراكات عبر Stripe فقط. Apple و Google سيرفضون التطبيق.

**المطلوب — Backend**:
- `subscriptions.service.ts` → إضافة `verifyAppleReceipt()` و `verifyGooglePurchase()`
- endpoint جديد `POST /subscriptions/verify-receipt` يقبل `{ platform, receipt }`
- التحقق من الإيصال عبر Apple/Google servers
- تفعيل الاشتراك بعد التحقق

**المطلوب — Mobile**:
- `expo-in-app-purchases` أو `react-native-iap`
- `app/premium/index.tsx` → زر الشراء يستخدم IAP بدل Stripe مباشر
- إرسال الإيصال للباك اند للتحقق

**الأثر**: بدون هذا = رفض النشر على المتاجر.

---

## المرحلة 2: ميزات تنافسية (تتفوق على Muzz وخطابة)

### 2.1 نظام الولي / المحرم (Guardian System)
**المشكلة**: Muzz و خطابة يدعمون "الولي" — شخص موثوق يراقب المحادثات. fit-marry لا يدعمه.

**المطلوب — Schema**:
```prisma
model Guardian {
  id              String   @id @default(cuid())
  userId          String
  guardianUserId  String?  // إذا كان مستخدم بالتطبيق
  guardianName    String
  guardianPhone   String
  guardianEmail   String?
  status          GuardianStatus @default(PENDING)
  inviteCode      String   @unique
  canReadMessages Boolean  @default(false)
  canApproveMatch Boolean  @default(false)
  createdAt       DateTime @default(now())
}

enum GuardianStatus {
  PENDING
  ACCEPTED
  REJECTED
}
```

**المطلوب — Backend**:
- `guardians/guardians.service.ts` → CRUD + دعوة عبر رابط/كود
- `guardians/guardians.controller.ts` → endpoints
- `conversations.service.ts` → إذا `canApproveMatch` مفعّل، المحادثة لا تبدأ حتى يوافق الولي
- `messages.service.ts` → إذا `canReadMessages` مفعّل، الولي يستطيع قراءة الرسائل

**المطلوب — Mobile**:
- شاشة إعدادات الولي
- إشعارات للولي عند حدوث match جديد
- واجهة القراءة للولي (read-only)

**الأثر**: ميزة حاسمة للسوق الخليجي. بدونها الفتيات لن يستخدموا التطبيق.

---

### 2.2 التحقق من الهوية (ID Verification)
**المشكلة**: لا يوجد تحقق. أي شخص يسجل بأي معلومات.

**المطلوب — Schema**:
```prisma
// إضافة لـ User model
  idVerificationStatus  VerificationStatus @default(NONE)
  idVerifiedAt          DateTime?

enum VerificationStatus {
  NONE
  PENDING
  VERIFIED
  REJECTED
}
```

**المطلوب — Backend**:
- `profiles/verification.service.ts`:
  - `submitVerification(userId, dto)` — رفع صورة الهوية
  - `adminVerify(adminId, userId, status)` — موافقة/رفض
- رفع الصورة مشفرة (لا تُخزن كـ plain)
- حذف الصورة بعد التحقق

**المطلوب — Mobile**:
- شاشة رفع الهوية (صورة أمامية + سيلفي)
- علامة ✓ زرقاء على البروفايل المتحقق
- فلتر "المتحققين فقط" بالاستكشاف

**المطلوب — Admin**:
- صفحة مراجعة طلبات التحقق
- موافقة/رفض مع سبب

**الأثر**: يرفع الثقة 10 أضعاف. Muzz يدعمها وهي سبب شهرتها.

---

### 2.3 أسئلة كسر الجليد (Icebreakers)
**المشكلة**: المحادثة تبدأ فارغة. المستخدمون لا يعرفون ماذا يكتبون.

**المطلوب — Schema**:
```prisma
model IcebreakerQuestion {
  id        String   @id @default(cuid())
  textAr    String   // السؤال بالعربي
  textEn    String?
  category  String   // personal, values, lifestyle, fun
  isActive  Boolean  @default(true)
}

model IcebreakerAnswer {
  id         String   @id @default(cuid())
  userId     String
  questionId String
  answer     String
  isPublic   Boolean  @default(true)
  createdAt  DateTime @default(now())
}
```

**المطلوب — Backend**:
- `icebreakers/icebreakers.service.ts`:
  - `getRandomQuestions(count)` — أسئلة عشوائية
  - `answerQuestion(userId, questionId, answer)` — إجابة
  - `getUserAnswers(userId)` — إجابات المستخدم (تُعرض بالبروفايل)
  - `getConversationStarter(conversationId)` — سؤال مقترح لبدء المحادثة

**المطلوب — Mobile**:
- بطاقة "سؤال اليوم" بالبروفايل
- عند بدء محادثة جديدة → اقتراح سؤال للبدء
- إجابات الشخص تُعرض ببروفايله العام

**أمثلة أسئلة**:
- "ما أهم صفة تبحث عنها في شريك حياتك؟"
- "كيف تتخيل حياتك بعد 5 سنوات؟"
- "ما رأيك بعمل المرأة بعد الزواج؟"
- "هل تفضل السكن مع العائلة أم مستقل؟"

---

### 2.4 نظام التوافق (Compatibility Score)
**المشكلة**: لا يوجد أي مؤشر توافق. المستخدم يتصفح عشوائياً.

**المطلوب — Backend**:
- `matching/compatibility.service.ts`:
  - `calculateScore(user1, user2)` → نسبة مئوية (0-100%)
  - المعايير:
    - تطابق نوع الزواج: +20%
    - تطابق البلد: +15%
    - فرق العمر مناسب: +10%
    - تطابق المذهب/الدين: +15%
    - تطابق التعليم: +5%
    - تطابق التدخين/الكحول: +10%
    - تطابق الرغبة بالأطفال: +10%
    - تطابق الاهتمامات: +15%
- `matching.service.ts` → `getDiscovery()` يحسب النسبة ويرجعها مع كل بطاقة
- الترتيب حسب النسبة (الأعلى توافقاً أولاً)

**المطلوب — Mobile**:
- دائرة نسبة التوافق على كل بطاقة استكشاف (مثل: 87%)
- صفحة تفصيل التوافق عند الضغط على النسبة

**الأثر**: ميزة غير موجودة بأي منافس عربي. تجعل التصفح ذكي وليس عشوائي.

---

### 2.5 واجهة Swipe Cards
**المشكلة**: الاستكشاف حالياً قائمة تمرير عمودية. Tinder و Muzz يستخدمون بطاقات swipe.

**المطلوب — Mobile**:
- تثبيت `react-native-deck-swiper` أو بناء custom swipe component
- `app/(tabs)/index.tsx` → تحويل من FlatList إلى Swipe Stack:
  - سحب يمين = Like
  - سحب يسار = Skip
  - سحب لأعلى = عرض البروفايل الكامل
  - زر قلب = Like
  - زر X = Skip
- أنيميشن سلسة مع spring physics

**الأثر**: تجربة المستخدم الأهم. كل المنافسين يستخدمونها لسبب — إدمانية وممتعة.

---

## المرحلة 3: ميزات التفوق (غير موجودة بأي منافس)

### 3.1 الخاطبة الذكية (AI Matchmaker)
**الفكرة**: بدل أن يتصفح المستخدم يدوياً، الخاطبة الذكية ترسل له 3 اقتراحات يومياً.

**المطلوب — Backend**:
- `matching/ai-matchmaker.service.ts`:
  - `generateDailyMatches(userId)` — تختار 3 مرشحين يومياً
  - الخوارزمية:
    1. حساب التوافق لجميع المرشحين المتاحين
    2. استبعاد من سبق إرسالهم
    3. تنويع (لا يرسل نفس الجنسية/المدينة 3 مرات)
    4. الأولوية للمرشحين المتحققين + النشطاء
  - `@Cron(EVERY_DAY_AT_8AM)` يشغّل التوليد
- إشعار push يومي: "لديك 3 اقتراحات جديدة من الخاطبة 💍"

**المطلوب — Schema**:
```prisma
model DailyMatch {
  id            String   @id @default(cuid())
  userId        String
  matchedUserId String
  score         Float
  status        DailyMatchStatus @default(PENDING)
  sentAt        DateTime @default(now())
  viewedAt      DateTime?
  actionAt      DateTime?
}

enum DailyMatchStatus {
  PENDING
  VIEWED
  LIKED
  SKIPPED
}
```

**المطلوب — Mobile**:
- تبويب جديد "الخاطبة" أو قسم خاص أعلى الاستكشاف
- بطاقات مميزة بتصميم ذهبي
- كل بطاقة تعرض نسبة التوافق + سبب الاقتراح

**الأثر**: خطابة تقدم خدمة "خاطبة بشرية" بسعر مرتفع. نحن نقدمها مجاناً وبشكل آلي ذكي.

---

### 3.2 ملف الشروط المسبقة (Deal-Breakers)
**الفكرة**: المستخدم يحدد شروطه الإجبارية مسبقاً، والخوارزمية تستبعد من لا يستوفيها.

**المطلوب — Schema**:
```prisma
model UserPreferences {
  id                  String   @id @default(cuid())
  userId              String   @unique
  // شروط إجبارية (Deal-Breakers)
  requiredReligion    String?
  requiredSect        String?
  requiredCountries   String[] // بلدان مقبولة
  requiredAgeMin      Int?
  requiredAgeMax      Int?
  requiredEducation   String[] // مستويات التعليم المقبولة
  requiredMarital     String[] // الحالات الاجتماعية المقبولة
  noSmoking           Boolean  @default(false)
  noAlcohol           Boolean  @default(false)
  mustWantChildren    Boolean  @default(false)
  // تفضيلات (ليست إجبارية — تؤثر على درجة التوافق)
  preferredHeight     Int?
  preferredNationality String?
  updatedAt           DateTime @updatedAt
}
```

**المطلوب — Backend**:
- `matching.service.ts` → `getDiscovery()` يطبق شروط `UserPreferences` الإجبارية كـ WHERE conditions
- `matching/compatibility.service.ts` → التفضيلات غير الإجبارية تؤثر على نسبة التوافق

**المطلوب — Mobile**:
- شاشة "شروطي" ضمن البروفايل
- واجهة واضحة تفصل بين "شروط إجبارية" و "تفضيلات"

**الأثر**: توفير وقت المستخدم. لن يرى بروفايلات لا تناسبه أبداً.

---

### 3.3 مراحل التعارف (Courtship Stages)
**الفكرة**: بدل محادثة مفتوحة بلا هدف، نظام مراحل يوجه العلاقة.

**المطلوب — Schema**:
```prisma
enum ConversationStage {
  INTRODUCTION    // 3 أيام — أسئلة أساسية
  GETTING_TO_KNOW // 7 أيام — محادثة حرة
  SERIOUS_TALK    // 14 يوم — أسئلة جدية (مهر، سكن، إلخ)
  FAMILY_MEETING  // بلا حد — ترتيب لقاء العائلات
  DECIDED         // أحدهما قرر
}

// إضافة لـ Conversation model
  stage     ConversationStage @default(INTRODUCTION)
  stageAt   DateTime          @default(now())
```

**المطلوب — Backend**:
- `conversations.service.ts`:
  - `advanceStage(conversationId)` — الانتقال للمرحلة التالية (يتطلب موافقة الطرفين)
  - `getStageGuidelines(stage)` — إرشادات كل مرحلة
- كل مرحلة تفتح ميزات جديدة:
  - INTRODUCTION: نص فقط + أسئلة كسر الجليد
  - GETTING_TO_KNOW: نص + صوت
  - SERIOUS_TALK: نص + صوت + صور + مكالمة فيديو
  - FAMILY_MEETING: كل شيء + مشاركة رقم الهاتف + إشعار الولي

**المطلوب — Mobile**:
- شريط تقدم أعلى المحادثة يعرض المرحلة الحالية
- زر "الانتقال للمرحلة التالية" (يرسل طلب للطرف الآخر)
- قفل الميزات حسب المرحلة

**الأثر**: ميزة غير موجودة بأي تطبيق زواج. تجعل العلاقة جدية ومنظمة. تقلل المستخدمين غير الجادين.

---

### 3.4 جلسة التعارف المرئية (Video Date)
**الفكرة**: مكالمة فيديو منظمة بأسئلة وموقت.

**المطلوب — Backend**:
- `calls/video-date.service.ts`:
  - `createVideoDate(conversationId)` — إنشاء جلسة بأسئلة محددة
  - `getDateQuestions(stage)` — أسئلة حسب مرحلة المحادثة
  - الجلسة: 15 دقيقة، كل 3 دقائق يظهر سؤال جديد
  - بعد الانتهاء: كل طرف يقيّم الجلسة (😊/😐/😞)

**المطلوب — Mobile**:
- زر "جلسة تعارف" بجانب زر المكالمة العادية
- شاشة المكالمة تعرض السؤال الحالي أعلى الفيديو
- موقت 15 دقيقة
- شاشة تقييم بعد الانتهاء

**الأثر**: تحول المكالمة من عشوائية إلى مفيدة. يقلل القلق من "ماذا أقول".

---

### 3.5 نظام السمعة والتقييم
**الفكرة**: تقييم المستخدمين بعد انتهاء كل محادثة.

**المطلوب — Schema**:
```prisma
model UserRating {
  id              String   @id @default(cuid())
  ratedUserId     String
  raterUserId     String
  conversationId  String
  respect         Int      // 1-5
  seriousness     Int      // 1-5
  honesty         Int      // 1-5
  comment         String?  // تعليق خاص (لا يُعرض)
  createdAt       DateTime @default(now())
  @@unique([raterUserId, conversationId])
}

// إضافة لـ User model
  reputationScore Float @default(0) // 0-5 متوسط
  totalRatings    Int   @default(0)
```

**المطلوب — Backend**:
- `ratings/ratings.service.ts`:
  - `rateUser(raterId, dto)` — تقييم بعد إغلاق المحادثة
  - `getReputation(userId)` — المتوسط
  - `@Cron` لتحديث المتوسطات
- المستخدمون ذوو التقييم > 4 يحصلون على أولوية بالاستكشاف

**المطلوب — Mobile**:
- عند إغلاق محادثة → شاشة تقييم (3 معايير + تعليق اختياري)
- نجوم التقييم على البروفايل العام
- فلتر "تقييم عالي فقط"

**الأثر**: يطرد المستخدمين غير الجادين. يكافئ الملتزمين. Muzz بدأت بتطبيق شيء مشابه.

---

### 3.6 Stories / قصص يومية
**المطلوب — Schema**:
```prisma
model Story {
  id        String   @id @default(cuid())
  userId    String
  mediaUrl  String
  mediaType StoryMediaType
  caption   String?
  expiresAt DateTime // 24 ساعة
  viewCount Int      @default(0)
  createdAt DateTime @default(now())
}

enum StoryMediaType {
  IMAGE
  VIDEO
  TEXT
}
```

**المطلوب — Mobile**:
- شريط Stories أعلى شاشة الاستكشاف (دوائر)
- إضافة Story (صورة/نص) — بريميوم فقط
- عرض Stories بواجهة Tinder-like (tap للتالي)

---

## المرحلة 4: تحسينات تقنية

### 4.1 إصلاح `lastSeenAt` في الوقت الحقيقي
**الحالي**: يتحدث فقط عند طلب API.
**المطلوب**: يتحدث مع كل اتصال/انقطاع WebSocket + كل تفاعل.

### 4.2 Caching بـ Redis
**المطلوب**: خطوة مستقبلية
- cache نتائج الاستكشاف (TTL 5 دقائق)
- cache البروفايلات العامة
- cache إعدادات النظام

### 4.3 إشعارات أذكى
**الحالي**: إشعارات أساسية (like, match, message).
**المطلوب**:
- "فلان شاف بروفايلك" (بريميوم)
- "لم ترد على فلان منذ يومين"
- "لديك 3 likes لم تراها"
- إشعارات صامتة بالليل (quiet hours)

### 4.4 تقارير ذكية (Admin)
**المطلوب** في لوحة التحكم:
- معدل التحويل: signup → profile complete → first like → first match → first message
- متوسط مدة المحادثة قبل الإغلاق
- أكثر أسباب الإغلاق (BLOCK vs NOT_COMPATIBLE)
- معدل الاحتفاظ (retention) أسبوعي/شهري
- خريطة حرارية للمستخدمين حسب البلد

---

## المرحلة 5: الأمان والثقة

### 5.1 كشف البروفايلات المزيفة
**المطلوب — Backend**:
- `moderation/fake-detection.service.ts`:
  - تحليل: هل الصورة من الإنترنت (reverse image search API)
  - تحليل: سلوك مشبوه (10 محادثات مغلقة بسرعة)
  - تحليل: نصوص متكررة (copy-paste messages)
  - تنبيه الأدمن تلقائياً

### 5.2 حماية البيانات
**المطلوب**:
- تشفير الرسائل الحساسة (E2E encryption — future)
- سياسة حذف الحساب مع كل البيانات (GDPR compliance)
- تقرير بيانات المستخدم (data export)

### 5.3 نظام البلاغات المحسّن
**الحالي**: بلاغ بسيط مع نص.
**المطلوب**:
- فئات محددة: تحرش، احتيال، بروفايل مزيف، سلوك مسيء
- رد آلي فوري على البلاغات العاجلة (تحرش → حظر فوري مؤقت)
- متابعة المبلّغ بنتيجة البلاغ

---

## المرحلة 6: التوسع والنمو

### 6.1 دعم لغات متعددة
**الحالي**: عربي فقط (RTL مفعّل).
**المطلوب**:
- `i18n` بالموبايل (عربي + إنجليزي + فرنسي + أوردو + تركي)
- لوحة التحكم بالعربي والإنجليزي

### 6.2 نظام الأحداث (Events)
**الفكرة**: لقاءات جماعية افتراضية (group video) للتعارف.
- الأدمن ينشئ حدث: "ليلة تعارف — السعودية" الخميس 8 مساء
- مجموعات من 4-6 أشخاص
- 10 دقائق محادثة → دوران
- بعد الحدث: يختار كل شخص من أعجبه

### 6.3 نسخة الويب
**المطلوب**: نسخة ويب كاملة (Next.js) بنفس الوظائف الأساسية.

---

## ملخص الأولويات

| المرحلة | المهام | الأثر | التعقيد |
|---------|--------|-------|---------|
| **1 — حرج** | فلاتر متقدمة، متصل الآن، typing، read receipts، IAP | سد الفجوات مع المنافسين | متوسط |
| **2 — تنافسي** | ولي، تحقق هوية، أسئلة، توافق، swipe | التساوي مع Muzz/خطابة | عالي |
| **3 — تفوق** | خاطبة ذكية، deal-breakers، مراحل، video date، سمعة، stories | تفوق 10x | عالي |
| **4 — تقني** | Redis، إشعارات ذكية، تقارير | أداء وبيانات | متوسط |
| **5 — أمان** | كشف مزيف، حماية بيانات، بلاغات محسنة | ثقة المستخدم | متوسط |
| **6 — نمو** | لغات، أحداث، نسخة ويب | توسع السوق | عالي |

---

## القاعدة الذهبية

> fit-marry ليس "تيندر عربي" ولا "Muzz آخر".
> الميزة التنافسية الحقيقية: **الجدية**.
> كل ميزة (مراحل التعارف، حد المحادثات، فترة انتظار الصور، نظام الولي، التوافق) تقول للمستخدم: "هذا التطبيق للجادين فقط."
> المنافسون يركزون على الترفيه. نحن نركز على **النتيجة: زواج ناجح**.
