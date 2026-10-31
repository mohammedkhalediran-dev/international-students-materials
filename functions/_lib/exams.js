// functions/_lib/exams.js — التقويم والامتحانات (بطلب محمد 2026-10-31).
// القراءة: لصاحب حساب كورسه الثالث أو للمشرف (مثل الجدول الجامعي). الزائر 401، وطالب كورس آخر 403.
// الإدارة (admin فقط): إضافة/تعديل/حذف.
//
// المسارات:
//   GET  /api/exams/access          هل يحق لي رؤية الامتحانات؟ (لا بيانات)
//   GET  /api/exams                 كل امتحانات الكورس الثالث مرتّبة بالتاريخ
//   POST /api/exams/admin/save      {id?, subject, kind, date, start?, room?, note?}
//   POST /api/exams/admin/delete    {id}
import { currentUser } from "./auth.js";
import { audit } from "./admin.js";
import { validDate, normTime, TIMETABLE_SEMESTERS } from "./timetable.js";
import { notify, audience } from "./push.js";

export const EXAM_KINDS = ["theory", "practical", "quiz", "other"];
const SEM = TIMETABLE_SEMESTERS[0];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
const fail = (error, status, extra = {}) => json({ ok: false, error, ...extra }, status);
async function readJson(req) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return null;
  try { return await req.json(); } catch { return null; }
}
function sameOrigin(req) { const o = req.headers.get("origin"); return !o || o === new URL(req.url).origin; }
async function semesterOf(env, userId) {
  const r = await env.DB.prepare("SELECT v FROM user_data WHERE user_id = ? AND k = 'ms.sem'").bind(userId).first();
  try { const v = r ? JSON.parse(r.v) : null; return [1, 2, 3].includes(v) ? v : null; } catch { return null; }
}

/* تنظيف مدخلات الامتحان (يُفحص في الخادم دائماً) */
export function cleanExam(b) {
  const subject = String(b && b.subject != null ? b.subject : "").trim().slice(0, 120);
  if (!subject) return { error: "subject_required" };
  const kind = EXAM_KINDS.includes(b.kind) ? b.kind : "theory";
  if (!validDate(b.date)) return { error: "bad_date" };
  let start = "";
  if (b.start != null && String(b.start).trim() !== "") { start = normTime(b.start); if (!start) return { error: "bad_time" }; }
  const room = String(b.room || "").trim().slice(0, 80);
  const note = String(b.note || "").trim().slice(0, 200);
  return { value: { subject, kind, date: b.date, start, room, note } };
}
const KIND_AR = { theory: "نظري", practical: "عملي", quiz: "اختبار قصير", other: "امتحان" };
const daysUntil = (date, now) => Math.round((new Date(date + "T00:00:00Z") - new Date(new Date(now).toISOString().slice(0, 10) + "T00:00:00Z")) / 864e5);
/* إشعار الامتحان لطلاب الكورس الثالث (فئة «تبليغ»؛ يحترم تفضيلات كل جهاز) */
export function examMessage(x, now, reminder) {
  const n = daysUntil(x.date, now);
  const when = n <= 0 ? "اليوم" : n === 1 ? "غداً" : "بعد " + n + " أيام";
  return {
    semester: SEM, category: "announcement",
    title: (reminder ? "تذكير · " : "امتحان جديد · ") + x.subject,
    body: (KIND_AR[x.kind] || "امتحان") + " — " + x.date + (x.start ? " " + x.start : "") + (reminder ? " (" + when + ")" : ""),
    url: "exams.html", tag: "exam-" + (x.id || x.date),
    actions: [{ action: "open", title: "افتح الامتحانات", url: "exams.html" }]
  };
}
const rowOut = (r) => ({ id: r.id, subject: r.subject, kind: r.kind, date: r.date, start: r.start_time, room: r.room, note: r.note });

export async function handleExams(req, env, opts = {}) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, "");
  if (p !== "/api/exams" && !p.startsWith("/api/exams/")) return null;
  if (!env.DB) return fail("not_configured", 503);
  if (req.method !== "GET" && !sameOrigin(req)) return fail("forbidden", 403);
  const now = (opts.now || Date.now)();
  const me = await currentUser(req, env, now);
  const sem = me ? await semesterOf(env, me.id) : null;
  const isAdmin = !!me && me.role === "admin";
  const allowed = isAdmin || TIMETABLE_SEMESTERS.includes(sem);

  if (p === "/api/exams/access" && req.method === "GET") return json({ ok: true, signedIn: !!me, allowed, admin: isAdmin, semester: sem });
  if (!me) return fail("unauthorized", 401);

  try {
    if (p === "/api/exams" && req.method === "GET") {
      if (!allowed) return fail("forbidden", 403);
      const rs = await env.DB.prepare("SELECT * FROM exams WHERE semester = ? ORDER BY date, start_time, id").bind(SEM).all();
      return json({ ok: true, semester: SEM, items: (rs.results || []).map(rowOut) });
    }
    if (!p.startsWith("/api/exams/admin/")) return fail("not_found", 404);
    if (!isAdmin) return fail("forbidden", 403);
    if (req.method !== "POST") return fail("not_found", 404);
    const action = p.slice("/api/exams/admin/".length);
    const b = await readJson(req);
    if (!b) return fail("bad_request", 400);

    if (action === "save") {
      const c = cleanExam(b);
      if (c.error) return fail(c.error, 400);
      const v = c.value;
      const id = Number.isInteger(b.id) ? b.id : null;
      if (id) {
        const r = await env.DB.prepare("UPDATE exams SET subject = ?, kind = ?, date = ?, start_time = ?, room = ?, note = ? WHERE id = ? AND semester = ?")
          .bind(v.subject, v.kind, v.date, v.start, v.room, v.note, id, SEM).run();
        if (!r.meta || !r.meta.changes) return fail("not_found", 404);
        await audit(env, me, null, "exam_update", { id, subject: v.subject, date: v.date }, "ok", now);
        return json({ ok: true, id });
      }
      const r = await env.DB.prepare("INSERT INTO exams (semester, subject, kind, date, start_time, room, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(SEM, v.subject, v.kind, v.date, v.start, v.room, v.note, me.id, now).run();
      const nid = r.meta && r.meta.last_row_id;
      await audit(env, me, null, "exam_create", { id: nid, subject: v.subject, date: v.date }, "ok", now);
      let reach = null;
      if (b.notify === true) {                       // إشعار الطلاب بالامتحان الجديد (اختياري، عند الإضافة فقط)
        const msg = examMessage({ id: nid, ...v }, now, false);
        reach = await audience(env, msg).catch(() => 0);
        const task = notify(env, msg, opts.pushFetch || fetch).catch(() => null);
        if (opts.waitUntil) opts.waitUntil(task); else await task;
      }
      return json({ ok: true, id: nid, reach });
    }
    if (action === "remind") {                       // تذكير يدوي بامتحان قائم (لا مجدول تلقائي في Pages)
      if (!Number.isInteger(b.id)) return fail("bad_request", 400);
      const r = await env.DB.prepare("SELECT * FROM exams WHERE id = ? AND semester = ?").bind(b.id, SEM).first();
      if (!r) return fail("not_found", 404);
      const msg = examMessage({ id: r.id, subject: r.subject, kind: r.kind, date: r.date, start: r.start_time }, now, true);
      const reach = await audience(env, msg).catch(() => 0);
      const task = notify(env, msg, opts.pushFetch || fetch).catch(() => null);
      if (opts.waitUntil) opts.waitUntil(task); else await task;
      await audit(env, me, null, "exam_remind", { id: r.id, reach }, "ok", now);
      return json({ ok: true, reach });
    }
    if (action === "delete") {
      if (!Number.isInteger(b.id)) return fail("bad_request", 400);
      const r = await env.DB.prepare("DELETE FROM exams WHERE id = ? AND semester = ?").bind(b.id, SEM).run();
      if (!r.meta || !r.meta.changes) return fail("not_found", 404);
      await audit(env, me, null, "exam_delete", { id: b.id }, "ok", now);
      return json({ ok: true });
    }
    return fail("not_found", 404);
  } catch (e) {
    const msg = String(e && e.message || e);
    if (/no such table/i.test(msg)) return fail("not_migrated", 503);
    return fail("server_error", 500);
  }
}
