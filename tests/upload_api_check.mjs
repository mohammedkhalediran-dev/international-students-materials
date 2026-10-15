// node tests/upload_api_check.mjs — فحص منطق الرفع (lib/upload-core.mjs) بمخزن في الذاكرة
import { handle, LIMITS } from "../lib/upload-core.mjs";
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
const listed = await (await call("uploads", { method: "GET", code: "code-sara-1234" })).json();
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
chk(again.status === 200 && (await (await call("uploads", { method: "GET", code: "code-sara-1234" })).json()).items.filter((e) => e.id === up.id).length === 1, "إعادة finish لا تكرر الإدخال");

// 6) رفعان متزامنان لا يضيع أحدهما
const [a, b] = await Promise.all([upload("code-sara-1234", pdf(3000), { number: 3 }), upload("code-ali-98765", pdf(4000), { number: 4 })]);
const ids = (await (await call("uploads", { method: "GET", code: "code-sara-1234" })).json()).items.map((e) => e.id);
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

// 8) الفهرس والمخزن
chk((await call("uploads", { method: "GET" })).status === 401, "قائمة المشرفين تحتاج رمزاً");
const keep = (await (await call("uploads", { method: "GET", code: "code-sara-1234" })).json()).items.map((e) => e.id).sort();
store._data.delete("index"); // ضياع الفهرس
const rebuilt = await (await call("uploads.js", { method: "GET" })).text();
chk(keep.length > 0 && keep.every((id) => rebuilt.includes(id)), "الفهرس يُعاد بناؤه من مفاتيح الإدخالات عند ضياعه");
const stale = await upload("code-sara-1234", pdf(2000), { number: 9 });
store._data.set("index", { value: Buffer.from("[]"), metadata: {}, expires: 0 }); // فهرس قديم لا يعرف الملف
chk((await call(`file/${stale.id}`, { method: "GET" })).status === 200, "الملف يُعرض حتى لو تأخر الفهرس");
const longTitle = await upload("code-sara-1234", pdf(1500), { number: 10, title: "ع".repeat(300), label: "ع".repeat(200) });
chk(longTitle.res.status === 200, "عنوان طويل بالعربية يُقصّ ويدخل حد البيانات الوصفية " + longTitle.res.status);
const noStore = await handle(new Request("https://site.test/api/uploads.js"), { store: null, env: () => CODES, ip: "1.1.1.1", now: () => clock });
chk((await noStore.text()).startsWith("window.UPLOADS = []"), "بلا مخزن مربوط: قائمة فارغة لا خطأ");

console.log(fails.length ? `${passes} passed, ${fails.length} failed` : `upload api OK: ${passes} checks`);
process.exit(fails.length ? 1 : 0);
