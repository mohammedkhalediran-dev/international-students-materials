// functions/_lib/admin.js — مركز الإدارة (Step 53). كل المسارات هنا للمشرف فقط: auth.js يتحقق من الجلسة
// ومن أن الدور admin قبل استدعاء handleAdmin، والطلبات المغيِّرة من أصل مختلف مرفوضة هناك أيضاً.
//
// المسارات (تحت /api/auth/admin/):
//   GET  stats                      أرقام الحسابات من قاعدة البيانات
//   GET  users?q&role&status&sem&page&per   بحث وتصفية وتقسيم صفحات
//   GET  user?id=                   تفاصيل حساب
//   GET  export?q&role&status&sem   CSV للنتائج المصفّاة (UTF-8 BOM، حماية من CSV formula injection)
//   GET  audit?page=                سجل التغييرات
//   GET  push                       حالة خدمة الإشعارات الحقيقية (بلا مفاتيح)
//   POST push-test                  إشعار اختبار إلى أجهزة المشرف نفسه فقط
// وPOST /api/auth/user (موجود من قبل) صار هنا: الدور، الإيقاف/التفعيل، كورس الطالب — مع الحمايات والتسجيل.
//
// «نشط» = الحساب مفعّل (active = 1)، وليس متصلاً الآن. «دخل خلال 7 أيام» من آخر تسجيل دخول.
// لا أرقام هوية في Medixa (نخزّن الاسم والبريد فقط بقرار المشروع)؛ الربط الوحيد هو حساب Google (google_sub لا يُعرض).
import { vapidReady, notifyUser } from "./push.js";

export const ROLES_ALL = ["student", "uploader", "rep", "admin"];
export const ASSIGNABLE = ["student", "uploader", "rep"]; // admin من ADMIN_EMAILS فقط
const SESSION_MS = 30 * 24 * 3600 * 1000;
const RECENT_MS = 7 * 24 * 3600 * 1000;
const MAX_PER = 100;
const now0 = () => Date.now();

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}
const fail = (error, status, extra = {}) => json({ ok: false, error, ...extra }, status);
async function readJson(req) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return null;
  try { return await req.json(); } catch { return null; }
}

/* بحث مطبَّع: يتجاهل حالة الأحرف والتشكيل وصور الألف والياء والتاء المربوطة */
export function norm(s) {
  return String(s || "").toLowerCase().normalize("NFKC")
    .replace(/[ً-ٰٟـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
}

/* ---------- قراءة الحسابات (مع بدائل قبل تطبيق migrations/0005) ---------- */
async function allUsers(env) {
  const base = "SELECT u.id, u.email, u.name, u.role, u.active, u.created_at, " +
    "(SELECT MAX(expires_at) FROM sessions s WHERE s.user_id = u.id) AS last_exp, " +
    "(SELECT v FROM user_data d WHERE d.user_id = u.id AND d.k = 'ms.sem') AS sem_v";
  const act = ", (SELECT COALESCE(SUM(site_s), 0) FROM user_activity a WHERE a.user_id = u.id) AS site_s, (SELECT COALESCE(SUM(study_s), 0) FROM user_activity a WHERE a.user_id = u.id) AS study_s, " +
    "(SELECT MAX(last_at) FROM user_activity a WHERE a.user_id = u.id) AS act_at, (SELECT full_name FROM profiles f WHERE f.user_id = u.id) AS full_name, " +
    "(SELECT MAX(t) FROM user_data d2 WHERE d2.user_id = u.id) AS synced_at";
  const tries = [
    base + act + ", u.last_login_at, (SELECT COUNT(*) FROM push_subs p WHERE p.user_id = u.id) AS push FROM users u ORDER BY u.id",
    base + ", u.last_login_at, (SELECT COUNT(*) FROM push_subs p WHERE p.user_id = u.id) AS push FROM users u ORDER BY u.id",
    base + ", NULL AS last_login_at, (SELECT COUNT(*) FROM push_subs p WHERE p.user_id = u.id) AS push FROM users u ORDER BY u.id",
    base + ", NULL AS last_login_at, 0 AS push FROM users u ORDER BY u.id"
  ];
  for (const sql of tries) {
    try { return ((await env.DB.prepare(sql).all()).results || []).map(shape); } catch { /* عمود أو جدول غير موجود بعد */ }
  }
  return [];
}
function shape(r) {
  let sem = null; try { const v = JSON.parse(r.sem_v); if ([1, 2, 3].includes(v)) sem = v; } catch { sem = null; }
  const fromSession = r.last_exp ? r.last_exp - SESSION_MS : null;
  const last = Math.max(r.last_login_at || 0, fromSession || 0) || null;
  const lastActive = Math.max(last || 0, r.act_at || 0, r.synced_at || 0) || null;
  return { id: r.id, name: r.name, email: r.email, role: ROLES_ALL.includes(r.role) ? r.role : "student", active: !!r.active, created: r.created_at, lastLogin: last, semester: sem, devices: Number(r.push) || 0, fullName: r.full_name || null, siteSec: Number(r.site_s) || 0, studySec: Number(r.study_s) || 0, lastActive };
}
export function filterUsers(list, q) {
  const text = norm(q.get("q"));
  const role = q.get("role"), status = q.get("status"), sem = q.get("sem");
  return list.filter((u) =>
    (!text || norm(u.name + " " + u.email).includes(text)) &&
    (!role || u.role === role) &&
    (!status || (status === "active" ? u.active : status === "suspended" ? !u.active : true)) &&
    (!sem || (sem === "none" ? !u.semester : String(u.semester) === sem)));
}
const activeAdmins = (list) => list.filter((u) => u.role === "admin" && u.active).length;

function stats(list, now) {
  const total = list.length, active = list.filter((u) => u.active).length;
  return {
    total, active, suspended: total - active,
    recent: list.filter((u) => u.lastLogin && now - u.lastLogin < RECENT_MS).length,
    activeWeek: list.filter((u) => u.lastActive && now - u.lastActive < RECENT_MS).length,
    away14: list.filter((u) => u.active && (!u.lastActive || now - u.lastActive > 14 * 864e5)).length,
    hours: Math.round(list.reduce((s, u) => s + u.siteSec, 0) / 360) / 10,
    studyHours: Math.round(list.reduce((s, u) => s + u.studySec, 0) / 360) / 10,
    withDevices: list.filter((u) => u.devices > 0).length,
    byRole: Object.fromEntries(ROLES_ALL.map((r) => [r, list.filter((u) => u.role === r).length])),
    bySemester: { 1: 0, 2: 0, 3: 0, ...Object.fromEntries([1, 2, 3].map((s) => [s, list.filter((u) => u.semester === s).length])), none: list.filter((u) => !u.semester).length }
  };
}

/* ---------- سجل التغييرات ---------- */
export async function audit(env, actor, target, action, detail, result, now = Date.now()) {
  try {
    await env.DB.prepare("INSERT INTO audit_log (at, actor_id, actor_name, target_id, target_name, action, detail, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(now, actor.id, String(actor.name || actor.email || "").slice(0, 80), target ? target.id : null, target ? String(target.name || "").slice(0, 80) : null,
        action, detail ? JSON.stringify(detail).slice(0, 500) : null, result).run();
    return true;
  } catch { return false; } // قبل تطبيق 0005: العملية تتم، والسجل غير متاح (الواجهة توضّح ذلك)
}
async function auditList(env, q) {
  const page = Math.max(1, parseInt(q.get("page"), 10) || 1), per = 30;
  try {
    const total = (await env.DB.prepare("SELECT COUNT(*) AS c FROM audit_log WHERE action NOT IN ('user_login', 'user_logout')").first()).c;
    const rows = (await env.DB.prepare("SELECT id, at, actor_id, actor_name, target_id, target_name, action, detail, result FROM audit_log WHERE action NOT IN ('user_login', 'user_logout') ORDER BY at DESC, id DESC LIMIT ? OFFSET ?").bind(per, (page - 1) * per).all()).results || [];
    return json({ ok: true, available: true, total, page, per, items: rows.map((r) => ({ ...r, detail: safeParse(r.detail) })) });
  } catch { return json({ ok: true, available: false, total: 0, page: 1, per, items: [] }); }
}
const safeParse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

/* ---------- تعديل حساب: الدور، الحالة، الكورس ---------- */
async function update(req, env, me, now) {
  const b = await readJson(req);
  if (!b || !Number.isInteger(b.id)) return fail("bad_request", 400);
  const list = await allUsers(env);
  const t = list.find((u) => u.id === b.id);
  if (b.role !== undefined && !ASSIGNABLE.includes(b.role)) { await audit(env, me, t, "role", { to: b.role }, "refused", now); return fail("bad_role", 400); }
  if (b.semester !== undefined && ![1, 2, 3].includes(b.semester)) return fail("bad_semester", 400);
  if (!t) return fail("not_found", 404);
  if (b.role !== undefined && t.role === "admin") { await audit(env, me, t, "role", { to: b.role }, "refused", now); return fail("admin_locked", 409); }
  if (b.active === false && t.id === me.id) { await audit(env, me, t, "status", { to: "suspended" }, "refused", now); return fail("self_locked", 409); }
  if (b.active === false && t.role === "admin" && t.active && activeAdmins(list) <= 1) { await audit(env, me, t, "status", { to: "suspended" }, "refused", now); return fail("last_admin", 409); }

  if (b.role !== undefined && b.role !== t.role) {
    await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(b.role, t.id).run();
    await audit(env, me, t, "role", { from: t.role, to: b.role }, "ok", now);
  }
  if (typeof b.active === "boolean" && b.active !== t.active) {
    await env.DB.prepare("UPDATE users SET active = ? WHERE id = ?").bind(b.active ? 1 : 0, t.id).run();
    // الإيقاف يُنهي الجلسات القائمة فوراً؛ البيانات (التقدم والمفضلة والملفات) تبقى كما هي
    if (!b.active) await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(t.id).run();
    await audit(env, me, t, "status", { from: t.active ? "active" : "suspended", to: b.active ? "active" : "suspended" }, "ok", now);
  }
  if (b.semester !== undefined && b.semester !== t.semester) {
    // يُكتب بوقت أحدث من أي نسخة على أجهزة الطالب، فيأخذه في مزامنته التالية (الأحدث يفوز)
    const cur = await env.DB.prepare("SELECT t FROM user_data WHERE user_id = ? AND k = 'ms.sem'").bind(t.id).first();
    const stamp = Math.max(now, cur ? cur.t + 1 : 0);
    await env.DB.prepare("INSERT INTO user_data (user_id, k, v, t) VALUES (?, 'ms.sem', ?, ?) ON CONFLICT(user_id, k) DO UPDATE SET v = excluded.v, t = excluded.t")
      .bind(t.id, JSON.stringify(b.semester), stamp).run();
    await audit(env, me, t, "semester", { from: t.semester, to: b.semester }, "ok", now);
  }
  const after = (await allUsers(env)).find((u) => u.id === t.id);
  return json({ ok: true, user: after });
}

/* ---------- تفاصيل حساب ---------- */
async function detail(env, q) {
  const id = parseInt(q.get("id"), 10);
  const u = (await allUsers(env)).find((x) => x.id === id);
  if (!u) return fail("not_found", 404);
  const sessions = (await env.DB.prepare("SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND expires_at > ?").bind(id, Date.now()).first()).c;
  const rows = (await env.DB.prepare("SELECT k, v FROM user_data WHERE user_id = ? AND k IN ('ms.fav', 'ms.read')").bind(id).all()).results || [];
  const count = (k) => { const r = rows.find((x) => x.k === k); try { const v = r ? JSON.parse(r.v) : null; return Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : 0; } catch { return 0; } };
  /* معلومات إضافية للمشرف: كل شيء أعداد وتواريخ فقط (لا رقم جواز ولا درجات ولا نص كتبه الطالب). غياب جدول لا يُفشل الطلب. */
  const safe = async (fn, d) => { try { return await fn(); } catch { return d; } };
  const keys = await safe(async () => (await env.DB.prepare("SELECT k, v, t FROM user_data WHERE user_id = ?").bind(id).all()).results || [], []);
  const val = (k) => { const r = keys.find((x) => x.k === k); try { return r ? JSON.parse(r.v) : null; } catch { return null; } };
  const size = (v) => (Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : 0);
  const tasks = val("ms.tasks"), taskList = Array.isArray(tasks) ? tasks : [];
  const syncedAt = keys.reduce((m, r) => Math.max(m, Number(r.t) || 0), 0) || null;
  const profile = await safe(() => env.DB.prepare("SELECT full_name FROM profiles WHERE user_id = ?").bind(id).first(), null);
  const person = await safe(() => env.DB.prepare("SELECT id, linked_at FROM grade_people WHERE user_id = ?").bind(id).first(), null);
  const gradeRows = person ? await safe(async () => (await env.DB.prepare("SELECT COUNT(*) AS c FROM grade_entries WHERE person_id = ?").bind(person.id).first()).c, 0) : 0;
  const notes = await safe(async () => (await env.DB.prepare("SELECT COUNT(*) AS c, COUNT(DISTINCT doc) AS f, MAX(t) AS last, COALESCE(SUM(LENGTH(d)), 0) AS bytes FROM pdf_notes WHERE user_id = ?").bind(id).first()), null);
  const images = await safe(async () => (await env.DB.prepare("SELECT COUNT(DISTINCT id) AS c FROM pdf_assets WHERE user_id = ?").bind(id).first()).c, 0);
  /* الدرجات الكاملة (المشرف مأذون برؤيتها؛ رقم الجواز غير مخزّن أصلاً) */
  const grades = person ? await safe(async () => ((await env.DB.prepare("SELECT b.title, e.course, e.grade FROM grade_entries e JOIN grade_batches b ON b.id = e.batch_id WHERE e.person_id = ? ORDER BY b.id, e.ord, e.id").bind(person.id).all()).results || []).map((r) => ({ term: r.title, course: r.course, grade: r.grade })), []) : [];
  /* نشاط آخر 30 يوماً */
  const since = new Date(now0() - 29 * 864e5).toISOString().slice(0, 10);
  const days = await safe(async () => ((await env.DB.prepare("SELECT day, site_s, study_s FROM user_activity WHERE user_id = ? AND day >= ? ORDER BY day").bind(id, since).all()).results || []).map((r) => ({ day: r.day, site: r.site_s, study: r.study_s })), []);
  /* الأجهزة (إشعارات) والجلسات */
  const devs = await safe(async () => ((await env.DB.prepare("SELECT semester, created_at, last_ok FROM push_subs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").bind(id).all()).results || []).map((r) => ({ semester: r.semester, since: r.created_at, lastOk: r.last_ok || null })), []);
  const sess = await safe(async () => ((await env.DB.prepare("SELECT expires_at FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY expires_at DESC LIMIT 20").bind(id, now0()).all()).results || []).map((r) => ({ signedIn: r.expires_at - SESSION_MS, expires: r.expires_at })), []);
  /* سجل الحساب: دخوله وخروجه وما فعله المشرف عليه */
  const log = await safe(async () => ((await env.DB.prepare("SELECT at, actor_id, actor_name, action, detail FROM audit_log WHERE target_id = ? OR actor_id = ? ORDER BY at DESC, id DESC LIMIT 40").bind(id, id).all()).results || []).map((r) => ({ at: r.at, by: r.actor_name, self: r.actor_id === id, action: r.action, detail: safeParse(r.detail) })), []);
  const names = (v) => (v && typeof v === "object" && !Array.isArray(v)) ? Object.entries(v).slice(0, 60).map(([k, x]) => ({ id: k, n: Array.isArray(x) ? x.length : (x && typeof x === "object" ? Object.keys(x).length : 1), items: Array.isArray(x) ? x.slice(0, 40) : null })) : [];
  const lastCourse = val("ms.last");
  return json({ ok: true, user: {
    ...u, sessions, favorites: count("ms.fav"), read: count("ms.read"), linked: "google",
    studentCode: "M" + id,
    review: size(val("ms.review")), studied: size(val("ms.study")),
    tasks: taskList.length, tasksDone: taskList.filter((x) => x && (x.done || x.completed)).length,
    lastCourse: typeof lastCourse === "string" ? lastCourse.slice(0, 80) : null,
    syncedAt,
    fullName: profile && profile.full_name ? profile.full_name : null,
    gradesLinked: !!person, gradeRows,
    grades, activityDays: days, deviceList: devs, sessionList: sess, log,
    readBy: names(val("ms.read")), reviewBy: names(val("ms.review")), studyBy: names(val("ms.study")),
    siteSec: u.siteSec, studySecTotal: u.studySec,
    pdf: notes ? { pages: Number(notes.c) || 0, files: Number(notes.f) || 0, last: notes.last || null, bytes: Number(notes.bytes) || 0, images } : null
  } });
}

/* ---------- CSV ---------- */
const ROLE_AR = { student: "طالب", uploader: "رافع ملفات", rep: "ممثل الدفعة", admin: "مشرف" };
export function csvCell(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // لا تُفسَّر كصيغة في Excel/Sheets
  return '"' + s.replace(/"/g, '""') + '"';
}
const day = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : "");
async function exportCsv(env, q, me, now) {
  const rows = filterUsers(await allUsers(env), q);
  const head = ["الاسم", "البريد الإلكتروني", "الدور", "الحالة", "الكورس", "تاريخ الإنشاء", "آخر دخول"];
  const lines = [head].concat(rows.map((u) => [u.name, u.email, ROLE_AR[u.role], u.active ? "نشط" : "موقوف", u.semester ? "الكورس " + u.semester : "غير محدد", day(u.created), day(u.lastLogin)]));
  await audit(env, me, null, "export", { rows: rows.length, filters: Object.fromEntries([...q].filter(([k]) => ["q", "role", "status", "sem"].includes(k)).map(([k, v]) => [k, k === "q" ? v.slice(0, 40) : v])) }, "ok", now);
  return new Response("﻿" + lines.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="medixa-accounts-${day(now)}.csv"`, "cache-control": "no-store" }
  });
}

/* ---------- الإشعارات ---------- */
async function pushStatus(env, me) {
  const out = { ok: true, configured: vapidReady(env), table: false, total: 0, bySemester: { 1: 0, 2: 0, 3: 0 }, linked: 0, mine: 0, prefs: false };
  try {
    const rows = (await env.DB.prepare("SELECT semester, COUNT(*) AS c, SUM(user_id IS NOT NULL) AS l, SUM(user_id = ?) AS m FROM push_subs GROUP BY semester").bind(me.id).all()).results || [];
    out.table = true;
    for (const r of rows) { out.total += r.c; out.linked += r.l || 0; out.mine += r.m || 0; if (out.bySemester[r.semester] !== undefined) out.bySemester[r.semester] = r.c; }
  } catch { /* الجدول غير موجود */ }
  try { await env.DB.prepare("SELECT prefs FROM push_subs LIMIT 1").all(); out.prefs = out.table; } catch { out.prefs = false; }
  return json(out);
}
async function pushTest(env, me, now, fetchImpl) {
  if (!vapidReady(env)) return fail("not_configured", 503);
  const r = await notifyUser(env, me.id, {
    title: "اختبار · إشعار من لوحة الإدارة", body: "وصل هذا الإشعار إلى أجهزتك أنت فقط.", url: "admin.html#notifications", tag: "admin-test"
  }, fetchImpl);
  await audit(env, me, me, "push_test", { devices: r.devices, sent: r.sent, failed: r.failed, removed: r.removed }, r.sent > 0 ? "ok" : "no_delivery", now);
  return json({ ok: true, ...r });
}

/* ---------- إشعار لطالب أو مجموعة ---------- */
async function readBody(req) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return null;
  try { return await req.json(); } catch { return null; }
}
export function pickRecipients(all, b, now) {
  const ids = Array.isArray(b.ids) ? b.ids.filter((x) => Number.isInteger(x)) : null;
  if (ids && ids.length) return all.filter((u) => ids.includes(u.id) && u.active);
  const t = b.target || {};
  return all.filter((u) => u.active &&
    (!t.semester || (t.semester === "none" ? !u.semester : u.semester === Number(t.semester))) &&
    (!t.role || u.role === t.role) &&
    (!t.inactiveDays || !u.lastActive || now - u.lastActive > Number(t.inactiveDays) * 864e5) &&
    (!t.withDevicesOnly || u.devices > 0));
}
async function notifyGroup(req, env, me, now, opts) {
  if (!vapidReady(env)) return fail("not_configured", 503);
  const b = await readBody(req);
  if (!b) return fail("bad_request", 400);
  const title = String(b.title || "").trim().slice(0, 100), body = String(b.body || "").trim().slice(0, 240);
  if (!title) return fail("title_required", 400);
  const who = pickRecipients(await allUsers(env), b, now).slice(0, 500);
  if (b.preview === true) return json({ ok: true, preview: true, users: who.length, devices: who.reduce((s, u) => s + u.devices, 0) });
  let sent = 0, failed = 0, devices = 0;
  for (const u of who) {
    if (!u.devices) continue;
    const r = await notifyUser(env, u.id, { title, body, url: "index.html", tag: "admin-" + now }, opts.pushFetch).catch(() => null);
    if (r) { sent += r.sent || 0; failed += r.failed || 0; devices += r.devices || 0; }
  }
  await audit(env, me, who.length === 1 ? who[0] : null, "push_group", { users: who.length, devices, sent, failed, title }, sent > 0 ? "ok" : "no_delivery", now);
  return json({ ok: true, users: who.length, devices, sent, failed });
}
/* إنهاء كل جلسات حساب (يخرج من كل أجهزته) */
async function signoutUser(req, env, me, now) {
  const b = await readBody(req);
  if (!b || !Number.isInteger(b.id)) return fail("bad_request", 400);
  const t = await env.DB.prepare("SELECT id, name FROM users WHERE id = ?").bind(b.id).first();
  if (!t) return fail("not_found", 404);
  const r = await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(t.id).run();
  await audit(env, me, t, "signout_all", { sessions: r.meta ? r.meta.changes : 0 }, "ok", now);
  return json({ ok: true, ended: r.meta ? r.meta.changes : 0 });
}

/* ---------- نقطة الدخول (المستخدم مشرف مؤكَّد مسبقاً) ---------- */
export async function handleAdmin(req, env, me, p, opts = {}) {
  const now = (opts.now || Date.now)();
  const q = new URL(req.url).searchParams;
  if (p === "/api/auth/user" && req.method === "POST") return update(req, env, me, now);
  if (req.method === "GET") {
    if (p === "/api/auth/admin/stats") {
      const st = stats(await allUsers(env), now);
      st.topCourses = [];
      try { st.topCourses = ((await env.DB.prepare("SELECT v, COUNT(*) AS c FROM user_data WHERE k = 'ms.last' GROUP BY v ORDER BY c DESC LIMIT 5").all()).results || []).map((r) => ({ id: safeParse(r.v), n: r.c })).filter((x) => typeof x.id === "string"); } catch { /* لا شيء */ }
      return json({ ok: true, me: me.id, stats: st });
    }
    if (p === "/api/auth/admin/users") {
      const all = await allUsers(env);
      // المشرف الحالي أولاً، ثم المشرفون، ثم الأحدث تسجيلاً
      const sortKey = q.get("sort"), dir = q.get("dir") === "asc" ? 1 : -1;
      const SORTS = { name: (u) => String(u.fullName || u.name || "").toLowerCase(), created: (u) => u.created || 0, active: (u) => u.lastActive || 0, hours: (u) => u.siteSec, study: (u) => u.studySec, role: (u) => ROLES_ALL.indexOf(u.role) };
      const byKey = SORTS[sortKey] ? (a, b) => { const x = SORTS[sortKey](a), y = SORTS[sortKey](b); return (x < y ? -1 : x > y ? 1 : 0) * dir; }
        : (a, b) => (b.id === me.id) - (a.id === me.id) || (b.role === "admin") - (a.role === "admin") || b.id - a.id;
      const rows = filterUsers(all, q).sort(byKey);
      const per = Math.min(MAX_PER, Math.max(1, parseInt(q.get("per"), 10) || 20));
      const pages = Math.max(1, Math.ceil(rows.length / per));
      const page = Math.min(pages, Math.max(1, parseInt(q.get("page"), 10) || 1));
      return json({ ok: true, me: me.id, total: all.length, count: rows.length, page, per, pages, activeAdmins: activeAdmins(all), users: rows.slice((page - 1) * per, page * per) });
    }
    if (p === "/api/auth/admin/user") return detail(env, q);
    if (p === "/api/auth/admin/export") return exportCsv(env, q, me, now);
    if (p === "/api/auth/admin/audit") return auditList(env, q);
    if (p === "/api/auth/admin/push") return pushStatus(env, me);
  }
  if (p === "/api/auth/admin/push-test" && req.method === "POST") return pushTest(env, me, now, opts.pushFetch);
  if (p === "/api/auth/admin/notify" && req.method === "POST") return notifyGroup(req, env, me, now, opts);
  if (p === "/api/auth/admin/signout" && req.method === "POST") return signoutUser(req, env, me, now);
  return null;
}
