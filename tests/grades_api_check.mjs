// node --no-warnings tests/grades_api_check.mjs — Step 57: درجاتي الجامعية على قاعدة D1 وهمية (بيانات وهمية فقط).
import { handleAuth } from "../functions/_lib/auth.js";
import { handleGrades, normPassport, cleanRows } from "../functions/_lib/grades.js";
import { createMockD1 } from "./mock_d1.mjs";
import { mint, fakeFetch, CLIENT_ID } from "./google_token.mjs";

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log("FAIL", m); } };
const SECRET = "test-secret-0123456789-abcdef";

function setup(dbOpts, extraEnv = {}) {
  const env = { DB: createMockD1(dbOpts), GOOGLE_CLIENT_ID: CLIENT_ID, ADMIN_EMAILS: "boss@x.com", GRADES_SECRET: SECRET, ...extraEnv };
  let clock = Date.now();
  const call = async (method, path, body, cookie, extra = {}) => {
    const headers = { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...extra };
    const req = new Request("https://medixa.test" + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const res = /^\/api\/(auth|sync)/.test(path) ? await handleAuth(req, env, { fetch: fakeFetch }) : await handleGrades(req, env, { now: () => clock });
    const sc = res.headers.get("set-cookie");
    return { status: res.status, body: await res.json().catch(() => ({})), cookie: sc ? sc.split(";")[0] : null };
  };
  const login = async (claims) => (await call("POST", "/api/auth/google", { credential: await mint(claims) })).cookie;
  return { env, call, login, tick: (ms) => { clock += ms; } };
}

// بيانات وهمية: لا أسماء ولا أرقام جواز حقيقية
const ROWS = [
  { name: "Student Alpha", passport: "X1234567", course: "Physiology of Kidney", grade: "88" },
  { name: "Student Alpha", passport: "X1234567", course: "Medical immunology", grade: "74" },
  { name: "Student Beta", passport: "Y7654321", course: "Physiology of Kidney", grade: "61" },
  { name: "Student Beta", passport: "Y7654321", course: "Medical immunology", grade: "Absent" }
];

// 0. وحدات صغيرة
ok(normPassport(" x-123 4567 ") === "X1234567", "passport normalised (case, spaces, dashes)");
ok(normPassport("Y٧٦٥٤٣٢١") === "Y7654321" && normPassport("Y۷۶۵۴۳۲۱") === "Y7654321", "Arabic and Persian digits normalised");
ok(normPassport("ab") === null && normPassport("") === null && normPassport("X12345678901234567890") === null, "too short/long rejected");
ok(cleanRows([{ name: "A", passport: "X1234567", course: "C", grade: "" }]).error === "invalid_rows", "row without grade rejected");
ok(cleanRows([{ name: "A", passport: "X1234567", course: "C", grade: "1" }, { name: "B", passport: "x1234567", course: "D", grade: "2" }]).error === "name_mismatch", "two names for one passport rejected");
ok(cleanRows([]).error === "empty", "empty file rejected");

{
  const { env, call, login, tick } = setup();
  const boss = await login({ sub: "b", email: "boss@x.com", name: "محمد" });
  const alpha = await login({ sub: "a", email: "alpha@x.com", name: "Alpha" });
  const beta = await login({ sub: "be", email: "beta@x.com", name: "Beta" });
  const eve = await login({ sub: "e", email: "eve@x.com", name: "Eve" });

  // 1. الصلاحيات في الخادم
  for (const [m, p] of [["GET", "/api/grades/me"], ["POST", "/api/grades/claim"], ["GET", "/api/grades/admin/summary"], ["POST", "/api/grades/admin/upload"], ["POST", "/api/grades/admin/delete-batch"], ["POST", "/api/grades/admin/unlink"]]) {
    ok((await call(m, p, m === "POST" ? {} : null)).status === 401, "guest refused: " + p);
  }
  for (const [m, p] of [["GET", "/api/grades/admin/summary"], ["POST", "/api/grades/admin/upload"], ["POST", "/api/grades/admin/delete-batch"], ["POST", "/api/grades/admin/unlink"]]) {
    ok((await call(m, p, m === "POST" ? { id: 1, person_id: 1, title: "x", rows: ROWS } : null, alpha)).status === 403, "student cannot manage: " + p);
  }
  ok((await call("POST", "/api/grades/admin/upload", { title: "T", rows: ROWS }, boss, { origin: "https://evil.test" })).status === 403, "cross-origin upload refused");
  ok((await call("POST", "/api/grades/claim", { passport: "X1234567" }, alpha, { origin: "https://evil.test" })).status === 403, "cross-origin claim refused");

  // 2. الرفع
  ok((await call("POST", "/api/grades/admin/upload", { title: " ", rows: ROWS }, boss)).body.error === "title_required", "title required");
  let r = await call("POST", "/api/grades/admin/upload", { title: "Course 3 — 2025/2026", rows: ROWS }, boss);
  ok(r.status === 200 && r.body.students === 2 && r.body.rows === 4, "upload counts " + JSON.stringify(r.body));

  // لا رقم جواز في أي جدول، والبصمة ليست SHA-256 بسيطاً للرقم
  const db = env.DB._db;
  const dump = JSON.stringify(["grade_people", "grade_entries", "grade_batches", "audit_log", "grade_attempts"].map((t) => db.prepare("SELECT * FROM " + t).all()));
  ok(!/X1234567|Y7654321|1234567|7654321/.test(dump), "no passport number stored anywhere");
  const plainSha = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("X1234567"))), (b) => b.toString(16).padStart(2, "0")).join("");
  ok(!dump.includes(plainSha), "fingerprint is keyed (not a plain hash)");

  // 3. الربط
  r = await call("GET", "/api/grades/me", null, alpha);
  ok(r.status === 200 && r.body.linked === false, "not linked before claim");
  r = await call("POST", "/api/grades/claim", { passport: "Z0000000" }, alpha);
  ok(r.status === 404 && r.body.error === "not_found", "unknown passport");
  r = await call("POST", "/api/grades/claim", { passport: " x-123 4567 " }, alpha);
  ok(r.status === 200 && r.body.linked === true && r.body.name === "Student Alpha", "claim with differently written passport links");
  const rowsA = (r.body.batches || []).flatMap((b) => b.rows);
  ok(rowsA.length === 2 && rowsA.every((x) => ["Physiology of Kidney", "Medical immunology"].includes(x.course)) && rowsA.some((x) => x.grade === "88"), "student sees own grades");
  ok(!JSON.stringify(r.body).includes("61") && !JSON.stringify(r.body).includes("Beta"), "student does not see another student's grades");
  ok((await call("POST", "/api/grades/claim", { passport: "Y7654321" }, alpha)).body.error === "already_linked", "one account links once");
  r = await call("POST", "/api/grades/claim", { passport: "X1234567" }, eve);
  ok(r.status === 409 && r.body.error === "claimed", "second account cannot take a linked passport");
  ok((await call("GET", "/api/grades/me", null, eve)).body.linked === false, "failed claimer still sees nothing");
  r = await call("POST", "/api/grades/claim", { passport: "Y٧٦٥٤٣٢١" }, beta);
  ok(r.status === 200 && r.body.batches[0].rows.some((x) => x.grade === "Absent"), "beta links with Arabic digits");

  // 4. محاولات محدودة
  const mallory = await login({ sub: "m", email: "m@x.com", name: "M" });
  let last;
  for (let i = 0; i < 6; i++) last = await call("POST", "/api/grades/claim", { passport: "Q00000" + i + "0" }, mallory);
  ok(last.status === 429 && last.body.error === "too_many_attempts", "guessing is rate limited");
  tick(3600 * 1000 + 1);
  ok((await call("POST", "/api/grades/claim", { passport: "Q0000099" }, mallory)).status === 404, "limit resets after an hour");
  for (let i = 0; i < 10; i++) { tick(13 * 60 * 1000); last = await call("POST", "/api/grades/claim", { passport: "Q11111" + i + "1" }, mallory); }
  ok(last.status === 429, "daily cap");

  // 5. دفعة جديدة تُضاف تلقائياً لمن رُبط، والحذف
  r = await call("POST", "/api/grades/admin/upload", { title: "Re-sit", rows: [{ name: "Student Alpha", passport: "X1234567", course: "Medical immunology", grade: "81" }] }, boss);
  ok(r.status === 200 && r.body.alreadyLinked === 1, "new batch attaches to linked student");
  r = await call("GET", "/api/grades/me", null, alpha);
  ok(r.body.batches.length === 2 && r.body.batches[0].title === "Re-sit", "student sees both batches, newest first");
  const sum = await call("GET", "/api/grades/admin/summary", null, boss);
  ok(sum.status === 200 && sum.body.batches.length === 2 && sum.body.people.length === 2, "summary");
  ok(!/pass_hash|passport|X1234567/.test(JSON.stringify(sum.body)) && !/[0-9a-f]{64}/.test(JSON.stringify(sum.body)), "summary exposes no passport or fingerprint");
  ok(sum.body.people.find((p) => p.name === "Student Alpha").user.email === "alpha@x.com", "admin sees which account is linked");
  const resit = sum.body.batches.find((b) => b.title === "Re-sit");
  ok((await call("POST", "/api/grades/admin/delete-batch", { id: resit.id }, boss)).status === 200, "delete batch");
  ok((await call("GET", "/api/grades/me", null, alpha)).body.batches.length === 1, "deleted batch gone for student");

  // 6. فك الربط يسمح لصاحب الحق
  const alphaPerson = sum.body.people.find((p) => p.name === "Student Alpha");
  ok((await call("POST", "/api/grades/admin/unlink", { person_id: alphaPerson.id }, boss)).body.changed === 1, "admin unlinks");
  ok((await call("GET", "/api/grades/me", null, alpha)).body.linked === false, "unlinked student no longer sees grades");
  r = await call("POST", "/api/grades/claim", { passport: "X1234567" }, eve);
  ok(r.status === 200 && r.body.name === "Student Alpha", "after unlink, another account can link");

  // 7. السجل بلا أرقام جواز
  const log = JSON.stringify(db.prepare("SELECT * FROM audit_log").all());
  ok(/grades_upload/.test(log) && /grades_link/.test(log) && /grades_unlink/.test(log) && /grades_claim_conflict/.test(log), "actions audited");
  ok(!/X1234567|Y7654321/.test(log), "audit log has no passport");
}

{
  // 8. بلا مفتاح سري أو بلا الجدول
  const { call, login } = setup({}, { GRADES_SECRET: "" });
  const s = await login({ sub: "s", email: "s@x.com", name: "S" });
  const r = await call("GET", "/api/grades/me", null, s);
  ok(r.status === 503 && r.body.missing === "GRADES_SECRET", "no secret: 503, nothing stored without a key");
  const short = setup({}, { GRADES_SECRET: "short" });
  ok((await short.call("GET", "/api/grades/me", null, await short.login({ sub: "t", email: "t@x.com", name: "T" }))).status === 503, "weak secret refused");
  const old = setup({ without: ["0007"] });
  const u = await old.login({ sub: "o", email: "o@x.com", name: "O" });
  ok((await old.call("GET", "/api/grades/me", null, u)).body.error === "not_migrated", "before migration: not_migrated");
}

console.log(fails ? `GRADES FAIL ${fails}/${n}` : `GRADES OK: ${n} checks`);
process.exit(fails ? 1 : 0);
