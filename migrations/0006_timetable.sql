-- Step 55: الجدول الجامعي الرسمي (للكورس الثالث). إضافات فقط: جدولان جديدان، لا تعديل لبيانات موجودة.
-- محاضرة أسبوعية متكررة (weekday) أو لمرة واحدة (date). لا تظهر للطلاب إلا بعد النشر (status = 'published').
CREATE TABLE IF NOT EXISTS timetable_lectures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester INTEGER NOT NULL DEFAULT 3,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  lecturer TEXT NOT NULL DEFAULT '',
  room TEXT NOT NULL DEFAULT '',
  weekday INTEGER,                 -- 0 = الأحد ... 6 = السبت (للمتكرر أسبوعياً)
  date TEXT,                       -- YYYY-MM-DD (للمحاضرة لمرة واحدة)
  start_time TEXT NOT NULL,        -- HH:MM
  end_time TEXT NOT NULL,
  valid_from TEXT,                 -- بداية التكرار (اختياري)
  valid_to TEXT,                   -- نهاية التكرار (اختياري)
  status TEXT NOT NULL DEFAULT 'draft',   -- draft | published
  source TEXT NOT NULL DEFAULT 'manual',  -- manual | import
  created_by INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS timetable_lectures_sem ON timetable_lectures (semester, status);

-- استثناء لتاريخ واحد من محاضرة: إلغاء أو نقل (موعد/قاعة جديدة)
CREATE TABLE IF NOT EXISTS timetable_exceptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lecture_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  action TEXT NOT NULL,            -- cancel | move
  new_date TEXT,
  new_start TEXT,
  new_end TEXT,
  new_room TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (lecture_id, date)
);
