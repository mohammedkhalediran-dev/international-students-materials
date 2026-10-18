// node tests/notes_dev_server.mjs [sitePort] [apiPort] — للاختبار فقط: يقدّم site ويشغّل Supabase وهمياً (tests/mock_supabase.mjs).
// يولّد ملف PDF تجريبياً في /files/test/sample.pdf (3 صفحات، الثانية مدوّرة 90°) بلا حفظه في المستودع.
import http from "node:http";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createMock } from "./mock_supabase.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SITE = join(ROOT, "site");
const SP = Number(process.argv[2]) || 8781, AP = Number(process.argv[3]) || 8782;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf", ".webmanifest": "application/manifest+json" };

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, degrees } = require(join(SITE, "vendor", "pdf-lib.min.js"));
const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica);
for (let i = 1; i <= 3; i++) { const pg = d.addPage([400, 560]); pg.drawText("Test page " + i, { x: 40, y: 500, size: 28, font: f }); if (i === 2) pg.setRotation(degrees(90)); }
const SAMPLE = Buffer.from(await d.save());

const mock = await createMock();
http.createServer(mock.handler).listen(AP);
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let p = decodeURIComponent(url.pathname);
  if (p === "/files/test/sample.pdf") { res.writeHead(200, { "content-type": "application/pdf" }); return res.end(req.method === "HEAD" ? undefined : SAMPLE); }
  if (p.endsWith("/")) p += "index.html";
  const file = normalize(join(SITE, p));
  if (!file.startsWith(SITE)) { res.writeHead(403); return res.end(); }
  try { const data = await readFile(file); res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }); res.end(req.method === "HEAD" ? undefined : data); }
  catch (e) { res.writeHead(404); res.end("not found"); }
}).listen(SP, () => console.log("ready " + SP + " " + AP));
