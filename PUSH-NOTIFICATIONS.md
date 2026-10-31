# Notifications (Web Push) and «my semester» — Step 49

Decisions by Mohammed (2026-10-19): guests and signed-in students can turn notifications on; a new lecture notifies only students of that lecture's semester; announcements go to everyone; each student chooses their semester.

## For the student
- First visit to the home page asks «في أي كورس أنت؟». The choice (`ms.sem`) opens that semester's page and, from then on, the other semesters are hidden everywhere in the student interface (home, sidebar, search, planner, question bank). It syncs with the account and can be changed only in Settings (workspace.html?view=settings). Decision by Mohammed 2026-10-19: no course button in the sidebar. Upload/admin pages still list every semester.
- Sidebar: «تفعيل الإشعارات». Android and computers: works in the browser. iPhone/iPad: only after Share → «إضافة إلى الشاشة الرئيسية», opening Medixa from that icon (iOS 16.4+); the button explains this.
- Notifications: «محاضرة جديدة: <المادة>» (tap opens the lecture) and «تبليغ: <العنوان>» (opens the announcements).

## When a notification is sent
- Announcement published from announce.html → every subscribed device.
- Lecture uploaded or linked from upload.html (type lecture) → devices whose chosen semester matches the course. Not sent for quizzes/exams, or for uploads marked «لا تظهر في أحدث المحاضرات» (old material).
- Expired subscriptions (404/410 from the push service) are deleted automatically.

## One-time setup (Mohammed, on Cloudflare)
1. Open admin.html → «مفاتيح الإشعارات» → «توليد المفاتيح» (generated in your browser only).
2. Cloudflare → medixa → Settings → Variables and Secrets → Production: add `VAPID_PUBLIC_KEY` (text) and `VAPID_PRIVATE_KEY` (Secret). Optional `VAPID_SUBJECT` = `mailto:<your email>`.
3. Redeploy. Until the keys exist the notification button stays hidden and nothing is sent.
4. Database: `migrations/0003_push.sql` (table `push_subs`) must exist in D1 `medixa` before the keys are added.

## Data stored
`push_subs`: the push endpoint and its public keys per device, the chosen semester, optional account id, timestamps. No name, no email.

## Code
- `functions/_lib/push.js` — VAPID (RFC 8292) and aes128gcm encryption (RFC 8291) with Web Crypto only; subscribe/unsubscribe routes; `notify()`.
- `functions/_lib/course-semesters.js` — generated from `site/data/courses.js` by `node scripts/gen-course-semesters.cjs` (re-run after editing courses; `tests/push_check.mjs` fails if it is stale).
- `site/js/my-course.js` — semester picker and the notification button. `site/sw.js` — `push` and `notificationclick`.

## Tests
- `tests/push_check.mjs` (npm test): payload decrypted by an independent RFC 8291 implementation, VAPID signature verified, validation, semester filtering, expired cleanup, which uploads notify, map freshness.
- `tests/step49_course_push_browser.py`: picker, sidebar, enable/disable, lecture → right semester only, semester change, announcement → all, iPhone instructions. The browser push service is stubbed; real Apple/Google delivery is not tested here.


## تفعيل تلقائي (Step 51، 2026-10-19)
من سجّل الدخول تُفعَّل إشعاراته تلقائياً: إن كان الإذن ممنوحاً يُشترك بصمت، وإلا تظهر نافذة الإذن عند أول لمسة بعد الدخول (المتصفحات وiOS تشترط لمسة)، مرة واحدة لكل جهاز (ms.push.asked). من أوقفها بنفسه لا تعود (ms.push.off). الزائر يفعّلها بزر القائمة. الرفض لا يُكرَّر.

## Step 52 (2026-10-19): تجربة إشعارات أوضح (على نمط الفيديو المرجعي)
لم تتغير طريقة الإرسال (VAPID والتشفير والاشتراك كما هي). التغييرات:
- **النص:** «الحدث · المادة» في العنوان والتفاصيل في السطر الثاني، مثل «محاضرة جديدة · المناعة الطبية» / «المحاضرة 4: Kidney». التبليغ: «تبليغ · العنوان».
- **الهوية:** أيقونة Medixa، وشارة أحادية اللون assets/notify-badge.png لشريط حالة Android، واتجاه عربي RTL.
- **التجميع ومنع التكرار:** وسم واحد لكل مادة، فإشعار جديد لنفس المادة يحلّ محل السابق بلا صوت جديد. الملف الثاني لنفس المحاضرة خلال 12 ساعة لا يرسل إشعاراً. عدة محاضرات لنفس المادة خلال 30 دقيقة تصبح إشعاراً واحداً «المحاضرات 4، 5 و6». السجل في KV (push/recent/<المادة>).
- **الفتح المباشر:** الضغط يفتح المحاضرة نفسها (course.html?id=…#lec-N) حتى لو كانت الصفحة مفتوحة.
- **الأزرار:** «افتح المحاضرة» و«افتح الملف» (PDF) على Android وChrome/Edge في الكمبيوتر. iPhone/iPad وSafari لا تدعم الأزرار: يظهر الإشعار بلا أزرار والضغط عليه يفتح المحاضرة.
- **أنواع جديدة:** الاختبارات التفاعلية وأسئلة السنوات السابقة ترسل إشعاراً لطلاب كورس المادة أيضاً.
- **التفضيلات:** زر «تخصيص» بجانب الإشعارات: المحاضرات / الاختبارات وأسئلة السنوات السابقة / التبليغات، و«كل مواد كورسي» أو «مواد أختارها». محفوظة لكل جهاز (ms.push.prefs) وتُرسل مع الاشتراك.
- **لمن ينشر التبليغ:** يظهر عدد الأجهزة المشتركة التي يصلها الإشعار.

### خطوة واحدة على D1 الحقيقي (قبل أن تعمل التفضيلات)
migrations/0004_push_prefs.sql يضيف عموداً واحداً (prefs) لجدول push_subs ولا يغيّر أي اشتراك.
قبل تطبيقه: كل شيء يعمل كما في Step 51 (الإشعارات تصل للجميع)، ونافذة التخصيص تقول إن الحفظ سيعمل بعد تحديث الخادم.

### ما لا يمكن التحكم به
شكل الإشعار وحجمه وتجميعه على شاشة القفل يحدده نظام الجهاز. لم يُجرَّب Step 52 على هاتف حقيقي بعد؛
الفحوص: tests/push_check.mjs، tests/sw_notify_check.cjs، tests/step52_notify_browser.py (Chromium حقيقي يعرض الإشعار).
