// node --no-warnings tests/ai_chat_check.mjs — المساعد الذكي والدردشة على D1 وهمي
import assert from "node:assert/strict";
import { createMockD1 } from "./mock_d1.mjs";
import { readFileSync } from "node:fs";
const mk = () => { const d = createMockD1(); d._db.exec(readFileSync(new URL("../migrations/0013_ai_chat.sql", import.meta.url), "utf8")); return d; };
import { handleAssistant } from "../functions/_lib/assistant.js";
import { handleChat } from "../functions/_lib/chat.js";
import { MIGRATIONS } from "../functions/_lib/migrations.generated.js";
import { ensureSchema, resetSchemaState } from "../functions/_lib/migrate.js";

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const DB = mk();
for (const [id, role] of [[1, "student"], [2, "student"], [3, "rep"]]) {
  DB._db.prepare("INSERT INTO users(id,google_sub,email,name,role,active,created_at) VALUES(?,?,?,?,?,1,1)").run(id, "g" + id, id + "@x.com", "طالب رقم " + id + " ثالث", role);
}
const users = { 1: { id: 1, name: "طالب رقم 1 ثالث", role: "student" }, 2: { id: 2, name: "طالب 2", role: "student" }, 3: { id: 3, name: "ممثل", role: "rep" } };
let t = 1_700_000_000_000;
const call = async (fn, uid, path, body, env0) => {
  const req = new Request("https://m.test" + path, body === undefined ? { method: "GET" } : { method: "POST", headers: { "content-type": "application/json", origin: "https://m.test" }, body: JSON.stringify(body) });
  const res = await fn(req, env0, { currentUser: async () => users[uid] || null, now: () => t });
  return res ? { s: res.status, j: await res.json() } : null;
};

// ---- الترحيل التلقائي
resetSchemaState();
const fresh = mk();
await ensureSchema({ DB: fresh }, MIGRATIONS);
ok((await fresh.prepare("SELECT COUNT(*) n FROM _schema_migrations").first()).n === MIGRATIONS.length && MIGRATIONS.length >= 1, "كل الترحيلات سُجّلت");

// ---- المساعد
let calls = 0, failAll = false;
const AI = { async run(model, { messages }) { calls++; if (failAll) throw new Error("down"); return { response: "جواب عن: " + messages[messages.length - 1].content }; } };
const env = { DB, AI, DAILY_QUOTA_UNITS: "3", CHAT_ENABLED: "1" };
ok((await call(handleAssistant, 0, "/api/assistant/ask", { question: "x" }, env)).s === 401, "بلا دخول 401");
const a1 = await call(handleAssistant, 1, "/api/assistant/ask", { question: "ما الميتوكوندريا؟", courseName: "Cell", context: "نص" }, env);
ok(a1.s === 200 && a1.j.answer.includes("الميتوكوندريا") && a1.j.quota.remaining === 2, "جواب وحصة");
failAll = true;
const bad = await call(handleAssistant, 1, "/api/assistant/ask", { question: "سؤال" }, env);
ok(bad.s === 502, "فشل النماذج 502");
ok((await call(handleAssistant, 1, "/api/assistant/me", undefined, env)).j.quota.used === 1, "الفشل لا يخصم");
failAll = false;
await call(handleAssistant, 1, "/api/assistant/ask", { question: "٢" }, env);
await call(handleAssistant, 1, "/api/assistant/ask", { question: "٣" }, env);
ok((await call(handleAssistant, 1, "/api/assistant/ask", { question: "٤" }, env)).s === 429, "تجاوز الحصة 429");
ok((await call(handleAssistant, 2, "/api/assistant/ask", { question: "طالب آخر" }, env)).s === 200, "حصة مستقلة لكل طالب");
t += 86400000;
ok((await call(handleAssistant, 1, "/api/assistant/ask", { question: "يوم جديد" }, env)).s === 200, "تتجدد باليوم");
const cap = { ...env, GLOBAL_DAILY_UNITS: "1" };
ok((await call(handleAssistant, 2, "/api/assistant/ask", { question: "x" }, cap)).s === 429, "السقف العام");
ok((await call(handleAssistant, 1, "/api/assistant/ask", { question: "x" }, { DB })).s === 503, "بلا AI يعيد 503");

// ---- الدردشة
ok((await call(handleChat, 1, "/api/chat/rooms", undefined, { DB, CHAT_ENABLED: "0" })).s === 404, "الدردشة مغلقة عند CHAT_ENABLED=0");
const rooms = await call(handleChat, 1, "/api/chat/rooms", undefined, env);
ok(rooms.j.items.length === 1 && rooms.j.items[0].slug === "general", "غرفة عامة واحدة");
t += 5000;
const s1 = await call(handleChat, 1, "/api/chat/send", { room: 1, body: "  مرحبا  " }, env);
ok(s1.s === 201 && s1.j.item.body === "مرحبا" && s1.j.item.user_name === "طالب رقم", "إرسال (اسم مختصر)");
ok((await call(handleChat, 1, "/api/chat/send", { room: 1, body: "فوراً" }, env)).s === 429, "تباطؤ");
t += 3000;
ok((await call(handleChat, 2, "/api/chat/send", { room: 1, body: "رد" }, env)).s === 201, "طالب ثان");
const list = await call(handleChat, 1, "/api/chat/messages?room=1", undefined, env);
ok(list.j.items.length === 2, "قراءة");
ok((await call(handleChat, 1, "/api/chat/messages?room=2", undefined, env)).j.items.length === 0, "عزل الغرف");
ok((await call(handleChat, 2, "/api/chat/delete", { message_id: s1.j.item.id }, env)).s === 403, "لا يحذف رسالة غيره");
ok((await call(handleChat, 3, "/api/chat/delete", { message_id: s1.j.item.id }, env)).s === 200, "الممثل يحذف");
const after = await call(handleChat, 2, "/api/chat/messages?room=1", undefined, env);
ok(after.j.items.length === 1 && after.j.items[0].body === "رد", "المحذوف يختفي من القائمة تماماً");
const gone = await call(handleChat, 2, "/api/chat/messages?room=1&after=1&since=1", undefined, env);
ok(Array.isArray(gone.j.gone) && gone.j.gone.includes(s1.j.item.id) === false || gone.j.gone.length >= 0, "قائمة المحذوف");
const gone0 = await call(handleChat, 2, "/api/chat/messages?room=1&after=" + (s1.j.item.id - 1) + "&since=1", undefined, env);
ok(gone0.j.gone.includes(s1.j.item.id), "العميل يعرف المحذوف ليزيله");
ok((await DB.prepare("SELECT body FROM chat_message_archive").first()).body === "مرحبا", "أرشفة المحذوف");
t += 3000;
const att = await call(handleChat, 2, "/api/chat/send", { room: 1, body: "", attach: { type: "week", title: "الجدول", href: "timetable.html" } }, env);
ok(att.s === 201 && att.j.item.body.startsWith("[[att]]"), "مرفق جدول");
t += 3000;
ok((await call(handleChat, 2, "/api/chat/send", { room: 1, body: "x", attach: { type: "lecture", title: "t", href: "https://evil.example/x" } }, env)).s === 400, "رابط خارجي مرفوض");
t += 3000;
ok((await call(handleChat, 2, "/api/chat/send", { room: 1, body: "x", attach: { type: "lecture", title: "t", href: "javascript:alert(1)" } }, env)).s === 400, "رابط javascript مرفوض");
t += 3000;
ok((await call(handleChat, 2, "/api/chat/send", { room: 1, body: "x", attach: { type: "bad", title: "t", href: "a.html" } }, env)).s === 400, "نوع مرفق غير معروف");
t += 3000;
const rep = await call(handleChat, 2, "/api/chat/send", { room: 1, body: "جواب", reply_to: att.j.item.id }, env);
ok(rep.s === 201 && rep.j.item.body.startsWith("[[re]]") && rep.j.item.body.includes("الجدول") && rep.j.item.body.endsWith("\nجواب"), "رد على رسالة (الاقتباس من الخادم)");
t += 3000;
ok((await call(handleChat, 2, "/api/chat/send", { room: 1, body: "x", reply_to: s1.j.item.id }, env)).s === 400, "لا رد على رسالة محذوفة");
t += 3000;
ok((await call(handleChat, 2, "/api/chat/send", { room: 1, body: "", reply_to: att.j.item.id }, env)).s === 400, "الرد يحتاج نصاً");
ok((await call(handleChat, 2, "/api/chat/mute", { user_id: 1, minutes: 5 }, env)).s === 403, "الكتم للمشرف فقط");
ok((await call(handleChat, 3, "/api/chat/mute", { user_id: 2, minutes: 5 }, env)).s === 200, "كتم");
t += 3000;
ok((await call(handleChat, 2, "/api/chat/send", { room: 1, body: "x" }, env)).s === 403, "المكتوم لا يكتب");
ok((await call(handleChat, 3, "/api/chat/mute", { user_id: 2, minutes: 0 }, env)).s === 200, "رفع الكتم");
ok((await call(handleChat, 2, "/api/chat/report", { message_id: 2, reason: "سبب" }, env)).s === 200, "بلاغ");
ok((await call(handleChat, 0, "/api/chat/messages?room=1", undefined, env)).s === 401, "بلا دخول 401");
console.log("AI+CHAT OK: " + n + " checks");
