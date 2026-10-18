// node tests/middleware_check.mjs — تقييد الموقع بالدخول عند REQUIRE_LOGIN=1.
import { onRequest } from "../functions/_middleware.js";
import { handleAuth } from "../functions/_lib/auth.js";
import { createMockD1 } from "./mock_d1.mjs";
import { mint, fakeFetch, CLIENT_ID } from "./google_token.mjs";

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } };
const DB = createMockD1();
const run = (env, path, headers = {}) =>
  onRequest({ request: new Request("https://m.test" + path, { headers }), env, next: async () => new Response("PASSED") });
const text = async (r) => r.status === 302 ? "redirect:" + r.headers.get("location") : r.status + ":" + (await r.text());

ok((await text(await run({}, "/index.html"))).endsWith("PASSED"), "off by default");
ok((await text(await run({ REQUIRE_LOGIN: "1" }, "/index.html"))).endsWith("PASSED"), "no DB bound -> stays open");

const env = { DB, REQUIRE_LOGIN: "1" };
const html = { accept: "text/html" };
ok((await text(await run(env, "/index.html", html))) === "redirect:https://m.test/login.html?next=%2Findex.html", "page redirects to login");
ok((await text(await run(env, "/files/x/a.pdf"))).startsWith("401"), "pdf blocked without login");
for (const p of ["/login.html", "/css/style.css", "/js/auth.js", "/assets/icon-192.png", "/api/auth/login", "/sw.js"])
  ok((await text(await run(env, p, html))).endsWith("PASSED"), "open path " + p);

const envG = { ...env, GOOGLE_CLIENT_ID: CLIENT_ID };
const reg = await handleAuth(new Request("https://m.test/api/auth/google", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ credential: await mint() }) }), envG, { fetch: fakeFetch });
const cookie = reg.headers.get("set-cookie").split(";")[0];
ok((await text(await run(env, "/files/x/a.pdf", { cookie }))).endsWith("PASSED"), "logged-in user passes");
console.log(fails ? fails + " failures" : "MIDDLEWARE OK");
process.exit(fails ? 1 : 0);
