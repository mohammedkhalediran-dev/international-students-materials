// lib/upload-core.mjs — منطق الرفع كاملاً.
// لا يعتمد على منصة بعينها: يستقبل المخزن والبيئة في deps، فيمكن اختباره محلياً (tests/upload_api_check.mjs).
// المخزن (store) يوفّر: get(key,{type}) وset(key,value,{metadata,ttl}) وdelete(key) وlist(prefix) → [{key,metadata}].
//
// المسارات (كلها تحت /api/):
//   GET  uploads.js     يعرّف window.UPLOADS؛ تحمّله الصفحات قبل رسم المواد
//   GET  uploads        قائمة المرفوعات JSON (وتعيد بناء الفهرس من المفاتيح)
//   GET|HEAD file/<id>  يعرض ملف PDF مرفوعاً
//   POST check          يتحقق من الرمز
//   POST chunk          يستقبل قطعة من الملف (?id=&index=)
//   POST finish         يُنهي الرفع ويضيف المحاضرة إلى القائمة
//   POST abort          يحذف قطع رفع لم يكتمل
//   POST delete         يحذف ملفاً مرفوعاً
// الرمز يُرسَل في الترويسة x-upload-code، ورموز المساعدين في متغير البيئة UPLOAD_CODES بصيغة: اسم:رمز,اسم:رمز
//
// المفاتيح: entry/<id> (قيمة وبيانات وصفية = الإدخال)، index (كل الإدخالات)، chunks/<id>/<NNN>، attempts/<hash>.
// كل إدخال في مفتاحه الخاص فلا يضيع إدخال إن رفع مساعدان معاً؛ والفهرس يُعاد بناؤه من المفاتيح.

export const LIMITS = {
  chunk: 3 * 1024 * 1024,   // أكبر قطعة تقبلها الدالة (المتصفح يرسل 2 ميغا)
  file: 20 * 1024 * 1024,   // أكبر ملف
  maxChunks: 16,
  attempts: 8,              // محاولات رمز خاطئة قبل القفل
  lockMs: 15 * 60 * 1000,
  minCode: 8,
  metaBytes: 1000           // حد البيانات الوصفية في KV هو 1024 بايت
};

const INDEX = "index";
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const COURSE_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

const enc = new TextEncoder();
async function sha(s) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(String(s))));
}
const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
function sameBytes(a, b) {
  let d = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ (b[i] || 0);
  return d === 0;
}
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

export async function parseCodes(raw) {
  const out = [];
  for (const part of String(raw || "").split(/[\n,]+/)) {
    const s = part.trim();
    const i = s.indexOf(":");
    if (i < 1) continue;
    const name = s.slice(0, i).trim();
    const code = s.slice(i + 1).trim();
    if (!name || code.length < LIMITS.minCode) continue; // الرموز القصيرة تُهمل
    out.push({ name, digest: await sha(code) });
  }
  return out;
}

/* التحقق من الرمز مع قفل مؤقت بعد محاولات خاطئة كثيرة (حسب عنوان الجهاز) */
async function authenticate(req, deps) {
  const users = await parseCodes(deps.env("UPLOAD_CODES"));
  if (!users.length) return { res: fail("not_configured", 503) };

  const now = deps.now();
  const key = "attempts/" + hex(await sha(deps.ip || "unknown")).slice(0, 32);
  const rec = await deps.store.get(key, { type: "json" });
  const active = rec && now - rec.first < LIMITS.lockMs ? rec : null;
  if (active && active.count >= LIMITS.attempts) return { res: fail("locked", 429) };

  const given = await sha(req.headers.get("x-upload-code") || "");
  let found = null;
  for (const u of users) if (sameBytes(u.digest, given)) found = u; // بلا خروج مبكر

  if (!found) {
    await deps.store.set(key, JSON.stringify({ count: (active ? active.count : 0) + 1, first: active ? active.first : now }), { ttl: Math.ceil(LIMITS.lockMs / 1000) });
    return { res: fail("bad_code", 401) };
  }
  if (rec) await deps.store.delete(key);
  return { name: found.name };
}

/* الفهرس: مفتاح واحد يقرؤه كل زائر. يُعاد بناؤه من مفاتيح entry/ عند الرفع والحذف وطلب القائمة. */
async function rebuildIndex(deps, { add, removeId } = {}) {
  const keys = await deps.store.list("entry/");
  const map = new Map();
  for (const k of keys) if (k.metadata && k.metadata.id) map.set(k.metadata.id, k.metadata);
  if (add) map.set(add.id, add);
  if (removeId) map.delete(removeId);
  const list = [...map.values()].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  await deps.store.set(INDEX, JSON.stringify(list));
  return list;
}
async function readIndex(deps) {
  const m = await deps.store.get(INDEX, { type: "json" });
  return Array.isArray(m) ? m : rebuildIndex(deps);
}

const publicEntry = (e) => ({ id: e.id, courseId: e.courseId, number: e.number, title: e.title, label: e.label, size: e.size, added: e.added });

function cleanText(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function cleanFilename(v) {
  let n = cleanText(v, 80).replace(/[\\/:*?"<>|]/g, "_");
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
    const list = (await readIndex(deps)).map(publicEntry);
    return new Response("window.UPLOADS = " + JSON.stringify(list) + ";\n", {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-cache"
      }
    });
  } catch (e) {
    // أي عطل: قائمة فارغة حتى لا تتعطل صفحات الموقع
    return new Response("window.UPLOADS = [];\n", {
      headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" }
    });
  }
}

async function findEntry(deps, id) {
  const e = (await readIndex(deps)).find((x) => x.id === id);
  return e || (await deps.store.get("entry/" + id, { type: "json" })); // قد لا يكون الفهرس قد لحق بعد
}

async function serveFile(id, method, deps) {
  const entry = await findEntry(deps, id);
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

/* أحجام القطع من البيانات الوصفية؛ يعيد المحاولة لأن KV قد يتأخر قليلاً في إظهار الكتابة */
async function chunkSizes(deps, id, n) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const found = new Map();
    for (const k of await deps.store.list(`chunks/${id}/`)) found.set(k.key, Number(k.metadata && k.metadata.size) || 0);
    let size = 0, ok = true;
    for (let i = 0; i < n; i++) {
      if (!found.has(chunkKey(id, i))) { ok = false; break; }
      size += found.get(chunkKey(id, i));
    }
    if (ok) return size;
    if (attempt < 3) await sleep(400);
  }
  return null;
}

async function finish(req, deps, who) {
  const b = await readJson(req);
  if (!b) return fail("bad_request", 400);
  const id = String(b.id || "");
  const n = Number(b.chunks);
  const courseId = String(b.courseId || "");
  const number = Number(b.number);
  const title = cleanText(b.title, 120);
  const filename = cleanFilename(b.filename);
  const label = cleanText(b.label, 60) || filename.replace(/\.pdf$/i, "");
  if (!ID_RE.test(id) || !Number.isInteger(n) || n < 1 || n > LIMITS.maxChunks ||
      !COURSE_RE.test(courseId) || !Number.isInteger(number) || number < 1 || number > 999 || !title) {
    return fail("bad_request", 400);
  }

  const already = await deps.store.get("entry/" + id, { type: "json" });
  if (already) return json({ ok: true, entry: publicEntry(already) }); // إعادة الطلب بعد انقطاع

  const size = await chunkSizes(deps, id, n);
  if (size === null) return fail("missing_chunk", 400);
  if (size > LIMITS.file) { await dropChunks(deps, id, n); return fail("too_big", 413); }
  if (size < 1) return fail("bad_request", 400);

  const now = deps.now();
  const entry = { id, courseId, number, title, label, filename, size, chunks: n, added: today(now), ts: now, by: cleanText(who, 40) };
  if (enc.encode(JSON.stringify(entry)).length > LIMITS.metaBytes) return fail("bad_request", 400);

  await deps.store.set("entry/" + id, JSON.stringify(entry), { metadata: entry });
  await rebuildIndex(deps, { add: entry });
  return json({ ok: true, entry: publicEntry(entry) });
}

async function remove(req, deps) {
  const b = await readJson(req);
  const id = b && String(b.id || "");
  if (!id || !ID_RE.test(id)) return fail("bad_request", 400);
  const entry = await deps.store.get("entry/" + id, { type: "json" });
  if (!entry) return fail("not_found", 404);
  await deps.store.delete("entry/" + id);
  await rebuildIndex(deps, { removeId: id });
  await dropChunks(deps, id, entry.chunks);
  return json({ ok: true });
}

async function abort(req, deps) {
  const b = await readJson(req);
  const id = b && String(b.id || "");
  if (!id || !ID_RE.test(id)) return fail("bad_request", 400);
  const done = await deps.store.get("entry/" + id, { type: "json" });
  if (!done) await dropChunks(deps, id, LIMITS.maxChunks); // لا نمس ملفاً أُنجز رفعه
  return json({ ok: true });
}

export async function handle(req, deps) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "");
    const method = req.method;

    if (method === "GET" && path === "uploads.js") return await uploadsJs(deps);
    if (method === "GET" && path === "uploads") {
      const auth = await authenticate(req, deps);
      if (auth.res) return auth.res;
      return json({ ok: true, items: (await rebuildIndex(deps)).map(publicEntry) });
    }
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
    console.error("upload api error", e);
    return fail("server", 500);
  }
}
