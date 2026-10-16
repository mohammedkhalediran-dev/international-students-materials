// node tests/upload_api_check.mjs — فحص منطق الرفع (netlify/lib/core.mjs) بمخزن في الذاكرة
import { handle, LIMITS } from "../netlify/lib/core.mjs";
import { createMockStore } from "./mock_store.mjs";
import { randomUUID } from "node:crypto";

let passes = 0;
const fails = [];
const chk = (c, m) => { if (c) passes++; else { fails.push(m); console.log("FAIL", m); } };

const CODES = "سارة:code-sara-1234,علي:code-ali-98765,قصير:123";
const store = createMockStore();
let clock = Date.parse("2026-10-16T10:00:00Z");
const deps = (ip = "1.1.1.1", env = CODES) => ({ store, env: (k) => (k === "UPLOAD_CODES" ? env : undefined), ip, now: () => clock });

const call = (path, { method = "POST", code, body, ip, env } = {}) => {
  const headers = {};
  if (code) headers["x-upload-code"] = code;
  let b = body;
  if (body && !(body instanceof Uint8Array) && typeof body === "object") { b = JSON.stringify(body); headers["content-type"] = "application/json"; }
  return handle(new Request("https://site.test/api/" + path, { method, headers, body: b }), deps(ip, env));
};
const pdf = (n, fill = 65) => { const u = new Uint8Array(n); u.fill(fill); u.set(new TextEncoder().encode("%PDF-1.7\n")); return u; };
const meta = { courseId: "medical-immunology", number: 2, title: "Innate Immunity", label: "Slides", filename: "innate.pdf" };

async function upload(code, bytes, over = {}) {
  const id = randomUUID();
  const CH = 2 * 1024 * 1024;
  const n = Math.ceil(bytes.length / CH);
  for (let i = 0; i < n; i++) {
    const r = await call(`chunk?id=${id}&index=${i}`, { code, body: bytes.slice(i * CH, (i + 1) * CH) });
    if (r.status !== 200) return { id, chunkStatus: r.status, res: r };
  }
  const res = await call("finish", { code, body: { id, chunks: n, ...meta, ...over } });
  return { id, res };
}

// 1) الرمز
chk((await call("check", { code: "code-sara-1234" })).status === 200, "رمز صحيح يُقبل");
chk((await (await call("check", { code: "code-ali-98765" })).json()).name === "علي", "الاسم يطابق الرمز");
chk((await call("check", { code: "code-sara-1235" })).status === 401, "رمز خاطئ يُرفض");
chk((await call("check", {})).status === 401, "بلا رمز يُرفض");
chk((await call("check", { code: "123" })).status === 401, "رمز قصير في الإعداد يُهمل");
chk((await call("check", { code: "x", env: "" })).status === 503, "بلا إعداد: غير مهيأ");

// 2) القفل بعد محاولات خاطئة
for (let i = 0; i < LIMITS.attempts; i++) await call("check", { code: "bad-" + i, ip: "9.9.9.9" });
chk((await call("check", { code: "code-sara-1234", ip: "9.9.9.9" })).status === 429, "القفل بعد محاولات خاطئة كثيرة (حتى مع رمز صحيح)");
chk((await call("check", { code: "code-sara-1234", ip: "8.8.8.8" })).status === 200, "جهاز آخر لا يتأثر بالقفل");
clock += LIMITS.lockMs + 1000;
chk((await call("check", { code: "code-sara-1234", ip: "9.9.9.9" })).status === 200, "ينتهي القفل بعد المدة");

// 3) رفع ملف كبير على قطع ثم القراءة
const big = pdf(5 * 1024 * 1024 + 123);
const up = await upload("code-sara-1234", big);
chk(up.res.status === 200, "رفع 5 ميغا على 3 قطع ينجح " + up.res.status);
const entry = (await up.res.json()).entry;
chk(entry && entry.size === big.length && entry.courseId === "medical-immunology", "الإدخال يحمل الحجم والمادة");
const listed = await (await call("uploads", { method: "GET" })).json();
chk(listed.items.length === 1 && !("by" in listed.items[0]), "القائمة العامة لا تكشف اسم الرافع");
const js = await (await call("uploads.js", { method: "GET" })).text();
chk(js.startsWith("window.UPLOADS = [") && js.includes(up.id), "uploads.js يعرّف window.UPLOADS");
const got = await call(`file/${up.id}`, { method: "GET" });
const bytes = new Uint8Array(await got.arrayBuffer());
chk(got.status === 200 && got.headers.get("content-type") === "application/pdf", "الملف يُعرض كـ PDF");
chk(bytes.length === big.length && bytes.every((v, i) => v === big[i]), "البايتات المقروءة تطابق المرفوعة");
const head = await call(`file/${up.id}`, { method: "HEAD" });
chk(head.status === 200 && head.headers.get("content-length") === String(big.length), "HEAD يعيد الحجم");
chk((await call(`file/${randomUUID()}`, { method: "GET" })).status === 404, "ملف غير موجود: 404");

// 4) التحقق من المدخلات
const notPdf = await upload("code-sara-1234", new TextEncoder().encode("hello world, not a pdf"));
chk(notPdf.chunkStatus === 400, "ملف ليس PDF يُرفض");
chk((await upload("code-sara-1234", pdf(1000), { number: 0 })).res.status === 400, "رقم محاضرة غير صالح");
chk((await upload("code-sara-1234", pdf(1000), { title: "   " })).res.status === 400, "عنوان فارغ");
chk((await upload("code-sara-1234", pdf(1000), { courseId: "../etc" })).res.status === 400, "رمز مادة غير صالح");
chk((await upload("code-sara-1234", pdf(1000), { label: "" })).res.status === 200, "العنوان الفرعي الفارغ يُملأ من اسم الملف");
const huge = await upload("code-sara-1234", pdf(LIMITS.file + 1024));
chk(huge.res.status === 413, "أكبر من الحد يُرفض " + huge.res.status);
chk(store.keys(`chunks/${huge.id}/`).length === 0, "قطع الملف المرفوض تُحذف");
chk((await call(`chunk?id=${randomUUID()}&index=0`, { body: pdf(100) })).status === 401, "رفع قطعة بلا رمز يُرفض");
chk((await call(`chunk?id=${randomUUID()}&index=0`, { code: "code-sara-1234", body: pdf(LIMITS.chunk + 1) })).status === 413, "قطعة أكبر من الحد");
const missing = randomUUID();
await call(`chunk?id=${missing}&index=0`, { code: "code-sara-1234", body: pdf(500) });
chk((await call("finish", { code: "code-sara-1234", body: { id: missing, chunks: 2, ...meta } })).status === 400, "قطعة ناقصة تُرفض");

// 5) إعادة الطلب لا تكرر الإدخال
const again = await call("finish", { code: "code-sara-1234", body: { id: up.id, chunks: 3, ...meta } });
chk(again.status === 200 && (await (await call("uploads", { method: "GET" })).json()).items.filter((e) => e.id === up.id).length === 1, "إعادة finish لا تكرر الإدخال");

// 6) رفعان متزامنان لا يضيع أحدهما
const [a, b] = await Promise.all([upload("code-sara-1234", pdf(3000), { number: 3 }), upload("code-ali-98765", pdf(4000), { number: 4 })]);
const ids = (await (await call("uploads", { method: "GET" })).json()).items.map((e) => e.id);
chk(a.res.status === 200 && b.res.status === 200 && ids.includes(a.id) && ids.includes(b.id), "رفعان متزامنان يبقيان معاً");

// 7) إلغاء الرفع والحذف
const ab = randomUUID();
await call(`chunk?id=${ab}&index=0`, { code: "code-sara-1234", body: pdf(800) });
await call("abort", { code: "code-sara-1234", body: { id: ab } });
chk(store.keys(`chunks/${ab}/`).length === 0, "abort يحذف قطعاً ناقصة");
await call("abort", { code: "code-sara-1234", body: { id: up.id } });
chk(store.keys(`chunks/${up.id}/`).length === 3, "abort لا يمس ملفاً مكتملاً");
chk((await call("delete", { body: { id: up.id } })).status === 401, "الحذف يحتاج رمزاً");
chk((await call("delete", { code: "code-ali-98765", body: { id: up.id } })).status === 200, "الحذف بالرمز");
chk(store.keys(`chunks/${up.id}/`).length === 0, "الحذف يزيل القطع");
chk((await call(`file/${up.id}`, { method: "GET" })).status === 404, "الملف المحذوف لا يُعرض");
chk((await call("delete", { code: "code-ali-98765", body: { id: up.id } })).status === 404, "حذف ثانٍ: غير موجود");
chk((await call("nothing", { method: "GET" })).status === 404, "مسار مجهول: 404");

// 8) أنواع جديدة: روابط، اختبار تفاعلي، أسئلة سنوات، خيار أحدث المحاضرات، قائمة المشرفين
const SARA = "code-sara-1234", ALI = "code-ali-98765";
const adminList = async (code = SARA) => (await (await call("admin", { code, body: {} })).json()).items;
chk((await call("admin", { body: {} })).status === 401, "قائمة المشرفين تحتاج رمزاً");
const lecUp = await upload(SARA, pdf(2000), { number: 7, title: "Renal Blood Flow", showInLatest: false });
const lecEntry = (await lecUp.res.json()).entry;
chk(lecEntry.type === "lecture" && lecEntry.kind === "file" && lecEntry.showInLatest === false, "ملف المحاضرة: النوع والتفضيل محفوظان");
const adm = (await adminList()).find((e) => e.id === lecUp.id);
chk(adm && adm.by === "سارة" && /^\d{4}-\d\d-\d\dT/.test(adm.at), "قائمة المشرفين تعرض الرافع ووقت الرفع");
chk(!("by" in (await (await call("uploads", { method: "GET" })).json()).items[0]), "القائمة العامة ما زالت بلا اسم الرافع");

const quiz = await call("link", { code: ALI, body: { courseId: "medical-immunology", type: "quiz", label: "Interactive test 1", url: "https://quiz.example.com/t/1" } });
const quizEntry = (await quiz.json()).entry;
chk(quiz.status === 200 && quizEntry.kind === "link" && quizEntry.number === 0 && quizEntry.url === "https://quiz.example.com/t/1", "رابط اختبار تفاعلي للمادة كلها");
chk((await call("link", { code: ALI, body: { courseId: "medical-immunology", type: "quiz", label: "x", url: "javascript:alert(1)" } })).status === 400, "رابط javascript يُرفض");
chk((await call("link", { code: ALI, body: { courseId: "medical-immunology", type: "quiz", label: "x", url: "not a url" } })).status === 400, "رابط غير صالح يُرفض");
chk((await call("link", { code: ALI, body: { courseId: "medical-immunology", type: "quiz", label: "", url: "https://a.example.com" } })).status === 400, "رابط بلا اسم يُرفض");
chk((await call("link", { code: ALI, body: { courseId: "medical-immunology", type: "lecture", label: "x", url: "https://a.example.com" } })).status === 400, "رابط محاضرة بلا رقم يُرفض");
chk((await call("link", { code: ALI, body: { courseId: "medical-immunology", type: "quiz", number: 3, label: "x", url: "https://a.example.com" } })).status === 400, "رقم محاضرة بلا عنوان يُرفض");
chk((await call("link", { body: { courseId: "medical-immunology", type: "quiz", label: "x", url: "https://a.example.com" } })).status === 401, "إضافة رابط تحتاج رمزاً");
chk((await call(`file/${quizEntry.id}`, { method: "GET" })).status === 404, "الرابط لا يُقدَّم كملف");

const exam = await upload(SARA, pdf(1500), { type: "exam", number: 0, title: "", label: "Final 2025" });
const examEntry = (await exam.res.json()).entry;
chk(exam.res.status === 200 && examEntry.type === "exam" && examEntry.number === 0 && examEntry.title === "", "أسئلة سنوات سابقة (PDF) للمادة كلها بلا عنوان");
chk((await upload(SARA, pdf(1500), { type: "lecture", number: 0, title: "" })).res.status === 400, "محاضرة بلا رقم تُرفض");
chk((await upload(SARA, pdf(1500), { type: "weird" })).res.status === 400, "نوع مجهول يُرفض");

// تعديل
const second = await upload(ALI, pdf(1200), { number: 7, title: "Renal Blood Flow", label: "Notes" });
const ed = await call("edit", { code: SARA, body: { id: lecUp.id, title: "Renal Blood Flow and GFR", label: "Slides v2", showInLatest: true } });
chk(ed.status === 200, "التعديل ينجح");
let all = await adminList();
chk(all.find((e) => e.id === lecUp.id).label === "Slides v2" && all.find((e) => e.id === lecUp.id).showInLatest === true, "الاسم والتفضيل تغيّرا");
chk(all.find((e) => e.id === second.id).title === "Renal Blood Flow and GFR", "عنوان المحاضرة يُطبَّق على كل ملفاتها");
chk((await call("edit", { code: SARA, body: { id: lecUp.id, number: 8 } })).status === 200 && (await adminList()).find((e) => e.id === lecUp.id).number === 8, "تغيير رقم المحاضرة");
chk((await call("edit", { code: SARA, body: { id: lecUp.id, number: 0 } })).status === 400, "محاضرة لا تصير بلا رقم");
chk((await call("edit", { code: SARA, body: { id: examEntry.id, number: 4 } })).status === 400, "رقم جديد بلا عنوان يُرفض");
chk((await call("edit", { code: SARA, body: { id: examEntry.id, number: 4, title: "Immune Tolerance" } })).status === 200, "ربط أسئلة السنوات بمحاضرة مع عنوان");
chk((await call("edit", { code: SARA, body: { id: quizEntry.id, url: "https://quiz.example.com/t/2" } })).status === 200 && (await adminList()).find((e) => e.id === quizEntry.id).url === "https://quiz.example.com/t/2", "تعديل رابط");
chk((await call("edit", { code: SARA, body: { id: lecUp.id, url: "https://x.example.com" } })).status === 400, "الرابط لا يُعدَّل على ملف");
chk((await call("edit", { code: SARA, body: { id: quizEntry.id, url: "ftp://x" } })).status === 400, "رابط غير http يُرفض في التعديل");
chk((await call("edit", { code: SARA, body: { id: lecUp.id, label: "  " } })).status === 400, "اسم ظاهر فارغ يُرفض");
chk((await call("edit", { code: SARA, body: { id: randomUUID(), label: "x" } })).status === 404, "تعديل عنصر غير موجود");
chk((await call("edit", { body: { id: lecUp.id, label: "x" } })).status === 401, "التعديل يحتاج رمزاً");
// الحذف يشمل الرابط
chk((await call("delete", { code: ALI, body: { id: quizEntry.id } })).status === 200 && !(await adminList()).some((e) => e.id === quizEntry.id), "حذف رابط");
// إدخال قديم بلا kind وtype يظهر كمحاضرة PDF
await store.set("manifest.json", JSON.stringify([{ id: "11111111-1111-4111-8111-111111111111", courseId: "medical-immunology", number: 1, title: "Old", label: "Old", filename: "o.pdf", size: 5, chunks: 1, added: "2026-10-01", by: "علي" }]));
const old = (await (await call("uploads", { method: "GET" })).json()).items[0];
chk(old.kind === "file" && old.type === "lecture" && !("showInLatest" in old), "إدخال قديم يُقرأ كمحاضرة PDF بلا تفضيل");

console.log(fails.length ? `${passes} passed, ${fails.length} failed` : `upload api OK: ${passes} checks`);
process.exit(fails.length ? 1 : 0);
