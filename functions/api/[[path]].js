// functions/api/[[path]].js — نقطة دخول Cloudflare Pages Functions لكل مسارات /api/.
// يحتاج ربط (Binding) من نوع KV باسم LECTURES، وسراً (Secret) باسم UPLOAD_CODES. التفاصيل في README.md.
import { handle } from "../../lib/upload-core.mjs";
import { kvStore } from "../../lib/kv-store.mjs";

export async function onRequest(context) {
  const { request, env } = context;
  return handle(request, {
    store: env.LECTURES ? kvStore(env.LECTURES) : null,
    env: (k) => env[k],
    ip: request.headers.get("cf-connecting-ip"),
    now: () => Date.now()
  });
}
