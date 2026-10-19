-- Step 61: الملف الشخصي (بطلب محمد 2026-10-19). إضافة فقط: جدول جديد.
-- الاسم الكامل كما في الجامعة يكتبه الطالب. رقم الجواز لا يُخزَّن هنا ولا في أي مكان: يُربط عبر بصمته في grade_people
-- (إن لم تُرفع درجاته بعد يُنشأ له سجل مربوط بلا درجات، فتلحقه درجاته تلقائياً عند الرفع).
CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
