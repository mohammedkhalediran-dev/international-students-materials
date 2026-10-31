// functions/api/[[path]].js — نقطة دخول Cloudflare Pages Functions لمسارات /api/*.
// يتطلب ربط KV باسم LECTURES وسرّ UPLOAD_CODES من لوحة Cloudflare. بدون الربط: القائمة فارغة وبقية المسارات 503.
import { handle } from "../../netlify/lib/core.mjs";
import { kvStore } from "../_lib/kvstore.js";
import { handleAuth, uploadAccount, currentUser } from "../_lib/auth.js";
import { handlePush, notify, lectureNotice } from "../_lib/push.js";
import { handleTimetable } from "../_lib/timetable.js";
import { handleExams } from "../_lib/exams.js";
import { handleGrades } from "../_lib/grades.js";
import { handlePdfNotes } from "../_lib/pdfnotes.js";
import { handleAi } from "../_lib/ai.js";

export async function onRequest({ request, env, waitUntil }) {
  const authRes = await handleAuth(request, env, { ip: request.headers.get("CF-Connecting-IP") || "", waitUntil });
  if (authRes) return authRes;
  const ttRes = await handleTimetable(request, env); // الجدول الجامعي: الكورس الثالث والمشرف فقط
  if (ttRes) return ttRes;
  const exRes = await handleExams(request, env); // التقويم والامتحانات: الكورس الثالث والمشرف فقط
  if (exRes) return exRes;
  const grRes = await handleGrades(request, env); // درجاتي الجامعية: كل طالب درجاته فقط، والرفع للمشرف (رقم الجواز لا يُخزَّن)
  if (grRes) return grRes;
  const pnRes = await handlePdfNotes(request, env); // كتابة الطالب وتظليله على ملفات PDF: صفوفه هو فقط (Step 63)
  if (pnRes) return pnRes;
  const aiRes = await handleAi(request, env, { currentUser }); // ترجمة/شرح النص المحدد في قارئ PDF (Workers AI، للمسجّل دخوله فقط)
  if (aiRes) return aiRes;
  const pushRes = await handlePush(request, env, { currentUser });
  if (pushRes) return pushRes;
  if (!env.LECTURES) {
    const path = new URL(request.url).pathname;
    if (path.endsWith("/api/uploads.js")) {
      return new Response("window.UPLOADS = [];", {
        headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" }
      });
    }
    return new Response(JSON.stringify({ error: "not_configured" }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
  const res = await handle(request, {
    store: kvStore(env.LECTURES),
    env: (k) => env[k],
    ip: request.headers.get("CF-Connecting-IP") || "",
    now: () => Date.now(),
    account: uploadAccount(env) // رفع بالحساب لدور رافع أو ممثل الدفعة أو مشرف
  });
  // محاضرة أو أسئلة جديدة رُفعت: إشعار لطلاب كورسها فقط، بلا تكرار، ومجمّع لنفس المادة (لا يؤخّر الرد)
  const path = new URL(request.url).pathname;
  if (request.method === "POST" && /\/api\/(finish|link)$/.test(path) && res.status === 200) {
    const entry = ((await res.clone().json().catch(() => ({}))) || {}).entry;
    waitUntil(lectureNotice(kvStore(env.LECTURES), entry).then((msg) => msg && notify(env, msg)).catch(() => null));
  }
  return res;
}
