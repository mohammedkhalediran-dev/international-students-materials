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

/* إرسال لكل المشتركين (semester = null) أو لطلاب كورس واحد. يحذف الاشتراكات المنتهية (404/410). */
export async function notify(env, { semester = null, title, body, url, tag }, fetchImpl = fetch) {
  if (!env.DB || !vapidReady(env)) return { sent: 0, failed: 0, removed: 0, skipped: true };
  const rows = (semester ? await env.DB.prepare("SELECT endpoint, p256dh, auth FROM push_subs WHERE semester = ?").bind(semester).all()
                         : await env.DB.prepare("SELECT endpoint, p256dh, auth FROM push_subs").all()).results || [];
  const message = { title: String(title).slice(0, 120), body: String(body || "").slice(0, 240), url: url || "index.html", tag: tag || "medixa" };
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

/* إشعار محاضرة جديدة (بعد رفع ناجح في core.mjs): لطلاب كورس المادة فقط، وليس للمرفوعات القديمة المخفية من «أحدث المحاضرات» */
export function lectureMessage(entry) {
  if (!entry || entry.type !== "lecture" || entry.showInLatest === false) return null;
  const c = COURSE_SEMESTERS[entry.courseId];
  if (!c) return null;
  return {
    semester: c.semester,
    title: "محاضرة جديدة: " + c.name,
    body: (entry.number ? "المحاضرة " + entry.number + (entry.title ? " — " + entry.title : "") : entry.label || ""),
    url: "course.html?id=" + encodeURIComponent(entry.courseId) + (entry.number ? "#lec-" + entry.number : ""),
    tag: "lecture-" + entry.courseId + "-" + entry.number
  };
}
export function announcementMessage(a) {
  return { semester: null, title: "تبليغ: " + a.title, body: a.body || "", url: "index.html#announcements", tag: "announcement-" + a.id };
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
    return json({ ok: true, semester: s.semester });
  }
  if (p === "/api/push/unsubscribe") {
    if (!b || typeof b.endpoint !== "string") return fail("bad_request", 400);
    await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(b.endpoint).run();
    return json({ ok: true });
  }
  return fail("not_found", 404);
}
