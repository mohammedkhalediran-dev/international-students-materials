-- Step 53: لوحة الإدارة. إضافات فقط (لا حذف ولا تعديل لبيانات موجودة).
-- 1) سجل التغييرات: من نفّذ، الحساب المستهدف، نوع التغيير، الوقت، النتيجة. لا أسرار ولا رموز جلسات.
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  actor_id INTEGER NOT NULL,
  actor_name TEXT NOT NULL,
  target_id INTEGER,
  target_name TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  result TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_log_at ON audit_log(at);
-- 2) وقت آخر تسجيل دخول (قبل هذا العمود يُستنتج من الجلسات القائمة فقط)
ALTER TABLE users ADD COLUMN last_login_at INTEGER;
