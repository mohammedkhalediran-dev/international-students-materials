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
