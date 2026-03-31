# 🚀 خطة الإكمال إلى 100% — Fit Marry
> تاريخ الكتابة: 11 مارس 2026

---

## 📊 الوضع الحالي قبل البدء

| الجزء | الحالة | الهدف |
|-------|--------|-------|
| الباك-إند (NestJS) | ~85% | 100% |
| تطبيق الجوال (Expo) | ~65% | 100% |
| لوحة التحكم (Next.js) | ~80% | 100% |

---

## ✅ ما اكتُشف أثناء المراجعة العميقة (موجود فعلاً ولم يُلاحَظ أولاً)

قبل كتابة الخطة، هذه الأشياء **موجودة في الباك-إند فعلاً** وليست ناقصة:
- `POST /profiles/ads/reward` — endpoint مكتمل في `profiles.controller.ts` + `profiles.service.ts`
- `claimAdReward()` — يضبط `adRewardExpiresAt = now + 1 hour`
- `checkLikePermission()` — يتحقق من `adRewardExpiresAt` للنساء
- حد 15 إعجاب/يوم للرجال — مُنفَّذ فعلاً بـ count من startOfDay
- حد 5 محادثات للـ Premium و3 للمجاني — مُنفَّذ في `checkConversationLimit()`

---

## 🔴 المرحلة 1 — إصلاحات فورية (Bug Fixes)
**الوقت المقدر: ساعة واحدة**

### 1.1 إصلاح `token` غير موجود في AuthContext
**الملف:** `fit-marry-mobile/app/(tabs)/index.tsx` السطر 30
```tsx
// الحالي (خطأ — token غير موجود في AuthContext interface):
const { token } = useAuth();

// الصحيح:
const { user } = useAuth();
```
**المشكلة:** `AuthContext` لا يُصدّر `token`، فـ `token` دائماً `undefined` لكنه غير مستخدم بعد ذلك — dead code يجب حذفه.

### 1.2 إصلاح `PATCH` بدل `PUT` في تعديل الملف
**الملف:** `fit-marry-mobile/app/profile/edit.tsx`

```tsx
// الحالي:
await api.patch('/profiles/me', payload); // أو put؟

// Backend يقبل: PUT /profiles/me
// يجب التأكد أن الـ method صحيحة
```

---

## 🔴 المرحلة 2 — تطبيق الجوال: الناقص الحرج
**الوقت المقدر: 2-3 أيام**

### 2.1 شاشة التسجيل الكاملة (Signup)
**الملف:** `fit-marry-mobile/app/(auth)/signup.tsx`
**الحالة:** placeholder من 4 أسطر فقط

**الخطة — نموذج متعدد الخطوات (4 Steps):**

```
Step 1: اختيار نوع الزواج
  → زر "زواج دائم" | زر "مسيار"
  → يحفظ marriageType

Step 2: بيانات الحساب
  → TextField: بريد إلكتروني أو رقم هاتف
  → Checkbox: "أؤكد أنني بالغ وأوافق على الشروط"
  → يحفظ email/phone + ageConfirmed

Step 3: إرسال وانتظار OTP
  → POST /auth/signup → يرسل OTP
  → 6 خانات OTP input
  → POST /auth/verify-otp → يستلم accessToken + refreshToken
  → زر "إعادة الإرسال" بعد countdown 60 ثانية

Step 4: التوجيه والحفظ
  → حفظ Token في SecureStore
  → login(token, userData)
  → push إلى /(tabs)
```

**البيانات المطلوبة للـ API:**
```json
POST /auth/signup
{
  "email": "...",          // أو phone
  "phone": "...",          // أو email
  "marriageType": "PERMANENT",
  "ageConfirmed": true,
  "deviceId": "..."        // من expo-constants: Constants.deviceId
}
```

**الحزم المطلوبة:** `expo-constants` (موجودة)

---

### 2.2 أيقونات شريط التبويبات
**الملف:** `fit-marry-mobile/app/(tabs)/_layout.tsx`
**الحالة:** الكود موجود لكن الأيقونات مُعلَّقة بـ `//`

**الخطة:**
```tsx
import { Ionicons } from '@expo/vector-icons'; // موجود في package.json

// Discover:  icon="search"
// Matches:   icon="chatbubbles"
// Likes:     icon="heart"
// Profile:   icon="person"
```

---

### 2.3 تضبيب صور المستخدمين في الاستكشاف (Blurred Images)
**الملف:** `fit-marry-mobile/app/(tabs)/index.tsx`
**الحالة:** `<Image>` عادي بدون تضبيب
**الحزمة:** `expo-blur` موجودة في `package.json`

**الخطة:**
```tsx
import { BlurView } from 'expo-blur';

// الحالي:
<Image source={{ uri: avatar }} style={styles.avatar} />

// الجديد:
<View style={styles.imageWrapper}>
  <Image source={{ uri: avatar }} style={styles.avatar} />
  <BlurView intensity={80} style={StyleSheet.absoluteFill} />
  {/* زر "كشف الصورة" */}
  <TouchableOpacity onPress={handleReveal} style={styles.revealBtn}>
    <Ionicons name="eye" size={24} color="white" />
  </TouchableOpacity>
</View>
```

**منطق الكشف:**
1. المستخدم يضغط "كشف"
2. `BlurView` يختفي
3. Timer 5 ثوانٍ ينطلق
4. بعد 5 ثوانٍ: الصورة تعود للتضبيب تلقائياً
5. `useScreenProtection(isRevealed)` — منع screenshot أثناء الكشف

---

### 2.4 Push Notifications في التطبيق
**الحالة:** غير موجودة بالكامل

**الخطة:**
```bash
# تثبيت الحزمة
npx expo install expo-notifications
```

**ملف جديد:** `fit-marry-mobile/src/hooks/usePushNotifications.ts`
```tsx
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect } from 'react';
import api from '../services/api';

export const usePushNotifications = () => {
  useEffect(() => {
    registerForPush();
  }, []);

  const registerForPush = async () => {
    if (!Device.isDevice) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    // أرسل التوكن للسيرفر
    await api.post('/notifications/register-push', { token });
  };
};
```

**في الباك-إند** — إضافة endpoint:
```
POST /notifications/register-push
  body: { token: string }
  → يحفظ pushToken في جدول User أو Device
```

**وإرسال إشعار عند Match:**
```typescript
// في likes.service.ts عند إنشاء محادثة:
await notificationsService.sendPush(targetId, {
  title: '🎉 تطابق جديد!',
  body: `${nickname} قبل إعجابك`
});
```

---

### 2.5 شاشة عرض الملف الشخصي لمستخدم آخر
**الملف:** جديد `fit-marry-mobile/app/user/[id].tsx`
**الحالة:** زر "عرض الملف" في الاستكشاف موجود لكن لا توجد صفحة وجهة

**الخطة:**
```tsx
// GET /profiles/:id — موجود في الباك-إند
// يعرض: الاسم، الجنسية، الدين، العمر، عن نفسه، تفضيلات الشريك
// زر إعجاب مباشر من صفحة الملف
```

---

### 2.6 TypeScript Types المشتركة
**الملف:** `fit-marry-mobile/src/types/index.ts`
**الحالة:** المجلد فارغ تماماً

**الخطة:**
```typescript
export interface User {
  id: string;
  email?: string;
  phone?: string;
  marriageType: 'PERMANENT' | 'MISYAR';
  subscriptionTier: 'FREE' | 'PREMIUM';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  adRewardExpiresAt?: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  nickname?: string;
  avatarUrl?: string;
  age?: number;
  religion?: string;
  sect?: string;
  nationalityPrimary?: string;
  residenceCountry?: string;
  aboutMe?: string;
  partnerPrefs?: string;
  maritalStatus?: string;
  jobStatus?: string;
}

export interface Conversation {
  id: string;
  status: 'ACTIVE' | 'CLOSED';
  participants: ConversationParticipant[];
  messages: Message[];
}

export interface ConversationParticipant {
  user: { id: string; profile?: Partial<UserProfile> | null };
}

export interface Message {
  id: string;
  text?: string;
  senderId: string;
  createdAt: string;
  type: 'TEXT' | 'IMAGE' | 'VOICE';
  viewOnce?: boolean;
}

export interface Like {
  id: string;
  fromUser: { id: string; profile?: Partial<UserProfile> | null };
  createdAt: string;
}

export interface SubscriptionPackage {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  features?: Record<string, boolean>;
}
```

---

### 2.7 شاشة مكافأة الإعلانات (Ad Reward)
**الحالة:** الـ API موجود `POST /profiles/ads/reward` لكن لا توجد شاشة في التطبيق

**الخطة — إضافة زر في شاشة الملف الشخصي:**
```tsx
// في profile.tsx — إضافة قسم "احصل على وصول مجاني":
const handleWatchAd = async () => {
  // 1. تشغيل Google AdMob (أو محاكاة في MVP)
  // 2. بعد انتهاء الإعلان:
  await api.post('/profiles/ads/reward');
  Alert.alert('🎉 مكافأة!', 'حصلت على وصول كامل لمدة ساعة واحدة!');
};
```

**ملاحظة للـ MVP:** يمكن تخطي AdMob الفعلي والسماح للمستخدم بالضغط مباشرة مع رسالة "مشاهدة إعلان" + تأخير 5 ثوانٍ.

---

### 2.8 دعم RTL الكامل
**الملف:** `fit-marry-mobile/app/_layout.tsx`

```tsx
import { I18nManager } from 'react-native';

// أول شيء عند تشغيل التطبيق:
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  // في Expo: يحتاج reload
}
```

---

## 🟡 المرحلة 3 — الباك-إند: الناقص
**الوقت المقدر: يوم واحد**

### 3.1 Push Notification Delivery
**الملف:** `fit-marry-backend/src/notifications/notifications.service.ts`
**الحالة:** يحفظ في DB فقط، لا يرسل فعلياً

**الخطة — إضافة Expo Push API:**
```typescript
// استخدام Expo Push Notifications Service (لا يحتاج Firebase مباشرة)
async sendPush(userId: string, payload: { title: string; body: string }) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true }
  });
  
  if (!user?.pushToken) return;

  // Expo Push API
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: user.pushToken,
      title: payload.title,
      body: payload.body,
    }),
  });
}
```

**Migration مطلوبة:** إضافة `pushToken String?` لجدول `User` في Prisma Schema.

---

### 3.2 CRUD الباقات من لوحة التحكم
**الملف:** `fit-marry-backend/src/subscriptions/subscriptions.controller.ts`
**الحالة:** لا توجد endpoints للـ admin لإدارة الباقات

**الخطة — إضافة endpoints:**
```typescript
// في subscriptions.controller.ts أو admin module:

POST   /admin/packages          → createPackage()
PUT    /admin/packages/:id      → updatePackage()
DELETE /admin/packages/:id      → deletePackage()
PATCH  /admin/packages/:id/toggle → togglePackageActive()
```

**الـ Service:**
```typescript
async createPackage(dto: CreatePackageDto) {
  return this.prisma.subscriptionPackage.create({ data: dto });
}
async updatePackage(id: string, dto: UpdatePackageDto) {
  return this.prisma.subscriptionPackage.update({ where: { id }, data: dto });
}
async deletePackage(id: string) {
  return this.prisma.subscriptionPackage.delete({ where: { id } });
}
```

---

### 3.3 تسجيل Push Token من التطبيق
**ملف جديد في الباك-إند:**

```
POST /notifications/register-push
  @Body() { token: string }
  → يُحدّث User.pushToken
```

---

### 3.4 إرسال إشعارات عند الأحداث المهمة
**الأماكن التي تحتاج إشعار:**

| الحدث | المكان في الكود | الإشعار |
|-------|----------------|---------|
| تم قبول إعجابك | `likes.service.ts → acceptLike()` | "تطابق جديد! ابدأ المحادثة" |
| رسالة جديدة | `messages.service.ts → sendMessage()` | "رسالة جديدة من [اسم]" |
| إعجاب جديد واردة | `likes.service.ts → createLike()` | "شخص أعجب بك!" |
| انتهاء الاشتراك | Cron Job | "اشتراكك ينتهي قريباً" |

---

## 🟡 المرحلة 4 — لوحة التحكم: الناقص
**الوقت المقدر: يوم واحد**

### 4.1 صفحة الباقات — CRUD حقيقي
**الملف:** `fit-marry-admin/app/(dashboard)/packages/page.tsx`
**الحالة:** بيانات وهمية بالكامل

**الخطة:**
```tsx
// استبدال الـ mock data بـ:
const { data: packages } = useQuery({
  queryKey: ['packages'],
  queryFn: () => api.get('/subscriptions/packages').then(r => r.data)
});

// إضافة Dialog لإنشاء باقة جديدة:
// - name, price, durationDays, features (checkboxes)

// إضافة زر تعديل + حذف

// Mutation:
const createMutation = useMutation({
  mutationFn: (data) => api.post('/admin/packages', data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages'] })
});
```

---

### 4.2 رسم بياني للنشاط في الرئيسية
**الملف:** `fit-marry-admin/app/(dashboard)/page.tsx`
**الحالة:** placeholder فارغ `"سيتم إضافة الرسم البياني قريباً"`

**الخطة:**
```bash
# تثبيت recharts
npm install recharts --prefix fit-marry-admin
```

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// إضافة endpoint في الباك-إند:
// GET /admin/reports/activity?days=7
// يُرجع: [{ date: "2026-03-05", users: 12, messages: 45, likes: 30 }, ...]
```

**endpoint الجديد في الباك-إند:**
```typescript
// admin-reports.controller.ts
@Get('activity')
getActivityChart(@Query('days') days: number = 7) {
  return this.adminService.getActivityChart(days);
}

// admin.service.ts
async getActivityChart(days: number) {
  // استعلام تجميعي على Users + Messages + Likes خلال N يوم
}
```

---

### 4.3 صفحة تفاصيل الشكوى مع رسائل المحادثة
**الملف المطلوب:** `fit-marry-admin/app/(dashboard)/complaints/[id]/page.tsx`
**الحالة:** غير موجود

**الخطة:**
```tsx
// 1. جلب تفاصيل الشكوى: GET /admin/complaints/:id
// 2. إذا كان للشكوى conversationId:
//    جلب الرسائل: POST /admin/complaints/limited-messages
//    { complaintId: id, limit: 50 }
// 3. عرض الرسائل بشكل محجوب (النصوص ظاهرة، الصور مخفية)
// 4. أزرار الإجراء في نفس الصفحة
```

---

### 4.4 تحسين صفحة المستخدمين — فلتر وبحث
**الملف:** `fit-marry-admin/app/(dashboard)/users/page.tsx`
**التحسين:**
```tsx
// إضافة:
// - حقل بحث بالاسم أو البريد
// - فلتر حسب الحالة (ACTIVE / SUSPENDED / BANNED)
// - فلتر حسب نوع الزواج
// - Pagination (حالياً يعرض الكل بدون حد)
```

---

## 🟢 المرحلة 5 — تحسينات الجودة
**الوقت المقدر: يومان**

### 5.1 WebSocket للرسائل الفورية (استبدال Polling)
**الحالة:** الرسائل تُحدَّث بـ `setInterval(3000)` — هذا يستنزف الشبكة

**الخطة:**
```bash
# الباك-إند:
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# التطبيق:
npx expo install socket.io-client
```

**ملف جديد:** `fit-marry-backend/src/gateway/chat.gateway.ts`
```typescript
@WebSocketGateway({ cors: true })
export class ChatGateway {
  @SubscribeMessage('joinRoom')
  handleJoin(client: Socket, payload: { conversationId: string }) {
    client.join(payload.conversationId);
  }

  // عند إرسال رسالة في messages.service.ts:
  this.chatGateway.server.to(conversationId).emit('newMessage', message);
}
```

**في التطبيق:`**
```tsx
// استبدال startPolling بـ:
const socket = io(API_URL);
socket.emit('joinRoom', { conversationId: id });
socket.on('newMessage', (msg) => {
  setMessages(prev => [msg, ...prev]);
});
```

---

### 5.2 Cloudinary بدل التخزين المحلي
**الحالة:** الصور تُحفظ في `uploads/avatars/` على السيرفر (تضيع عند إعادة التشغيل)

**الخطة:**
```bash
npm install cloudinary --prefix fit-marry-backend
```

```typescript
// في profiles.service.ts → uploadAvatar():
// استبدال fs.writeFileSync بـ:
const result = await cloudinary.uploader.upload(
  `data:${dto.mimeType};base64,${dto.base64}`,
  { folder: 'fit-marry/avatars', public_id: userId }
);
const avatarUrl = result.secure_url;
```

**المتغيرات البيئية المطلوبة:**
```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

### 5.3 Cron Job لانتهاء الاشتراكات
**الحالة:** لا يوجد تحديث تلقائي عند انتهاء الاشتراك

**الخطة:**
```typescript
// subscriptions.service.ts — إضافة:
@Cron('0 0 * * *') // كل يوم منتصف الليل
async checkExpiredSubscriptions() {
  const expired = await this.prisma.userSubscription.findMany({
    where: { isActive: true, endsAt: { lt: new Date() } }
  });
  
  for (const sub of expired) {
    await this.prisma.$transaction([
      this.prisma.userSubscription.update({
        where: { id: sub.id }, data: { isActive: false }
      }),
      this.prisma.user.update({
        where: { id: sub.userId }, data: { subscriptionTier: 'FREE' }
      }),
    ]);
  }
}
```

```bash
npm install @nestjs/schedule
```

---

### 5.4 إضافة `GET /subscriptions/my` للتطبيق
**الحالة:** موجود في الباك-إند لكن غير مستخدم في التطبيق
**الخطة:** في شاشة `profile.tsx` — عرض تاريخ انتهاء الاشتراك بجانب "Premium"

---

### 5.5 اختبارات E2E
**الملفات الموجودة:** `test/auth.e2e-spec.ts`, `test/messages.e2e-spec.ts`
**الخطة:** إضافة اختبارات لـ:
- `likes.e2e-spec.ts` — سيناريو إعجاب متبادل → محادثة
- `conversations.e2e-spec.ts` — حد المحادثات 3/5
- `subscriptions.e2e-spec.ts` — الاشتراك وتغيير الصلاحيات

---

## 📅 جدول التنفيذ المقترح

| اليوم | المهمة | الملفات المتأثرة | الأثر |
|-------|--------|-----------------|-------|
| 1 | إصلاح signup + أيقونات Tabs | `signup.tsx`, `_layout.tsx` | 65% → 72% |
| 2 | Blurred Images + Screen Reveal | `(tabs)/index.tsx` | 72% → 78% |
| 3 | Push Notifications (Backend) + pushToken migration | `notifications.service.ts`, `schema.prisma` | 85% → 90% |
| 4 | Push Notifications (Mobile) + Types | `usePushNotifications.ts`, `src/types/index.ts` | 78% → 85% |
| 5 | Admin: Packages CRUD | `packages/page.tsx`, `subscriptions.controller.ts` | 80% → 88% |
| 6 | Admin: رسم بياني + complaint details | `page.tsx`, `complaints/[id]/page.tsx` | 88% → 95% |
| 7 | Cron Job انتهاء الاشتراكات | `subscriptions.service.ts` | 90% → 95% |
| 8 | WebSocket للرسائل (استبدال polling) | `chat.gateway.ts`, `chat/[id].tsx` | 95% → 98% |
| 9 | Cloudinary + RTL + User Profile Screen | `profiles.service.ts`, `_layout.tsx`, `user/[id].tsx` | 98% → 100% |
| 10 | اختبارات + مراجعة كاملة | test files | Quality 100% |

---

## 🏁 ملخص ما يحتاج كتابة كود جديد

### الباك-إند (NestJS) — 7 تغييرات:
1. `schema.prisma` — إضافة `pushToken String?` لجدول `User`
2. `notifications.service.ts` — دالة `sendPush()` بـ Expo Push API
3. `notifications.controller.ts` — `POST /notifications/register-push`
4. `subscriptions.controller.ts` + `admin module` — CRUD الباقات للأدمن
5. `admin-reports.controller.ts` — `GET /admin/reports/activity`
6. `subscriptions.service.ts` — Cron Job انتهاء الاشتراكات
7. `chat.gateway.ts` — WebSocket Gateway (اختياري — بعد كل شيء آخر)

### تطبيق الجوال (Expo) — 6 تغييرات:
1. `app/(auth)/signup.tsx` — نموذج كامل متعدد الخطوات
2. `app/(tabs)/_layout.tsx` — إضافة أيقونات Ionicons
3. `app/(tabs)/index.tsx` — تضبيب الصور + كشف 5 ثوانٍ
4. `src/hooks/usePushNotifications.ts` — ملف جديد
5. `src/types/index.ts` — تعريف أنواع TypeScript
6. `app/user/[id].tsx` — شاشة عرض ملف مستخدم آخر

### لوحة التحكم (Next.js) — 3 تغييرات:
1. `app/(dashboard)/packages/page.tsx` — ربط حقيقي بالـ API + Dialog إضافة/تعديل
2. `app/(dashboard)/page.tsx` — رسم بياني بـ recharts
3. `app/(dashboard)/complaints/[id]/page.tsx` — صفحة جديدة لتفاصيل الشكوى

---

## ⚠️ تنبيهات مهمة

1. **WebSocket وPush Notifications** — الأفضل تركهما لآخر المراحل لأنهما يحتاجان إعداد بيئة إضافية (Firebase, certs)
2. **Cloudinary** — يحتاج حساب مجاني على cloudinary.com — بدونه الصور تُحفظ محلياً وتضيع عند reset السيرفر
3. **RTL** — `I18nManager.forceRTL(true)` يحتاج إعادة بناء التطبيق (Rebuild)، لا يعمل بـ hot reload
4. **Cron Job** — يحتاج `@nestjs/schedule` package يُضاف للـ `AppModule`
5. **الباقات في Admin** — تحتاج إنشاء DTOs + endpoints في الباك-إند قبل ربطها بلوحة التحكم
