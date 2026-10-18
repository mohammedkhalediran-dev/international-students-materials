/* فحص قاعدة بيانات التعليقات (supabase/schema.sql) على Postgres حقيقي: دمج ذري، حذف، وخصوصية بين المستخدمين. */
import assert from "node:assert/strict";
import { makeDb, addUser, rpc, asUser } from "./pg_harness.mjs";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };
const fails = async (p, re, m) => { try { await p; } catch (e) { ok(re.test(String(e.message)), m + " :: " + e.message); return; } assert.fail("expected failure: " + m); };

const db = await makeDb();
await addUser(db, A, "a@example.com");
await addUser(db, B, "b@example.com");
const F = "files/المناعة/محاضرة-1.pdf";
const stroke = (id, t) => ({ id, k: "p", c: "#e43d56", w: 3, p: "100 200 300 400", t });

/* حفظ أول: عنصران */
await rpc(db, A, "notes_save_page", { p_file: F, p_page: 1, p_add: { s1: stroke("s1", 1000), s2: stroke("s2", 1001) }, p_remove: {}, p_meta: { title: "المناعة", course: "medical-immunology", url: "files/x.pdf", pages: 12 } });
let got = await rpc(db, A, "notes_get_file", { p_file: F });
eq(got.length, 1, "صفحة واحدة"); eq(Object.keys(got[0].items).sort(), ["s1", "s2"], "عنصران");

/* جهاز ثانٍ لنفس الحساب يضيف عنصراً دون أن يمحو الأول (لا تضيع التعديلات) */
await rpc(db, A, "notes_save_page", { p_file: F, p_page: 1, p_add: { s3: stroke("s3", 1002) }, p_remove: {} });
got = await rpc(db, A, "notes_get_file", { p_file: F });
eq(Object.keys(got[0].items).sort(), ["s1", "s2", "s3"], "الدمج يحفظ عمل الجهازين");

/* حذف من جهاز، وإعادة إرسال العنصر القديم من جهاز بطيء لا تُعيده */
await rpc(db, A, "notes_save_page", { p_file: F, p_page: 1, p_add: {}, p_remove: { s2: 2000 } });
await rpc(db, A, "notes_save_page", { p_file: F, p_page: 1, p_add: { s2: stroke("s2", 1001) }, p_remove: {} });
got = await rpc(db, A, "notes_get_file", { p_file: F });
eq(Object.keys(got[0].items).sort(), ["s1", "s3"], "المحذوف لا يعود من جهاز قديم");
/* لكن تعديل العنصر بعد الحذف (t أحدث) يُعيده: هذا ما يفعله «تراجع عن الحذف» */
await rpc(db, A, "notes_save_page", { p_file: F, p_page: 1, p_add: { s2: stroke("s2", 3000) }, p_remove: {} });
got = await rpc(db, A, "notes_get_file", { p_file: F });
eq(Object.keys(got[0].items).sort(), ["s1", "s2", "s3"], "التراجع عن الحذف يعيد العنصر");

/* قائمة الملفات والعدّاد */
let list = await rpc(db, A, "notes_list_files");
eq(list.length, 1, "ملف واحد"); eq(list[0].count, 3, "ثلاثة عناصر"); eq(list[0].pages, 12, "عدد الصفحات"); eq(list[0].title, "المناعة", "العنوان");

/* الخصوصية: المستخدم B لا يرى شيئاً من بيانات A ولا يستطيع تعديلها */
eq(await rpc(db, B, "notes_get_file", { p_file: F }), [], "B لا يرى صفحات A");
eq(await rpc(db, B, "notes_list_files"), [], "B لا يرى ملفات A");
await rpc(db, B, "notes_save_page", { p_file: F, p_page: 1, p_add: { b1: stroke("b1", 5000) }, p_remove: {}, p_meta: { title: "ملف B" } });
got = await rpc(db, A, "notes_get_file", { p_file: F });
eq(Object.keys(got[0].items).sort(), ["s1", "s2", "s3"], "كتابة B لا تدخل صفحات A رغم تطابق اسم الملف");
eq(Object.keys((await rpc(db, B, "notes_get_file", { p_file: F }))[0].items), ["b1"], "B يرى عنصره فقط");
await rpc(db, B, "notes_delete_file", { p_file: F });
eq((await rpc(db, A, "notes_list_files")).length, 1, "حذف B لا يمس ملفات A");

/* وصول مباشر إلى الجداول: RLS تمنع القراءة والكتابة عبر مستخدم آخر */
eq((await asUser(db, B, (tx) => tx.query("select * from public.note_pages"))).rows.length, 0, "RLS: B لا يقرأ الجدول");
await fails(asUser(db, B, (tx) => tx.query("insert into public.note_files (user_id, file_key) values ($1, 'x')", [A])), /row-level security/i, "RLS: B لا يكتب باسم A");
eq((await asUser(db, B, (tx) => tx.query("update public.note_pages set items = '{}' where user_id = $1 returning 1", [A]))).rows.length, 0, "RLS: B لا يعدّل صفوف A");
/* الزائر (anon) ممنوع */
await fails(rpc(db, null, "notes_list_files"), /permission denied/i, "الزائر لا يستدعي الدوال");
await fails(asUser(db, null, (tx) => tx.query("select * from public.note_files")), /permission denied/i, "الزائر لا يقرأ الجداول");

/* مدخلات سيئة وحجم كبير */
await fails(rpc(db, A, "notes_save_page", { p_file: F, p_page: 1, p_add: [1], p_remove: {} }), /bad_input/, "مدخل ليس كائناً");
await fails(rpc(db, A, "notes_save_page", { p_file: F, p_page: 0, p_add: {}, p_remove: {} }), /check constraint|violates/i, "رقم صفحة غير صالح");
const big = {}; for (let i = 0; i < 40; i++) big["g" + i] = { id: "g" + i, k: "p", p: "1 ".repeat(30000), t: 1 };
await fails(rpc(db, A, "notes_save_page", { p_file: F, p_page: 2, p_add: big, p_remove: {} }), /page_too_big/, "صفحة أكبر من الحد");

/* حذف كل بيانات المستخدم */
await rpc(db, A, "notes_delete_all");
eq(await rpc(db, A, "notes_list_files"), [], "حذف كل شيء");
eq((await db.query("select count(*)::int c from public.note_pages")).rows[0].c, 0, "الصفحات حُذفت بالتتابع");

console.log("notes sql OK:", n, "checks");
