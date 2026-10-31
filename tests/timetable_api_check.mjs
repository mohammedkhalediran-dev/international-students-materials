// node --no-warnings tests/timetable_api_check.mjs — Step 55: الجدول الجامعي على قاعدة D1 وهمية (لا حسابات حقيقية).
import { handleAuth } from "../functions/_lib/auth.js";
import { handleTimetable, expand, findConflicts, parseAiRows, normTime } from "../functions/_lib/timetable.js";
import { createMockD1 } from "./mock_d1.mjs";
import { mint, fakeFetch, CLIENT_ID } from "./google_token.mjs";

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log("FAIL", m); } };

function setup(dbOpts, extraEnv = {}) {
  const env = { DB: createMockD1(dbOpts), GOOGLE_CLIENT_ID: CLIENT_ID, ADMIN_EMAILS: "boss@x.com", ...extraEnv };
  const call = async (method, path, body, cookie, extra = {}) => {
    const headers = { ...(body instanceof FormData ? {} : { "content-type": "application/json" }), ...(cookie ? { cookie } : {}), ...extra };
    const req = new Request("https://medixa.test" + path, { method, headers, body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined });
    const res = /^\/api\/(auth|sync)/.test(path) ? await handleAuth(req, env, { fetch: fakeFetch }) : await handleTimetable(req, env);
    const sc = res.headers.get("set-cookie");
    return { status: res.status, body: await res.json().catch(() => ({})), cookie: sc ? sc.split(";")[0] : null };
  };
  const login = async (claims) => (await call("POST", "/api/auth/google", { credential: await mint(claims) })).cookie;
  return { env, call, login };
}

const L = (o) => ({ subject: "Pediatrics", topic: "Neonatal Medicine", lecturer: "د. أحمد", room: "A", repeat: "weekly", weekday: 1, start: "09:00", end: "10:30", ...o });

{
  const { env, call, login } = setup();
  const boss = await login({ sub: "b", email: "boss@x.com", name: "محمد" });
  const s3 = await login({ sub: "s3", email: "s3@x.com", name: "طالب ثالث" });
  const s2 = await login({ sub: "s2", email: "s2@x.com", name: "طالب ثاني" });
  const none = await login({ sub: "s0", email: "s0@x.com", name: "بلا كورس" });
  await call("PUT", "/api/sync", { items: { "ms.sem": { v: 3, t: 5 } } }, s3);
  await call("PUT", "/api/sync", { items: { "ms.sem": { v: 2, t: 5 } } }, s2);
  const range = "/api/timetable?from=2026-10-18&to=2026-10-24";

  // 1. access is enforced on the server
  ok((await call("GET", range)).status === 401, "guest refused (401)");
  ok((await call("GET", range, null, s2)).status === 403, "course 2 student refused (403)");
  ok((await call("GET", range, null, none)).status === 403, "student without course refused");
  ok((await call("GET", range, null, s3)).status === 200, "course 3 student allowed");
  ok((await call("GET", range, null, boss)).status === 200, "admin allowed");
  let a = await call("GET", "/api/timetable/access");
  ok(a.status === 200 && a.body.allowed === false && a.body.signedIn === false, "access probe for guest");
  a = await call("GET", "/api/timetable/access", null, s3);
  ok(a.body.allowed === true && a.body.admin === false, "access probe for course 3");
  for (const [m, p] of [["GET", "/api/timetable/admin/list"], ["POST", "/api/timetable/admin/save"], ["POST", "/api/timetable/admin/delete"], ["POST", "/api/timetable/admin/publish"], ["POST", "/api/timetable/admin/exception"], ["POST", "/api/timetable/admin/import"], ["POST", "/api/timetable/admin/check"]]) {
    ok((await call(m, p, m === "POST" ? { id: 1 } : null, s3)).status === 403, "student cannot manage: " + p);
    ok((await call(m, p, m === "POST" ? { id: 1 } : null)).status === 401, "guest cannot manage: " + p);
  }
  ok((await call("POST", "/api/timetable/admin/save", L(), boss, { origin: "https://evil.test" })).status === 403, "cross-origin write refused");
  ok((await call("GET", "/api/timetable?from=2026-10-18&to=2027-10-18", null, s3)).status === 400, "range limited");

  // 2. create, validation, drafts hidden until published
  ok((await call("POST", "/api/timetable/admin/save", L({ end: "08:00" }), boss)).body.error === "end_before_start", "end before start rejected");
  ok((await call("POST", "/api/timetable/admin/save", L({ subject: "  " }), boss)).body.error === "subject_required", "subject required");
  let r = await call("POST", "/api/timetable/admin/save", L(), boss);
  ok(r.status === 200 && r.body.id === 1, "weekly lecture saved as draft");
  r = await call("GET", range, null, s3);
  ok(r.body.items.length === 0, "draft not visible to students");
  r = await call("POST", "/api/timetable/admin/publish", {}, boss);
  ok(r.body.changed === 1, "publish all drafts");
  r = await call("GET", range, null, s3);
  ok(r.body.items.length === 1 && r.body.items[0].date === "2026-10-19" && r.body.items[0].subject === "Pediatrics", "published weekly lecture on Monday " + JSON.stringify(r.body.items));
  r = await call("GET", "/api/timetable?from=2026-10-18&to=2026-11-07", null, s3);
  ok(r.body.items.length === 3, "recurs every week");

  // 3. conflicts
  r = await call("POST", "/api/timetable/admin/save", L({ subject: "Surgery", start: "10:00", end: "11:00", room: "B" }), boss);
  ok(r.status === 409 && r.body.conflicts[0].kind === "time", "overlap detected");
  r = await call("POST", "/api/timetable/admin/save", L({ subject: "Surgery", start: "10:30", end: "12:00", room: "A", publish: true }), boss);
  ok(r.status === 200, "back-to-back is not a conflict");
  r = await call("POST", "/api/timetable/admin/save", L({ repeat: "once", date: "2026-10-26", start: "09:30", end: "10:00", subject: "Extra" }), boss);
  ok(r.status === 409, "one-off on a weekly slot conflicts");
  r = await call("POST", "/api/timetable/admin/save", L({ repeat: "once", date: "2026-10-26", start: "09:30", end: "10:00", subject: "Extra", force: true, publish: true }), boss);
  ok(r.status === 200 && r.body.conflicts.length === 1, "force saves with warning");
  ok((await call("POST", "/api/timetable/admin/save", L({ from: "2026-11-01", to: "2026-12-01", start: "09:00", end: "10:00", subject: "Later", weekday: 1 }), boss)).status === 409, "range overlap is a conflict");
  ok((await call("POST", "/api/timetable/admin/save", { ...L({ weekday: 4, subject: "Old" }), to: "2026-10-01" }, boss)).status === 200, "ended series saved");
  ok((await call("POST", "/api/timetable/admin/save", L({ repeat: "once", date: "2026-10-22", subject: "New" }), boss)).status === 200, "ended series does not conflict with a later date");

  // 4. exceptions: cancel and reschedule
  ok((await call("POST", "/api/timetable/admin/exception", { lecture_id: 1, date: "2026-10-20", action: "cancel" }, boss)).body.error === "not_on_date", "exception must be on a real occurrence");
  ok((await call("POST", "/api/timetable/admin/exception", { lecture_id: 1, date: "2026-10-19", action: "cancel", note: "عطلة" }, boss)).status === 200, "cancel one date");
  r = await call("GET", range, null, s3);
  const ped = r.body.items.find((x) => x.lecture === 1);
  ok(ped.state === "cancelled" && ped.note === "عطلة", "cancelled shown with note");
  ok((await call("POST", "/api/timetable/admin/exception", { lecture_id: 1, date: "2026-10-19", action: "move", new_date: "2026-10-21", new_start: "13:00", new_end: "14:30", new_room: "C" }, boss)).status === 200, "reschedule replaces cancel");
  r = await call("GET", range, null, s3);
  const moved = r.body.items.filter((x) => x.lecture === 1);
  ok(moved.length === 2 && moved[0].state === "moved" && moved[1].state === "rescheduled" && moved[1].date === "2026-10-21" && moved[1].room === "C" && moved[1].originalDate === "2026-10-19", "moved: original marked, new slot shown " + JSON.stringify(moved));
  r = await call("GET", "/api/timetable?from=2026-10-26&to=2026-10-26", null, s3);
  ok(r.body.items.filter((x) => x.lecture === 1)[0].state === "normal", "next week unaffected");
  ok((await call("POST", "/api/timetable/admin/exception", { lecture_id: 1, date: "2026-10-19", action: "clear" }, boss)).status === 200, "restore date");
  r = await call("GET", range, null, s3);
  ok(r.body.items.find((x) => x.lecture === 1).state === "normal", "restored");

  // 5. edit, unpublish, delete
  ok((await call("POST", "/api/timetable/admin/save", L({ id: 1, room: "D", start: "08:00", end: "09:00" }), boss)).status === 200, "edit lecture");
  r = await call("GET", range, null, s3);
  ok(r.body.items.find((x) => x.lecture === 1).room === "D", "edit visible immediately");
  ok((await call("POST", "/api/timetable/admin/publish", { ids: [1], unpublish: true }, boss)).body.changed === 1, "unpublish one");
  r = await call("GET", range, null, s3);
  ok(!r.body.items.some((x) => x.lecture === 1), "unpublished hidden");
  ok((await call("POST", "/api/timetable/admin/publish", { unpublish: true }, boss)).status === 400, "unpublish-all refused");
  ok((await call("POST", "/api/timetable/admin/delete", { id: 1 }, boss)).status === 200, "delete");
  ok((await call("POST", "/api/timetable/admin/delete", { id: 1 }, boss)).status === 404, "delete missing → 404");
  ok(!env.DB._db.prepare("SELECT COUNT(*) c FROM timetable_exceptions WHERE lecture_id = 1").get().c, "exceptions removed with lecture");

  // 6. import: check, conflict block, approve
  const rows = [L({ subject: "Internal Medicine", weekday: 3, start: "11:00", end: "12:30", room: "B" }), L({ subject: "Surgery", weekday: 3, start: "12:00", end: "13:00", room: "B" }), { subject: "", start: "x" }];
  r = await call("POST", "/api/timetable/admin/check", { rows }, boss);
  ok(r.body.errors.length === 1 && r.body.errors[0].row === 2 && r.body.conflicts.some((c) => c.a === 0 && c.b === 1 && c.kind === "room"), "check reports invalid row and room conflict " + JSON.stringify(r.body));
  ok((await call("POST", "/api/timetable/admin/import", { rows }, boss)).body.error === "invalid_rows", "import refuses invalid rows");
  ok((await call("POST", "/api/timetable/admin/import", { rows: rows.slice(0, 2) }, boss)).status === 409, "import blocked on conflict");
  r = await call("POST", "/api/timetable/admin/import", { rows: [rows[0], { ...rows[1], start: "13:00", end: "14:00" }], publish: false }, boss);
  ok(r.status === 200 && r.body.ids.length === 2 && r.body.status === "draft", "import approved as drafts");
  r = await call("GET", "/api/timetable/admin/list", null, boss);
  ok(r.body.lectures.filter((l) => l.source === "import" && l.status === "draft").length === 2 && r.body.ai === false, "admin list shows drafts");
  ok((await call("POST", "/api/timetable/admin/extract", new FormData(), boss)).body.error === "ocr_not_configured", "OCR needs AI binding");
  ok(env.DB._db.prepare("SELECT COUNT(*) c FROM audit_log WHERE action LIKE 'timetable_%'").get().c >= 8, "changes are audited");
  ok(env.DB._db.prepare("SELECT COUNT(*) c FROM users").get().c === 4, "no accounts touched");
}

// 7. server OCR path with a fake AI binding
{
  const calls = [];
  const AI = {
    async run(model, input) {
      calls.push(input.prompt);
      if (input.prompt === "agree") return { response: "ok" };
      if (calls.length === 1) throw new Error("Prior to using this model you must submit the prompt 'agree'");
      return { response: 'Here: [{"day":"Monday","start":"9:00","end":"10:30","subject":"Pediatrics","topic":"Neonatal","lecturer":"Dr. Ahmed","room":"A"},{"day":"الأربعاء","start":"11","end":"12:30","subject":"Surgery"}]' };
    },
    async toMarkdown() { return [{ data: "Sunday 09:00-10:30 Pediatrics" }]; }
  };
  const { call, login } = setup(undefined, { AI });
  const boss = await login({ sub: "b", email: "boss@x.com", name: "محمد" });
  const fd = new FormData(); fd.append("file", new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), "t.png");
  let r = await call("POST", "/api/timetable/admin/extract", fd, boss);
  ok(r.status === 200 && r.body.rows.length === 2 && r.body.rows[0].weekday === 1 && r.body.rows[1].weekday === 3 && r.body.rows[1].start === "11:00" && calls.includes("agree"), "vision OCR → rows (with one-time agree) " + JSON.stringify(r.body));
  const fd2 = new FormData(); fd2.append("file", new Blob(["%PDF"], { type: "application/pdf" }), "t.pdf");
  r = await call("POST", "/api/timetable/admin/extract", fd2, boss);
  ok(r.body.mode === "text" && r.body.text.includes("Pediatrics"), "PDF → text on server");
  const fd3 = new FormData(); fd3.append("file", new Blob(["x"], { type: "text/html" }), "t.html");
  ok((await call("POST", "/api/timetable/admin/extract", fd3, boss)).status === 415, "other types refused");
}

// 8. before migration 0006
{
  const { call, login } = setup({ without: ["0006"] });
  const boss = await login({ sub: "b", email: "boss@x.com", name: "محمد" });
  ok((await call("GET", "/api/timetable/admin/list", null, boss)).body.error === "not_migrated", "clear error before migration");
  ok((await call("GET", "/api/timetable/access", null, boss)).body.allowed === true, "access probe works before migration");
}

// 9. pure helpers
ok(normTime("٩:٠٠") === "09:00" && normTime("9.30") === "09:30" && normTime("25:00") === null, "time normalisation");
ok(parseAiRows("no json") .length === 0, "garbage AI output → no rows");
ok(findConflicts([{ repeat: "weekly", weekday: 1, start: "09:00", end: "10:00", subject: "A" }, { repeat: "weekly", weekday: 2, start: "09:00", end: "10:00", subject: "B" }]).length === 0, "different days no conflict");
ok(expand([{ id: 1, repeat: "once", date: "2026-10-20", start: "09:00", end: "10:00", subject: "X" }], [{ lecture_id: 1, date: "2026-10-20", action: "move", new_date: "2026-10-27" }], "2026-10-26", "2026-10-28")
  .some((o) => o.state === "rescheduled" && o.date === "2026-10-27"), "move into range from outside");

console.log(fails ? `timetable_api_check: ${fails}/${n} FAILED` : `PASS timetable_api_check: ${n} checks`);
process.exit(fails ? 1 : 0);
