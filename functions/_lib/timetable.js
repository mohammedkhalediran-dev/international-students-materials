// functions/_lib/timetable.js — الجدول الجامعي الرسمي (Step 55، بطلب محمد 2026-10-19).
// القراءة: لصاحب حساب كورسه الثالث (ms.sem = 3 في حسابه) أو للمشرف. الزائر 401، وطالب كورس آخر 403 — من الخادم نفسه.
// الإدارة (admin فقط): إنشاء/تعديل/حذف/نشر، إلغاء أو نقل محاضرة في تاريخ واحد، فحص التعارض، استيراد مع معاينة وموافقة،
// واستخراج الجدول من صورة أو PDF ممسوح على الخادم (Workers AI مربوط باسم AI؛ اختياري — بدونه يعمل الإدخال اليدوي واستخراج PDF النصي في المتصفح).
//
// المسارات:
//   GET  /api/timetable/access                     هل يحق لي رؤية الجدول؟ (لا بيانات)
//   GET  /api/timetable?from=YYYY-MM-DD&to=...      مواعيد منشورة بعد تطبيق الاستثناءات (أقصى 62 يوماً)
//   GET  /api/timetable/admin/list                 كل المحاضرات (مسودة ومنشورة) والاستثناءات
//   POST /api/timetable/admin/save                 {id?, subject, topic, lecturer, room, repeat, weekday|date, start, end, from?, to?, publish?, force?}
//   POST /api/timetable/admin/delete               {id}
//   POST /api/timetable/admin/publish              {ids?: [..], unpublish?: true}  (بلا ids = نشر كل المسودات)
//   POST /api/timetable/admin/exception            {lecture_id, date, action: cancel|move|clear, new_date?, new_start?, new_end?, new_room?, note?}
//   POST /api/timetable/admin/check                {rows: [...]} تعارضات الصفوف بينها ومع الجدول الحالي
//   POST /api/timetable/admin/import               {rows: [...], publish?, force?}
//   POST /api/timetable/admin/extract              multipart: file (صورة أو PDF) → صفوف مقترحة للمعاينة
import { currentUser } from "./auth.js";
import { audit } from "./admin.js";

export const TIMETABLE_SEMESTERS = [3];
const MAX_RANGE_DAYS = 62;
const MAX_ROWS = 200;
const MAX_FILE = 8 * 1024 * 1024;
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
const fail = (error, status, extra = {}) => json({ ok: false, error, ...extra }, status);
async function readJson(req) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return null;
  try { return await req.json(); } catch { return null; }
}
function sameOrigin(req) { const o = req.headers.get("origin"); return !o || o === new URL(req.url).origin; }

/* ---------- تواريخ وأوقات ---------- */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function validDate(s) {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
export function normTime(s) {
  const m = String(s == null ? "" : s).trim().replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c)).match(/^(\d{1,2})(?:[:.٫](\d{2}))?$/);
  if (!m) return null;
  const h = +m[1], mi = +(m[2] || 0);
  return h < 24 && mi < 60 ? String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0") : null;
}
const mins = (t) => +t.slice(0, 2) * 60 + +t.slice(3);
export const weekdayOf = (s) => new Date(s + "T00:00:00Z").getUTCDay();
export function addDays(s, n) { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);

/* ---------- التحقق من محاضرة ---------- */
const clip = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
export function cleanLecture(b) {
  if (!b || typeof b !== "object") return { error: "bad_request" };
  const out = {
    subject: clip(b.subject, 80), topic: clip(b.topic, 140), lecturer: clip(b.lecturer, 60), room: clip(b.room, 40),
    start: normTime(b.start), end: normTime(b.end), repeat: b.repeat === "once" ? "once" : "weekly",
    weekday: null, date: null, from: null, to: null
  };
  if (!out.subject) return { error: "subject_required" };
  if (!out.start || !out.end) return { error: "bad_time" };
  if (mins(out.end) <= mins(out.start)) return { error: "end_before_start" };
  if (out.repeat === "once") {
    if (!validDate(b.date)) return { error: "bad_date" };
    out.date = b.date;
  } else {
    const w = Number(b.weekday);
    if (!Number.isInteger(w) || w < 0 || w > 6) return { error: "bad_weekday" };
    out.weekday = w;
    if (b.from) { if (!validDate(b.from)) return { error: "bad_date" }; out.from = b.from; }
    if (b.to) { if (!validDate(b.to)) return { error: "bad_date" }; out.to = b.to; }
    if (out.from && out.to && out.to < out.from) return { error: "bad_range" };
  }
  return { value: out };
}
function rowToLecture(r) {
  return {
    id: r.id, semester: r.semester, subject: r.subject, topic: r.topic, lecturer: r.lecturer, room: r.room,
    repeat: r.date ? "once" : "weekly", weekday: r.weekday, date: r.date, start: r.start_time, end: r.end_time,
    from: r.valid_from, to: r.valid_to, status: r.status, source: r.source, updated: r.updated_at
  };
}

/* ---------- التعارض: محاضرتان قد تقعان في اليوم نفسه بأوقات متداخلة (لطلاب الكورس نفسه) ---------- */
function rangeOverlap(a, b) {
  const lo = (x) => x.repeat === "once" ? x.date : (x.from || "0000-01-01");
  const hi = (x) => x.repeat === "once" ? x.date : (x.to || "9999-12-31");
  return lo(a) <= hi(b) && lo(b) <= hi(a);
}
function sameDayPossible(a, b) {
  const dayOf = (x) => x.repeat === "once" ? weekdayOf(x.date) : x.weekday;
  if (dayOf(a) !== dayOf(b)) return false;
  if (a.repeat === "once" && b.repeat === "once") return a.date === b.date;
  return rangeOverlap(a, b);
}
export function conflictBetween(a, b) {
  if (!sameDayPossible(a, b)) return null;
  if (!(mins(a.start) < mins(b.end) && mins(b.start) < mins(a.end))) return null;
  const same = (x, y) => x && y && x.toLowerCase() === y.toLowerCase();
  if (same(a.subject, b.subject) && a.start === b.start && a.end === b.end) return "duplicate";
  if (same(a.room, b.room)) return "room";
  return "time";
}
export function findConflicts(rows, existing = []) {
  const out = [];
  rows.forEach((a, i) => {
    rows.forEach((b, j) => { if (j > i) { const k = conflictBetween(a, b); if (k) out.push({ a: i, b: j, kind: k }); } });
    existing.forEach((e) => { if (e.id !== a.id) { const k = conflictBetween(a, e); if (k) out.push({ a: i, existing: e.id, kind: k, subject: e.subject, start: e.start, end: e.end, status: e.status }); } });
  });
  return out;
}

/* ---------- توسيع المواعيد لمدى تاريخ ---------- */
export function expand(lectures, exceptions, from, to) {
  const exc = new Map(exceptions.map((x) => [x.lecture_id + "|" + x.date, x]));
  const out = [];
  const n = daysBetween(from, to);
  for (let i = 0; i <= n; i++) {
    const d = addDays(from, i), w = weekdayOf(d);
    for (const l of lectures) {
      const hit = l.repeat === "once" ? l.date === d : (l.weekday === w && (!l.from || d >= l.from) && (!l.to || d <= l.to));
      if (!hit) continue;
      const base = { lecture: l.id, date: d, start: l.start, end: l.end, subject: l.subject, topic: l.topic, lecturer: l.lecturer, room: l.room, state: "normal" };
      const x = exc.get(l.id + "|" + d);
      if (!x) { out.push(base); continue; }
      if (x.action === "cancel") { out.push({ ...base, state: "cancelled", note: x.note || "" }); continue; }
      const nd = x.new_date || d;
      const moved = { ...base, date: nd, start: x.new_start || l.start, end: x.new_end || l.end, room: x.new_room || l.room, state: "rescheduled", note: x.note || "", originalDate: d, originalStart: l.start };
      if (nd !== d || moved.start !== l.start) out.push({ ...base, state: "moved", note: x.note || "", movedTo: { date: nd, start: moved.start, end: moved.end, room: moved.room } });
      if (nd >= from && nd <= to) out.push(moved);
    }
  }
  // نقل من تاريخ خارج المدى إلى داخله
  for (const x of exceptions) {
    if (x.action !== "move" || !x.new_date || x.new_date < from || x.new_date > to || (x.date >= from && x.date <= to)) continue;
    const l = lectures.find((y) => y.id === x.lecture_id);
    if (!l) continue;
    out.push({ lecture: l.id, date: x.new_date, start: x.new_start || l.start, end: x.new_end || l.end, subject: l.subject, topic: l.topic, lecturer: l.lecturer, room: x.new_room || l.room, state: "rescheduled", note: x.note || "", originalDate: x.date, originalStart: l.start });
  }
  out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  return out;
}

/* ---------- قاعدة البيانات ---------- */
async function semesterOf(env, userId) {
  const r = await env.DB.prepare("SELECT v FROM user_data WHERE user_id = ? AND k = 'ms.sem'").bind(userId).first();
  try { const v = r ? JSON.parse(r.v) : null; return [1, 2, 3].includes(v) ? v : null; } catch { return null; }
}
async function loadAll(env, sem, onlyPublished) {
  const q = "SELECT * FROM timetable_lectures WHERE semester = ?" + (onlyPublished ? " AND status = 'published'" : "") + " ORDER BY COALESCE(date, ''), weekday, start_time, id";
  const lectures = ((await env.DB.prepare(q).bind(sem).all()).results || []).map(rowToLecture);
  const ids = new Set(lectures.map((l) => l.id));
  const ex = ((await env.DB.prepare("SELECT e.* FROM timetable_exceptions e JOIN timetable_lectures l ON l.id = e.lecture_id WHERE l.semester = ? ORDER BY e.date").bind(sem).all()).results || [])
    .filter((x) => ids.has(x.lecture_id));
  return { lectures, exceptions: ex };
}
async function insertLecture(env, v, sem, status, source, me, now) {
  const r = await env.DB.prepare("INSERT INTO timetable_lectures (semester, subject, topic, lecturer, room, weekday, date, start_time, end_time, valid_from, valid_to, status, source, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(sem, v.subject, v.topic, v.lecturer, v.room, v.weekday, v.date, v.start, v.end, v.from, v.to, status, source, me.id, now, now).run();
  return r.meta.last_row_id;
}
const log = (env, me, action, detail, now) => audit(env, me, null, action, detail, "ok", now);

/* ---------- الاستخراج من صورة/PDF على الخادم (Workers AI) ---------- */
const PROMPT = "This image is a university lecture timetable. Extract every lecture as a JSON array only, no prose. " +
  "Each item: {\"day\": weekday name in English (Saturday..Friday), \"start\": \"HH:MM\" 24h, \"end\": \"HH:MM\" 24h, " +
  "\"subject\": course name exactly as written, \"topic\": lecture title or \"\", \"lecturer\": name or \"\", \"room\": hall/room or \"\"}. " +
  "Keep original spelling. If a cell is empty, skip it. Output only the JSON array.";
export function parseAiRows(text) {
  const s = String(text || "");
  const a = s.indexOf("["), b = s.lastIndexOf("]");
  if (a < 0 || b <= a) return [];
  let arr; try { arr = JSON.parse(s.slice(a, b + 1)); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const DAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, "الأحد": 0, "الاحد": 0, "الاثنين": 1, "الإثنين": 1, "الثلاثاء": 2, "الأربعاء": 3, "الاربعاء": 3, "الخميس": 4, "الجمعة": 5, "السبت": 6 };
  return arr.slice(0, MAX_ROWS).map((x) => {
    const d = DAYS[String(x && x.day || "").trim().toLowerCase()];
    return { repeat: "weekly", weekday: d === undefined ? null : d, start: normTime(x && x.start) || "", end: normTime(x && x.end) || "", subject: clip(x && x.subject, 80), topic: clip(x && x.topic, 140), lecturer: clip(x && x.lecturer, 60), room: clip(x && x.room, 40) };
  }).filter((r) => r.subject);
}
async function runVision(env, bytes) {
  const input = { prompt: PROMPT, image: [...bytes], max_tokens: 2048 };
  try { return await env.AI.run(VISION_MODEL, input); } catch (e) {
    // أول استعمال لهذا النموذج يتطلب قبول رخصته مرة واحدة
    if (/agree/i.test(String(e && e.message))) { await env.AI.run(VISION_MODEL, { prompt: "agree" }); return env.AI.run(VISION_MODEL, input); }
    throw e;
  }
}
async function extract(req, env) {
  if (!env.AI) return fail("ocr_not_configured", 503);
  let form; try { form = await req.formData(); } catch { return fail("bad_request", 400); }
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") return fail("bad_request", 400);
  if (file.size > MAX_FILE) return fail("too_large", 413);
  const type = String(file.type || "");
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    if (type === "application/pdf") {
      // PDF: تحويل إلى نص على الخادم؛ المتصفح يحلّل النص كما يحلّل PDF النصي
      const md = await env.AI.toMarkdown([{ name: "timetable.pdf", blob: new Blob([bytes], { type }) }]);
      const text = (Array.isArray(md) ? md : [md]).map((x) => x && x.data || "").join("\n");
      return json({ ok: true, mode: "text", text: text.slice(0, 60000) });
    }
    if (!/^image\/(png|jpeg|webp)$/.test(type)) return fail("bad_type", 415);
    const out = await runVision(env, bytes);
    return json({ ok: true, mode: "rows", rows: parseAiRows(out && (out.response || out.description || out)) });
  } catch { return fail("ocr_failed", 502); }
}

/* ---------- نقطة الدخول ---------- */
export async function handleTimetable(req, env, opts = {}) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, "");
  if (p !== "/api/timetable" && !p.startsWith("/api/timetable/")) return null;
  if (!env.DB) return fail("not_configured", 503);
  if (req.method !== "GET" && !sameOrigin(req)) return fail("forbidden", 403);
  const now = (opts.now || Date.now)();
  const me = await currentUser(req, env, now);
  const sem = me ? await semesterOf(env, me.id) : null;
  const isAdmin = !!me && me.role === "admin";
  const allowed = isAdmin || TIMETABLE_SEMESTERS.includes(sem);

  if (p === "/api/timetable/access" && req.method === "GET") {
    return json({ ok: true, signedIn: !!me, allowed, admin: isAdmin, semester: sem });
  }
  if (!me) return fail("unauthorized", 401);
  const SEM = TIMETABLE_SEMESTERS[0];

  try {
    if (p === "/api/timetable" && req.method === "GET") {
      if (!allowed) return fail("forbidden", 403);
      const from = url.searchParams.get("from"), to = url.searchParams.get("to");
      if (!validDate(from) || !validDate(to) || to < from || daysBetween(from, to) > MAX_RANGE_DAYS) return fail("bad_range", 400);
      const { lectures, exceptions } = await loadAll(env, SEM, true);
      return json({ ok: true, semester: SEM, from, to, items: expand(lectures, exceptions, from, to) });
    }

    if (!p.startsWith("/api/timetable/admin/")) return fail("not_found", 404);
    if (!isAdmin) return fail("forbidden", 403);
    const action = p.slice("/api/timetable/admin/".length);

    if (action === "list" && req.method === "GET") {
      const all = await loadAll(env, SEM, false);
      return json({ ok: true, semester: SEM, ai: !!env.AI, ...all });
    }
    if (req.method !== "POST") return fail("not_found", 404);
    if (action === "extract") return extract(req, env);

    const b = await readJson(req);
    if (!b) return fail("bad_request", 400);

    if (action === "copyweek") {                      // نسخ محاضرات أسبوع (تواريخ محددة) إلى الأسبوع التالي
      if (!validDate(b.from)) return fail("bad_date", 400);
      const to = addDays(b.from, 6);
      const src = ((await env.DB.prepare("SELECT * FROM timetable_lectures WHERE semester = ? AND date >= ? AND date <= ? ORDER BY date, start_time").bind(SEM, b.from, to).all()).results || []);
      if (!src.length) return fail("nothing_to_copy", 400);
      const exist = ((await env.DB.prepare("SELECT subject, date, start_time FROM timetable_lectures WHERE semester = ? AND date >= ? AND date <= ?").bind(SEM, addDays(b.from, 7), addDays(to, 7)).all()).results || [])
        .map((r) => r.date + "|" + r.start_time + "|" + r.subject);
      let copied = 0, skipped = 0;
      for (const r of src) {
        const d = addDays(r.date, 7);
        if (exist.includes(d + "|" + r.start_time + "|" + r.subject)) { skipped++; continue; }
        await env.DB.prepare("INSERT INTO timetable_lectures (semester, subject, topic, lecturer, room, weekday, date, start_time, end_time, valid_from, valid_to, status, source, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL, ?, 'manual', ?, ?, ?)")
          .bind(SEM, r.subject, r.topic, r.lecturer, r.room, d, r.start_time, r.end_time, b.publish === true ? "published" : "draft", me.id, now, now).run();
        copied++;
      }
      await audit(env, me, null, "timetable_copyweek", { from: b.from, copied, skipped }, "ok", now);
      return json({ ok: true, copied, skipped, status: b.publish === true ? "published" : "draft" });
    }

    if (action === "save") {
      const c = cleanLecture(b);
      if (c.error) return fail(c.error, 400);
      const v = c.value;
      const { lectures } = await loadAll(env, SEM, false);
      const id = Number.isInteger(b.id) ? b.id : null;
      if (id && !lectures.some((l) => l.id === id)) return fail("not_found", 404);
      const conflicts = findConflicts([{ ...v, id }], lectures);
      if (conflicts.length && !b.force) return fail("conflict", 409, { conflicts });
      const status = b.publish === true ? "published" : b.publish === false ? "draft" : null;
      if (id) {
        await env.DB.prepare("UPDATE timetable_lectures SET subject = ?, topic = ?, lecturer = ?, room = ?, weekday = ?, date = ?, start_time = ?, end_time = ?, valid_from = ?, valid_to = ?, status = COALESCE(?, status), updated_at = ? WHERE id = ?")
          .bind(v.subject, v.topic, v.lecturer, v.room, v.weekday, v.date, v.start, v.end, v.from, v.to, status, now, id).run();
        await log(env, me, "timetable_edit", { id, subject: v.subject }, now);
        return json({ ok: true, id, conflicts });
      }
      const newId = await insertLecture(env, v, SEM, status || "draft", "manual", me, now);
      await log(env, me, "timetable_add", { id: newId, subject: v.subject, status: status || "draft" }, now);
      return json({ ok: true, id: newId, conflicts });
    }

    if (action === "delete") {
      if (!Number.isInteger(b.id)) return fail("bad_request", 400);
      const row = await env.DB.prepare("SELECT id, subject FROM timetable_lectures WHERE id = ? AND semester = ?").bind(b.id, SEM).first();
      if (!row) return fail("not_found", 404);
      await env.DB.prepare("DELETE FROM timetable_exceptions WHERE lecture_id = ?").bind(b.id).run();
      await env.DB.prepare("DELETE FROM timetable_lectures WHERE id = ?").bind(b.id).run();
      await log(env, me, "timetable_delete", { id: b.id, subject: row.subject }, now);
      return json({ ok: true });
    }

    if (action === "publish") {
      const to = b.unpublish ? "draft" : "published";
      let changed;
      if (Array.isArray(b.ids) && b.ids.length) {
        const ids = b.ids.filter(Number.isInteger).slice(0, MAX_ROWS);
        if (!ids.length) return fail("bad_request", 400);
        const r = await env.DB.prepare("UPDATE timetable_lectures SET status = ?, updated_at = ? WHERE semester = ? AND id IN (" + ids.map(() => "?").join(",") + ")").bind(to, now, SEM, ...ids).run();
        changed = r.meta.changes;
      } else {
        if (b.unpublish) return fail("bad_request", 400); // إخفاء الكل دفعة واحدة غير مسموح
        const r = await env.DB.prepare("UPDATE timetable_lectures SET status = 'published', updated_at = ? WHERE semester = ? AND status = 'draft'").bind(now, SEM).run();
        changed = r.meta.changes;
      }
      await log(env, me, b.unpublish ? "timetable_unpublish" : "timetable_publish", { count: changed }, now);
      return json({ ok: true, changed });
    }

    if (action === "exception") {
      if (!Number.isInteger(b.lecture_id) || !validDate(b.date)) return fail("bad_request", 400);
      const l = (await loadAll(env, SEM, false)).lectures.find((x) => x.id === b.lecture_id);
      if (!l) return fail("not_found", 404);
      const occurs = l.repeat === "once" ? l.date === b.date : (l.weekday === weekdayOf(b.date) && (!l.from || b.date >= l.from) && (!l.to || b.date <= l.to));
      if (!occurs) return fail("not_on_date", 400);
      if (b.action === "clear") {
        await env.DB.prepare("DELETE FROM timetable_exceptions WHERE lecture_id = ? AND date = ?").bind(l.id, b.date).run();
        await log(env, me, "timetable_restore", { id: l.id, date: b.date }, now);
        return json({ ok: true });
      }
      if (b.action !== "cancel" && b.action !== "move") return fail("bad_request", 400);
      const note = clip(b.note, 140);
      let nd = null, ns = null, ne = null, nr = null;
      if (b.action === "move") {
        nd = b.new_date ? (validDate(b.new_date) ? b.new_date : "x") : null;
        ns = b.new_start ? normTime(b.new_start) : null; ne = b.new_end ? normTime(b.new_end) : null; nr = clip(b.new_room, 40) || null;
        if (nd === "x" || (b.new_start && !ns) || (b.new_end && !ne)) return fail("bad_time", 400);
        if (mins(ne || l.end) <= mins(ns || l.start)) return fail("end_before_start", 400);
        if (!nd && !ns && !ne && !nr) return fail("bad_request", 400);
      }
      await env.DB.prepare("INSERT INTO timetable_exceptions (lecture_id, date, action, new_date, new_start, new_end, new_room, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(lecture_id, date) DO UPDATE SET action = excluded.action, new_date = excluded.new_date, new_start = excluded.new_start, new_end = excluded.new_end, new_room = excluded.new_room, note = excluded.note, created_by = excluded.created_by, created_at = excluded.created_at")
        .bind(l.id, b.date, b.action, nd, ns, ne, nr, note, me.id, now).run();
      await log(env, me, b.action === "cancel" ? "timetable_cancel" : "timetable_move", { id: l.id, subject: l.subject, date: b.date, to: nd || undefined }, now);
      return json({ ok: true });
    }

    if (action === "check" || action === "import") {
      if (!Array.isArray(b.rows) || !b.rows.length || b.rows.length > MAX_ROWS) return fail("bad_request", 400);
      const clean = [], errors = [];
      b.rows.forEach((r, i) => { const c = cleanLecture(r); if (c.error) errors.push({ row: i, error: c.error }); else clean.push({ ...c.value, _i: i }); });
      const { lectures } = await loadAll(env, SEM, false);
      const conflicts = findConflicts(clean, lectures).map((c) => ({ ...c, a: clean[c.a]._i, b: c.b === undefined ? undefined : clean[c.b]._i }));
      if (action === "check") return json({ ok: true, errors, conflicts });
      if (errors.length) return fail("invalid_rows", 400, { errors, conflicts });
      if (conflicts.length && !b.force) return fail("conflict", 409, { conflicts });
      const status = b.publish ? "published" : "draft";
      const ids = [];
      for (const v of clean) ids.push(await insertLecture(env, v, SEM, status, "import", me, now));
      await log(env, me, "timetable_import", { count: ids.length, status }, now);
      return json({ ok: true, ids, status });
    }
    return fail("not_found", 404);
  } catch (e) {
    if (/no such table/i.test(String(e && e.message))) return fail("not_migrated", 503);
    throw e;
  }
}
