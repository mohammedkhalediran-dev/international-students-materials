// node tests/dev_server.mjs [port] — خادم محلي للاختبار: يقدّم مجلد site ويشغّل دالة الرفع بمخزن في الذاكرة.
// لا يستعمل Netlify ولا الإنترنت. الرموز من UPLOAD_CODES (أو قيمة افتراضية للاختبار فقط).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handle } from "../lib/upload-core.mjs";
import { createMockStore } from "./mock_store.mjs";

const SITE = join(fileURLToPath(new URL(".", import.meta.url)), "..", "site");
const PORT = Number(process.argv[2]) || 8772;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf", ".webmanifest": "application/manifest+json" };

const store = createMockStore();
const codes = process.env.UPLOAD_CODES || "سارة:test-code-sara,علي:test-code-ali";
const deps = (req) => ({ store, env: (k) => (k === "UPLOAD_CODES" ? codes : undefined), ip: req.socket.remoteAddress, now: () => Date.now() });

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:" + PORT);
  if (url.pathname.startsWith("/api/")) {
    const parts = [];
    for await (const c of req) parts.push(c);
    const body = Buffer.concat(parts);
    const r = await handle(new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body }), deps(req));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    if (r.body) for await (const c of r.body) res.write(c);
    res.end();
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = normalize(join(SITE, p));
  if (!file.startsWith(SITE)) { res.writeHead(403); res.end(); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch (e) { res.writeHead(404); res.end("not found"); }
}).listen(PORT, () => console.log("dev server on " + PORT));
