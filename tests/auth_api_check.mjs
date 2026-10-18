// node --no-warnings tests/auth_api_check.mjs — دخول Google والجلسات والمزامنة والمشرف على قاعدة D1 وهمية.
import { handleAuth } from "../functions/_lib/auth.js";
import { createMockD1 } from "./mock_d1.mjs";
import { mint, otherKey, fakeFetch, CLIENT_ID } from "./google_token.mjs";

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } };
const env = { DB: createMockD1(), GOOGLE_CLIENT_ID: CLIENT_ID, ADMIN_EMAILS: "boss@x.com" };
const call = async (method, path, body, cookie, extra = {}, e = env) => {
  const headers = { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...extra };
  const res = await handleAuth(new Request("https://medixa.test" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), e, { fetch: fakeFetch });
  const sc = res.headers.get("set-cookie");
  return { status: res.status, body: await res.json(), cookie: sc ? sc.split(";")[0] : null, raw: sc };
};
const login = async (claims, opts) => call("POST", "/api/auth/google", { credential: await mint(claims, opts) });

// الإعداد
let r = await call("GET", "/api/auth/config");
ok(r.body.googleClientId === CLIENT_ID && r.body.ready === true, "config exposes client id");
r = await call("GET", "/api/auth/config", null, null, {}, { DB: env.DB });
ok(r.body.ready === false, "config not ready without client id");
r = await call("POST", "/api/auth/google", { credential: "x" }, null, {}, { DB: env.DB });
ok(r.status === 503, "google login 503 when not configured");

// رموز مرفوضة
for (const [name, args] of [
  ["wrong audience", [{ aud: "other.apps.googleusercontent.com" }]],
  ["wrong issuer", [{ iss: "https://evil.com" }]],
  ["expired", [{ exp: Math.floor(Date.now() / 1000) - 10 }]],
  ["unverified email", [{ email_verified: false }]],
  ["unknown kid", [{}, { kid: "nope" }]],
  ["alg none", [{}, { alg: "none" }]],
  ["bad signature", [{}, { key: await otherKey() }]]
]) { r = await login(...args); ok(r.status === 401, "reject " + name + " got " + r.status); }
r = await call("POST", "/api/auth/google", { credential: "not.a.jwt" });
ok(r.status === 401, "reject garbage");
r = await call("POST", "/api/auth/google", {});
ok(r.status === 400, "missing credential");
ok(env.DB._db.prepare("select count(*) c from users").get().c === 0, "no user created by bad tokens");

// دخول ناجح
r = await login();
ok(r.status === 200 && r.body.user.role === "student" && r.body.user.email === "a@x.com", "login creates student");
ok(/HttpOnly/.test(r.raw) && /SameSite=Lax/.test(r.raw), "cookie flags");
const cookieA = r.cookie;
r = await login({ name: "Ali Renamed" });
ok(r.status === 200 && env.DB._db.prepare("select count(*) c from users").get().c === 1 && r.body.user.name === "Ali Renamed", "same sub reuses account, updates name");
r = await call("GET", "/api/auth/me", null, cookieA);
ok(r.status === 200 && r.body.user.email === "a@x.com", "me ok");
r = await call("GET", "/api/auth/me");
ok(r.status === 401, "me without cookie");
const cols = env.DB._db.prepare("pragma table_info(users)").all().map((c) => c.name).join(",");
ok(!/hash|salt|password/.test(cols), "no password columns: " + cols);

// المزامنة
r = await call("GET", "/api/sync");
ok(r.status === 401, "sync needs login");
r = await call("PUT", "/api/sync", { items: { "ms.fav": { v: ["a", "b"], t: 100 }, "evil.key": { v: 1, t: 1 } } }, cookieA);
ok(r.status === 200 && r.body.data["ms.fav"].v.length === 2 && !r.body.data["evil.key"], "sync put + allowlist");
r = await call("PUT", "/api/sync", { items: { "ms.fav": { v: ["old"], t: 50 } } }, cookieA);
ok(r.body.data["ms.fav"].v.length === 2, "older write does not overwrite");
r = await call("PUT", "/api/sync", { items: { "ms.fav": { v: ["new"], t: 200 } } }, cookieA);
ok(r.body.data["ms.fav"].v[0] === "new", "newer write wins");
r = await call("PUT", "/api/sync", { items: { "ms.study": { v: "x".repeat(300000), t: 1 } } }, cookieA);
ok(r.status === 413, "oversized value rejected");

// حماية الأصل
r = await call("POST", "/api/auth/google", { credential: await mint() }, null, { origin: "https://evil.test" });
ok(r.status === 403, "cross-origin POST blocked");

// المشرف
r = await call("GET", "/api/auth/users", null, cookieA);
ok(r.status === 403, "student cannot list users");
r = await login({ sub: "sub-boss", email: "Boss@x.com", name: "Boss" });
ok(r.body.user.role === "admin", "admin via ADMIN_EMAILS (case-insensitive)");
const cookieB = r.cookie;
r = await call("GET", "/api/auth/users", null, cookieB);
ok(r.status === 200 && r.body.users.length === 2 && !("google_sub" in r.body.users[0]) , "admin lists users without google_sub");
r = await call("POST", "/api/auth/user", { id: 1, active: false }, cookieB);
ok(r.status === 200, "admin disables");
r = await call("GET", "/api/auth/me", null, cookieA);
ok(r.status === 401, "disabled user's session dies");
r = await login();
ok(r.status === 403 && r.body.error === "disabled", "disabled user cannot login");
await call("POST", "/api/auth/user", { id: 1, active: true }, cookieB);
r = await login();
ok(r.status === 200, "re-enabled user logs in");

// خروج
r = await call("POST", "/api/auth/logout", null, cookieB);
r = await call("GET", "/api/auth/me", null, cookieB);
ok(r.status === 401, "logout kills session");

console.log(fails ? fails + " failures" : "AUTH API OK");
process.exit(fails ? 1 : 0);
