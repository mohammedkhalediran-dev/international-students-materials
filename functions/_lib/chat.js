// functions/_lib/chat.js — الدردشة: غرف حسب الكورس + غرفة عامة. كل من سجّل الدخول يقرأ ويكتب.
// المسارات (/api/chat/...): rooms (GET) · messages?room=ID&after=ID (GET) · send · report · delete · mute (POST).
// الإشراف: rep وadmin يحذفان ويكتمان. الدردشة مفتاحها CHAT_ENABLED=1 (غير ذلك تعيد 404).
import { currentUser } from "./auth.js";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
});
const fail = (error, status) => json({ ok: false, error }, status);
const MOD = ["rep", "admin"];
const MAX_BODY = 1000;
const clean = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f‎‏‪-‮]/g, "").trim().slice(0, n);
const idOf = (v) => (Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);
const shortName = (n) => String(n || "طالب").trim().split(/\s+/).slice(0, 2).join(" ");

export async function handleChat(req, env, opts = {}) {
  const url = new URL(req.url);
  const m = /^\/api\/chat\/(rooms|messages|send|report|delete|mute)$/.exec(url.pathname.replace(/\/+$/, ""));
  if (!m) return null;
  if (env.CHAT_ENABLED !== "1") return fail("not_found", 404);
  if (!env.DB) return fail("not_configured", 503);
  const op = m[1];
  const now = (opts.now || Date.now)();
  const user = await (opts.currentUser || currentUser)(req, env, now);
  if (!user) return fail("unauthorized", 401);
  const isMod = MOD.includes(user.role);

  if (op === "rooms" && req.method === "GET") {
    const rows = (await env.DB.prepare("SELECT id, slug, name FROM chat_rooms ORDER BY sort, id").all()).results || [];
    return json({ ok: true, items: rows, me: { id: user.id, mod: isMod } });
  }
  if (op === "messages" && req.method === "GET") {
    const room = idOf(url.searchParams.get("room"));
    if (!room) return fail("bad_request", 400);
    const after = Number(url.searchParams.get("after")) || 0;
    const rows = (await env.DB.prepare(
      "SELECT id, user_id, user_name, CASE WHEN deleted_at IS NULL THEN body ELSE '' END AS body, created_at, deleted_at FROM chat_messages WHERE room_id=? AND id>? ORDER BY id DESC LIMIT 60"
    ).bind(room, after).all()).results || [];
    return json({ ok: true, items: rows.reverse() });
  }
  if (req.method !== "POST") return fail("not_found", 404);
  const origin = req.headers.get("origin");
  if (origin && origin !== url.origin) return fail("forbidden", 403);
  let b = null;
  try { b = await req.json(); } catch { /* فارغ */ }
  if (!b) return fail("bad_request", 400);

  try {
    if (op === "send") {
      const room = idOf(b.room), body = clean(b.body, MAX_BODY);
      if (!room || !body) return fail("bad_request", 400);
      if (!(await env.DB.prepare("SELECT 1 AS x FROM chat_rooms WHERE id=?").bind(room).first())) return fail("not_found", 404);
      const mute = await env.DB.prepare("SELECT until_at FROM chat_mutes WHERE user_id=?").bind(user.id).first();
      if (mute && mute.until_at > now) return fail("muted", 403);
      const recent = await env.DB.prepare("SELECT created_at FROM chat_messages WHERE user_id=? ORDER BY id DESC LIMIT 1").bind(user.id).first();
      if (recent && now - recent.created_at < 1200) return fail("slow_down", 429);
      const hourly = await env.DB.prepare("SELECT COUNT(*) AS n FROM chat_messages WHERE user_id=? AND created_at>?").bind(user.id, now - 3600000).first();
      if (hourly && hourly.n >= 120) return fail("slow_down", 429);
      const r = await env.DB.prepare("INSERT INTO chat_messages(room_id,user_id,user_name,body,created_at) VALUES(?,?,?,?,?)")
        .bind(room, user.id, shortName(user.name), body, now).run();
      return json({ ok: true, item: { id: Number(r.meta.last_row_id), user_id: user.id, user_name: shortName(user.name), body, created_at: now, deleted_at: null } }, 201);
    }
    if (op === "report") {
      const id = idOf(b.message_id), reason = clean(b.reason, 300);
      if (!id || !reason) return fail("bad_request", 400);
      const rc = await env.DB.prepare("SELECT COUNT(*) AS n FROM chat_reports WHERE reporter_id=? AND created_at>?").bind(user.id, now - 86400000).first();
      if (rc && rc.n >= 20) return fail("slow_down", 429);
      await env.DB.prepare("INSERT OR IGNORE INTO chat_reports(message_id,reporter_id,reason,created_at) VALUES(?,?,?,?)").bind(id, user.id, reason, now).run();
      return json({ ok: true });
    }
    const id = idOf(b.message_id);
    if (op === "delete") {
      if (!id) return fail("bad_request", 400);
      const msg = await env.DB.prepare("SELECT user_id, created_at, deleted_at FROM chat_messages WHERE id=?").bind(id).first();
      if (!msg || msg.deleted_at) return fail("not_found", 404);
      if (!isMod && !(msg.user_id === user.id && now - msg.created_at <= 15 * 60 * 1000)) return fail("forbidden", 403);
      await env.DB.prepare("INSERT INTO chat_message_archive(message_id,body,reason,created_at) SELECT id,body,'delete',? FROM chat_messages WHERE id=?").bind(now, id).run();
      await env.DB.prepare("UPDATE chat_messages SET deleted_at=? WHERE id=?").bind(now, id).run();
      return json({ ok: true });
    }
    if (op === "mute") {
      if (!isMod) return fail("forbidden", 403);
      const target = idOf(b.user_id), mins = Math.min(Math.max(Number(b.minutes) || 0, 0), 60 * 24 * 30);
      if (!target || target === user.id) return fail("bad_request", 400);
      if (!mins) await env.DB.prepare("DELETE FROM chat_mutes WHERE user_id=?").bind(target).run();
      else await env.DB.prepare("INSERT OR REPLACE INTO chat_mutes(user_id,until_at,set_by) VALUES(?,?,?)").bind(target, now + mins * 60000, user.id).run();
      return json({ ok: true });
    }
  } catch (e) {
    console.error("chat", String(e && e.message).slice(0, 200));
    return fail("server", 500);
  }
  return fail("not_found", 404);
}
