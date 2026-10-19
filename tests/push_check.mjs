// node --no-warnings tests/push_check.mjs — Step 49: Web Push server checks (no network).
// The payload is decrypted with an independent implementation (node:crypto ECDH + HKDF, RFC 8291) and the VAPID
// token is verified with the public key, so a bug in functions/_lib/push.js cannot pass by checking itself.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
import { encryptPayload, vapidHeader, notify, handlePush, lectureMessage, announcementMessage, b64u, unb64u } from "../functions/_lib/push.js";
import { COURSE_SEMESTERS } from "../functions/_lib/course-semesters.js";
import { createMockD1 } from "./mock_d1.mjs";

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// --- independent RFC 8291 decryption ---
function decrypt(body, uaEcdh, authSecret) {
  const salt = body.subarray(0, 16), rs = body.readUInt32BE(16), idlen = body[20], asPublic = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  ok(rs === 4096 && idlen === 65, "aes128gcm header: rs 4096, 65-byte key id");
  const shared = uaEcdh.computeSecret(asPublic);
  const uaPublic = uaEcdh.getPublicKey();
  const ikm = Buffer.from(crypto.hkdfSync("sha256", shared, authSecret, Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]), 32));
  const cek = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const d = crypto.createDecipheriv("aes-128-gcm", cek, nonce);
  d.setAuthTag(ct.subarray(ct.length - 16));
  const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  ok(pt[pt.length - 1] === 2, "last-record delimiter 0x02");
  return pt.subarray(0, pt.length - 1).toString("utf8");
}
function subscriber(endpoint) {
  const ecdh = crypto.createECDH("prime256v1"); ecdh.generateKeys();
  const auth = crypto.randomBytes(16);
  return { ecdh, auth, sub: { endpoint, keys: { p256dh: b64u(ecdh.getPublicKey()), auth: b64u(auth) } } };
}
async function vapidEnv() {
  const kp = await crypto.webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { pub: kp.publicKey, VAPID_PUBLIC_KEY: b64u(await crypto.webcrypto.subtle.exportKey("raw", kp.publicKey)), VAPID_PRIVATE_KEY: (await crypto.webcrypto.subtle.exportKey("jwk", kp.privateKey)).d };
}

// 1. encryption round trip (English + Arabic)
{
  const s = subscriber("https://push.test/a");
  for (const text of ['{"title":"hello"}', JSON.stringify({ title: "تبليغ: امتحان المناعة", body: "الأحد القادم" })]) {
    const body = Buffer.from(await encryptPayload(s.sub.keys.p256dh, s.sub.keys.auth, text));
    ok(decrypt(body, s.ecdh, s.auth) === text, "independent decryption returns the original text");
  }
  const other = subscriber("https://push.test/b");
  const body = Buffer.from(await encryptPayload(s.sub.keys.p256dh, s.sub.keys.auth, "secret"));
  assert.throws(() => decrypt(body, other.ecdh, other.auth)); n++;
}

// 2. VAPID token verifies with the public key, has the right audience and expiry
{
  const env = await vapidEnv();
  const h = await vapidHeader(env, "https://fcm.googleapis.com/fcm/send/xyz", 1_700_000_000_000);
  const m = h.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/);
  ok(m && m[4] === env.VAPID_PUBLIC_KEY, "vapid header format with k=public key");
  const claims = JSON.parse(Buffer.from(unb64u(m[2])).toString());
  ok(claims.aud === "https://fcm.googleapis.com" && claims.exp === 1_700_000_000 + 12 * 3600 && /^mailto:|^https:/.test(claims.sub), "jwt claims");
  const valid = await crypto.webcrypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, env.pub, unb64u(m[3]), new TextEncoder().encode(m[1] + "." + m[2]));
  ok(valid, "ES256 signature verifies with VAPID public key");
}

// 3. subscribe / unsubscribe validation and semester filtering
{
  const env = { DB: createMockD1(), ...(await vapidEnv()) };
  const call = (path, body, origin = "https://medixa.pages.dev") => handlePush(new Request("https://medixa.pages.dev" + path, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body) }), env);
  const s3a = subscriber("https://push.test/s3a"), s3b = subscriber("https://push.test/gone/s3b"), s2 = subscriber("https://push.test/s2");
  ok((await call("/api/push/subscribe", { ...s3a.sub, semester: 3 })).status === 200, "subscribe semester 3");
  ok((await call("/api/push/subscribe", { ...s3b.sub, semester: 3 })).status === 200, "subscribe second device");
  ok((await call("/api/push/subscribe", { ...s2.sub, semester: 2 })).status === 200, "subscribe semester 2");
  ok((await call("/api/push/subscribe", { ...s2.sub, semester: 1 })).status === 200, "re-subscribe updates the semester (no duplicate)");
  ok((await call("/api/push/subscribe", { ...s2.sub, semester: 2 })).status === 200, "back to semester 2");
  for (const bad of [{ ...s3a.sub, semester: 4 }, { ...s3a.sub, endpoint: "http://push.test/x", semester: 3 }, { endpoint: "https://push.test/x", keys: { p256dh: "abc", auth: "def" }, semester: 3 }, {}])
    ok((await call("/api/push/subscribe", bad)).status === 400, "invalid subscription rejected");
  ok((await call("/api/push/subscribe", { ...s3a.sub, semester: 3 }, "https://evil.example")).status === 403, "cross-origin rejected");
  ok((await handlePush(new Request("https://medixa.pages.dev/api/push/key"), env).then((r) => r.json())).publicKey === env.VAPID_PUBLIC_KEY, "public key served");
  ok((await handlePush(new Request("https://medixa.pages.dev/api/push/key"), { DB: env.DB }).then((r) => r.json())).ready === false, "without VAPID keys: not ready");
  ok((await handlePush(new Request("https://medixa.pages.dev/api/other"), env)) === null, "other paths ignored");

  const log = [];
  const fakeFetch = async (endpoint, init) => { log.push({ endpoint, init }); return new Response(null, { status: new URL(endpoint).pathname.startsWith("/gone") ? 410 : 201 }); };
  const r1 = await notify(env, { semester: 3, title: "محاضرة جديدة", body: "x", url: "course.html?id=a" }, fakeFetch);
  ok(r1.sent === 1 && r1.removed === 1 && log.length === 2, "semester 3 only: one delivered, one expired removed " + JSON.stringify(r1));
  ok(log.every((l) => !l.endpoint.includes("s2")), "semester 2 student not notified about a semester 3 lecture");
  ok(log[0].init.headers["content-encoding"] === "aes128gcm" && log[0].init.headers.ttl && log[0].init.headers.authorization.startsWith("vapid t="), "push request headers");
  const msg = JSON.parse(decrypt(Buffer.from(log.find((l) => l.endpoint.endsWith("s3a")).init.body), s3a.ecdh, s3a.auth));
  ok(msg.title === "محاضرة جديدة" && msg.url === "course.html?id=a", "delivered message decrypts to the notification");
  ok((await env.DB.prepare("SELECT COUNT(*) AS c FROM push_subs").first()).c === 2, "expired subscription deleted");
  log.length = 0;
  const r2 = await notify(env, announcementMessage({ id: 7, title: "امتحان", body: "غداً" }), fakeFetch);
  ok(r2.sent === 2 && log.length === 2, "announcement goes to every subscriber");
  ok((await call("/api/push/unsubscribe", { endpoint: s2.sub.endpoint })).status === 200, "unsubscribe");
  ok((await env.DB.prepare("SELECT COUNT(*) AS c FROM push_subs").first()).c === 1, "unsubscribed device removed");
  ok((await notify({ DB: env.DB }, { title: "x" }, fakeFetch)).skipped === true, "no VAPID keys: nothing sent, no error");
}

// 4. which uploads notify
{
  const id = Object.keys(COURSE_SEMESTERS).find((k) => COURSE_SEMESTERS[k].semester === 3);
  const m = lectureMessage({ type: "lecture", courseId: id, number: 4, title: "Kidney", label: "Slides" });
  ok(m && m.semester === 3 && m.title.includes(COURSE_SEMESTERS[id].name) && m.url.endsWith("#lec-4") && m.tag === "lecture-" + id + "-4", "lecture message for the course's semester");
  ok(lectureMessage({ type: "lecture", courseId: id, number: 4, title: "x", showInLatest: false }) === null, "old upload hidden from latest: no notification");
  ok(lectureMessage({ type: "quiz", courseId: id, number: 0 }) === null, "quizzes/exams do not notify");
  ok(lectureMessage({ type: "lecture", courseId: "unknown-course", number: 1, title: "x" }) === null, "unknown course: no notification");
}

// 5. server course map matches site/data/courses.js
{
  const ctx = {}; vm.runInNewContext(fs.readFileSync(new URL("../site/data/courses.js", import.meta.url), "utf8") + "\n;this.C = COURSES;", ctx);
  ok(ctx.C.length === Object.keys(COURSE_SEMESTERS).length && ctx.C.every((c) => COURSE_SEMESTERS[c.id] && COURSE_SEMESTERS[c.id].semester === c.semester), "course-semesters.js is up to date (run scripts/gen-course-semesters.cjs after editing courses.js)");
}
console.log(`PUSH OK: ${n} checks`);
