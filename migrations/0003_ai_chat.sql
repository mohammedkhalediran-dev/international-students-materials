-- المساعد الذكي والدردشة. كل الجمل بـ IF NOT EXISTS فتُعاد بأمان.
CREATE TABLE IF NOT EXISTS ai_quota (
  user_id INTEGER NOT NULL,
  day_key TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day_key)
);
CREATE TABLE IF NOT EXISTS chat_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES chat_rooms(id),
  user_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id, created_at);
CREATE TABLE IF NOT EXISTS chat_reports (
  message_id INTEGER NOT NULL,
  reporter_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (message_id, reporter_id)
);
CREATE TABLE IF NOT EXISTS chat_mutes (
  user_id INTEGER PRIMARY KEY,
  until_at INTEGER NOT NULL,
  set_by INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_message_archive (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO chat_rooms (slug, name, sort) VALUES ('general', 'الغرفة العامة', 0);
INSERT OR IGNORE INTO chat_rooms (slug, name, sort) VALUES ('s1', 'الكورس الأول', 1);
INSERT OR IGNORE INTO chat_rooms (slug, name, sort) VALUES ('s2', 'الكورس الثاني', 2);
INSERT OR IGNORE INTO chat_rooms (slug, name, sort) VALUES ('s3', 'الكورس الثالث', 3);
