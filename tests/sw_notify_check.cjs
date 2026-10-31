// node tests/sw_notify_check.cjs — Step 52: how site/sw.js shows a push and where a tap goes.
// Runs sw.js in a sandbox with stubbed service-worker APIs (no browser). Real device rendering is the OS's job.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict");
const SRC = fs.readFileSync(path.join(__dirname, "..", "site", "sw.js"), "utf8");
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

function load({ maxActions = 2, clients = [] } = {}) {
  const handlers = {}, shown = [], opened = [];
  const self = {
    addEventListener: (t, f) => { handlers[t] = f; },
    location: { origin: "https://medixa.pages.dev" },
    registration: { scope: "https://medixa.pages.dev/", showNotification: (t, o) => { shown.push({ title: t, ...o }); return Promise.resolve(); } },
    clients: { matchAll: async () => clients, openWindow: async (u) => { opened.push(u); return {}; }, claim: async () => {} },
    Notification: { maxActions },
    skipWaiting: async () => {}
  };
  vm.runInNewContext(SRC, { self, location: self.location, URL, caches: {}, fetch: () => {}, console, Promise });
  const push = async (payload) => { let p; handlers.push({ data: payload === undefined ? null : { json: () => JSON.parse(payload), text: () => payload }, waitUntil: (x) => { p = x; } }); await p; return shown[shown.length - 1]; };
  const click = async (data, action = "") => { let p; handlers.notificationclick({ action, notification: { data, close() {} }, waitUntil: (x) => { p = x; } }); await p; };
  return { push, click, opened };
}
const lecture = JSON.stringify({ title: "محاضرة جديدة · المناعة الطبية", body: "المحاضرة 4: Kidney", url: "course.html?id=medical-immunology#lec-4", tag: "course-medical-immunology",
  category: "lecture", ts: 1800000000000, actions: [{ action: "open", title: "افتح المحاضرة", url: "course.html?id=medical-immunology#lec-4" }, { action: "file", title: "افتح الملف", url: "api/file/abc" }] });

(async () => {
  // Android / desktop Chrome: buttons, branding, grouping tag
  const a = load({ maxActions: 2 });
  const s = await a.push(lecture);
  ok(s.title === "محاضرة جديدة · المناعة الطبية" && s.body === "المحاضرة 4: Kidney", "title and body");
  ok(s.icon === "assets/icon-192.png" && s.badge === "assets/notify-badge.png" && s.dir === "rtl" && s.lang === "ar", "brand icon, monochrome badge, Arabic RTL");
  ok(s.tag === "course-medical-immunology" && s.renotify === false && s.timestamp === 1800000000000, "one tag per subject, quiet replace, server time");
  ok(s.actions.length === 2 && s.actions[0].title === "افتح المحاضرة" && !("url" in s.actions[0]), "two action buttons where supported");
  // iPhone / Safari: no action support -> no buttons, tap still opens the lecture
  const i = load({ maxActions: 0 });
  const si = await i.push(lecture);
  ok(!si.actions && si.data.url.endsWith("#lec-4"), "no buttons where unsupported; tap target kept");
  // old Step 49-51 payload still works
  const o = await load().push(JSON.stringify({ title: "تبليغ: x", body: "y", url: "index.html#announcements", tag: "announcement-1" }));
  ok(o.title === "تبليغ: x" && o.tag === "announcement-1" && !o.actions, "older payload shows unchanged");
  ok((await load().push("plain text")).title === "Medixa" && (await load().push()).title === "Medixa", "non-JSON or empty push still shows a notification");
  // hostile payload: actions without urls dropped, more than two trimmed
  const h = await load().push(JSON.stringify({ title: "t", actions: [{ action: "x", title: "X" }, { action: "a", title: "A", url: "a.html" }, { action: "b", title: "B", url: "b.html" }, { action: "c", title: "C", url: "c.html" }] }));
  ok(h.actions.length === 2 && h.actions[0].action === "a", "invalid actions dropped, at most two");

  // taps: no window open -> opens the lecture; action button -> its own target
  const c1 = load(); const d = (await c1.push(lecture)).data;
  await c1.click(d); ok(c1.opened[0] === "https://medixa.pages.dev/course.html?id=medical-immunology#lec-4", "tap opens the lecture directly");
  await c1.click(d, "file"); ok(c1.opened[1] === "https://medixa.pages.dev/api/file/abc", "«افتح الملف» opens the PDF");
  await c1.click({ url: "https://evil.example/x" }); ok(c1.opened[2] === "https://medixa.pages.dev/index.html", "foreign target falls back to the home page");
  await c1.click({ url: "course.html?id=a", actions: {} }, "unknown"); ok(c1.opened[3] === "https://medixa.pages.dev/course.html?id=a", "unknown action falls back to the main target");
  // a Medixa window is already open -> reuse it
  const nav = []; let focused = 0;
  const win = { focus: async function () { focused++; return this; }, navigate: async (u) => { nav.push(u); return win; } };
  const c2 = load({ clients: [win] }); await c2.click(d);
  ok(focused === 1 && nav[0].endsWith("#lec-4") && c2.opened.length === 0, "open window is focused and moved to the lecture");
  // navigate refused (uncontrolled window) -> new window instead of doing nothing
  const bad = { focus: async function () { return this; }, navigate: async () => { throw new TypeError("not controlled"); } };
  const c3 = load({ clients: [bad] }); await c3.click(d);
  ok(c3.opened[0].endsWith("#lec-4"), "if the open window cannot be moved, a new one opens");
  console.log(`SW NOTIFY OK: ${n} checks`);
})().catch((e) => { console.error(e); process.exit(1); });
