-- صورة الطالب واسمه الظاهر (للدردشة والملف الشخصي). الصورة مصغّرة JPEG بترميز base64 (حتى ~67KB).
CREATE TABLE IF NOT EXISTS user_avatars (
  user_id INTEGER PRIMARY KEY,
  display_name TEXT,
  avatar TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0
);
