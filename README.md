# مواد الطلاب الدوليين — تشغيل وفحص محلي

الموقع ثابت (HTML وCSS وJavaScript) بلا خطوة بناء ولا خادم.

## التشغيل محلياً
    cd site
    python3 -m http.server 8000
ثم افتح http://localhost:8000/index.html

(فتح index.html مباشرة من الملفات يعمل أيضاً، لكن فحص "الملف غير متاح" والعمل بلا إنترنت يحتاجان خادماً.)

## الفحوص
    node tests/data_check.js          # سلامة البيانات: المواد، الدرجات (16.3)، مسارات الملفات
    python3 -I tests/ui_check.py      # 3 لغات × صفحتان × 4 عروض، أخطاء JS، نصوص غير مترجمة
    python3 -I tests/phase1_check.py  # البحث والتصفية، الاتجاه، لوحة المفاتيح، المسودات، حالات التحميل والخطأ
فحوص الواجهة تحتاج Python مع Playwright وChromium. عدّل مسار المتصفح في أعلى الملفين
(executable_path) إن كان مختلفاً على جهازك، وعدّل مسار مجلد site في سطر الخادم.

## إضافة محتوى غير منشور
أضف `draft: true` إلى المحاضرة أو الملف فيختفي من القوائم والأرقام والبحث.
تنبيه: لا يحمي هذا الملف نفسه؛ أي ملف داخل مجلد files/ يمكن فتحه برابطه المباشر. لا ترفع ملفاً غير جاهز.

## رفع المحاضرات من الموقع (Cloudflare Pages)

الرفع يعمل بدالة في `functions/api/[[path]].js` ومنطقها في `lib/upload-core.mjs`، والتخزين في Cloudflare KV.

1. في Cloudflare: Workers & Pages ← Create ← Pages ← Connect to Git ← اختر المستودع. Build command: اتركه فارغاً. Build output directory: `site`.
2. أنشئ KV: Storage & Databases ← KV ← Create، باسم `lectures`.
3. في مشروع Pages: Settings ← Bindings ← Add ← KV namespace. اسم المتغير `LECTURES` والمساحة `lectures`.
4. Settings ← Variables and Secrets ← Add: الاسم `UPLOAD_CODES`، النوع Secret، والقيمة `سارة:رمز-طويل-1,علي:رمز-طويل-2` (كل رمز 8 أحرف فأكثر، بلا `:` ولا `,`).
5. أعد النشر ثم افتح `/upload.html`. الحد الأقصى 20 ميغا للملف.
6. للتجربة المحلية: `node tests/dev_server.mjs` (مخزن في الذاكرة).

حدود Cloudflare المجانية: 1000 كتابة و1000 حذف و1000 عملية قائمة في اليوم، و100 ألف قراءة. كل ملف يستهلك قطعة كتابة لكل 2 ميغا.
