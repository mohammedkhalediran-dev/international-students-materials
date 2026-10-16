// functions/_lib/auth.js — الحسابات ومزامنة بيانات الطالب على Cloudflare D1.
// يحتاج ربط D1 باسم DB. متغيرات اختيارية: REGISTER_CODE (رمز دعوة للتسجيل)، ADMIN_EMAILS (بريد المشرفين مفصولاً بفاصلة)،
// REQUIRE_LOGIN=1 (يقيّد الموقع كله بالدخول؛ يطبّقه functions/_middleware.js).
// المسارات: POST /api/auth/register|login|logout، GET /api/auth/me، GET|PUT /api/sync،
//           GET /api/auth/users وPOST /api/auth/user (للمشرف فقط).

export const SYNC_KEYS = ["ms.fav", "ms.read", "ms.last", "ms.exam", "ms.review", "ms.study"];
const ITER = 100000; // أقصى ما تسمح به Cloudflare Workers لـ PBKDF2
const SESSION_MS = 30 * 24 * 3600 * 1000;
const MAX_VALUE = 200 * 1024;
const LOCK = { attempts: 8, ms: 15 * 60 * 1000 };
const COOKIE = "ms_session";

const enc = new TextEncoder();
const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (s) => Uint8Array.from(s.match(/../g) || [], (h) => parseInt(h, 16));
async function sha(s) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))); }
async function pbkdf2(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unhex(saltHex), iterations: ITER }, key, 256);
  return hex(new Uint8Array(bits));
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const rand = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}
const fail = (error, status) => json({ ok: false, error }, status);

function cookieHeader(token, req, maxAge) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
export function readCookie(req) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|; )" + COOKIE + "=([0-9a-f]{64})"));
  return m ? m[1] : null;
}

/* المستخدم الحالي من الجلسة، أو null */
export async function currentUser(req, env, now = Date.now()) {
  const token = readCookie(req);
  if (!token || !env.DB) return null;
  const row = await env.DB.prepare(
    "SELECT u.id, u.email, u.name, u.role, u.active FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(await sha(token), now).first();
  return row && row.active ? row : null;
}

async function startSession(env, userId, req, now) {
  const token = rand(32);
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha(token), userId, now + SESSION_MS).run();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now).run();
  return cookieHeader(token, req, SESSION_MS / 1000);
}

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role });
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const adminList = (env) => String(env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);

async function readJson(req) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return null;
  try { return await req.json(); } catch { return null; }
}

/* حماية CSRF: الطلبات المغيّرة يجب أن تأتي من نفس الموقع */
function sameOrigin(req) {
  const o = req.headers.get("origin");
  return !o || o === new URL(req.url).origin;
}

async function lockState(env, key, now) {
  const rec = await env.DB.prepare("SELECT n, first FROM attempts WHERE k = ?").bind(key).first();
  return rec && now - rec.first < LOCK.ms ? rec : null;
}
async function bumpAttempt(env, key, now) {
  const rec = await lockState(env, key, now);
  if (rec) await env.DB.prepare("UPDATE attempts SET n = n + 1 WHERE k = ?").bind(key).run();
  else await env.DB.prepare("INSERT OR REPLACE INTO attempts (k, n, first) VALUES (?, 1, ?)").bind(key, now).run();
}

async function register(req, env, now) {
  const b = await readJson(req);
  if (!b) return fail("bad_request", 400);
  const email = String(b.email || "").trim().toLowerCase();
  const name = String(b.name || "").trim().slice(0, 60);
  const password = String(b.password || "");
  if (!EMAIL_RE.test(email)) return fail("bad_email", 400);
  if (!name) return fail("bad_name", 400);
  if (password.length < 8 || password.length > 200) return fail("weak_password", 400);
  if (env.REGISTER_CODE) {
    const a = await sha(String(b.code || "")), c = await sha(String(env.REGISTER_CODE));
    if (!safeEqual(a, c)) return fail("bad_code", 403);
  }
  const salt = rand(16);
  const hash = await pbkdf2(password, salt);
  const role = adminList(env).includes(email) ? "admin" : "student";
  try {
    const r = await env.DB.prepare("INSERT INTO users (email, name, salt, hash, role, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)")
      .bind(email, name, salt, hash, role, now).run();
    const id = r.meta && r.meta.last_row_id;
    const cookie = await startSession(env, id, req, now);
    return json({ ok: true, user: { id, email, name, role } }, 200, { "set-cookie": cookie });
  } catch (e) {
    if (/UNIQUE/i.test(String(e && e.message))) return fail("email_taken", 409);
    throw e;
  }
}

async function login(req, env, ip, now) {
  const b = await readJson(req);
  if (!b) return fail("bad_request", 400);
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  const key = "login/" + (await sha(email + "|" + ip)).slice(0, 32);
  const rec = await lockState(env, key, now);
  if (rec && rec.n >= LOCK.attempts) return fail("locked", 429);

  const u = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  // نحسب التجزئة دائماً حتى لا يُعرف من الزمن هل البريد مسجّل
  const given = await pbkdf2(password, u ? u.salt : "00".repeat(16));
  if (!u || !u.active || !safeEqual(given, u.hash)) {
    await bumpAttempt(env, key, now);
    return fail("bad_credentials", 401);
  }
  await env.DB.prepare("DELETE FROM attempts WHERE k = ?").bind(key).run();
  if (adminList(env).includes(email) && u.role !== "admin") {
    await env.DB.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(u.id).run();
    u.role = "admin";
  }
  const cookie = await startSession(env, u.id, req, now);
  return json({ ok: true, user: publicUser(u) }, 200, { "set-cookie": cookie });
}

async function logout(req, env) {
  const token = readCookie(req);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha(token)).run();
  return json({ ok: true }, 200, { "set-cookie": cookieHeader("", req, 0) });
}

async function syncGet(user, env) {
  const rows = await env.DB.prepare("SELECT k, v, t FROM user_data WHERE user_id = ?").bind(user.id).all();
  const data = {};
  for (const r of rows.results || []) {
    try { data[r.k] = { v: JSON.parse(r.v), t: r.t }; } catch { /* قيمة تالفة تُهمل */ }
  }
  return json({ ok: true, data });
}

async function syncPut(req, user, env) {
  const b = await readJson(req);
  if (!b || typeof b.items !== "object" || !b.items) return fail("bad_request", 400);
  const stmts = [];
  for (const k of Object.keys(b.items)) {
    if (!SYNC_KEYS.includes(k)) continue;
    const it = b.items[k];
    if (!it || typeof it.t !== "number") continue;
    const v = JSON.stringify(it.v === undefined ? null : it.v);
    if (v.length > MAX_VALUE) return fail("too_large", 413);
    // الأحدث يفوز: لا نكتب فوق قيمة أحدث منها
    stmts.push(env.DB.prepare(
      "INSERT INTO user_data (user_id, k, v, t) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, k) DO UPDATE SET v = excluded.v, t = excluded.t WHERE excluded.t > user_data.t"
    ).bind(user.id, k, v, Math.floor(it.t)));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return syncGet(user, env);
}

async function adminUsers(env) {
  const rows = await env.DB.prepare("SELECT id, email, name, role, active, created_at FROM users ORDER BY id").all();
  return json({ ok: true, users: rows.results || [] });
}

async function adminUpdate(req, env) {
  const b = await readJson(req);
  if (!b || !Number.isInteger(b.id)) return fail("bad_request", 400);
  if (typeof b.active === "boolean") {
    await env.DB.prepare("UPDATE users SET active = ? WHERE id = ?").bind(b.active ? 1 : 0, b.id).run();
    if (!b.active) await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(b.id).run();
  }
  if (typeof b.password === "string") {
    if (b.password.length < 8 || b.password.length > 200) return fail("weak_password", 400);
    const salt = rand(16);
    await env.DB.prepare("UPDATE users SET salt = ?, hash = ? WHERE id = ?").bind(salt, await pbkdf2(b.password, salt), b.id).run();
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(b.id).run();
  }
  return json({ ok: true });
}

/* نقطة الدخول: يعيد null إن لم يكن المسار من اختصاصه */
export async function handleAuth(req, env, opts = {}) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, "");
  if (!p.startsWith("/api/auth/") && p !== "/api/sync") return null;
  const now = (opts.now || Date.now)();
  const ip = opts.ip || "";
  if (!env.DB) return fail("not_configured", 503);

  if (req.method !== "GET" && !sameOrigin(req)) return fail("forbidden", 403);

  if (p === "/api/auth/register" && req.method === "POST") return register(req, env, now);
  if (p === "/api/auth/login" && req.method === "POST") return login(req, env, ip, now);
  if (p === "/api/auth/logout" && req.method === "POST") return logout(req, env);

  const user = await currentUser(req, env, now);
  if (p === "/api/auth/me" && req.method === "GET") return user ? json({ ok: true, user: publicUser(user) }) : fail("unauthorized", 401);
  if (!user) return fail("unauthorized", 401);

  if (p === "/api/sync" && req.method === "GET") return syncGet(user, env);
  if (p === "/api/sync" && req.method === "PUT") return syncPut(req, user, env);

  if (user.role !== "admin") return fail("forbidden", 403);
  if (p === "/api/auth/users" && req.method === "GET") return adminUsers(env);
  if (p === "/api/auth/user" && req.method === "POST") return adminUpdate(req, env);
  return fail("not_found", 404);
}
