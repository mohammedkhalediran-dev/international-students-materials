# تشغيل الحسابات وحفظ التعليقات (Supabase) — خطوات محمد فقط

مجاني لنحو 25 طالباً. لا تضع أي مفتاح سرّي في GitHub: المفتاح العام (anon) وحده يوضع في الموقع، وهو آمن لأن الخصوصية تحميها سياسات قاعدة البيانات (RLS) في `schema.sql`.

1. ادخل supabase.com وأنشئ حساباً ثم **New project** (اختر أقرب منطقة، واحفظ كلمة مرور قاعدة البيانات في مكان خاص).
2. من القائمة **SQL Editor** ← **New query** ← الصق كل محتوى `supabase/schema.sql` ← **Run**. (يمكن إعادة التشغيل بأمان.)
3. **Authentication ← Sign In / Providers ← Email**: فعّل Email، وأبقِ «Allow new users to sign up» مفعّلاً.
4. **Authentication ← Emails ← Templates**: افتح قالبَي **Confirm signup** و**Magic Link**، وغيّر نص الرسالة ليعرض الرمز بدل الرابط، مثلاً:
   `رمز دخولك إلى Medixa: {{ .Token }}`
5. **Authentication ← Emails ← SMTP Settings**: فعّل Custom SMTP (البريد المدمج يرسل رسالتين في الساعة فقط ولا يكفي):
   Host `smtp.gmail.com` — Port `465` — Username بريدك — Password «كلمة مرور التطبيق» من حساب Google (تتطلب التحقق بخطوتين) — Sender email بريدك نفسه.
6. **Project Settings ← API**: انسخ **Project URL** و**anon public key** (لا تنسخ service_role أبداً).
7. ضعهما في `site/data/cloud-config.js`:
   `window.MEDIXA_CLOUD = { url: "https://xxxx.supabase.co", anonKey: "eyJ..." };`
   ثم ادفع التغيير إلى فرع الاختبار وجرّب من الآيباد.

## ملاحظات
- مشروع Supabase المجاني **يتوقف بعد نحو أسبوع بلا نشاط**. إن توقف: ادخل لوحة Supabase واضغط Restore (البيانات تبقى).
- الخطة المجانية: 500MB قاعدة بيانات، و50,000 مستخدم نشط شهرياً، وهذا أكثر بكثير مما يلزم.
- ما دام `url` فارغاً في الملف، تعمل التعليقات على الجهاز فقط ويظهر «حسابي» بلا دخول.
- كل طالب يرى تعليقاته فقط: السياسات تربط كل صف بـ `auth.uid()`، وقد اختُبر ذلك على Postgres حقيقي (`node tests/notes_sql_check.mjs`).
