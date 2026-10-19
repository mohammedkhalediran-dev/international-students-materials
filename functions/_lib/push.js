// functions/_lib/push.js — إشعارات الموقع (Web Push) بلا مكتبات: Web Crypto فقط (يعمل على Cloudflare وNode).
// RFC 8291 (تشفير aes128gcm) وRFC 8292 (VAPID). القرار (محمد 2026-10-19): الزائر يستطيع الاشتراك،
// إشعار المحاضرة لطلاب الكورس نفسه فقط، والتبليغ للجميع.
// متغيرات Cloudflare: VAPID_PUBLIC_KEY (عام، 65 بايت base64url) وVAPID_PRIVATE_KEY (سرّي، 32 بايت base64url)
// يولّدهما المشرف من admin.html على جهازه ويضعهما بنفسه. بدونهما: الاشتراك والإرسال معطّلان بلا أخطاء.
// المسارات: GET /api/push/key ، POST /api/push/subscribe {endpoint, keys:{p256dh,auth}, semester} ، POST /api/push/unsubscribe {endpoint}
import { COURSE_SEMESTERS } from "./course-semesters.js";

const enc = new TextEncoder();
const SEMESTERS = [1, 2, 3];
const MAX_ENDPOINT = 1000;
const CONCURRENCY = 20;

export function b64u(bytes) {
  let s = ""; const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(str) {
  const s = String(str).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parts) {
  const len = parts.reduce((n, p) => n + p.length, 0), out = new Uint8Array(len);
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/* ---------- VAPID (RFC 8292) ---------- */
export function vapidReady(env) {
  try { return unb64u(env.VAPID_PUBLIC_KEY || "").length === 65 && unb64u(env.VAPID_PRIVATE_KEY || "").length === 32; } catch { return false; }
}
async function vapidKey(env) {
  const pub = unb64u(env.VAPID_PUBLIC_KEY);
  const jwk = { kty: "EC", crv: "P-256", x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: env.VAPID_PRIVATE_KEY, ext: true };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}
export async function vapidHeader(env, endpoint, now = Date.now()) {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || "mailto:admin@medixa.pages.dev" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, await vapidKey(env), enc.encode(head + "." + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}

/* ---------- تشفير الرسالة (RFC 8291, aes128gcm) ---------- */
export async function encryptPayload(p256dh, authSecret, plaintext, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const uaPublic = unb64u(p256dh), auth = unb64u(authSecret);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const prkKey = await hmac(auth, shared);
  const ikm = await hmac(prkKey, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const data = concat(typeof plaintext === "string" ? enc.encode(plaintext) : plaintext, new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, data));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

/* إرسال لاشتراك واحد. يعيد رمز الحالة (0 = خطأ شبكة) */
export async function sendOne(env, sub, message, fetchImpl = fetch) {
  const body = await encryptPayload(sub.p256dh, sub.auth, JSON.stringify(message));
  try {
    const r = await fetchImpl(sub.endpoint, {
      method: "POST",
      headers: { "content-encoding": "aes128gcm", "content-type": "application/octet-stream", ttl: "86400", urgency: "normal", authorization: await vapidHeader(env, sub.endpoint) },
      body
    });
    return r.status;
  } catch { return 0; }
}

/* ---------- تفضيلات الطالب (Step 52) ----------
   prefs (JSON في push_subs.prefs، عمود أضافته migrations/0004_push_prefs.sql):
   { lecture: bool, resource: bool, announcement: bool, courses: null | [courseId...] }
   الغائب = مفعّل، وcourses = null تعني كل مواد كورسه. إن لم يُطبَّق 0004 بعد على D1 يعمل كل شيء كما في Step 51 بلا تفضيلات. */
export const CATEGORIES = ["lecture", "resource", "announcement"];
export function cleanPrefs(p) {
  if (!p || typeof p !== "object") return null;
  const out = {};
  for (const k of CATEGORIES) if (p[k] === false) out[k] = false;
  if (Array.isArray(p.courses)) out.courses = p.courses.filter((c) => typeof c === "string" && COURSE_SEMESTERS[c]).slice(0, 60);
  return Object.keys(out).length ? out : null;
}
export function wants(prefsJson, msg) {
  let p = null; try { p = prefsJson ? JSON.parse(prefsJson) : null; } catch { p = null; }
  if (!p) return true;
  if (msg.category && p[msg.category] === false) return false;
  if (msg.course && Array.isArray(p.courses) && !p.courses.includes(msg.course)) return false;
  return true;
}
async function targets(env, semester) {
  const q = (cols) => semester ? env.DB.prepare(`SELECT ${cols} FROM push_subs WHERE semester = ?`).bind(semester).all()
                               : env.DB.prepare(`SELECT ${cols} FROM push_subs`).all();
  try { return (await q("endpoint, p256dh, auth, prefs")).results || []; }
  catch { return (await q("endpoint, p256dh, auth")).results || []; } // قبل تطبيق 0004
}
/* عدد الأجهزة التي سيصلها إشعار (لعرضه لمن ينشر التبليغ، مثل «وصلهم الإشعار») */
export async function audience(env, msg) {
  if (!env.DB || !vapidReady(env)) return 0;
  return (await targets(env, msg.semester || null)).filter((s) => wants(s.prefs, msg)).length;
}

/* إرسال لكل المشتركين (semester = null) أو لطلاب كورس واحد. يحذف الاشتراكات المنتهية (404/410). */
export async function notify(env, msg, fetchImpl = fetch) {
  const { semester = null, title, body, url, tag } = msg;
  if (!env.DB || !vapidReady(env)) return { sent: 0, failed: 0, removed: 0, skipped: true };
  const rows = (await targets(env, semester)).filter((s) => wants(s.prefs, msg));
  // الحقول القديمة (title/body/url/tag) كما هي ليفهمها أي sw.js قديم على الأجهزة؛ والجديدة اختيارية
  const message = { title: String(title).slice(0, 120), body: String(body || "").slice(0, 240), url: url || "index.html", tag: tag || "medixa" };
  if (msg.category) message.category = msg.category;
  if (msg.course) message.course = msg.course;
  if (Array.isArray(msg.actions)) message.actions = msg.actions.slice(0, 2);
  if (msg.grouped) message.count = msg.grouped;
  message.ts = msg.ts || Date.now();
  let sent = 0, failed = 0, removed = 0;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(async (s) => {
      const st = await sendOne(env, s, message, fetchImpl);
      if (st >= 200 && st < 300) { sent++; await env.DB.prepare("UPDATE push_subs SET last_ok = ? WHERE endpoint = ?").bind(Date.now(), s.endpoint).run(); }
      else if (st === 404 || st === 410) { removed++; await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(s.endpoint).run(); }
      else failed++;
    }));
  }
  return { sent, failed, removed, skipped: false };
}

/* ---------- نصوص الإشعارات (Step 52، على نمط «الحدث · التفاصيل») ----------
   محاضرة: لطلاب كورس المادة فقط، وليس للمرفوعات القديمة المخفية من «أحدث المحاضرات».
   اختبار تفاعلي / أسئلة سنوات سابقة (الفئة resource): كذلك لطلاب كورس المادة.
   الوسم (tag) واحد لكل مادة: إشعار جديد للمادة نفسها يحلّ محل السابق على الجهاز بدل أن تتراكم. */
const KIND = {
  lecture: { title: "محاضرة جديدة", category: "lecture" },
  quiz: { title: "اختبار تفاعلي جديد", category: "resource" },
  exam: { title: "أسئلة سنوات سابقة", category: "resource" }
};
const courseUrl = (id, n) => "course.html?id=" + encodeURIComponent(id) + (n ? "#lec-" + n : "");
const fileUrl = (entry) => (entry.kind === "file" && entry.id ? "api/file/" + encodeURIComponent(entry.id) : null);
function joinAr(list) { return list.length < 2 ? String(list[0] || "") : list.slice(0, -1).join("، ") + " و" + list[list.length - 1]; }

export function lectureMessage(entry) {
  if (!entry || !KIND[entry.type] || entry.showInLatest === false) return null;
  const c = COURSE_SEMESTERS[entry.courseId];
  if (!c) return null;
  const k = KIND[entry.type];
  const n = entry.number > 0 ? entry.number : 0;
  const what = entry.type === "lecture"
    ? (n ? "المحاضرة " + n + (entry.title ? ": " + entry.title : "") : entry.label || "")
    : [n ? "المحاضرة " + n : "", entry.label || ""].filter(Boolean).join(" · ");
  const url = courseUrl(entry.courseId, n);
  const file = fileUrl(entry);
  const actions = [{ action: "open", title: entry.type === "lecture" ? "افتح المحاضرة" : "افتحها", url }];
  if (file) actions.push({ action: "file", title: "افتح الملف", url: file });
  return {
    semester: c.semester, category: k.category, course: entry.courseId,
    title: k.title + " · " + c.name,
    body: what,
    url, tag: "course-" + entry.courseId, actions
  };
}
export function announcementMessage(a) {
  return {
    semester: null, category: "announcement",
    title: "تبليغ · " + a.title, body: a.body || "",
    url: "index.html#announcements", tag: "announcement-" + a.id,
    actions: [{ action: "open", title: "اقرأ التبليغ", url: "index.html#announcements" }]
  };
}

/* منع التكرار والتجميع (KV: مفتاح صغير واحد لكل مادة push/recent/<id>، يحذف ما مضى عليه 12 ساعة عند كل كتابة):
   - الملف الثاني لنفس المحاضرة ونفس النوع خلال 12 ساعة (شرائح ثم ملخص، أو إعادة رفع) لا يرسل إشعاراً جديداً.
   - عدة محاضرات لنفس المادة خلال 30 دقيقة تُجمع في إشعار واحد يحلّ محل السابق: «المحاضرات 4، 5 و6».
   KV نهائي الاتساق: رفعتان في اللحظة نفسها قد تُرسلان إشعارين، وهذا مقبول. بدون KV يُرسل كل إشعار كما هو. */
export const GROUP_WINDOW = 30 * 60 * 1000;
export const DEDUPE_WINDOW = 12 * 3600 * 1000;
export async function lectureNotice(store, entry, now = Date.now()) {
  const msg = lectureMessage(entry);
  if (!msg || !store) return msg;
  const key = "push/recent/" + entry.courseId;
  let rec = null; try { rec = await store.get(key, { type: "json" }); } catch { rec = null; }
  const items = (rec && Array.isArray(rec.items) ? rec.items : []).filter((i) => now - i.at < DEDUPE_WINDOW);
  const n = entry.number > 0 ? entry.number : 0;
  const label = n ? "" : String(entry.label || "").slice(0, 80); // للمادة كلها (رقم 0): يميّز اختباراً عن آخر باسمه
  if (items.some((i) => i.n === n && i.type === entry.type && (n > 0 || (i.l || "") === label))) return null; // مكرر
  const recent = items.filter((i) => now - i.at < GROUP_WINDOW && i.type === entry.type && i.n > 0);
  items.push(n ? { n, type: entry.type, at: now } : { n, type: entry.type, l: label, at: now });
  try { await store.set(key, JSON.stringify({ items: items.slice(-30) })); } catch { /* الإرسال أهم من السجل */ }
  if (!recent.length || !n) return msg;
  const nums = [...new Set(recent.map((i) => i.n).concat([n]))].sort((a, b) => a - b);
  const c = COURSE_SEMESTERS[entry.courseId];
  const plural = { lecture: "محاضرات جديدة", quiz: "اختبارات تفاعلية جديدة", exam: "أسئلة سنوات سابقة" }[entry.type];
  return {
    ...msg,
    title: plural + " · " + c.name,
    body: (entry.type === "lecture" ? "المحاضرات " : "للمحاضرات ") + joinAr(nums),
    url: courseUrl(entry.courseId, nums[0]),
    actions: [{ action: "open", title: "افتح المادة", url: courseUrl(entry.courseId, nums[0]) }],
    grouped: nums.length
  };
}

/* ---------- المسارات ---------- */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
const fail = (error, status) => json({ ok: false, error }, status);
async function readJson(req) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return null;
  try { return await req.json(); } catch { return null; }
}
function validSub(b) {
  if (!b || typeof b.endpoint !== "string" || b.endpoint.length > MAX_ENDPOINT || !b.keys) return null;
  let u; try { u = new URL(b.endpoint); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const p256dh = String(b.keys.p256dh || ""), auth = String(b.keys.auth || "");
  try { if (unb64u(p256dh).length !== 65 || unb64u(auth).length !== 16) return null; } catch { return null; }
  const semester = Number(b.semester);
  if (!SEMESTERS.includes(semester)) return null;
  return { endpoint: b.endpoint, p256dh, auth, semester };
}

/* يعيد null إن لم يكن المسار من اختصاصه. currentUser اختياري (لربط الاشتراك بالحساب) */
export async function handlePush(req, env, { now = Date.now, currentUser } = {}) {
  const p = new URL(req.url).pathname.replace(/\/+$/, "");
  if (!p.startsWith("/api/push/")) return null;
  if (p === "/api/push/key" && req.method === "GET") return json({ ok: true, ready: !!env.DB && vapidReady(env), publicKey: vapidReady(env) ? env.VAPID_PUBLIC_KEY : "" });
  if (req.method !== "POST") return fail("not_found", 404);
  const o = req.headers.get("origin");
  if (o && o !== new URL(req.url).origin) return fail("forbidden", 403);
  if (!env.DB || !vapidReady(env)) return fail("not_configured", 503);
  const b = await readJson(req);
  if (p === "/api/push/subscribe") {
    const s = validSub(b);
    if (!s) return fail("bad_request", 400);
    const user = currentUser ? await currentUser(req, env) : null;
    await env.DB.prepare("INSERT INTO push_subs (endpoint, p256dh, auth, semester, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, semester = excluded.semester, user_id = COALESCE(excluded.user_id, push_subs.user_id)")
      .bind(s.endpoint, s.p256dh, s.auth, s.semester, user ? user.id : null, now()).run();
    // التفضيلات (Step 52) في خطوة منفصلة: إن لم يُطبَّق 0004 بعد يبقى الاشتراك محفوظاً ويُبلَّغ العميل
    let prefsSaved = false;
    if (b.prefs !== undefined) {
      const p = cleanPrefs(b.prefs);
      try { await env.DB.prepare("UPDATE push_subs SET prefs = ? WHERE endpoint = ?").bind(p ? JSON.stringify(p) : null, s.endpoint).run(); prefsSaved = true; } catch { prefsSaved = false; }
    }
    return json({ ok: true, semester: s.semester, prefsSaved });
  }
  if (p === "/api/push/unsubscribe") {
    if (!b || typeof b.endpoint !== "string") return fail("bad_request", 400);
    await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(b.endpoint).run();
    return json({ ok: true });
  }
  return fail("not_found", 404);
}
