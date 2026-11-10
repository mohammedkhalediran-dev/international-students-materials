// functions/_lib/assistant.js — المساعد الذكي: POST /api/assistant/ask (يتطلب تسجيل دخول).
// يحتاج ربط Workers AI باسم AI. الحصة اليومية لكل طالب من D1 (جدول ai_quota)، ويمكن ضبط سقف عام GLOBAL_DAILY_UNITS.
import { currentUser } from "./auth.js";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const fail = (error, status, message) => json({ ok: false, error, message }, status);
const clip = (s, n) => String(s == null ? "" : s).slice(0, n);

export const dayKeyOf = (now) => new Date(now + 3 * 3600 * 1000).toISOString().slice(0, 10); // يوم بغداد

const SYSTEM = [
  "أنت مساعد دراسي لطالب طب دولي في جامعة بابل للعلوم الطبية. تجيب بالعربية البسيطة.",
  "اعتمد أولاً على «سياق المحاضرة» المرفق. إن لم يكفِ السياق فاشرح من معرفتك العامة وقل صراحة أن هذا ليس من ملف المحاضرة، ولا تخترع أرقاماً أو مصادر.",
  "قواعد الكتابة (مهمة جداً لأن شاشة الطالب تخلط العربية بالإنجليزية):",
  "- كل مصطلح إنجليزي يُكتب في سطر مستقل (عنواناً بخط غامق)، ثم تحته الشرح العربي. لا تبدأ سطراً عربياً بكلمة إنجليزية ولا تخلط الإنجليزية داخل الجملة العربية.",
  "- بعد كل مصطلح صعب اكتب نطقه بحروف عربية في جزأين أو ثلاثة بشرطة، مثل: هايبو-كوندرياك.",
  "- لا تستعمل اختصاراً أو رقماً وحده (مثل VI أو X)؛ اكتب الاسم الكامل مع رقمه دائماً.",
  "- لكل معلومة مهمة أضف حيلة حفظ قصيرة (تشبيه أو جملة تُحفظ).",
  "- اجعل الجواب قصيراً ومنظماً بنقاط، فالطالب لا يحب النص الطويل."
].join("\n");

function aiText(out) {
  if (!out) return "";
  if (typeof out === "string") return out.trim();
  if (typeof out.response === "string" && out.response.trim()) return out.response.trim();
  const c = out.choices && out.choices[0];
  if (c) { const t = (c.message && c.message.content) || c.text; if (typeof t === "string" && t.trim()) return t.trim(); }
  if (typeof out.output_text === "string" && out.output_text.trim()) return out.output_text.trim();
  if (Array.isArray(out.output)) {
    const parts = [];
    for (const it of out.output) if (it && it.type === "message" && Array.isArray(it.content)) for (const x of it.content) if (x && typeof x.text === "string") parts.push(x.text);
    if (parts.join("").trim()) return parts.join("").trim();
  }
  return "";
}

async function runModels(env, messages) {
  // الأقوى أولاً ثم الأخف؛ إن تعذّر نموذج (حصة، ضغط) ننتقل للتالي
  const models = [env.CF_AI_MODEL || "@cf/openai/gpt-oss-120b", "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct-fp8"]
    .filter((m, i, a) => a.indexOf(m) === i);
  let last;
  for (const model of models) {
    try {
      const text = aiText(await env.AI.run(model, { messages, max_tokens: 1800 }));
      if (text) return text;
      last = new Error("empty_response");
    } catch (e) { last = e; }
  }
  throw last;
}

export async function handleAssistant(req, env, opts = {}) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, "");
  if (!p.startsWith("/api/assistant/")) return null;
  if (!env.DB) return fail("not_configured", 503, "الخدمة غير مفعّلة.");
  const now = (opts.now || Date.now)();
  const user = await (opts.currentUser || currentUser)(req, env, now);
  if (!user) return fail("unauthorized", 401, "سجّل الدخول لاستخدام المساعد.");
  const limit = Number(env.DAILY_QUOTA_UNITS) > 0 ? Number(env.DAILY_QUOTA_UNITS) : 30;
  const day = dayKeyOf(now);

  if (p === "/api/assistant/me" && req.method === "GET") {
    const r = await env.DB.prepare("SELECT used FROM ai_quota WHERE user_id=? AND day_key=?").bind(user.id, day).first();
    const used = Number((r && r.used) || 0);
    return json({ ok: true, quota: { limit, used, remaining: Math.max(0, limit - used) } });
  }
  if (p !== "/api/assistant/ask" || req.method !== "POST") return fail("not_found", 404);

  const origin = req.headers.get("origin");
  if (origin && origin !== url.origin) return fail("forbidden", 403);
  let b = null;
  try { b = await req.json(); } catch { /* فارغ */ }
  const question = clip(b && b.question, 600).trim();
  if (!question) return fail("bad_request", 400, "اكتب سؤالك.");
  if (!env.AI) return fail("ai_not_configured", 503, "المساعد الذكي غير مفعّل بعد على الخادم.");

  const globalCap = Number(env.GLOBAL_DAILY_UNITS) > 0 ? Number(env.GLOBAL_DAILY_UNITS) : 0;
  if (globalCap) {
    const g = await env.DB.prepare("SELECT COALESCE(SUM(used),0) AS n FROM ai_quota WHERE day_key=?").bind(day).first();
    if (Number((g && g.n) || 0) >= globalCap) return fail("busy", 429, "المساعد مزدحم حالياً. حاول لاحقاً.");
  }
  // حجز ذرّي لوحدة واحدة: لا يتجاوز الطالب حده بطلبات متوازية
  await env.DB.prepare("INSERT OR IGNORE INTO ai_quota(user_id, day_key, used) VALUES(?,?,0)").bind(user.id, day).run();
  const got = await env.DB.prepare("UPDATE ai_quota SET used = used + 1 WHERE user_id=? AND day_key=? AND used < ?").bind(user.id, day, limit).run();
  if (got && got.meta && got.meta.changes === 0) return fail("quota", 429, "انتهت حصتك اليومية من الأسئلة. عد غداً.");

  const course = clip(b.courseName, 120), lecture = clip(b.lectureTitle, 160), context = clip(b.context, 6000);
  const history = (Array.isArray(b.history) ? b.history : []).slice(-6)
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: clip(m.content, 1200) }));
  const ctx = [course && "المادة: " + course, lecture && "المحاضرة: " + lecture, context && "سياق المحاضرة:\n" + context].filter(Boolean).join("\n");
  try {
    const answer = await runModels(env, [{ role: "system", content: SYSTEM + (ctx ? "\n\n" + ctx : "") }, ...history, { role: "user", content: question }]);
    const r = await env.DB.prepare("SELECT used FROM ai_quota WHERE user_id=? AND day_key=?").bind(user.id, day).first();
    const used = Number((r && r.used) || 0);
    return json({ ok: true, answer, quota: { limit, used, remaining: Math.max(0, limit - used) } });
  } catch (e) {
    console.error("assistant", String(e && e.message).slice(0, 200));
    await env.DB.prepare("UPDATE ai_quota SET used = MAX(0, used - 1) WHERE user_id=? AND day_key=?").bind(user.id, day).run(); // لا نخصم عن فشل
    return fail("ai_failed", 502, "تعذّر الحصول على جواب الآن. حاول بعد قليل.");
  }
}
