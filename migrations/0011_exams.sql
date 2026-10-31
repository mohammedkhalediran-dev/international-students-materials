-- التقويم والامتحانات (للكورس الثالث). إضافة فقط: جدول جديد، لا تعديل لبيانات موجودة.
CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester INTEGER NOT NULL DEFAULT 3,
  subject TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'theory',   -- theory | practical | quiz | other
  date TEXT NOT NULL,                    -- YYYY-MM-DD
  start_time TEXT NOT NULL DEFAULT '',   -- HH:MM أو فارغ
  room TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS exams_sem_date ON exams (semester, date);
