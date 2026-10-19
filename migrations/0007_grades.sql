-- Step 57: درجاتي الجامعية (بطلب محمد 2026-10-19). إضافات فقط: جداول جديدة، لا تعديل لبيانات موجودة.
-- رقم الجواز لا يُخزَّن أبداً: نحفظ بصمته فقط (HMAC-SHA256 بمفتاح سري GRADES_SECRET في Cloudflare).
-- الطالب يكتب رقم جوازه مرة واحدة فيُربط حسابه بالبصمة نهائياً (ربط تلقائي، ويفكّه المشرف عند الخطأ).

-- شخص واحد لكل رقم جواز (بصمته)، وحساب واحد على الأكثر لكل شخص
CREATE TABLE IF NOT EXISTS grade_people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pass_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  user_id INTEGER UNIQUE,
  linked_at INTEGER,
  created_at INTEGER NOT NULL
);

-- كل ملف يرفعه المشرف دفعة باسم (مثل «الكورس الثالث 2025/2026»)
CREATE TABLE IF NOT EXISTS grade_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  student_count INTEGER NOT NULL DEFAULT 0,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at INTEGER NOT NULL
);

-- درجة مادة واحدة لشخص في دفعة
CREATE TABLE IF NOT EXISTS grade_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  person_id INTEGER NOT NULL,
  course TEXT NOT NULL,
  grade TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS grade_entries_person ON grade_entries (person_id);
CREATE INDEX IF NOT EXISTS grade_entries_batch ON grade_entries (batch_id);

-- محاولات إدخال رقم الجواز (لمنع التخمين): تُحذف القديمة تلقائياً
CREATE TABLE IF NOT EXISTS grade_attempts (
  user_id INTEGER NOT NULL,
  at INTEGER NOT NULL,
  ok INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS grade_attempts_user ON grade_attempts (user_id, at);
