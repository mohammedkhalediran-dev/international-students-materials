// functions/_lib/pdfnotes.js — مزامنة كتابة الطالب وتظليله وبطاقاته على ملفات PDF مع حسابه (Step 63، بطلب محمد 2026-10-19).
// كل طالب يقرأ ويكتب صفوفه فقط. الملف يُعرَّف ببصمة مساره (24 حرفاً سداسياً يحسبها المتصفح)، والجزء:
//   ink:<صفحة> (خطوط وتظليل ونصوص الصفحة) · study (بطاقات وملاحظات وأقنعة وأسئلة) · layout (هوامش وصفحات فارغة) · occl (أقنعة الحجب)
//
//   GET  /api/pdfnotes?doc=<معرّف>   صفوف الملف [{k, d, t}] + الاستهلاك
//   GET  /api/pdfnotes                الاستهلاك فقط
//   PUT  /api/pdfnotes                {doc, rows:[{k, d, base}]} حفظ بتفاؤل: base = t الذي قرأه الجهاز (أو null لصف جديد).
//                                     إن تغيّر الصف من جهاز آخر ← conflict بلا كتابة، ويدمج المتصفح عند فتح الصفحة التالية.
import { currentUser } from "./auth.js";

export const USER_LIMIT = 5 * 1024 * 1024;   // مجموع ما يحفظه الطالب (محارف)
const ROW_MAX = { ink: 400 * 1024, study: 800 * 1024, layout: 64 * 1024, occl: 400 * 1024 };
const MAX_ROWS = 60;
const MAX_BODY = 4 * 1024 * 1024;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
const fail = (error, status, extra = {}) => json({ ok: false, error, ...extra }, status);
function sameOrigin(req) { const o = req.headers.get("origin"); return !o || o === new URL(req.url).origin; }
const notMigrated = (e) => /no such table|no such column/i.test(String(e && e.message));

export const validDoc = (s) => typeof s === "string" && /^[0-9a-f]{24}$/.test(s);
export function keyKind(k) {
  if (typeof k !== "string") return null;
  if (/^ink:(0|[1-9]\d{0,3})$/.test(k)) return "ink";
  return k === "study" || k === "layout" || k === "occl" ? k : null;
}

async function usage(env, userId) {
  const r = await env.DB.prepare("SELECT COALESCE(SUM(LENGTH(d)), 0) AS bytes, COUNT(DISTINCT doc) AS docs FROM pdf_notes WHERE user_id = ?").bind(userId).first();
  return { bytes: (r && r.bytes) || 0, docs: (r && r.docs) || 0, limit: USER_LIMIT };
}

async function readDoc(env, me, doc) {
  const rows = ((await env.DB.prepare("SELECT k, d, t FROM pdf_notes WHERE user_id = ? AND doc = ? ORDER BY k").bind(me.id, doc).all()).results || []);
  return json({ ok: true, rows: rows.map((r) => ({ k: r.k, d: r.d, t: r.t })), usage: await usage(env, me.id) });
}

async function writeRows(req, env, me, now) {
  const text = await req.text();
  if (text.length > MAX_BODY) return fail("too_large", 413);
  let b; try { b = JSON.parse(text); } catch { b = null; }
  if (!b || !validDoc(b.doc) || !Array.isArray(b.rows) || !b.rows.length || b.rows.length > MAX_ROWS) return fail("bad_request", 400);
  const u = await usage(env, me.id);
  let total = u.bytes;
  const results = [];
  for (const r of b.rows) {
    const k = r && r.k, kind = keyKind(k);
    if (!kind) { results.push({ k: String(k).slice(0, 20), error: "bad_key" }); continue; }
    if (typeof r.d !== "string") { results.push({ k, error: "bad_data" }); continue; }
    if (r.d.length > ROW_MAX[kind]) { results.push({ k, error: "too_large" }); continue; }
    const base = Number.isInteger(r.base) ? r.base : null;
    const cur = await env.DB.prepare("SELECT t, LENGTH(d) AS n FROM pdf_notes WHERE user_id = ? AND doc = ? AND k = ?").bind(me.id, b.doc, k).first();
    const oldLen = cur ? cur.n : 0;
    if (total - oldLen + r.d.length > USER_LIMIT) { results.push({ k, error: "quota" }); continue; }
    const t = Math.max(now, (cur ? cur.t : 0) + 1);
    let changed = 0;
    if (!cur) {
      if (base !== null) { results.push({ k, conflict: true, t: 0 }); continue; }  // الصف غير موجود لكن الجهاز يظنه موجوداً
      const w = await env.DB.prepare("INSERT INTO pdf_notes (user_id, doc, k, d, t) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, doc, k) DO NOTHING").bind(me.id, b.doc, k, r.d, t).run();
      changed = (w.meta && w.meta.changes) || 0;
    } else if (base === cur.t) {
      const w = await env.DB.prepare("UPDATE pdf_notes SET d = ?, t = ? WHERE user_id = ? AND doc = ? AND k = ? AND t = ?").bind(r.d, t, me.id, b.doc, k, cur.t).run();
      changed = (w.meta && w.meta.changes) || 0;
    }
    if (!changed) { const now2 = await env.DB.prepare("SELECT t FROM pdf_notes WHERE user_id = ? AND doc = ? AND k = ?").bind(me.id, b.doc, k).first(); results.push({ k, conflict: true, t: now2 ? now2.t : 0 }); continue; }
    total += r.d.length - oldLen;
    results.push({ k, ok: true, t });
  }
  return json({ ok: true, results, usage: { bytes: total, docs: u.docs, limit: USER_LIMIT } });
}

export async function handlePdfNotes(req, env, opts = {}) {
  const url = new URL(req.url), p = url.pathname.replace(/\/+$/, "");
  if (p !== "/api/pdfnotes") return null;
  if (!env.DB) return fail("not_configured", 503);
  if (req.method !== "GET" && !sameOrigin(req)) return fail("forbidden", 403);
  const now = (opts.now || Date.now)();
  const me = await currentUser(req, env, now);
  if (!me) return fail("unauthorized", 401);
  try {
    if (req.method === "GET") {
      const doc = url.searchParams.get("doc");
      if (!doc) return json({ ok: true, usage: await usage(env, me.id) });
      if (!validDoc(doc)) return fail("bad_request", 400);
      return await readDoc(env, me, doc);
    }
    if (req.method === "PUT") return await writeRows(req, env, me, now);
    return fail("not_found", 404);
  } catch (e) {
    if (notMigrated(e)) return fail("not_migrated", 503);
    throw e;
  }
}
