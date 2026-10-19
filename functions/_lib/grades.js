// functions/_lib/grades.js — درجاتي الجامعية (Step 57، بطلب محمد 2026-10-19).
// المشرف يرفع ملف الدرجات (اسم الطالب، رقم الجواز، المادة، الدرجة). رقم الجواز لا يُخزَّن أبداً:
// يتحول فوراً إلى بصمة HMAC-SHA256 بمفتاح سري (GRADES_SECRET في Cloudflare) لا يمكن إرجاعها إلى الرقم.
// الطالب يدخل بحساب Google ويكتب رقم جوازه مرة واحدة؛ إن طابق بصمةً غير مربوطة ارتبط حسابه بها نهائياً (ربط تلقائي)،
// وبعدها يرى درجاته هو فقط. كل التحقق هنا في الخادم؛ لا درجات في أي ملف عام.
//
// المسارات:
//   GET  /api/grades/me                    درجاتي (أو {linked:false}) + الملف الشخصي (Step 61)
//   POST /api/grades/profile               {full_name, passport?} الملف الشخصي: الاسم كما في الجامعة + ربط الجواز (مرة واحدة)
//   POST /api/grades/claim                 {passport} ربط حسابي برقم جوازي (محاولات محدودة؛ بقي للتوافق)
//   GET  /api/grades/admin/summary         الدفعات والأشخاص وحالة الربط (بلا بصمات ولا أرقام جواز)
//   GET  /api/grades/admin/roster          قائمة الطلاب من ملفاتهم الشخصية (رمز M<رقم>، الاسم، البريد، الكورس)
//   POST /api/grades/admin/upload          {title, rows:[{name, passport | code, course, grade}]}
//   POST /api/grades/admin/delete-batch    {id}
//   POST /api/grades/admin/unlink          {person_id}
import { currentUser } from "./auth.js";
import { audit } from "./admin.js";

const MAX_ROWS = 3000;
const MAX_TITLE = 80;
const FAIL_PER_HOUR = 5;
const FAIL_PER_DAY = 10;
const HOUR = 3600 * 1000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
const fail = (error, status, extra = {}) => json({ ok: false, error, ...extra }, status);
async function readJson(req) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return null;
  try { return await req.json(); } catch { return null; }
}
function sameOrigin(req) { const o = req.headers.get("origin"); return !o || o === new URL(req.url).origin; }
const clip = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

/* رقم الجواز بصيغة واحدة: أرقام لاتينية، أحرف كبيرة، بلا مسافات أو شرطات */
export function normPassport(s) {
  const out = String(s == null ? "" : s).normalize("NFKC")
    .replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c)).replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c))
    .toUpperCase().replace(/[\s\-_./\\]/g, "");
  return /^[A-Z0-9]{5,20}$/.test(out) ? out : null;
}

const enc = new TextEncoder();
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
async function fingerprint(key, passport) {
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode("medixa-grades:" + passport)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

const notMigrated = (e) => /no such table|no such column/i.test(String(e && e.message));

export const studentCode = (userId) => "M" + userId;
const codeToUser = (code) => { const m = /^M(\d{1,9})$/i.exec(String(code == null ? "" : code).trim()); return m ? Number(m[1]) : null; };

/* ---------- الطالب ---------- */
async function profileOf(env, userId) {
  const r = await env.DB.prepare("SELECT full_name, updated_at FROM profiles WHERE user_id = ?").bind(userId).first();
  return r ? { fullName: r.full_name, updatedAt: r.updated_at } : null;
}
async function myGrades(env, userId) {
  const prof = await profileOf(env, userId);
  const person = await env.DB.prepare("SELECT id, name, linked_at FROM grade_people WHERE user_id = ?").bind(userId).first();
  const profile = { fullName: prof ? prof.fullName : "", code: studentCode(userId), passportLinked: !!person, complete: !!(prof && person) };
  if (!person) return { ok: true, linked: false, profile };
  const rows = (await env.DB.prepare(
    "SELECT b.id AS batch_id, b.title, b.created_at, e.course, e.grade FROM grade_entries e JOIN grade_batches b ON b.id = e.batch_id WHERE e.person_id = ? ORDER BY b.created_at DESC, b.id DESC, e.ord"
  ).bind(person.id).all()).results || [];
  const batches = [];
  for (const r of rows) {
    let b = batches[batches.length - 1];
    if (!b || b.id !== r.batch_id) batches.push(b = { id: r.batch_id, title: r.title, at: r.created_at, rows: [] });
    b.rows.push({ course: r.course, grade: r.grade });
  }
  return { ok: true, linked: true, name: person.name, linkedAt: person.linked_at, batches, profile };
}

/* الاسم الكامل: جزءان على الأقل، بلا أرقام */
export function cleanFullName(s) {
  const n = clip(s, 100);
  return n.length >= 5 && /\S+\s+\S+/.test(n) && !/[0-9٠-٩۰-۹@]/.test(n) ? n : null;
}

async function tooMany(env, userId, now) {
  const f = await env.DB.prepare("SELECT SUM(CASE WHEN at > ? THEN 1 ELSE 0 END) AS hour, COUNT(*) AS day FROM grade_attempts WHERE user_id = ? AND ok = 0 AND at > ?")
    .bind(now - HOUR, userId, now - 24 * HOUR).first();
  return (f && f.hour) >= FAIL_PER_HOUR || (f && f.day) >= FAIL_PER_DAY;
}
async function recordAttempt(env, userId, now, ok) {
  await env.DB.prepare("INSERT INTO grade_attempts (user_id, at, ok) VALUES (?, ?, ?)").bind(userId, now, ok ? 1 : 0).run();
  await env.DB.prepare("DELETE FROM grade_attempts WHERE at < ?").bind(now - 7 * 24 * HOUR).run();
}

// Step 61: الملف الشخصي. الجواز يُكتب مرة واحدة: إن وُجدت درجاته رُبط بها، وإلا أُنشئ سجل مربوط تلحقه الدرجات عند رفعها.
async function saveProfile(req, env, me, now) {
  const b = await readJson(req);
  if (!b) return fail("bad_request", 400);
  const fullName = cleanFullName(b.full_name);
  if (!fullName) return fail("bad_name", 400);
  const mine = await env.DB.prepare("SELECT id FROM grade_people WHERE user_id = ?").bind(me.id).first();
  if (!mine) {
    if (await tooMany(env, me.id, now)) return fail("too_many_attempts", 429);
    const passport = normPassport(b.passport);
    if (!passport) { await recordAttempt(env, me.id, now, false); return fail("bad_passport", 400); }
    const hash = await fingerprint(await hmacKey(env.GRADES_SECRET), passport);
    const person = await env.DB.prepare("SELECT id, name, user_id FROM grade_people WHERE pass_hash = ?").bind(hash).first();
    if (person && person.user_id && person.user_id !== me.id) {
      await recordAttempt(env, me.id, now, false);
      await audit(env, me, { id: person.user_id, name: person.name }, "grades_claim_conflict", { person: person.id }, "denied", now);
      return fail("claimed", 409);
    }
    let r;
    if (person) r = await env.DB.prepare("UPDATE grade_people SET user_id = ?, linked_at = ? WHERE id = ? AND user_id IS NULL").bind(me.id, now, person.id).run();
    else r = await env.DB.prepare("INSERT INTO grade_people (pass_hash, name, user_id, linked_at, created_at) VALUES (?, '', ?, ?, ?) ON CONFLICT(pass_hash) DO NOTHING").bind(hash, me.id, now, now).run();
    if (!r.meta || !r.meta.changes) { await recordAttempt(env, me.id, now, false); return fail("claimed", 409); }
    await recordAttempt(env, me.id, now, true);
    await audit(env, me, me, "grades_link", { person: person ? person.id : null, pending: !person }, "ok", now);
  }
  await env.DB.prepare("INSERT INTO profiles (user_id, full_name, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET full_name = excluded.full_name, updated_at = excluded.updated_at")
    .bind(me.id, fullName, now, now).run();
  return json(await myGrades(env, me.id));
}

async function claim(req, env, me, now) {
  const b = await readJson(req);
  if (!b) return fail("bad_request", 400);
  const mine = await env.DB.prepare("SELECT id FROM grade_people WHERE user_id = ?").bind(me.id).first();
  if (mine) return fail("already_linked", 409);
  if (await tooMany(env, me.id, now)) return fail("too_many_attempts", 429);
  const passport = normPassport(b.passport);
  const record = (ok) => recordAttempt(env, me.id, now, ok);
  if (!passport) { await record(false); return fail("bad_passport", 400); }
  const hash = await fingerprint(await hmacKey(env.GRADES_SECRET), passport);
  const person = await env.DB.prepare("SELECT id, name, user_id FROM grade_people WHERE pass_hash = ?").bind(hash).first();
  if (!person) { await record(false); return fail("not_found", 404); }
  if (person.user_id && person.user_id !== me.id) {
    await record(false);
    await audit(env, me, { id: person.user_id, name: person.name }, "grades_claim_conflict", { person: person.id }, "denied", now);
    return fail("claimed", 409);
  }
  // الشرط user_id IS NULL يمنع سباق حسابين على الشخص نفسه
  const r = await env.DB.prepare("UPDATE grade_people SET user_id = ?, linked_at = ? WHERE id = ? AND user_id IS NULL").bind(me.id, now, person.id).run();
  if (!r.meta || !r.meta.changes) { await record(false); return fail("claimed", 409); }
  await record(true);
  await audit(env, me, me, "grades_link", { person: person.id }, "ok", now);
  return json(await myGrades(env, me.id));
}

/* ---------- المشرف ---------- */
export function cleanRows(rows) {
  if (!Array.isArray(rows)) return { error: "bad_request" };
  if (!rows.length) return { error: "empty" };
  if (rows.length > MAX_ROWS) return { error: "too_many_rows", max: MAX_ROWS };
  const out = [], bad = [];
  rows.forEach((r, i) => {
    const passport = normPassport(r && r.passport), course = clip(r && r.course, 120), grade = clip(r && r.grade, 24), name = clip(r && r.name, 100);
    const user = passport ? null : codeToUser(r && r.code); // Step 61: رمز الطالب من قائمة الملفات الشخصية بدل الجواز
    if ((!passport && !user) || !course || !grade) bad.push(i);
    else out.push({ passport, user, key: passport ? "P" + passport : "U" + user, course, grade, name });
  });
  if (bad.length) return { error: "invalid_rows", rows: bad.slice(0, 50), count: bad.length };
  // لا نقبل اسمين مختلفين لرقم جواز واحد في الملف نفسه (غالباً خطأ في نسخ الأعمدة)
  const names = new Map(), clash = [];
  out.forEach((r, i) => {
    const n = r.name.toLowerCase();
    if (!names.has(r.key)) names.set(r.key, n);
    else if (n && names.get(r.key) && names.get(r.key) !== n) clash.push(i);
  });
  if (clash.length) return { error: "name_mismatch", rows: clash.slice(0, 50), count: clash.length };
  return { value: out };
}

async function upload(req, env, me, now) {
  const b = await readJson(req);
  if (!b) return fail("bad_request", 400);
  const title = clip(b.title, MAX_TITLE);
  if (!title) return fail("title_required", 400);
  const c = cleanRows(b.rows);
  if (c.error) return fail(c.error, 400, { rows: c.rows, count: c.count, max: c.max });
  const key = await hmacKey(env.GRADES_SECRET);
  // الصفوف برمز الطالب: البصمة من سجله المربوط (موجود لكل من أكمل ملفه الشخصي)
  const users = [...new Set(c.value.filter((r) => r.user).map((r) => r.user))];
  const byUser = new Map();
  if (users.length) {
    const found = (await env.DB.prepare("SELECT user_id, pass_hash FROM grade_people WHERE user_id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(users)).all()).results || [];
    found.forEach((f) => byUser.set(f.user_id, f.pass_hash));
    const unknown = []; c.value.forEach((r, i) => { if (r.user && !byUser.has(r.user)) unknown.push(i); });
    if (unknown.length) return fail("unknown_code", 400, { rows: unknown.slice(0, 50), count: unknown.length });
  }
  const people = new Map(); // بصمة ← اسم
  const memo = new Map();   // رقم ← بصمة (لا يُحفظ خارج هذا الطلب)
  const entries = [];
  for (let i = 0; i < c.value.length; i++) {
    const r = c.value[i];
    let h = r.user ? byUser.get(r.user) : memo.get(r.passport);
    if (!h) { h = await fingerprint(key, r.passport); memo.set(r.passport, h); }
    if (!people.has(h) || (!people.get(h) && r.name)) people.set(h, r.name);
    entries.push({ h, c: r.course, g: r.grade, o: i });
  }
  memo.clear();
  const pjson = JSON.stringify([...people].map(([h, n]) => ({ h, n })));
  await env.DB.prepare(
    "INSERT INTO grade_people (pass_hash, name, created_at) SELECT json_extract(j.value, '$.h'), json_extract(j.value, '$.n'), ? FROM json_each(?) j WHERE true " +
    "ON CONFLICT(pass_hash) DO UPDATE SET name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE grade_people.name END"
  ).bind(now, pjson).run();
  const batch = await env.DB.prepare("INSERT INTO grade_batches (title, student_count, row_count, created_by, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(title, people.size, entries.length, me.id, now).run();
  const batchId = batch.meta && batch.meta.last_row_id;
  await env.DB.prepare(
    "INSERT INTO grade_entries (batch_id, person_id, course, grade, ord) SELECT ?, p.id, json_extract(j.value, '$.c'), json_extract(j.value, '$.g'), json_extract(j.value, '$.o') " +
    "FROM json_each(?) j JOIN grade_people p ON p.pass_hash = json_extract(j.value, '$.h')"
  ).bind(batchId, JSON.stringify(entries)).run();
  const linked = (await env.DB.prepare(
    "SELECT COUNT(DISTINCT p.id) AS c FROM grade_people p JOIN grade_entries e ON e.person_id = p.id WHERE e.batch_id = ? AND p.user_id IS NOT NULL"
  ).bind(batchId).first()).c;
  await audit(env, me, null, "grades_upload", { batch: batchId, title, students: people.size, rows: entries.length }, "ok", now);
  return json({ ok: true, batch: batchId, students: people.size, rows: entries.length, alreadyLinked: linked });
}

async function summary(env) {
  const batches = (await env.DB.prepare(
    "SELECT b.id, b.title, b.student_count, b.row_count, b.created_at, (SELECT COUNT(DISTINCT e.person_id) FROM grade_entries e JOIN grade_people p ON p.id = e.person_id WHERE e.batch_id = b.id AND p.user_id IS NOT NULL) AS linked FROM grade_batches b ORDER BY b.created_at DESC, b.id DESC"
  ).all()).results || [];
  const people = (await env.DB.prepare(
    "SELECT p.id, p.name, p.linked_at, u.name AS user_name, u.email AS user_email, pr.full_name AS profile_name, (SELECT COUNT(*) FROM grade_entries e WHERE e.person_id = p.id) AS entry_count FROM grade_people p LEFT JOIN users u ON u.id = p.user_id LEFT JOIN profiles pr ON pr.user_id = p.user_id ORDER BY COALESCE(NULLIF(p.name, ''), pr.full_name) COLLATE NOCASE LIMIT 5000"
  ).all()).results || [];
  return json({
    ok: true,
    batches: batches.map((b) => ({ id: b.id, title: b.title, students: b.student_count, rows: b.row_count, linked: b.linked, at: b.created_at })),
    people: people.map((p) => ({ id: p.id, name: p.name, rows: p.entry_count, linked: !!p.linked_at, linkedAt: p.linked_at, user: p.user_email ? { name: p.user_name, email: p.user_email, profileName: p.profile_name || "" } : null }))
  });
}

// Step 61: قائمة الطلاب الذين كتبوا ملفهم الشخصي، لملء الدرجات بجانبها ثم رفعها برمز الطالب
async function roster(env) {
  const rows = (await env.DB.prepare(
    "SELECT u.id, u.name AS google_name, u.email, pr.full_name, pr.updated_at, gp.id AS person_id, (SELECT v FROM user_data d WHERE d.user_id = u.id AND d.k = 'ms.sem') AS sem " +
    "FROM profiles pr JOIN users u ON u.id = pr.user_id LEFT JOIN grade_people gp ON gp.user_id = u.id ORDER BY pr.full_name COLLATE NOCASE LIMIT 5000"
  ).all()).results || [];
  return json({ ok: true, students: rows.map((r) => {
    let sem = null; try { sem = r.sem ? JSON.parse(r.sem) : null; } catch {}
    return { code: studentCode(r.id), fullName: r.full_name, googleName: r.google_name, email: r.email, semester: [1, 2, 3].includes(sem) ? sem : null, passportLinked: !!r.person_id, updatedAt: r.updated_at };
  }) });
}

async function deleteBatch(req, env, me, now) {
  const b = await readJson(req);
  const id = b && Number(b.id);
  if (!Number.isInteger(id)) return fail("bad_request", 400);
  const batch = await env.DB.prepare("SELECT id, title FROM grade_batches WHERE id = ?").bind(id).first();
  if (!batch) return fail("not_found", 404);
  await env.DB.prepare("DELETE FROM grade_entries WHERE batch_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM grade_batches WHERE id = ?").bind(id).run();
  // الشخص غير المربوط الذي لم تبق له درجات يُحذف؛ المربوط يبقى ليستقبل الدفعات القادمة تلقائياً
  await env.DB.prepare("DELETE FROM grade_people WHERE user_id IS NULL AND id NOT IN (SELECT DISTINCT person_id FROM grade_entries)").run();
  await audit(env, me, null, "grades_delete_batch", { batch: id, title: batch.title }, "ok", now);
  return json({ ok: true });
}

async function unlink(req, env, me, now) {
  const b = await readJson(req);
  const id = b && Number(b.person_id);
  if (!Number.isInteger(id)) return fail("bad_request", 400);
  const p = await env.DB.prepare("SELECT p.id, p.name, p.user_id, u.name AS user_name FROM grade_people p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ?").bind(id).first();
  if (!p) return fail("not_found", 404);
  if (!p.user_id) return json({ ok: true, changed: 0 });
  await env.DB.prepare("UPDATE grade_people SET user_id = NULL, linked_at = NULL WHERE id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM grade_people WHERE id = ? AND id NOT IN (SELECT DISTINCT person_id FROM grade_entries)").bind(id).run(); // سجل الملف الشخصي بلا درجات
  await env.DB.prepare("DELETE FROM grade_attempts WHERE user_id = ?").bind(p.user_id).run(); // يستطيع صاحب الحق المحاولة فوراً
  await audit(env, me, { id: p.user_id, name: p.user_name }, "grades_unlink", { person: id, name: p.name }, "ok", now);
  return json({ ok: true, changed: 1 });
}

export async function handleGrades(req, env, opts = {}) {
  const p = new URL(req.url).pathname.replace(/\/+$/, "");
  if (p !== "/api/grades" && !p.startsWith("/api/grades/")) return null;
  if (!env.DB) return fail("not_configured", 503);
  if (req.method !== "GET" && !sameOrigin(req)) return fail("forbidden", 403);
  const now = (opts.now || Date.now)();
  const me = await currentUser(req, env, now);
  if (!me) return fail("unauthorized", 401);
  if (!env.GRADES_SECRET || String(env.GRADES_SECRET).length < 16) return fail("not_configured", 503, { missing: "GRADES_SECRET" });
  try {
    if (p === "/api/grades/me" && req.method === "GET") return json(await myGrades(env, me.id));
    if (p === "/api/grades/claim" && req.method === "POST") return await claim(req, env, me, now);
    if (p === "/api/grades/profile" && req.method === "POST") return await saveProfile(req, env, me, now);
    if (!p.startsWith("/api/grades/admin/")) return fail("not_found", 404);
    if (me.role !== "admin") return fail("forbidden", 403);
    const action = p.slice("/api/grades/admin/".length);
    if (action === "summary" && req.method === "GET") return await summary(env);
    if (action === "roster" && req.method === "GET") return await roster(env);
    if (req.method !== "POST") return fail("not_found", 404);
    if (action === "upload") return await upload(req, env, me, now);
    if (action === "delete-batch") return await deleteBatch(req, env, me, now);
    if (action === "unlink") return await unlink(req, env, me, now);
    return fail("not_found", 404);
  } catch (e) {
    if (notMigrated(e)) return fail("not_migrated", 503);
    throw e;
  }
}
