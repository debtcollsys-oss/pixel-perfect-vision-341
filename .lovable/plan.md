# خطة مزامنة بيانات المحفظة عبر الأجهزة

## الفكرة العامة
تحويل التخزين من `localStorage` (محلي لكل متصفح) إلى Lovable Cloud حتى تظهر نفس البيانات والملاحظات وحالات التواصل لك ولفريقك على أي جهاز.

## الجزء 1: المصادقة (Authentication)
الشاشة الحالية تستخدم كلمة سر بسيطة `123456` مخزنة في الكود — هذا لا يكفي للمزامنة لأن السحابة تحتاج هوية حقيقية لكل مستخدم.

سننتقل إلى:
- **بريد + كلمة مرور** لكل محصّل وللإدارة.
- جدول `profiles` يربط حساب المصادقة بـ `employee_id` و`role` (collector/admin) و`name` و`supervisor`.
- جدول `user_roles` منفصل (للأمان — لا تخزّن الأدوار في profiles).
- شاشة دخول جديدة + شاشة "إعداد أول مرة" للإدارة لإنشاء حسابات المحصلين أو سماح للمحصل بالتسجيل برقمه الوظيفي ثم ربطه تلقائياً ببيانات `collectors.json`.
- تعطيل تأكيد البريد لتسهيل الدخول السريع.

## الجزء 2: مخطط قاعدة البيانات

```text
profiles
  id (uuid, FK auth.users)
  employee_id (text, unique)
  name, supervisor, role-display

user_roles
  user_id, role (enum: admin, collector)

customers              ← المحفظة (بدلاً من wallet.json)
  id (uuid)
  account_number, national_id, customer_name, phone,
  amount, product, debt_age, action, installment,
  is_salary, is_deceased, raw_json (jsonb للحقول الإضافية)
  imported_at, imported_by

customer_states        ← بدلاً من wallet:state:v1
  customer_key (text, PK)
  contacted, last_contacted_at,
  has_exemption, has_reschedule, default_date,
  client_status, edits (jsonb), notes (text),
  updated_at, updated_by

contact_logs           ← سجل المحاولات
  id, customer_key, channel (call/whatsapp/sms),
  note, created_at, created_by

customer_notes         ← الملاحظات الزمنية
  id, customer_key, text, created_at, created_by
```

كل الجداول تُفعّل عليها RLS:
- المحصّل يرى ويعدّل العملاء المسندين لرقمه الوظيفي فقط.
- الإدارة ترى وتعدّل الكل.
- سجل التواصل والملاحظات: المحصّل يضيف فقط لعملائه، الإدارة ترى الكل.

## الجزء 3: استيراد البيانات الأولية
- زر **"رفع المحفظة"** في لوحة الإدارة يستورد ملف Excel مباشرة إلى جدول `customers` (يستبدل البيانات السابقة أو يضيف شهر جديد عبر حقل `file_month`).
- خيار "ترحيل بياناتي المحلية" يقرأ ما هو محفوظ في `localStorage` على هذا الجهاز ويرفعه إلى السحابة لمرة واحدة، حتى لا تفقد ملاحظاتك الحالية.

## الجزء 4: إعادة هيكلة الكود
- `src/lib/wallet-store.ts`: يستبدل `localStorage` بـ React Query + استدعاءات Supabase.
- `useCustomerStates`: يصبح hook مدعوم بـ React Query مع تحديث متفائل (optimistic) ومزامنة فورية اختيارية عبر Supabase Realtime.
- إضافة `src/integrations/supabase/queries.ts` لتجميع كل الاستعلامات.
- `LoginGate.tsx`: يُستبدل بشاشة Email/Password حقيقية، مع الإبقاء على نفس الواجهة البصرية.

## الجزء 5: ما لن نغيّره الآن
- لن نغيّر شكل الواجهة أو سير العمل (نفس الجدول، نفس الأزرار، نفس فلاتر الإدارة والمحصّل).
- لن نضيف Google Sign-in الآن لتسريع الإطلاق — يمكن إضافته لاحقاً بنقرة.
- لن نلمس صفحات الحاسبة/الرسائل/القضايا في هذه الجولة.

## الترتيب المقترح للتنفيذ
1. هجرة قاعدة البيانات (إنشاء الجداول + RLS + trigger إنشاء profile تلقائياً).
2. شاشة المصادقة الجديدة + ربطها بجلسة Supabase.
3. تحويل `useWallet` و`useCustomerStates` إلى السحابة.
4. زر استيراد Excel من الإدارة + زر "ترحيل بياناتي المحلية".
5. اختبار: دخول من جهازين مختلفين والتأكد من ظهور نفس الملاحظات.

## ملاحظة مهمة
هذه عملية كبيرة (تغيّر طبقة البيانات بالكامل). بعد الموافقة سأنفّذها على دفعات ضمن نفس المحادثة. هل تريد المتابعة بهذا المخطط، أم تفضّل تعديلاً (مثلاً: الإبقاء على دخول بكلمة سر بسيطة بدون بريد، أو إضافة Google Sign-in من الآن)؟
