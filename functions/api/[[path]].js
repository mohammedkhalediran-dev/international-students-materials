// functions/api/[[path]].js — نقطة دخول Cloudflare Pages Functions لمسارات /api/*.
// يتطلب ربط KV باسم LECTURES وسرّ UPLOAD_CODES من لوحة Cloudflare. بدون الربط: القائمة فارغة وبقية المسارات 503.
import { handle } from "../../netlify/lib/core.mjs";
import { kvStore } from "../_lib/kvstore.js";
import { handleAuth, uploadAccount, currentUser } from "../_lib/auth.js";
import { handlePush, notify, lectureMessage } from "../_lib/push.js";

export async function onRequest({ request, env, waitUntil }) {
  const authRes = await handleAuth(request, env, { ip: request.headers.get("CF-Connecting-IP") || "", waitUntil });
  if (authRes) return authRes;
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
  // محاضرة جديدة رُفعت: إشعار لطلاب كورسها فقط (لا يؤخّر الرد)
  const path = new URL(request.url).pathname;
  if (request.method === "POST" && /\/api\/(finish|link)$/.test(path) && res.status === 200) {
    const msg = lectureMessage(((await res.clone().json().catch(() => ({}))) || {}).entry);
    if (msg) waitUntil(notify(env, msg).catch(() => null));
  }
  return res;
}
