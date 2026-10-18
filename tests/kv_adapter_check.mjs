// node tests/kv_adapter_check.mjs — فحص منطق الرفع عبر محوّل Cloudflare KV (functions/_lib/kvstore.js) بمخزن KV وهمي
import { handle, LIMITS } from "../netlify/lib/core.mjs";
import { kvStore } from "../functions/_lib/kvstore.js";
import { onRequest } from "../functions/api/[[path]].js";
import { randomUUID } from "node:crypto";

let passes = 0;
const fails = [];
const chk = (c, m) => { if (c) passes++; else { fails.push(m); console.log("FAIL", m); } };

// KV وهمي يحاكي واجهة Workers KV (get / getWithMetadata / put / delete)
function fakeKV() {
  const m = new Map();
  const out = (rec, type) => {
    if (!rec) return null;
    const v = rec.value;
    if (type === "json") return JSON.parse(typeof v === "string" ? v : new TextDecoder().decode(v));
    if (type === "arrayBuffer") return typeof v === "string" ? new TextEncoder().encode(v).buffer : v.slice(0);
    if (type === "stream") return { cancel: async () => {} };
    return typeof v === "string" ? v : new TextDecoder().decode(v);
  };
  return {
    puts: [],
    async get(k, type = "text") { return out(m.get(k), type); },
    async getWithMetadata(k, type = "text") { const r = m.get(k); return { value: out(r, type), metadata: r ? r.metadata : null }; },
    async put(k, value, o = {}) {
      this.puts.push({ k, o });
      const v = value instanceof Uint8Array ? value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) : value;
      m.set(k, { value: v, metadata: o.metadata || null });
    },
    async delete(k) { m.delete(k); },
    keys(p) { return [...m.keys()].filter((k) => k.startsWith(p)); }
  };
}

const CODES = "سارة:code-sara-1234,علي:code-ali-98765";
const kv = fakeKV();
let clock = Date.parse("2026-10-16T10:00:00Z");
const deps = (ip = "1.1.1.1") => ({ store: kvStore(kv), env: (k) => (k === "UPLOAD_CODES" ? CODES : undefined), ip, now: () => clock });
const call = (path, { method = "POST", code, body, ip } = {}) => {
  const headers = {};
  if (code) headers["x-upload-code"] = code;
  let b = body;
  if (body && !(body instanceof Uint8Array) && typeof body === "object") { b = JSON.stringify(body); headers["content-type"] = "application/json"; }
  return handle(new Request("https://site.test/api/" + path, { method, headers, body: b }), deps(ip));
};
const pdf = (n) => { const u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = i % 251; u.set(new TextEncoder().encode("%PDF-1.7\n")); return u; };
const meta = { courseId: "medical-immunology", number: 2, title: "Innate Immunity", label: "Slides", filename: "innate.pdf" };
async function upload(code, bytes, over = {}) {
  const id = randomUUID(), CH = 2 * 1024 * 1024, n = Math.ceil(bytes.length / CH);
  for (let i = 0; i < n; i++) {
    const r = await call(`chunk?id=${id}&index=${i}`, { code, body: bytes.slice(i * CH, (i + 1) * CH) });
    if (r.status !== 200) return { id, res: r };
  }
  return { id, res: await call("finish", { code, body: { id, chunks: n, ...meta, ...over } }) };
}

// الدخول
chk((await call("check", { code: "code-sara-1234" })).status === 200, "رمز صحيح يُقبل");
chk((await (await call("check", { code: "code-ali-98765" })).json()).name === "علي", "الاسم يطابق الرمز");
chk((await call("check", { code: "bad-code-0000" })).status === 401, "رمز خاطئ يُرفض");

// رفع متعدد القطع وقراءته
const big = pdf(5 * 1024 * 1024 + 77);
const up = await upload("code-sara-1234", big);
chk(up.res.status === 200, "رفع 5 ميغا على 3 قطع عبر KV ينجح " + up.res.status);
chk(kv.keys("chunks/" + up.id).length === 3, "القطع الثلاث محفوظة");
const js = await (await call("uploads.js", { method: "GET" })).text();
chk(js.startsWith("window.UPLOADS = [") && js.includes(up.id), "uploads.js يسرد الملف");
const got = await call(`file/${up.id}`, { method: "GET" });
const bytes = new Uint8Array(await got.arrayBuffer());
chk(got.status === 200 && bytes.length === big.length && bytes.every((v, i) => v === big[i]), "البايتات المقروءة تطابق المرفوعة");

// حذف
const del = await call("delete", { code: "code-sara-1234", body: { id: up.id } });
chk(del.status === 200 && (await call(`file/${up.id}`, { method: "GET" })).status === 404, "الحذف يزيل الملف");
chk(kv.keys("chunks/" + up.id).length === 0, "الحذف ينظّف القطع");

// رفعتان متتاليتان تبقيان في القائمة (الكتابة الشرطية للقائمة)
const a = await upload("code-sara-1234", pdf(1000), { number: 3 });
const b = await upload("code-ali-98765", pdf(2000), { number: 4 });
const list = await (await call("uploads", { method: "GET" })).json();
chk(a.res.status === 200 && b.res.status === 200 && list.items.length === 2, "رفعتان تظهران معاً");

// المحوّل: كتابة شرطية
const st = kvStore(kv);
await st.set("t.json", "{}", { onlyIfNew: true });
chk((await st.set("t.json", "{}", { onlyIfNew: true })).modified === false, "onlyIfNew يرفض الموجود");
const cur = await st.getWithMetadata("t.json", { type: "json" });
chk((await st.set("t.json", "{}", { onlyIfMatch: "stale" })).modified === false, "onlyIfMatch برقم قديم يُرفض");
chk((await st.set("t.json", "{}", { onlyIfMatch: cur.etag })).modified === true, "onlyIfMatch برقم صحيح يُقبل");
chk((await st.getMetadata("nope")) === null, "getMetadata لمفتاح غائب = null");

// القفل
for (let i = 0; i < LIMITS.attempts; i++) await call("check", { code: "bad-" + i + "-xxxx", ip: "9.9.9.9" });
chk((await call("check", { code: "code-sara-1234", ip: "9.9.9.9" })).status === 429, "القفل بعد محاولات خاطئة");
const att = kv.puts.filter((p) => p.k.startsWith("attempts/"));
chk(att.length > 0 && att.every((p) => p.o.expirationTtl >= 60), "مفاتيح المحاولات تنتهي تلقائياً (≥ 60 ثانية)");

// نقطة الدخول: بلا ربط KV
const ctx = (env, path) => ({ request: new Request("https://site.test/api/" + path), env });
const e1 = await onRequest(ctx({}, "uploads.js"));
chk((await e1.text()).trim() === "window.UPLOADS = [];", "بلا ربط: uploads.js فارغ");
chk((await onRequest(ctx({}, "uploads"))).status === 503, "بلا ربط: بقية المسارات 503");
const e2 = await onRequest(ctx({ LECTURES: kv, UPLOAD_CODES: CODES }, "uploads"));
chk(e2.status === 200, "مع الربط: نقطة الدخول تعمل");

console.log(fails.length ? `kv adapter FAILED: ${fails.length}` : `kv adapter OK: ${passes} checks`);
process.exit(fails.length ? 1 : 0);
