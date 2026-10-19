-- إشعارات الموقع (Web Push): عنوان الإشعار لكل جهاز وكورس الطالب فقط. لا اسم ولا بريد.
-- user_id اختياري (إن كان الطالب مسجّلاً)؛ الزائر يستطيع الاشتراك أيضاً (بقرار محمد 2026-10-19).
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  semester INTEGER NOT NULL,
  user_id INTEGER,
  created_at INTEGER NOT NULL,
  last_ok INTEGER
);
CREATE INDEX IF NOT EXISTS push_subs_semester ON push_subs(semester);
