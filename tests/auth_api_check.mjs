// node tests/auth_api_check.mjs — يختبر الحسابات والجلسات والمزامنة والمشرف على قاعدة D1 وهمية.
import { handleAuth } from "../functions/_lib/auth.js";
import { createMockD1 } from "./mock_d1.mjs";

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } };
const env = { DB: createMockD1(), REGISTER_CODE: "invite-1234", ADMIN_EMAILS: "boss@x.com" };
let t = 1_000_000;
const call = async (method, path, body, cookie, extra = {}) => {
  const headers = { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...extra };
  const req = new Request("https://medixa.test" + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const res = await handleAuth(req, env, { now: () => t, ip: "1.1.1.1" });
  const sc = res.headers.get("set-cookie");
  return { status: res.status, body: await res.json(), cookie: sc ? sc.split(";")[0] : null, raw: sc };
};

// التسجيل
let r = await call("POST", "/api/auth/register", { email: "a@x.com", name: "Ali", password: "password1", code: "wrong" });
ok(r.status === 403, "bad invite code rejected");
r = await call("POST", "/api/auth/register", { email: "bad", name: "Ali", password: "password1", code: "invite-1234" });
ok(r.status === 400, "bad email rejected");
r = await call("POST", "/api/auth/register", { email: "a@x.com", name: "Ali", password: "short", code: "invite-1234" });
ok(r.status === 400, "weak password rejected");
r = await call("POST", "/api/auth/register", { email: "A@x.com", name: "Ali", password: "password1", code: "invite-1234" });
ok(r.status === 200 && r.body.user.role === "student", "register ok");
ok(/HttpOnly/.test(r.raw) && /SameSite=Lax/.test(r.raw), "cookie flags");
const cookieA = r.cookie;
r = await call("POST", "/api/auth/register", { email: "a@x.com", name: "Ali", password: "password1", code: "invite-1234" });
ok(r.status === 409, "duplicate email");
ok(!JSON.stringify(env.DB._db.prepare("select * from users").all()).includes("password1"), "password not stored");

// me وتسجيل الخروج
r = await call("GET", "/api/auth/me", null, cookieA);
ok(r.status === 200 && r.body.user.email === "a@x.com", "me ok");
r = await call("GET", "/api/auth/me");
ok(r.status === 401, "me without cookie");

// الدخول والقفل
r = await call("POST", "/api/auth/login", { email: "a@x.com", password: "nope" });
ok(r.status === 401, "bad password");
r = await call("POST", "/api/auth/login", { email: "a@x.com", password: "password1" });
ok(r.status === 200 && r.cookie, "login ok");
for (let i = 0; i < 8; i++) await call("POST", "/api/auth/login", { email: "z@x.com", password: "x" });
r = await call("POST", "/api/auth/login", { email: "z@x.com", password: "x" });
ok(r.status === 429, "lockout after repeated failures");
t += 16 * 60 * 1000;
r = await call("POST", "/api/auth/login", { email: "z@x.com", password: "x" });
ok(r.status === 401, "lock expires");

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
r = await call("POST", "/api/auth/login", { email: "a@x.com", password: "password1" }, null, { origin: "https://evil.test" });
ok(r.status === 403, "cross-origin POST blocked");

// المشرف
r = await call("GET", "/api/auth/users", null, cookieA);
ok(r.status === 403, "student cannot list users");
r = await call("POST", "/api/auth/register", { email: "boss@x.com", name: "Boss", password: "password2", code: "invite-1234" });
ok(r.body.user.role === "admin", "admin via ADMIN_EMAILS");
const cookieB = r.cookie;
r = await call("GET", "/api/auth/users", null, cookieB);
ok(r.status === 200 && r.body.users.length === 2 && !("hash" in r.body.users[0]), "admin lists users without secrets");
r = await call("POST", "/api/auth/user", { id: 1, active: false }, cookieB);
ok(r.status === 200, "admin disables");
r = await call("GET", "/api/auth/me", null, cookieA);
ok(r.status === 401, "disabled user's session dies");
r = await call("POST", "/api/auth/login", { email: "a@x.com", password: "password1" });
ok(r.status === 401, "disabled user cannot login");
await call("POST", "/api/auth/user", { id: 1, active: true, password: "newpassword9" }, cookieB);
r = await call("POST", "/api/auth/login", { email: "a@x.com", password: "newpassword9" });
ok(r.status === 200, "admin password reset");

// خروج
r = await call("POST", "/api/auth/logout", null, cookieB);
r = await call("GET", "/api/auth/me", null, cookieB);
ok(r.status === 401, "logout kills session");

console.log(fails ? fails + " failures" : "AUTH API OK");
process.exit(fails ? 1 : 0);
