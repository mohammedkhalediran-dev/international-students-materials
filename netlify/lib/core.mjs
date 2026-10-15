// netlify/lib/core.mjs — منطق الرفع كاملاً.
// لا يستورد Netlify مباشرة: يستقبل المخزن والبيئة في deps، فيمكن اختباره محلياً (tests/upload_api_check.mjs).
//
// المسارات (كلها تحت /api/):
//   GET  uploads.js     يعرّف window.UPLOADS؛ تحمّله الصفحات قبل رسم المواد
//   GET  uploads        قائمة المرفوعات JSON
//   GET|HEAD file/<id>  يعرض ملف PDF مرفوعاً
//   POST check          يتحقق من الرمز
//   POST chunk          يستقبل قطعة من الملف (?id=&index=)
//   POST finish         يُنهي الرفع ويضيف المحاضرة إلى القائمة
//   POST abort          يحذف قطع رفع لم يكتمل
//   POST delete         يحذف ملفاً مرفوعاً
// الرمز يُرسَل في الترويسة x-upload-code، ورموز المساعدين في متغير البيئة UPLOAD_CODES بصيغة: اسم:رمز,اسم:رمز

import { createHash, timingSafeEqual } from "node:crypto";

export const LIMITS = {
  chunk: 3 * 1024 * 1024,   // أكبر قطعة تقبلها الدالة (المتصفح يرسل 2 ميغا)
  file: 20 * 1024 * 1024,   // أكبر ملف: حد بث الاستجابة في Netlify هو 20 ميغا
  maxChunks: 16,
  attempts: 8,              // محاولات رمز خاطئة قبل القفل
  lockMs: 15 * 60 * 1000,
  minCode: 8
};

const MANIFEST = "manifest.json";
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const COURSE_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

const sha = (s) => createHash("sha256").update(String(s)).digest();
const pad = (i) => String(i).padStart(3, "0");
const chunkKey = (id, i) => `chunks/${id}/${pad(i)}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra }
  });
}
const fail = (error, status) => json({ ok: false, error }, status);

export function parseCodes(raw) {
  return String(raw || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf(":");
      if (i < 1) return null;
      const name = s.slice(0, i).trim();
      const code = s.slice(i + 1).trim();
      if (!name || code.length < LIMITS.minCode) return null; // الرموز القصيرة تُهمل
      return { name, digest: sha(code) };
    })
    .filter(Boolean);
}

/* التحقق من الرمز مع قفل مؤقت بعد محاولات خاطئة كثيرة (حسب عنوان الجهاز) */
async function authenticate(req, deps) {
  const users = parseCodes(deps.env("UPLOAD_CODES"));
  if (!users.length) return { res: fail("not_configured", 503) };

  const now = deps.now();
  const key = "attempts/" + sha(deps.ip || "unknown").toString("hex").slice(0, 32);
  const rec = await deps.store.get(key, { type: "json" });
  const active = rec && now - rec.first < LIMITS.lockMs ? rec : null;
  if (active && active.count >= LIMITS.attempts) return { res: fail("locked", 429) };

  const given = sha(req.headers.get("x-upload-code") || "");
  let found = null;
  for (const u of users) if (timingSafeEqual(u.digest, given)) found = u; // بلا خروج مبكر

  if (!found) {
    await deps.store.set(key, JSON.stringify({ count: (active ? active.count : 0) + 1, first: active ? active.first : now }));
    return { res: fail("bad_code", 401) };
  }
  if (rec) await deps.store.delete(key);
  return { name: found.name };
}

async function readManifest(deps) {
  const m = await deps.store.get(MANIFEST, { type: "json" });
  return Array.isArray(m) ? m : [];
}

/* تعديل القائمة بكتابة مشروطة؛ إن كتب مساعدان معاً يعيد الثاني المحاولة بدل أن يضيع ملف */
async function updateManifest(deps, mutate) {
  for (let i = 0; i < 6; i++) {
    const cur = await deps.store.getWithMetadata(MANIFEST, { type: "json" });
    const list = cur && Array.isArray(cur.data) ? cur.data : [];
    const next = mutate(list);
    const opts = cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true };
    const r = await deps.store.set(MANIFEST, JSON.stringify(next), opts);
    if (r && r.modified === false) { await sleep(60 * (i + 1)); continue; }
    return next;
  }
  throw new Error("manifest_busy");
}

const publicEntry = (e) => ({ id: e.id, courseId: e.courseId, number: e.number, title: e.title, label: e.label, size: e.size, added: e.added });

function cleanText(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function cleanFilename(v) {
  let n = cleanText(v, 120).replace(/[\\/:*?"<>|]/g, "_");
  if (!/\.pdf$/i.test(n)) n = (n || "lecture") + ".pdf";
  return n;
}
const today = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });

async function readJson(req) {
  try {
    const text = await req.text();
    if (text.length > 10000) return null;
    const v = JSON.parse(text);
    return v && typeof v === "object" ? v : null;
  } catch (e) { return null; }
}

async function dropChunks(deps, id, n) {
  for (let i = 0; i < n; i++) await deps.store.delete(chunkKey(id, i));
}

/* ---------- المسارات العامة ---------- */
async function uploadsJs(deps) {
  try {
    const list = (await readManifest(deps)).map(publicEntry);
    return new Response("window.UPLOADS = " + JSON.stringify(list) + ";\n", {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "public, max-age=0, must-revalidate",
        "netlify-cdn-cache-control": "public, s-maxage=30, stale-while-revalidate=300"
      }
    });
  } catch (e) {
    // أي عطل: قائمة فارغة حتى لا تتعطل صفحات الموقع
    return new Response("window.UPLOADS = [];\n", {
      headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" }
    });
  }
}

async function serveFile(id, method, deps) {
  const entry = (await readManifest(deps)).find((e) => e.id === id);
  if (!entry) return fail("not_found", 404);
  const headers = {
    "content-type": "application/pdf",
    "content-disposition": `inline; filename="lecture.pdf"; filename*=UTF-8''${encodeURIComponent(entry.filename || "lecture.pdf")}`,
    "content-length": String(entry.size),
    "cache-control": "public, max-age=86400",
    "x-content-type-options": "nosniff"
  };
  if (method === "HEAD") return new Response(null, { status: 200, headers });

  let i = 0;
  const stream = new ReadableStream({
    async pull(controller) {
      if (i >= entry.chunks) { controller.close(); return; }
      const buf = await deps.store.get(chunkKey(id, i++), { type: "arrayBuffer" });
      if (!buf) { controller.error(new Error("missing_chunk")); return; }
      controller.enqueue(new Uint8Array(buf));
    }
  });
  return new Response(stream, { status: 200, headers });
}

/* ---------- المسارات التي تحتاج رمزاً ---------- */
async function receiveChunk(req, url, deps) {
  const id = url.searchParams.get("id") || "";
  const idx = Number(url.searchParams.get("index"));
  if (!ID_RE.test(id) || !Number.isInteger(idx) || idx < 0 || idx >= LIMITS.maxChunks) return fail("bad_request", 400);
  const buf = await req.arrayBuffer();
  if (buf.byteLength === 0) return fail("bad_request", 400);
  if (buf.byteLength > LIMITS.chunk) return fail("too_big", 413);
  if (idx === 0 && new TextDecoder("latin1").decode(new Uint8Array(buf, 0, Math.min(5, buf.byteLength))) !== "%PDF-") return fail("not_pdf", 400);
  await deps.store.set(chunkKey(id, idx), buf, { metadata: { size: buf.byteLength } });
  return json({ ok: true });
}

async function finish(req, deps, who) {
  const b = await readJson(req);
  if (!b) return fail("bad_request", 400);
  const id = String(b.id || "");
  const n = Number(b.chunks);
  const courseId = String(b.courseId || "");
  const number = Number(b.number);
  const title = cleanText(b.title, 200);
  const filename = cleanFilename(b.filename);
  const label = cleanText(b.label, 120) || filename.replace(/\.pdf$/i, "");
  if (!ID_RE.test(id) || !Number.isInteger(n) || n < 1 || n > LIMITS.maxChunks ||
      !COURSE_RE.test(courseId) || !Number.isInteger(number) || number < 1 || number > 999 || !title) {
    return fail("bad_request", 400);
  }

  const already = (await readManifest(deps)).find((e) => e.id === id);
  if (already) return json({ ok: true, entry: publicEntry(already) }); // إعادة الطلب بعد انقطاع

  let size = 0;
  for (let i = 0; i < n; i++) {
    const m = await deps.store.getMetadata(chunkKey(id, i));
    if (!m) return fail("missing_chunk", 400);
    size += Number(m.metadata && m.metadata.size) || 0;
  }
  if (size > LIMITS.file) { await dropChunks(deps, id, n); return fail("too_big", 413); }
  if (size < 1) return fail("bad_request", 400);

  const entry = { id, courseId, number, title, label, filename, size, chunks: n, added: today(deps.now()), by: who };
  await updateManifest(deps, (list) => list.concat([entry]));
  return json({ ok: true, entry: publicEntry(entry) });
}

async function remove(req, deps) {
  const b = await readJson(req);
  const id = b && String(b.id || "");
  if (!id || !ID_RE.test(id)) return fail("bad_request", 400);
  const entry = (await readManifest(deps)).find((e) => e.id === id);
  if (!entry) return fail("not_found", 404);
  await updateManifest(deps, (list) => list.filter((e) => e.id !== id));
  await dropChunks(deps, id, entry.chunks);
  return json({ ok: true });
}

async function abort(req, deps) {
  const b = await readJson(req);
  const id = b && String(b.id || "");
  if (!id || !ID_RE.test(id)) return fail("bad_request", 400);
  const inList = (await readManifest(deps)).some((e) => e.id === id);
  if (!inList) await dropChunks(deps, id, LIMITS.maxChunks); // لا نمس ملفاً أُنجز رفعه
  return json({ ok: true });
}

export async function handle(req, deps) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "");
    const method = req.method;

    if (method === "GET" && path === "uploads.js") return await uploadsJs(deps);
    if (method === "GET" && path === "uploads") return json({ ok: true, items: (await readManifest(deps)).map(publicEntry) });
    const fm = path.match(/^file\/([0-9a-f-]{36})$/);
    if (fm && (method === "GET" || method === "HEAD")) return await serveFile(fm[1], method, deps);

    if (method === "POST" && ["check", "chunk", "finish", "abort", "delete"].includes(path)) {
      const auth = await authenticate(req, deps);
      if (auth.res) return auth.res;
      if (path === "check") return json({ ok: true, name: auth.name });
      if (path === "chunk") return await receiveChunk(req, url, deps);
      if (path === "finish") return await finish(req, deps, auth.name);
      if (path === "abort") return await abort(req, deps);
      return await remove(req, deps);
    }
    return fail("not_found", 404);
  } catch (e) {
    if (e && e.message === "manifest_busy") return fail("busy", 503);
    console.error("upload api error", e);
    return fail("server", 500);
  }
}
