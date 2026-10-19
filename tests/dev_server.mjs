// node tests/dev_server.mjs [port] — خادم محلي للاختبار: يقدّم مجلد site ويشغّل دالة الرفع بمخزن في الذاكرة.
// لا يستعمل Netlify ولا الإنترنت. الرموز من UPLOAD_CODES (أو قيمة افتراضية للاختبار فقط).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handle } from "../netlify/lib/core.mjs";
import { createMockStore } from "./mock_store.mjs";
import { handleAuth, uploadAccount, currentUser } from "../functions/_lib/auth.js";
import { handlePush, notify, lectureNotice, b64u } from "../functions/_lib/push.js";
import { createMockD1 } from "./mock_d1.mjs";
import { handleTimetable } from "../functions/_lib/timetable.js";
import { handleGrades } from "../functions/_lib/grades.js";
import { mint, fakeFetch, CLIENT_ID } from "./google_token.mjs";

const SITE = join(fileURLToPath(new URL(".", import.meta.url)), "..", "site");
const PORT = Number(process.argv[2]) || 8772;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf", ".webmanifest": "application/manifest+json" };

const store = createMockStore();
const authEnv = { DB: createMockD1(), GOOGLE_CLIENT_ID: CLIENT_ID, ADMIN_EMAILS: process.env.ADMIN_EMAILS || "boss@x.com", GRADES_SECRET: "dev-only-grades-secret-not-for-production" };
// Web Push للاختبار: مفاتيح VAPID مولّدة عند التشغيل، والإرسال إلى https://push.test/... يُلتقط في الذاكرة (لا إنترنت)
if (process.env.NO_VAPID !== "1") {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  authEnv.VAPID_PUBLIC_KEY = b64u(await crypto.subtle.exportKey("raw", kp.publicKey));
  authEnv.VAPID_PRIVATE_KEY = (await crypto.subtle.exportKey("jwk", kp.privateKey)).d;
}
const pushLog = [];
const pushFetch = async (endpoint, init) => {
  const u = new URL(endpoint);
  if (u.hostname !== "push.test") return new Response(null, { status: 502 });
  pushLog.push({ endpoint, headers: init.headers, body: Buffer.from(init.body).toString("base64") });
  return new Response(null, { status: u.pathname.startsWith("/gone") ? 410 : 201 });
};
const codes = process.env.UPLOAD_CODES || "سارة:test-code-sara,علي:test-code-ali";
const deps = (req) => ({ store, env: (k) => (k === "UPLOAD_CODES" ? codes : undefined), ip: req.socket.remoteAddress, now: () => Date.now(), account: uploadAccount(authEnv) });

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:" + PORT);
  if (url.pathname === "/__test/token") { // للاختبار فقط: رمز Google وهمي موقّع بمفتاح الاختبار
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(await mint({ email: url.searchParams.get("email") || "a@x.com", sub: url.searchParams.get("sub") || "sub-1", name: url.searchParams.get("name") || "Ali Test" }));
    return;
  }
  if (url.pathname === "/__test/pushlog") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(pushLog)); return; }
  if (url.pathname.startsWith("/api/")) {
    const parts = [];
    for await (const c of req) parts.push(c);
    const body = Buffer.concat(parts);
    const rq = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
    let r = (await handleAuth(rq, authEnv, { fetch: fakeFetch, pushFetch })) || (await handleTimetable(rq, authEnv)) || (await handleGrades(rq, authEnv)) || (await handlePush(rq, authEnv, { currentUser }));
    if (!r) {
      r = await handle(rq, deps(req));
      if (req.method === "POST" && /\/api\/(finish|link)$/.test(url.pathname) && r.status === 200) {
        const msg = await lectureNotice(store, ((await r.clone().json().catch(() => ({}))) || {}).entry);
        if (msg) await notify(authEnv, msg, pushFetch);
      }
    }
    res.writeHead(r.status, Object.fromEntries(r.headers));
    if (r.body) for await (const c of r.body) res.write(c);
    res.end();
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = normalize(join(SITE, p));
  if (!file.startsWith(SITE)) { res.writeHead(403); res.end(); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch (e) { res.writeHead(404); res.end("not found"); }
}).listen(PORT, () => console.log("dev server on " + PORT));
