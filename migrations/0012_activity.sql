-- نشاط الطالب على الموقع (بطلب محمد): ثوانٍ في اليوم على الموقع وفي وضع الدراسة، وآخر نبضة. إضافة فقط.
CREATE TABLE IF NOT EXISTS user_activity (
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,                    -- YYYY-MM-DD (UTC)
  site_s INTEGER NOT NULL DEFAULT 0,    -- كل الوقت على الموقع
  study_s INTEGER NOT NULL DEFAULT 0,   -- منه في القارئ ووضع الدراسة
  last_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);
