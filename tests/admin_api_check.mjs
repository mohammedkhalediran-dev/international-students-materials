// node --no-warnings tests/admin_api_check.mjs — Step 53: مركز الإدارة على قاعدة D1 وهمية (لا حسابات حقيقية).
import { handleAuth } from "../functions/_lib/auth.js";
import { csvCell, norm } from "../functions/_lib/admin.js";
import { b64u } from "../functions/_lib/push.js";
import { createMockD1 } from "./mock_d1.mjs";
import { mint, fakeFetch, CLIENT_ID } from "./google_token.mjs";

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log("FAIL", m); } };
async function vapid() {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { VAPID_PUBLIC_KEY: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)), VAPID_PRIVATE_KEY: (await crypto.subtle.exportKey("jwk", kp.privateKey)).d };
}
function setup(dbOpts) {
  const env = { DB: createMockD1(dbOpts), GOOGLE_CLIENT_ID: CLIENT_ID, ADMIN_EMAILS: "boss@x.com,boss2@x.com" };
  const pushed = [];
  const pushFetch = async (endpoint) => { pushed.push(endpoint); return new Response(null, { status: 201 }); };
  const call = async (method, path, body, cookie, extra = {}) => {
    const headers = { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...extra };
    const res = await handleAuth(new Request("https://medixa.test" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env, { fetch: fakeFetch, pushFetch });
    const sc = res.headers.get("set-cookie"); const ct = res.headers.get("content-type") || "";
    return { status: res.status, body: ct.includes("json") ? await res.json() : new TextDecoder("utf-8", { ignoreBOM: true }).decode(await res.arrayBuffer()), headers: res.headers, cookie: sc ? sc.split(";")[0] : null };
  };
  const login = async (claims) => call("POST", "/api/auth/google", { credential: await mint(claims) });
  return { env, call, login, pushed };
}

{
  const { env, call, login, pushed } = setup();
  const boss = (await login({ sub: "sub-boss", email: "boss@x.com", name: "محمد خالد" })).cookie;
  const stu = (await login({ sub: "s1", email: "ahmed@x.com", name: "أحمد علي" })).cookie;
  await login({ sub: "s2", email: "sara@x.com", name: "سارة حسن" });
  await login({ sub: "s3", email: "=cmd@x.com", name: "=HYPERLINK(\"x\")" });
  await call("PUT", "/api/sync", { items: { "ms.sem": { v: 3, t: 10 } } }, stu);

  // 1. only admins
  for (const [m, path] of [["GET", "/api/auth/admin/stats"], ["GET", "/api/auth/admin/users"], ["GET", "/api/auth/admin/user?id=1"], ["GET", "/api/auth/admin/export"], ["GET", "/api/auth/admin/audit"], ["GET", "/api/auth/admin/push"], ["POST", "/api/auth/admin/push-test"], ["POST", "/api/auth/user"]]) {
    ok((await call(m, path, m === "POST" ? { id: 2, active: false } : null, stu)).status === 403, "student refused: " + path);
    ok((await call(m, path, m === "POST" ? { id: 2 } : null)).status === 401, "anonymous refused: " + path);
  }
  ok((await call("POST", "/api/auth/user", { id: 2, active: false }, boss, { origin: "https://evil.test" })).status === 403, "cross-origin admin change refused");

  // 2. stats & list
  let r = await call("GET", "/api/auth/admin/stats", null, boss);
  ok(r.status === 200 && r.body.stats.total === 4 && r.body.stats.active === 4 && r.body.stats.suspended === 0 && r.body.stats.recent === 4 && r.body.stats.byRole.admin === 1 && r.body.stats.bySemester[3] === 1, "stats from the database " + JSON.stringify(r.body.stats));
  r = await call("GET", "/api/auth/admin/users?q=" + encodeURIComponent("احمد"), null, boss);
  ok(r.body.count === 1 && r.body.users[0].email === "ahmed@x.com", "search ignores hamza forms (احمد → أحمد)");
  r = await call("GET", "/api/auth/admin/users?q=SARA", null, boss);
  ok(r.body.count === 1, "search by email, case-insensitive");
  r = await call("GET", "/api/auth/admin/users?sem=3", null, boss);
  ok(r.body.count === 1 && r.body.users[0].semester === 3, "filter by semester");
  r = await call("GET", "/api/auth/admin/users?sem=none&role=student", null, boss);
  ok(r.body.count === 2, "filter: no semester + student");
  r = await call("GET", "/api/auth/admin/users?per=2&page=2", null, boss);
  ok(r.body.pages === 2 && r.body.page === 2 && r.body.users.length === 2 && r.body.users[0].id === 3, "real pagination");
  r = await call("GET", "/api/auth/admin/users?per=2&page=99", null, boss);
  ok(r.body.page === 2, "page clamped");
  ok(!JSON.stringify(r.body).includes("sub-") && !JSON.stringify(r.body).includes("token"), "no google_sub or tokens in list");

  // 3. updates & protections
  r = await call("POST", "/api/auth/user", { id: 1, active: false }, boss);
  ok(r.status === 409 && r.body.error === "self_locked", "admin cannot suspend self");
  r = await call("POST", "/api/auth/user", { id: 1, role: "student" }, boss);
  ok(r.status === 409 && r.body.error === "admin_locked", "admin cannot drop own role");
  r = await call("POST", "/api/auth/user", { id: 2, role: "admin" }, boss);
  ok(r.status === 400, "admin role cannot be granted");
  r = await call("POST", "/api/auth/user", { id: 2, role: "rep" }, stu);
  ok(r.status === 403, "student cannot raise own role");
  r = await call("POST", "/api/auth/user", { id: 2, semester: 7 }, boss);
  ok(r.status === 400, "bad semester rejected");
  r = await call("POST", "/api/auth/user", { id: 2, role: "uploader", semester: 2 }, boss);
  ok(r.status === 200 && r.body.user.role === "uploader" && r.body.user.semester === 2, "role + semester saved");
  r = await call("GET", "/api/sync", null, stu);
  ok(r.body.data["ms.sem"].v === 2 && r.body.data["ms.sem"].t > 10, "semester change reaches the student's sync (newer stamp)");
  await call("PUT", "/api/sync", { items: { "ms.fav": { v: ["x", "y"], t: 5 } } }, stu);
  r = await call("POST", "/api/auth/user", { id: 2, active: false }, boss);
  ok(r.status === 200 && r.body.user.active === false, "suspend");
  ok((await call("GET", "/api/auth/me", null, stu)).status === 401, "suspended: existing session ends at once");
  ok((await login({ sub: "s1", email: "ahmed@x.com" })).status === 403, "suspended: cannot sign in again");
  ok(env.DB._db.prepare("select count(*) c from user_data where user_id = 2").get().c === 2, "suspended: progress and data kept");
  r = await call("GET", "/api/auth/admin/users?status=suspended", null, boss);
  ok(r.body.count === 1 && r.body.users[0].id === 2, "filter suspended");
  r = await call("POST", "/api/auth/user", { id: 2, active: true }, boss);
  ok(r.status === 200 && r.body.user.active === true && (await login({ sub: "s1", email: "ahmed@x.com" })).status === 200, "reactivate and sign in");
  r = await call("GET", "/api/auth/admin/user?id=2", null, boss);
  ok(r.body.user.favorites === 2 && r.body.user.sessions === 1 && r.body.user.linked === "google" && !("google_sub" in r.body.user), "detail: real counts, no google_sub");
  ok((await call("GET", "/api/auth/admin/user?id=99", null, boss)).status === 404, "detail 404");

  // last active admin
  const boss2 = (await login({ sub: "sub-boss2", email: "boss2@x.com", name: "Boss2" })).cookie;
  r = await call("POST", "/api/auth/user", { id: 1, active: false }, boss2);
  ok(r.status === 200, "another admin can be suspended while one remains");
  r = await call("POST", "/api/auth/user", { id: 1, active: true }, boss2);
  env.DB._db.prepare("update users set active = 0 where id = 1").run();
  const boss2Id = env.DB._db.prepare("select id from users where email = 'boss2@x.com'").get().id;
  const boss1 = (await login({ sub: "sub-boss", email: "boss@x.com" }));
  ok(boss1.status === 403, "(setup) admin 1 suspended directly");
  // boss2 is now the only active admin; nobody may suspend it — even itself is blocked by self_locked
  r = await call("POST", "/api/auth/user", { id: boss2Id, active: false }, boss2);
  ok(r.status === 409, "last active admin cannot be suspended");
  env.DB._db.prepare("update users set active = 1 where id = 1").run();

  // 4. CSV
  const bossAgain = (await login({ sub: "sub-boss", email: "boss@x.com" })).cookie;
  r = await call("GET", "/api/auth/admin/export?role=student", null, bossAgain);
  ok(r.status === 200 && /text\/csv/.test(r.headers.get("content-type")) && /attachment; filename="medixa-accounts-\d{4}-\d\d-\d\d\.csv"/.test(r.headers.get("content-disposition")), "csv download headers");
  ok(r.body.charCodeAt(0) === 0xFEFF && r.body.includes("سارة حسن") && !r.body.includes("ahmed@x.com"), "UTF-8 BOM, Arabic, filtered rows only");
  ok(r.body.includes(`"'=HYPERLINK(""x"")"`) && r.body.includes(`"'=cmd@x.com"`), "formula injection neutralised");
  ok(csvCell("+1") === `"'+1"` && csvCell("-x") === `"'-x"` && csvCell("@a") === `"'@a"` && csvCell("a\"b") === `"a""b"` && csvCell(null) === `""`, "csvCell rules");
  ok(norm("أحمدُ  إبراهيم") === norm("احمد ابراهيم"), "Arabic normalisation");

  // 5. audit log
  r = await call("GET", "/api/auth/admin/audit", null, bossAgain);
  const acts = r.body.items.map((i) => i.action + ":" + i.result);
  ok(r.body.available && acts.includes("role:ok") && acts.includes("status:ok") && acts.includes("semester:ok") && acts.includes("export:ok") && acts.includes("status:refused"), "audit records changes, refusals and exports " + acts.join(","));
  const item = r.body.items.find((i) => i.action === "role" && i.result === "ok");
  ok(item.actor_name === "محمد خالد" && item.target_id === 2 && item.detail.from === "student" && item.detail.to === "uploader" && typeof item.at === "number", "audit: who, target, what, when");
  ok(!JSON.stringify(r.body).match(/token|cookie|VAPID|sub-/i), "audit has no secrets");

  // 6. notifications: status + test only to the admin's own devices
  r = await call("GET", "/api/auth/admin/push", null, bossAgain);
  ok(r.body.configured === false && r.body.table === true, "push status: not configured without keys");
  ok((await call("POST", "/api/auth/admin/push-test", {}, bossAgain)).status === 503, "push test refused without keys");
  Object.assign(env, await vapid());
  const sub = (ep) => { const k = crypto.getRandomValues(new Uint8Array(65)); k[0] = 4; return ep; };
  const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const p256dh = b64u(await crypto.subtle.exportKey("raw", kp.publicKey)), auth = b64u(crypto.getRandomValues(new Uint8Array(16)));
  env.DB._db.prepare("insert into push_subs (endpoint, p256dh, auth, semester, user_id, created_at) values (?, ?, ?, 3, 1, 0)").run(sub("https://push.test/boss"), p256dh, auth);
  env.DB._db.prepare("insert into push_subs (endpoint, p256dh, auth, semester, user_id, created_at) values (?, ?, ?, 3, 2, 0)").run("https://push.test/student", p256dh, auth);
  env.DB._db.prepare("insert into push_subs (endpoint, p256dh, auth, semester, user_id, created_at) values (?, ?, ?, 2, NULL, 0)").run("https://push.test/guest", p256dh, auth);
  r = await call("GET", "/api/auth/admin/push", null, bossAgain);
  ok(r.body.configured && r.body.total === 3 && r.body.bySemester[3] === 2 && r.body.bySemester[2] === 1 && r.body.linked === 2 && r.body.mine === 1 && r.body.prefs === true, "push status from real tables " + JSON.stringify(r.body));
  ok(!JSON.stringify(r.body).includes(env.VAPID_PRIVATE_KEY) && !JSON.stringify(r.body).includes("push.test"), "push status shows no keys or endpoints");
  r = await call("POST", "/api/auth/admin/push-test", {}, bossAgain);
  ok(r.status === 200 && r.body.devices === 1 && r.body.sent === 1 && JSON.stringify(pushed) === JSON.stringify(["https://push.test/boss"]), "test push only to the admin's own device " + JSON.stringify(pushed));
}

// 7. before migration 0005: everything still works, audit says unavailable
{
  const { call, login } = setup({ without: ["0005"] });
  const boss = (await login({ sub: "sub-boss", email: "boss@x.com", name: "B" })).cookie;
  ok(boss, "login works before 0005");
  await login({ sub: "s1", email: "a@x.com" });
  let r = await call("GET", "/api/auth/admin/users", null, boss);
  ok(r.status === 200 && r.body.count === 2 && r.body.users[0].lastLogin > 0, "list works; last login from sessions");
  r = await call("POST", "/api/auth/user", { id: 2, role: "rep" }, boss);
  ok(r.status === 200 && r.body.user.role === "rep", "update works without audit table");
  r = await call("GET", "/api/auth/admin/audit", null, boss);
  ok(r.status === 200 && r.body.available === false, "audit reports unavailable instead of failing");
}

console.log(fails ? `ADMIN API FAILED (${fails})` : `ADMIN API OK: ${n} checks`);
process.exit(fails ? 1 : 0);
