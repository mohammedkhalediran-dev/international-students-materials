# مواد الطلاب الدوليين — تعليمات المشروع

موقع غير رسمي من إعداد طالب (محمد) لتنظيم ملفات PDF لمواد الكورس الثالث للطلاب الدوليين في جامعة بابل للعلوم الطبية.
المالك يستخدم iPad فقط، ويكتب بالعربية. اشرح التغييرات له في 2–3 جمل عربية بسيطة.

## قرارات ثابتة (لا تغيّرها دون سؤال)
- بقرار محمد (2026-10-14) أُزيل تنويه "غير رسمي" من الموقع. لا تُعد إضافته دون طلبه. المصدر: SITE.disclaimer في courses.js (فارغ = مخفي).
- اسم الموقع Medixa بقرار محمد (2026-10-15)، ومصدره SITE.title في courses.js؛ ويظهر فوق رسالة الترحيب في الرئيسية. الاسم محايد. لا تنسخ هوية الجامعة (شعارها، بياناتها، بريد مطوّرها) كهوية للموقع.
- الجمهور: الطلاب الدوليون فقط. المواد الموجودة الآن: الكورس الثالث (14 مادة، مجموع الدرجات 16.3) والكورس الثاني (13 مادة، 20.61) من جدول أرسله محمد؛ الدرجات وليست ساعات معتمدة. الأسماء العربية لمواد الكورس الثاني ترجمة مبدئية تحتاج مراجعته. والكورس الأول (10 مواد؛ الدرجات المعروفة 12.64) من جدول أرسله محمد (2026-10-15)؛ رموز مواده فارغة لأنها غير موجودة في الجدول ولا تُخترع. مواد Life Style وEmbryology وHistology (من جدول الامتحانات) بلا درجات (credits: null) حتى يرسلها محمد؛ الواجهة تخفي الدرجة عند null. 'مبادئ الخدمات الصحية' موجودة في الكورسين 1 و2 كما في جدولي محمد. أزيلت أرقام الإحصاء من الواجهة لأنها كانت للكورس الثالث فقط، وفحص data_check يتحقق من مجموع كل كورس على حدة.
- (تحديث 2026-10-18: وافق محمد على الدخول بحساب Google وقاعدة بيانات مجانية ولوحة إدارة؛ انظر قسم «الحسابات وقاعدة البيانات» أدناه.) سابقاً: لا تسجيل دخول للطلاب ولا لوحة إدارة حتى يُتخذ قرار الخصوصية. استثناء بموافقة محمد (2026-10-16): صفحة site/upload.html لرفع المحاضرات للمشرفين فقط برمز خاص لكل مساعد (دالة رفع على Cloudflare Pages Functions + KV).
- الرفع من الموقع (انتقل الموقع إلى Cloudflare، 2026-10-16): المنطق في netlify/lib/core.mjs (محايد للمنصة، Web Crypto بلا node:crypto) ونقطة الدخول functions/api/[[path]].js (Cloudflare Pages Functions) مع محوّل functions/_lib/kvstore.js الذي يجعل Cloudflare KV يشبه Netlify Blobs. ما زال netlify/functions/api.mjs يعمل لمن يرجع إلى Netlify. الرموز في متغير UPLOAD_CODES بصيغة `اسم:رمز,اسم2:رمز2` (الرمز 8 أحرف فأكثر، بلا : ولا ,)، يضبطها محمد بنفسه كسرّ في Cloudflare ولا تُكتب في المحادثة أو الكود. التخزين: KV اسمه lectures يُربط بالمشروع باسم LECTURES؛ بدون الربط تعيد uploads.js قائمة فارغة وبقية المسارات 503. أكبر ملف 20 ميغا. الملفات المرفوعة تُدمج في COURSES عبر MS.applyUploads من api/uploads.js.
  أنواع المرفوعات (2026-10-16): كل عنصر له kind (file|link) وtype (lecture|quiz|exam). رقم 0 = للمادة كلها (للاختبار والأسئلة فقط) ويُدمج في c.extras ويظهر في قسم «الاختبارات وأسئلة السنوات السابقة». الروابط (http/https فقط) مسار api/link. المسارات المحمية: admin (القائمة الكاملة مع by وat)، link، edit (رقم/نوع/اسم/عنوان/رابط/showInLatest، وتغيير العنوان يسري على كل ملفات المحاضرة)، delete. القائمة العامة uploads لا تُظهر اسم الرافع. showInLatest (true/false/غير محدد): غير المحدد = يظهر في «أحدث المحاضرات» لمواد كورس الطالب الحالي فقط (MS.inLatest)، فمواد الكورسين 1 و2 القديمة لا تظهر؛ والافتراضي في صفحة الرفع يتبع ذلك. لا استبدال للملف في مكانه (حذف ثم رفع). صفحة الرفع: لوحة المادة تُظهر أرقام المحاضرات الناقصة، رفع عدة ملفات مع اقتراح الرقم والعنوان والاسم الظاهر من اسم الملف (site/js/upload-names.js، يفحصه tests/upload_names_check.js)، وتصفية حسب المساعد والنوع. لا حساب لكل مشرف ولا ملفات أكبر من 20 ميغا (R2 مؤجل).
  قيود KV: اتساقه نهائي (قد يتأخر ظهور الملف ثوانٍ)، لا كتابة شرطية فيُحاكى تعارض القائمة بقراءة ثم كتابة (غير ذرّي)، والخطة المجانية نحو 1000 كتابة يومياً. لم يُجرَّب على Cloudflare الحقيقي بعد (ولا يُعرف إن كان المشروع Pages أم Workers)؛ الاختبارات على مخزن وهمي (tests/kv_adapter_check.mjs).
- لا تكتب معلومة عن الجامعة بلا مصدر. اسأل بدل التخمين.
- الملفات PDF، مسارها: site/files/<المادة>/المحاضرة-<رقم>-<عنوان>.pdf ، يرفعها محمد ومساعدان.
- الاستضافة على Cloudflare (مجلد النشر: site). لا تنشر للعامة دون موافقة صريحة.

## البنية
- موقع ثابت: HTML وCSS وJavaScript بلا إطار ولا خطوة بناء ولا خادم.
- site/data/courses.js: كل البيانات (SITE, SEMESTERS, CATEGORIES, COURSES). إضافة محاضرة = كائن في lectures.
  - draft: true يخفي المحاضرة/الملف من القوائم (لا يحمي الملف نفسه).
  - pron: نطق العنوان بحروف عربية (اختياري). nameFa: اسم فارسي للمادة (اختياري).
  - added في الملف: تاريخ الرفع (يرتّب "أحدث المحاضرات" ويظهر بجانب الملف).
  - layout في CATEGORIES لم يعد مستخدماً: كل المواد تُعرض ببطاقة واحدة (course-card).
- site/js/app.js: أدوات مشتركة (MS): التخزين المحلي، الأيقونات، المفضلة، التقدم، المراجعة، الرأس، البحث المطبَّع MS.norm.
- site/js/i18n.js: عربي (الأصل، RTL) + فارسی (RTL) + English (LTR). النص العربي في الصفحات هو المفتاح؛ الترجمات في القاموسين EN وFA.
  كل نص عربي جديد يحتاج سطراً في EN وFA (فحص ui_check يفشل إن بقي نص عربي في الإنجليزية). الترجمة الفارسية تحتاج مراجعة متحدث أصلي.
- site/index.html: الرأس ← الواجهة ← المواد الدراسية (بحث وتصفية) ← أحدث المحاضرات ← الأساتذة ← أدوات الطالب ← قائمة المراجعة ← المساعدة ← التذييل.
  روابط داخلية تعمل من أي صفحة: index.html#favorites (تصفية المفضلة) و index.html#search (فتح البحث).
- site/semester.html?id=<رقم الكورس>: صفحة كل كورس (مواده مجمّعة حسب النوع). الرئيسية فيها بطاقة لكل كورس تفتح صفحته؛ والبحث/التصفية في الرئيسية يعرض نتائج المواد من كل الكورسات.
- site/course.html?id=<id>: مسار تنقل (الرئيسية / المواد الدراسية / المادة)، رأس المادة، المحاضرات (#lec-N)، عارض PDF، المادة السابقة/التالية.
- site/study.html?id=<id>&lec=<رقم>: وضع الدراسة (بقرار محمد 2026-10-16). المحاضرة التي فيها study: true في courses.js يظهر لها زر "ذاكرها خطوة بخطوة" في صفحة المادة، ومحتواها في site/data/study/<id>-<رقم>.js (مواضيع: مصطلح إنجليزي + نطق عربي + شرح + حيلة حفظ + أسئلة اختيار من متعدد). التقدم محفوظ في localStorage (ms.study)، وتُعلَّم المحاضرة مقروءة تلقائياً عند 70% فأكثر. قواعد المحتوى (يتحقق منها data_check): الشرح العربي وحيل الحفظ بلا أي حرف لاتيني، والإنجليزي في سطر مستقل، لكل معلومة حيلة حفظ، والنطق جزءان أو ثلاثة بشرطة. المحتوى من ملف المحاضرة نفسه فقط ويغطي كامل الملف. المساعد الذكي (AI) وبنك الكلمات مؤجلان لمرحلة لاحقة.
- القائمة الجانبية (إعادة التصميم 2026-10-16): مكوّن مشترك في site/js/nav.js يرسمها داخل <aside class="sidebar" id="sidebar"></aside> الفارغ في الصفحات الأربع (index، semester، course، study). الإعداد في NAV وFOOT أعلى الملف: enabled: true = رابط فعلي؛ soon: true = صف رمادي بلا رابط عليه «قريباً» (مخطط الدراسة، التقويم والامتحانات، بنك الأسئلة، نتائج التدريب، درجاتي الجامعية، الملف الشخصي، الإعدادات)؛ بلا أي منهما = مخفي (تسجيل الخروج: لا جلسة دخول). لا تنشئ رابطاً معطلاً ولا صفحة فارغة. كتلة الحساب تعرض «زائر» بلا اسم أو بيانات وهمية. على الكمبيوتر القائمة بطاقة عائمة (هامش space-4، حواف وظل)، وعلى الهاتف درج بطول الشاشة. «متابعة القراءة» تظهر فقط بعد فتح مادة (ms.last). شارة «الحالي» تقرأ ms.sem (رقم كورس الطالب)؛ لا واجهة تضبطه بعد فلا تظهر. «درجاتي الجامعية»: لا تُفعَّل قبل تحقق الخادم من هوية الطالب، ولا درجات في ملفات عامة. العرض 280px والمطوية 76px (تفضيل الطي في ms.nav)، والدرج ≤1080px بعرض min(320px,88vw). ألوان القائمة متغيرات --nav-* في style.css.
- الرأس والتذييل نفس العلامات في الصفحتين؛ أي تعديل فيهما يُطبَّق على الاثنتين.
- site/sw.js: عمل بلا إنترنت. عند تغيير CSS/JS غيّر رقم ?v= في الصفحتين ورقم V في sw.js.

## نظام التصميم (site/css/style.css)
- كل القيم من متغيرات :root فقط: الألوان (--color-*)، المسافات (--space-1..8 = 4/8/12/16/24/32/48/64)، الخطوط (--text-xs..2xl)، الحواف (--radius-*)، الظلال (--shadow-sm/md).
- الألوان: كحلي #17324D للأساسي، تركوازي #168C8C للتفاعل، خلفية عاجية #F7F6F2 (بقرار محمد 2026-10-16)، بطاقات بيضاء، بترولي --color-petrol لزر الفتح الدائري والبانر. القائمة الجانبية كحلية (--nav-*). ألوان الحالة للمعنى فقط. استثناء زخرفي واحد: --hue-1..6 لتمييز أيقونات المواد وبطاقات الوصول السريع.
- التخطيط (بقرار محمد 2026-10-14، على نمط لوحة تعليمية): قائمة جانبية ثابتة (.sidebar، تنزلق من الجانب على الشاشات الصغيرة) + رأس علوي فاتح (بحث، المفضلة، اللغة، الوضع) + بطاقة ترحيب بتدرّج هادئ (.band). صور المواد (حزمة محمد 2026-10-16): حقل image في courses.js لـ14 مادة من الكورس الثالث (site/assets/courses/<id>.webp)، وحقل field (التخصص) يظهر صغيراً فوق الاسم؛ ما لا صورة له يظهر بأيقونة في دائرة. بطاقة المادة (.course-card): صورة ثم الاسم ثم تذييل فيه حالة المحاضرات وزر الفتح الدائري (.cc-go)، والمفضلة في الزاوية. صفحة الكورس (site/semester.html + site/css/semester.css بنطاق .semester-design): عنوان + بانر (hero-respiratory.webp) + تصفية حسب النوع، والبطاقات أفقية (صورة يسار النص؛ 3 على الكمبيوتر وصف واحد على الهاتف) وشريط سفلي بروابط فعلية على الهاتف. لا تُعد البطاقة عمودية في صفحة الكورس. الشعار site/assets/logo.png. لا ملف شخصي ولا إشعارات ولا خطة ولا ملاحظات ولا فيديو: كل ما يظهر يُبنى من بيانات حقيقية فقط.
- الوضع النهاري هو الأصل؛ الليلي باختيار المستخدم فقط (data-theme="dark").
- المكوّنات: .btn (.btn-primary/.btn-secondary/.btn-sm)، .field، .card، .tile، .badge، .empty، .section/.section-head، .band (بطاقة الترحيب)،
  .course-card، .latest-item، .prof-card، .panel، .lecture، .file-link. أضف مكوّناً جديداً فقط إذا لم يصلح أحدها.
- لا قيم مباشرة للألوان أو المسافات داخل المكوّنات، ولا style="" داخل HTML، ولا طبقات تعديل تُلحق بآخر الملف.

## الفحوص (شغّلها بعد كل تعديل)
    node tests/data_check.js
    node tests/upload_api_check.mjs
    node tests/kv_adapter_check.mjs
    node tests/upload_names_check.js
    python3 -I tests/upload_e2e.py
    python3 -I tests/ui_check.py
    python3 -I tests/phase1_check.py
    python3 -I tests/nav_check.py
فحوص الواجهة تحتاج Playwright وChromium (عدّل executable_path إن لزم).

## المرحلة الحالية
اكتملت إعادة تنظيم الواجهة (الرئيسية، نظام التصميم، صفحة المادة والتنقل) على فرع homepage-redesign.
بنك الأسئلة والتقويم الأكاديمي غير موجودين: يظهران "قريباً" فقط. لا خادم ولا قاعدة بيانات ولا تسجيل دخول دون موافقة صريحة.
النشر على Cloudflare Pages (بقرار محمد 2026-10-16): فرع main = موقع الاختبار main.medixa.pages.dev. الموقع الأصلي medixa.pages.dev ينشر فرع production فقط. لا تدمج في main ولا في production دون طلب صريح؛ لا يُرفع إلى production إلا بعد أن يجرّب محمد main ويوافق (الرفع: git push origin main:production).

## الحسابات وقاعدة البيانات (فرع feature/auth-db، بقرار محمد 2026-10-16/18: الدخول بحساب Google فقط، مجاني)
- لا بريد ولا كلمات مرور (بقرار محمد): الدخول بحساب Google أو المتابعة كزائر. نخزّن الاسم والبريد فقط.
- التخزين: Cloudflare D1 مربوط باسم DB. المخطط migrations/0001_init.sql (users بـgoogle_sub، sessions، user_data). لم يُجرَّب على D1 ولا Google الحقيقيين بعد؛ الاختبارات على محاكيات (tests/mock_d1.mjs، tests/google_token.mjs).
- الخادم: functions/_lib/auth.js يتحقق من رمز Google (RS256 مقابل شهادات Google، ويفحص iss وaud وexp وemail_verified) ثم ينشئ جلسة (كوكي HttpOnly وSameSite=Lax، 30 يوماً، تجزئة الرمز فقط). يُستدعى أولاً من functions/api/[[path]].js. الطلبات المغيِّرة من أصل مختلف تُرفض.
- متغيرات بيئة Cloudflare: GOOGLE_CLIENT_ID (معرّف العميل من Google Cloud Console، ليس سراً؛ يلزم إضافة عنواني الموقع في Authorized JavaScript origins: medixa.pages.dev وmain.medixa.pages.dev)، ADMIN_EMAILS (بريد المشرفين مفصولاً بفاصلة)، REQUIRE_LOGIN=1 اختياري لتقييد الموقع كله بالدخول (functions/_middleware.js، يحمي PDF أيضاً؛ يلزمه DB). الأصل: مفتوح للجميع. بدون GOOGLE_CLIENT_ID يبقى زر Google غير مفعّل ويعمل الزائر.
- العميل: site/login.html (تصميم مستقل من محمد، ثلاث لغات، نافذة تواصل، css/login.css وjs/login-i18n.js وjs/login.js وassets/login/)، وprivacy.html وterms.html. زر Google الرسمي (Google Identity Services) يُرسم من /api/auth/config. استثناء مقصود من نظام التصميم العام: صفحات login/privacy/terms لها ورقة أنماط مستقلة. مفتاح اللغة ms.lang مشترك مع الموقع.
- site/js/auth.js يزامن ms.fav وms.read وms.last وms.exam وms.review وms.study (الأحدث يفوز؛ أول مزامنة لجهاز تدمج بالاتحاد)، ويضيف زر الحساب في الرأس. الخروج يمسح هذه المفاتيح محلياً. admin.html: إيقاف/تفعيل الحسابات للمشرف.
- تنبيه: قد تُحجب خدمات Google على بعض الشبكات؛ الصفحة تعرض رسالة وتبقى «المتابعة كزائر» تعمل.
- رمز الرفع (UPLOAD_CODES) ما زال منفصلاً عن الحسابات.
- فحوص إضافية: node --no-warnings tests/auth_api_check.mjs ، node --no-warnings tests/middleware_check.mjs ، python3 -I tests/auth_e2e.py

- قاعدة D1 اسمها medixa (id: 8f0191c3-bac0-4dbc-8717-61e35c3196a5) مربوطة باسم DB في بيئتي Production وPreview، ومعها GOOGLE_CLIENT_ID وADMIN_EMAILS (2026-10-18). جرّب محمد الدخول بحساب Google على main.medixa.pages.dev ونجح، وظهرت لوحة الإدارة. دُمج feature/auth-db في main. شاشة موافقة Google في وضع Testing (المستخدمون التجريبيون فقط) وOAuth Client اسمه Medixa Web داخل مشروع Google Cloud باسم almaaqal-attendance. فرع الإنتاج الفعلي في إعدادات Cloudflare هو cloudflare-upload، فتحقق قبل أي رفع. صفحتا privacy وterms مفتوحتان في البوابة.
- الأدوار والتبليغات (2026-10-18، بطلب محمد): users.role = student | uploader | rep | admin. المشرف من ADMIN_EMAILS فقط ولا يُعيَّن من اللوحة. يعيّن المشرف الباقي من admin.html (قائمة بجانب الإيقاف؛ POST /api/auth/user {id, role}). الرفع بالحساب: أدوار uploader وrep وadmin تدخل upload.html بلا رمز (deps.account في core.mjs ومساعده uploadAccount في auth.js)، ورموز UPLOAD_CODES ما زالت تعمل. التبليغات: جدول announcements (migrations/0002_announcements.sql، طُبّق على D1 الحقيقي)؛ GET /api/announcements عام، والنشر والحذف لـ rep وadmin من announce.html (عربي فقط)، ويظهر قسم «التبليغات» في الرئيسية فقط إن وُجد تبليغ. فحوص جديدة ضمن auth_api_check وupload_api_check وauth_e2e.

## نسخة v8.1 (دمج 2026-10-18، فرع feature/medixa-v8.1-with-auth محلي؛ لم يُنشر)
- الأساس تصميم MEDIXA v8.1 كاملاً (الرئيسية home.js، workspace.html، مخطط الدراسة وبنك الأسئلة، وضع الدراسة، pdf-notes.html للكتابة على PDF وأدوات الدراسة). وفوقه نظام الدخول من main: auth.js في كل الصفحات، login/admin/announce/privacy/terms، functions/_lib/auth.js وmigrations وD1، الأدوار، الرفع بالحساب، التبليغات في الرئيسية (قسم #announcements)، ومزامنة الحساب عبر MS.onSave.
- الدخول Google + Cloudflare D1 (لا Firebase). بقيت functions/ وnetlify/ وmigrations/ كما في main.
- إصلاح عرض PDF: site/pdf-raster/ (صور صفحات 4 محاضرات) وpdf-raster-manifest.js؛ pdf-notes.html يرسم الصور بدل تصيير PDF إن وُجدت. لا يغطي الملفات المرفوعة لاحقاً. ما زال يحتاج pdf.js وpdf-lib من cdnjs.
- ملف المناعة PDF بقي الأصلي (v8.1 حملت نسخة أصغر؛ الأصل محفوظ في main).
- حفظ الكتابة والبطاقات في pdf-notes محلي على الجهاز (medixa.pdf.annotations.v1 وmedixa.study.v1 وms.notes) وليس ضمن SYNC_KEYS.
- فحوص جديدة: tests/v81_auth_smoke.py (يحتاج MEDIXA_CDN_DIR لتشغيل pdf.js بلا إنترنت) وanki_scheduler_check.cjs وredesign_check.mjs. فحصا ui_check.py وphase1_check.py (وجزء من nav_check.py) يخصان الرئيسية القديمة (#search في الرئيسية) ويفشلان مع تصميم v8.1: يحتاجان إعادة كتابة.
- docs/v8.1/ فيه ملفات توثيق النسخة الأصلية.

## Step 39 (2026-10-18): Step 38 هو الأساس الآن
- الأساس المعتمد MEDIXA Step 38 (أدوات الدراسة الأحدث: study-suite-v85، timer v83، planner v84، workspace v86، backup v87، recovery v88، ink backup v89، occlusion v90). لا ترجع إلى v8 أو v8.1.
- أُضيف فوقه نظام الدخول من فرع feature/medixa-v8.1-with-auth كما هو (تفاصيله في AUTH-INTEGRATION.md). Step 38 لم يكن فيه أي دخول أو Firebase.
- الإصدار ?v=step39 وV = "medixa-step39" في sw.js.
- `npm test` يشغّل فحوص الدراسة وفحوص الخادم (auth/middleware/upload/kv). فحوص المتصفح: tests/step39_login_integration.py وtests/auth_e2e.py وtests/v81_auth_smoke.py (تحتاج Playwright؛ MEDIXA_CDN_DIR لتشغيل pdf.js بلا إنترنت).
- baseline-preservation يسمح فقط بالتغييرات الموثقة في tests/baseline-intentional-changes.json (بصمة المحتوى الجديد مثبتة).

## Step 49 (2026-10-19): «كورسي» والإشعارات
- الطالب يختار كورسه (ms.sem، يُزامن مع الحساب) من نافذة في أول زيارة للرئيسية (site/js/my-course.js). بعد الاختيار لا تظهر له الكورسات الأخرى في الواجهة (حذف من SEMESTERS/COURSES في app.js؛ القوائم الكاملة في MS.ALL_SEMESTERS/MS.ALL_COURSES؛ صفحات الرفع والإدارة لا تتأثر). التغيير من الإعدادات فقط؛ لا زر كورس في القائمة الجانبية (بقرار محمد 2026-10-19).
- إشعارات Web Push: الزائر وصاحب الحساب. المحاضرة الجديدة (type lecture، وليست مخفية من «أحدث المحاضرات») لطلاب كورسها فقط، والتبليغ للجميع. التفاصيل والإعداد في PUSH-NOTIFICATIONS.md.
- يلزم: جدول push_subs (migrations/0003_push.sql) في D1، ومتغيرا VAPID_PUBLIC_KEY وVAPID_PRIVATE_KEY (سرّي) يولّدهما محمد من admin.html ويضعهما بنفسه في Cloudflare. بدونهما يبقى الزر مخفياً.
- بعد تعديل courses.js شغّل node scripts/gen-course-semesters.cjs.

## Step 52 (2026-10-19): تجربة الإشعارات (منشور؛ 0004 طُبّق على D1)
- آلية الإرسال لم تتغير. تغيّرت الرسائل (functions/_lib/push.js: lectureMessage/lectureNotice/announcementMessage)، وعرضها في sw.js (أيقونة، شارة assets/notify-badge.png، أزرار حيث تُدعم، فتح المحاضرة مباشرة).
- وسم واحد لكل مادة (course-<id>) + منع تكرار وتجميع عبر KV (push/recent/<id>). الاختبارات وأسئلة السنوات السابقة صارت ترسل إشعاراً (الفئة resource).
- تفضيلات لكل جهاز (ms.push.prefs) من زر «تخصيص» في القائمة الجانبية؛ الخادم يقرأ push_subs.prefs (migrations/0004_push_prefs.sql — يلزم تطبيقه على D1 الحقيقي بموافقة محمد؛ بدونه يعمل كل شيء كـStep 51).
- التبليغ يعيد reach (عدد الأجهزة) ويظهر في announce.html.
- فحوص: tests/sw_notify_check.cjs (ضمن npm test)، tests/step52_notify_browser.py (يستعمل Chromium الكامل channel='chromium' لأن headless shell لا يدعم الإشعارات).

## Step 53 (2026-10-19): مركز الإدارة (فرع feature/admin-center، لم يُنشر)
- admin.html بتصميم MEDIXA-Admin-Preview.html: css/admin.css مستقلة (استثناء من نظام style.css مثل login)، وjs/admin.js على بيانات حقيقية فقط.
- الخادم: functions/_lib/admin.js (/api/auth/admin/stats|users|user|export|audit|push|push-test) وPOST /api/auth/user صار فيه حماية المشرف الحالي وآخر مشرف وسجل التغييرات.
- لا أرقام هوية (الاسم والبريد فقط)؛ لا إضافة مستخدم يدوياً (Google عند أول دخول)؛ المشرف من ADMIN_EMAILS فقط.
- migrations/0005_admin.sql (audit_log + users.last_login_at) لم يُطبَّق على D1 بعد؛ الكود يعمل بدونه. التفاصيل في ADMIN-CENTER.md.
## Step 53 (2026-10-19): بانر الرئيسية الطبي المتحرك (بطلب محمد)
- المرجع المعتمد ملف أرسله محمد: MEDIXA-Medical-Banner.html (دماغ لؤلؤي + بطاقات طبية). حلّ محل .welcome وصورة medical-thorax في الرئيسية فقط (الصورة ما زالت مستخدمة في صفحات أخرى).
- الملفات: الهيكل في site/index.html (section.mm-banner#home)، الأنماط site/css/medical-banner.css (مكوّن مستقل بنطاق .mm-banner وألوانه --mm-* في أول الملف، فاتح وداكن)، الحركة site/js/medical-banner.js، الصورة site/assets/brain-pearl.webp (مستخرجة من المرجع).
- العنوان والزر ثابتان يميناً والمشهد يساراً بنسبة 2.28:1 (أقل ارتفاع 196px على الهاتف). زر «استكشف الكورسات» رابط إلى #semesters. لا شريط مراحل؛ زر صغير لإيقاف الحركة (تفضيله في ms.bannerMotion).
- الدورة 18 ثانية: استكشف ← افهم ← طبّق ← اربط ← عودة. كل عنصر خط زمني من إطارات مفتاحية (أول إطار = آخر إطار)؛ الدماغ يميل ±14° فقط ولا يدور دورة كاملة. حلقة رسم واحدة تتوقف خارج الشاشة وعند إخفاء الصفحة؛ prefers-reduced-motion يعرض تكوين «اربط» ثابتاً. MedixaBanner.seek(t) للفحص وdestroy() للتنظيف.
- نصوص البطاقات إنجليزية طبية عامة (لا أرقام ولا تقدّم يوحي ببيانات الطالب). النصوص العربية الجديدة لها سطر في EN وFA في i18n.js.
- البطاقات روابط (بطلب محمد 2026-10-19): وسم NEUROANATOMY وبطاقة PHYSIOLOGY ← #semesters، LECTURE NOTES ← workspace.html?view=lectures، CLINICAL LEARNING ← workspace.html?view=questions. خارج ترتيب Tab (tabindex=-1 داخل الرسم المخفي عن قارئ الشاشة)؛ الطبقات الزخرفية لا تلتقط اللمس؛ البطاقة الباهتة (opacity أقل من 0.6) لا تُضغط؛ المشهد يثبت ما دام المؤشر على بطاقة.
- إضافات Step 54 (بطلب محمد، النقاط السبع): (1) البطاقات روابط كما أعلاه. (2) بطاقة CONTINUE لآخر مادة فُتحت (MS.course(MS.getLast()))، في مرحلة الاستكشاف فقط، ومخفية إن لم توجد. (3) ترحيب «أهلاً، الاسم» (EN/FA أيضاً) لمن سجّل الدخول، من حدث ms:user الذي يطلقه auth.js بعد auth/me؛ الاسم في <bdi>. (4) أُلغيت بقرار محمد: الدماغ ثابت للجميع، لا يتغير العضو حسب الكورس. (5) التمرير: .mm-scroll يبتعد ويخفت والنص ثابت (معطّل مع تقليل الحركة). (6) السحب الأفقي باللمس يميل المشهد حتى 9° ويثبّته (touch-action: pan-y). (7) بطاقة NEW ANNOUNCEMENT لآخر تبليغ من حدث ms:announcements (يطلقه سكربت التبليغات في index.html)، في مرحلة الربط، وتفتح #announcements. النصوص من المستخدم تُكتب textContent فقط.

## Step 55 (2026-10-19): الجدول الجامعي الرسمي (منشور مع Step 56؛ 0006 طُبّق على D1)
- قسم «الجدول الجامعي» تحت البانر في الرئيسية (محاضرات الغد) + timetable.html (أسبوعي) + timetable-admin.html (إدارة واستيراد). التصميم: css/timetable.css مكوّن مستقل بنطاق .tt وألوانه --tt-* (فاتح وداكن)، والمرجع ملف محمد MEDIXA-course03-timetable.html ولقطته.
- الوصول من الخادم: الكورس الثالث (ms.sem في الحساب) أو المشرف؛ الزائر 401 وغيره 403. الإدارة للمشرف فقط. الخادم functions/_lib/timetable.js ويُستدعى في functions/api/[[path]].js بعد auth.
- migrations/0006_timetable.sql طُبّق على D1 الحقيقي (2026-10-19، بطلب محمد). Workers AI (ربط AI) اختياري لقراءة الصور. التفاصيل في TIMETABLE.md.
- الإصدار ?v=step56 وV = "medixa-step56" (الإنتاج كان قد استعمل step55 للبانر).


## إصلاح عارض PDF في صفحة المادة (2026-10-19، بطلب محمد)
- سفاري على iPhone/iPad لا يصغّر PDF داخل iframe (الصفحة مقصوصة ولا تتمرر). العارض في course.html صار site/js/pdf-viewer.js (MedixaViewer.open/close): يرسم كل صفحة بعرض النافذة في #viewerPages وتتمرر عمودياً.
- الترتيب: pdf.js 3.11.174 من cdnjs (disableFontFace: true لأن خطوط بعض الملفات تتداخل بدونه) ← صور pdf-raster إن وُجدت ← iframe مع تنبيه. الرسم كسول (IntersectionObserver) ويُفرَّغ عند الابتعاد لحماية ذاكرة الهاتف.
- الإصدار ?v=step56p لـ style.css وi18n.js وpdf-viewer.js، وV = "medixa-step56p".
