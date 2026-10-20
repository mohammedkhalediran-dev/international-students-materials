// node --no-warnings tests/grades_api_check.mjs — Step 57: درجاتي الجامعية على قاعدة D1 وهمية (بيانات وهمية فقط).
import { handleAuth } from "../functions/_lib/auth.js";
import { handleGrades, normPassport, cleanRows, gradeNumber, termStats } from "../functions/_lib/grades.js";
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
  // لا نبحث عن "61" في النص كله: الطوابع الزمنية (مثل 1792461…) قد تحويه
  ok(!rowsA.some((x) => x.grade === "61") && !JSON.stringify(r.body).includes("Beta"), "student does not see another student's grades");
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

{
  // 9. Step 61: الملف الشخصي — الاسم + الجواز مرة واحدة، وربط مسبق تلحقه الدرجات، والرفع برمز الطالب، وقائمة الطلاب
  const { env, call, login } = setup();
  const boss = await login({ sub: "b", email: "boss@x.com", name: "محمد" });
  const gam = await login({ sub: "g", email: "gamma@x.com", name: "G" });
  const del = await login({ sub: "d", email: "delta@x.com", name: "D" });
  const zed = await login({ sub: "z", email: "zed@x.com", name: "Z" });
  let r = await call("GET", "/api/grades/me", null, gam);
  ok(r.body.profile && r.body.profile.complete === false && r.body.profile.passportLinked === false && /^M\d+$/.test(r.body.profile.code), "empty profile reported");
  ok((await call("POST", "/api/grades/profile", { full_name: "Gamma", passport: "G1234567" }, gam)).body.error === "bad_name", "one-word name refused");
  ok((await call("POST", "/api/grades/profile", { full_name: "Gamma 7 Student", passport: "G1234567" }, gam)).body.error === "bad_name", "name with digits refused");
  ok((await call("POST", "/api/grades/profile", { full_name: "Gamma Student" }, gam)).body.error === "bad_passport", "passport required the first time");
  ok((await call("POST", "/api/grades/profile", { full_name: "Gamma Student", passport: "G1234567" }, gam, { origin: "https://evil.test" })).status === 403, "cross-origin profile refused");
  // قبل رفع أي درجات: يُحفظ الملف ويُربط مسبقاً
  r = await call("POST", "/api/grades/profile", { full_name: "Gamma Student", passport: "g-123 4567" }, gam);
  ok(r.status === 200 && r.body.profile.complete && r.body.linked && r.body.batches.length === 0, "profile saved and pre-linked before any upload " + JSON.stringify(r.body));
  const dump = JSON.stringify(env.DB._db.prepare("SELECT * FROM grade_people").all()) + JSON.stringify(env.DB._db.prepare("SELECT * FROM profiles").all());
  ok(!/G1234567|1234567/.test(dump), "no passport stored by profile");
  // حساب آخر بنفس الجواز يُرفض
  r = await call("POST", "/api/grades/profile", { full_name: "Fake Person", passport: "G1234567" }, zed);
  ok(r.status === 409 && r.body.error === "claimed", "another account cannot take a pre-linked passport");
  ok((await call("GET", "/api/grades/me", null, zed)).body.profile.complete === false, "refused account stays incomplete");
  // الاسم قابل للتعديل لاحقاً، والجواز لا يتغير
  r = await call("POST", "/api/grades/profile", { full_name: "Gamma A. Student", passport: "Q9999999" }, gam);
  ok(r.status === 200 && r.body.profile.fullName === "Gamma A. Student", "name editable later; passport ignored once linked");
  // الرفع بالجواز: الدرجات تلحق صاحب الملف تلقائياً
  r = await call("POST", "/api/grades/admin/upload", { title: "Term 1", rows: [{ name: "Gamma Student", passport: "G1234567", course: "Anatomy", grade: "90" }] }, boss);
  ok(r.status === 200 && r.body.alreadyLinked === 1, "upload by passport attaches to the pre-linked profile");
  r = await call("GET", "/api/grades/me", null, gam);
  ok(r.body.batches.length === 1 && r.body.batches[0].rows[0].grade === "90" && r.body.name === "Gamma Student", "student sees grades without typing anything again");
  // قائمة الطلاب ثم الرفع برمز الطالب
  await call("POST", "/api/grades/profile", { full_name: "Delta Student", passport: "D7654321" }, del);
  env.DB._db.prepare("INSERT INTO user_data (user_id, k, v, t) SELECT id, 'ms.sem', '3', 0 FROM users WHERE email = 'delta@x.com'").run();
  ok((await call("GET", "/api/grades/admin/roster", null, gam)).status === 403, "student cannot read roster");
  r = await call("GET", "/api/grades/admin/roster", null, boss);
  const dRow = (r.body.students || []).find((x) => x.email === "delta@x.com");
  ok(r.status === 200 && r.body.students.length === 2 && dRow && dRow.fullName === "Delta Student" && dRow.semester === 3 && dRow.passportLinked, "roster lists profiles with course " + JSON.stringify(r.body));
  ok(!/D7654321|7654321|pass_hash|[0-9a-f]{64}/.test(JSON.stringify(r.body)), "roster has no passport or fingerprint");
  ok(!(r.body.students || []).some((x) => x.email === "zed@x.com"), "incomplete profile not in roster");
  r = await call("POST", "/api/grades/admin/upload", { title: "Term 2", rows: [{ name: "Delta Student", code: dRow.code, course: "Physiology", grade: "77" }, { name: "Gamma Student", passport: "G1234567", course: "Physiology", grade: "81" }] }, boss);
  ok(r.status === 200 && r.body.students === 2 && r.body.alreadyLinked === 2, "upload mixing student code and passport " + JSON.stringify(r.body));
  r = await call("GET", "/api/grades/me", null, del);
  ok(r.body.batches.length === 1 && r.body.batches[0].rows[0].grade === "77", "student code row reaches its owner");
  r = await call("POST", "/api/grades/admin/upload", { title: "Bad", rows: [{ name: "X", code: "M99999", course: "C", grade: "1" }] }, boss);
  ok(r.status === 400 && r.body.error === "unknown_code", "unknown student code refused");
  // فك الربط لسجل بلا درجات يحذفه، فيستطيع صاحب الحق الربط
  const sum = await call("GET", "/api/grades/admin/summary", null, boss);
  ok(sum.body.people.some((p) => p.user && p.user.profileName === "Delta Student"), "summary shows profile name");
}
{
  // 10. بلا جدول الملف الشخصي (0008 غير مطبّق)
  const old = setup({ without: ["0008"] });
  const u = await old.login({ sub: "o", email: "o@x.com", name: "O" });
  ok((await old.call("GET", "/api/grades/me", null, u)).body.error === "not_migrated", "before 0008: not_migrated");
}

{
  // 11. المعدل والرتبة (2026-10-20): متوسط عادي، رتبة بين من اكتملت درجاتهم، بلا أسماء الآخرين
  ok(gradeNumber("13.25") === 13.25 && gradeNumber("١٤") === 14 && gradeNumber("12,5") === 12.5 && gradeNumber("غائب") === null && gradeNumber("") === null && gradeNumber("Absent") === null, "gradeNumber: digits, comma, text");
  const E = (pid, title, course, grade) => ({ pid, title, course, grade });
  const t1 = [
    E(1, "T", "A", "18"), E(1, "T", "B", "16"),          // 17
    E(2, "T", "A", "14"), E(2, "T", "B", "14"),          // 14
    E(3, "T", "A", "16"), E(3, "T", "B", "12"),          // 14 (تعادل مع 2)
    E(4, "T", "A", "10"), E(4, "T", "B", "غائب"),        // غير مكتمل
    E(5, "T", "A", "9")                                  // مادة ناقصة
  ];
  let s1 = termStats(t1, 1)[0];
  ok(s1.average === 17 && s1.rank === 1 && s1.of === 3 && s1.complete && s1.subjects === 2, "top student: average 17, rank 1 of 3 " + JSON.stringify(s1));
  s1 = termStats(t1, 2)[0]; const s3 = termStats(t1, 3)[0];
  ok(s1.rank === 2 && s3.rank === 2 && s1.of === 3 && s3.average === 14, "tie shares the same rank");
  ok(termStats(t1, 4)[0].average === null && termStats(t1, 4)[0].rank === null && termStats(t1, 4)[0].complete === false, "absent in a subject: no average, no rank");
  ok(termStats(t1, 5)[0].average === null && termStats(t1, 5)[0].complete === false, "missing subject: no average, no rank");
  ok(termStats(t1, 99).length === 0, "person without grades in the term gets nothing");
  ok(termStats([E(1, "T", "A", "13.25"), E(1, "T", "B", "14")], 1)[0].average === 13.63, "average rounded to 2 decimals (13.625 → 13.63)");
  ok(termStats([E(1, "T", "A", "10"), E(2, "T", "A", "12")], 1)[0].rank === null, "fewer than 3 ranked: average only, no rank");
  const two = termStats([E(1, "X", "A", "10"), E(1, "Y", "A", "20"), E(2, "X", "A", "5")], 1);
  ok(two.length === 2 && two.find((x) => x.title === "Y").average === 20, "each title is its own term");

  // عبر الخادم: الطالب يرى معدله ورتبته فقط، ودفعتان بالعنوان نفسه تُجمعان في كورس واحد
  const { call, login } = setup();
  const boss = await login({ sub: "b11", email: "boss@x.com", name: "Boss" });
  const stu = await login({ sub: "s11", email: "s11@x.com", name: "S11" });
  const P = ["P1111111", "P2222222", "P3333333", "P4444444"];
  const rowsA = [], rowsB = [];
  [["Rank One", P[0], 18, 16], ["Rank Two", P[1], 14, 14], ["Rank Three", P[2], 12, 12], ["Rank Four", P[3], 10, "غائب"]].forEach(([nm, pp, a, b]) => {
    rowsA.push({ name: nm, passport: pp, course: "Course A", grade: String(a) });
    rowsB.push({ name: nm, passport: pp, course: "Course B", grade: String(b) });
  });
  ok((await call("POST", "/api/grades/admin/upload", { title: "Term X", rows: rowsA }, boss)).status === 200, "term upload part 1");
  let r = await call("POST", "/api/grades/profile", { full_name: "Rank Two", passport: P[1] }, stu);
  r = await call("GET", "/api/grades/me", null, stu);
  let tm = (r.body.terms || [])[0];
  ok(tm && tm.title === "Term X" && tm.average === 14 && tm.rank === 2 && tm.of === 4 && tm.subjects === 1, "student sees average and rank after part 1 " + JSON.stringify(r.body.terms));
  ok((await call("POST", "/api/grades/admin/upload", { title: "Term X", rows: rowsB }, boss)).status === 200, "term upload part 2 (same title)");
  r = await call("GET", "/api/grades/me", null, stu);
  tm = r.body.terms[0];
  ok(r.body.terms.length === 1 && tm.subjects === 2 && tm.average === 14 && tm.rank === 2 && tm.of === 3, "two batches with one title count as one term; absent student drops out of ranking " + JSON.stringify(r.body.terms));
  ok(!/Rank One|Rank Three|Rank Four|P1111111|P3333333/.test(JSON.stringify(r.body)), "response exposes no other student's name or passport");
  const bossMe = await call("GET", "/api/grades/me", null, boss);
  ok(bossMe.status === 200 && bossMe.body.linked === false && !bossMe.body.terms, "unlinked account gets no terms");
}

console.log(fails ? `GRADES FAIL ${fails}/${n}` : `GRADES OK: ${n} checks`);
process.exit(fails ? 1 : 0);
