/* خادم Supabase وهمي للاختبار فقط: يحاكي مسارات الدخول بالرمز (otp/verify/token/logout) ومسارات rest/v1/rpc
   فوق قاعدة Postgres حقيقية (PGlite) تشغّل supabase/schema.sql، مع JWT موقّع وCORS.
   لا يتصل بأي شبكة. يُستعمل من tests/notes_dev_server.mjs. */
import { createHmac, randomUUID } from "node:crypto";
import { makeDb, addUser, rpc } from "./pg_harness.mjs";

const SECRET = "test-only-secret";
const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
function sign(payload) {
  const h = b64({ alg: "HS256", typ: "JWT" }), p = b64(payload);
  return h + "." + p + "." + createHmac("sha256", SECRET).update(h + "." + p).digest("base64url");
}
function verify(tok) {
  const [h, p, s] = String(tok || "").split(".");
  if (!s || createHmac("sha256", SECRET).update(h + "." + p).digest("base64url") !== s) return null;
  const o = JSON.parse(Buffer.from(p, "base64url").toString());
  return o.exp * 1000 > Date.now() ? o : null;
}

export async function createMock() {
  const db = await makeDb();
  const users = new Map();      // email → {id,email}
  const codes = new Map();      // email → code
  const refresh = new Map();    // refresh_token → user
  const stats = { otp: 0, rpc: 0 };
  let fail = 0;                 // عدد الطلبات القادمة التي تُرفض بـ 503 (لاختبار الأعطال)

  function session(u) {
    const now = Math.floor(Date.now() / 1000), exp = now + 3600;
    const rt = randomUUID(); refresh.set(rt, u);
    const claims = { aud: "authenticated", role: "authenticated", sub: u.id, email: u.email, iat: now, exp };
    return { access_token: sign(claims), token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: rt,
      user: { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
  }
  const json = (res, st, body) => { res.writeHead(st, { "content-type": "application/json" }); res.end(body === undefined ? "" : JSON.stringify(body)); };

  async function handle(req, res, url, body) {
    const p = url.pathname;
    if (p === "/__test/code") { return json(res, 200, { code: codes.get(url.searchParams.get("email")) || null }); }
    if (p === "/__test/stats") return json(res, 200, stats);
    if (p === "/__test/fail") { fail = Number(url.searchParams.get("n")) || 0; return json(res, 200, { fail }); }
    if (p === "/__test/dump") {
      const r = await db.query("select user_id, file_key, page, items, removed from public.note_pages order by 1,2,3");
      return json(res, 200, r.rows);
    }
    if (p === "/auth/v1/otp") {
      const email = String(body.email || "").toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 422, { code: 422, error_code: "validation_failed", msg: "Unable to validate email address: invalid format" });
      stats.otp++;
      codes.set(email, String(100000 + Math.floor(Math.random() * 900000)));
      return json(res, 200, {});
    }
    if (p === "/auth/v1/verify") {
      const email = String(body.email || "").toLowerCase();
      if (!codes.has(email) || codes.get(email) !== String(body.token)) return json(res, 403, { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" });
      codes.delete(email);
      let u = users.get(email);
      if (!u) { u = { id: randomUUID(), email }; users.set(email, u); await addUser(db, u.id, email); }
      return json(res, 200, session(u));
    }
    if (p === "/auth/v1/token") {
      const u = refresh.get(body.refresh_token);
      if (!u) return json(res, 400, { error: "invalid_grant", error_description: "Invalid Refresh Token" });
      refresh.delete(body.refresh_token);
      return json(res, 200, session(u));
    }
    if (p === "/auth/v1/logout") return json(res, 204);
    if (p === "/auth/v1/user") {
      const c = verify((req.headers.authorization || "").replace(/^Bearer /, ""));
      return c ? json(res, 200, { id: c.sub, email: c.email }) : json(res, 401, { msg: "invalid JWT" });
    }
    const m = p.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
    if (m) {
      if (fail > 0) { fail--; return json(res, 503, { message: "service unavailable" }); }
      const c = verify((req.headers.authorization || "").replace(/^Bearer /, ""));
      stats.rpc++;
      try {
        const r = await rpc(db, c ? c.sub : null, m[1], body || {});
        return json(res, 200, r === undefined ? null : r);
      } catch (e) {
        const msg = String(e.message || e);
        return json(res, /not_authenticated|permission denied/.test(msg) ? 401 : 400, { code: e.code || "P0001", message: msg, details: null, hint: null });
      }
    }
    return json(res, 404, { message: "not found" });
  }

  return {
    async handler(req, res) {
      res.setHeader("access-control-allow-origin", req.headers.origin || "*");
      res.setHeader("access-control-allow-headers", "authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile,x-supabase-api-version");
      res.setHeader("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("access-control-max-age", "600");
      if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
      const url = new URL(req.url, "http://x");
      const parts = []; for await (const c of req) parts.push(c);
      let body = {}; try { body = JSON.parse(Buffer.concat(parts).toString() || "{}"); } catch (e) {}
      try { await handle(req, res, url, body); } catch (e) { json(res, 500, { message: String(e.message || e) }); }
    }
  };
}
