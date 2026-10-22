// node tests/studio_assets_check.cjs — pure checks for site/js/studio-assets.js (magic bytes, fit, header sizes, ids, errors).
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const A = require('../site/js/studio-assets.js');
let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); };
const B = a => Uint8Array.from(a);
const pad = (u, len) => { const o = new Uint8Array(Math.max(len, u.length)); o.set(u); return o; };

// _sniff: magic bytes decide, never the declared type
const PNG_SIG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
const png = (w, h) => { const u = pad(B(PNG_SIG), 33); u.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8); new DataView(u.buffer).setUint32(16, w); new DataView(u.buffer).setUint32(20, h); return u; };
ok(A._sniff(png(10, 10)) === 'image/png', 'png magic');
ok(A._sniff(pad(B([0xFF, 0xD8, 0xFF, 0xE0]), 16)) === 'image/jpeg', 'jpeg magic');
const riff = (four, extra) => { const u = pad(B([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, ...Buffer.from(four)]), 40); if (extra) u.set(extra, 12); return u; };
ok(A._sniff(riff('WEBP')) === 'image/webp', 'webp magic');
ok(A._sniff(riff('WAVE')) === null, 'RIFF/WAVE is not an image');
ok(A._sniff(pad(Buffer.from('GIF89a'), 16)) === null, 'gif rejected');
ok(A._sniff(pad(Buffer.from('%PDF-1.7'), 16)) === null, 'pdf rejected');
ok(A._sniff(B(PNG_SIG.slice(0, 4))) === null, 'truncated header rejected');
ok(A._sniff(new Uint8Array(0)) === null, 'empty rejected');
ok(A._sniff(png(1, 1).buffer) === 'image/png', 'ArrayBuffer accepted');
ok(A._sniff('\x89PNG\r\n\x1a\n0000') === null && A._sniff(null) === null && A._sniff(undefined) === null && A._sniff([0xFF, 0xD8, 0xFF]) === null, 'non-bytes input -> null');

// _fit: integers, aspect kept, never upscale, longest side == max when shrinking
const eq = (a, b) => a[0] === b[0] && a[1] === b[1];
ok(eq(A._fit(4000, 3000, 2400), [2400, 1800]), 'landscape 4000x3000 -> 2400x1800');
ok(eq(A._fit(3000, 4000, 2400), [1800, 2400]), 'portrait 3000x4000 -> 1800x2400');
ok(eq(A._fit(100, 50, 2400), [100, 50]), 'small image not upscaled');
ok(eq(A._fit(2400, 2400, 2400), [2400, 2400]), 'exactly max kept');
ok(eq(A._fit(2401, 2401, 2400), [2400, 2400]), 'square shrinks to max');
ok(eq(A._fit(10000, 3, 2400), [2400, 1]) && eq(A._fit(3, 10000, 2400), [1, 2400]), 'extreme aspect keeps 1px minimum');
ok(eq(A._fit(0, 10, 2400), [0, 0]) && eq(A._fit(NaN, 10, 2400), [0, 0]) && eq(A._fit(-5, 10, 2400), [0, 0]) && eq(A._fit(Infinity, 10, 2400), [0, 0]), 'invalid sizes -> [0,0]');
ok(eq(A._fit(100.4, 50.6, 2400), [100, 51]), 'fractional input rounded');
ok(eq(A._fit(5000, 2500), [2400, 1200]), 'default max is 2400');
let fuzzOk = true;
for (let i = 0; i < 5000; i++) {
  const w = 1 + Math.floor(Math.random() * 20000), h = 1 + Math.floor(Math.random() * 20000), m = 1 + Math.floor(Math.random() * 4000), [a, b] = A._fit(w, h, m);
  const good = Number.isInteger(a) && Number.isInteger(b) && a >= 1 && b >= 1 && a <= w && b <= h && Math.max(a, b) <= m
    && (Math.max(w, h) <= m ? a === w && b === h : Math.max(a, b) === m)
    && (Math.max(w, h) <= m || Math.abs((w >= h ? b : a) - Math.max(1, (w >= h ? h : w) * m / Math.max(w, h))) <= 0.5 + 1e-9);   // short side = ideal rounded (>= 1px)
  if (!good) { fuzzOk = false; console.log('fit fuzz fail', w, h, m, a, b); break; }
}
ok(fuzzOk, 'fit fuzz: 5000 random sizes');

// _dims: pixel size from headers, so huge images are refused before decoding
ok(eq(A._dims(png(4000, 3000)), [4000, 3000]), 'png IHDR size');
ok(eq(A._dims(png(100000, 70000)), [100000, 70000]), 'png huge size read (32-bit)');
ok(A._dims(B(PNG_SIG)) === null, 'png without IHDR -> null');
const seg = (m, body) => [0xFF, m, (body.length + 2) >> 8, (body.length + 2) & 255, ...body];
const sof = (m, w, h) => seg(m, [8, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
const exif = new Array(60000).fill(7);
ok(eq(A._dims(B([0xFF, 0xD8, ...seg(0xE0, [0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), ...sof(0xC0, 4032, 3024)])), [4032, 3024]), 'jpeg baseline SOF0');
ok(eq(A._dims(B([0xFF, 0xD8, ...seg(0xE1, exif), ...seg(0xDB, new Array(64).fill(1)), ...seg(0xC4, new Array(30).fill(0)), ...sof(0xC2, 8000, 6000)])), [8000, 6000]), 'jpeg progressive SOF2 after big EXIF, DQT and DHT (DHT is not a frame)');
ok(eq(A._dims(B([0xFF, 0xD8, 0xFF, 0xFF, ...sof(0xC1, 300, 200)])), [300, 200]), 'jpeg fill bytes skipped');
ok(A._dims(B([0xFF, 0xD8, ...seg(0xE1, exif)])) === null, 'jpeg frame header beyond the slice -> null');
ok(A._dims(B([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0x12, 0x34, 0, 0, 0, 0, 0, 0])) === null, 'corrupt jpeg segment -> null (no hang)');
const vp8x = riff('WEBP', [...Buffer.from('VP8X'), 10, 0, 0, 0, 0x10, 0, 0, 0]); vp8x.set([0x9F, 0x0F, 0x00, 0xB7, 0x0B, 0x00], 24);   // 3999+1 x 2999+1
ok(eq(A._dims(vp8x), [4000, 3000]), 'webp VP8X canvas size');
const vp8l = riff('WEBP', [...Buffer.from('VP8L'), 0, 0, 0, 0, 0x2F]); { const v = (639 | (479 << 14)) >>> 0; vp8l.set([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255], 21); }
ok(eq(A._dims(vp8l), [640, 480]), 'webp lossless VP8L size');
const vp8 = riff('WEBP', [...Buffer.from('VP8 '), 0, 0, 0, 0]); vp8.set([0, 0, 0, 0x9D, 0x01, 0x2A, 1024 & 255, 1024 >> 8, 768 & 255, 768 >> 8], 20);
ok(eq(A._dims(vp8), [1024, 768]), 'webp lossy VP8 size');
ok(A._dims(pad(Buffer.from('hello world, not an image'), 40)) === null, 'non-image -> null');

// SHA-256 fallback (pages without crypto.subtle) must give the same ids as crypto.subtle
ok(A._sha256(Buffer.from('abc')) === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256("abc") test vector');
ok(A._sha256(new Uint8Array(0)) === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'sha256("") test vector');
let shaOk = true;
for (const len of [1, 55, 56, 57, 63, 64, 65, 119, 120, 128, 1000, 65537, 300001]) { const b = crypto.randomBytes(len); if (A._sha256(b) !== crypto.createHash('sha256').update(b).digest('hex')) { shaOk = false; console.log('sha mismatch at', len); } }
ok(shaOk, 'sha256 matches node crypto across block boundaries');

// limits and messages
ok(A.LIMITS.bytes === 25 * 1024 * 1024 && A.LIMITS.pixels === 60e6 && A.LIMITS.side === 2400 && A.LIMITS.budget === 120e6, 'limits (desktop budget in node)');
const CODES = ['type', 'size', 'decode', 'dims', 'quota', 'idb'];
ok(CODES.every(c => /[؀-ۿ]/.test(A.MESSAGES[c]) && !/[A-Za-z]{4,}/.test(A.MESSAGES[c].replace(/JPG|PNG|WebP/g, ''))), 'every error code has a short Arabic message');
ok(A.MESSAGES.type === 'نوع الصورة غير مدعوم. استعمل JPG أو PNG أو WebP.', 'type message as specified');

// error paths that need no browser: rejected promises with codes, never a synchronous throw
(async () => {
  const code = async f => { let p; try { p = f(); } catch (e) { return 'SYNC THROW'; } if (!(p instanceof Promise)) return 'not a promise'; try { await p; return 'resolved'; } catch (e) { return e instanceof Error ? e.code + '|' + e.message : 'not an Error'; } };
  ok((await code(() => A.put(null))).startsWith('type|نوع الصورة'), 'put(null) -> type');
  ok((await code(() => A.put('not a blob'))).startsWith('type|'), 'put(string) -> type');
  ok((await code(() => A.prepare(new Blob(['hello'], { type: 'text/plain' })))).startsWith('type|'), 'text/plain -> type');
  ok((await code(() => A.prepare(new Blob([crypto.randomBytes(64)], { type: 'image/png' })))).startsWith('decode|'), 'garbage typed image/png -> decode');
  ok((await code(() => A.prepare(new Blob([crypto.randomBytes(64)], { type: 'image/jpg' })))).startsWith('decode|'), 'garbage typed image/jpg (alias) -> decode');
  ok((await code(() => A.prepare(new Blob([], { type: 'image/jpeg' })))).startsWith('decode|'), 'empty image file -> decode');
  ok((await code(() => A.prepare(new Blob([pad(Buffer.from('GIF89a'), 64)], { type: 'image/gif' })))).startsWith('type|'), 'gif -> type');
  ok((await code(() => A.prepare(new Blob([new Uint8Array(A.LIMITS.bytes + 1)], { type: 'image/png' })))).startsWith('size|'), '> 25 MB -> size');
  ok((await code(() => A.prepare(new Blob([png(10000, 7000)], { type: 'image/png' })))).startsWith('dims|'), '70 MP header -> dims before decoding');
  ok((await code(() => A.putDataUrl('https://example.com/x.png'))).startsWith('type|'), 'putDataUrl rejects non data URLs');
  ok((await code(() => A.putDataUrl(42))).startsWith('type|'), 'putDataUrl(42) -> type');
  ok((await code(() => A.putDataUrl('data:image/png;base64,@@@@'))).startsWith('decode|'), 'bad base64 -> decode');
  ok((await code(() => A.get('nope'))) === 'resolved' && (await A.get('nope')) === null && (await A.has('img_xyz')) === false, 'invalid ids -> null/false, no throw');
  ok((await code(() => A.get('img_' + '0'.repeat(32)))).startsWith('idb|'), 'no IndexedDB -> idb (rejected, not thrown)');
  ok((await code(() => A.bitmap('img_' + '1'.repeat(32)))).startsWith('idb|') && A.peek('img_' + '1'.repeat(32)) === null, 'bitmap without IndexedDB -> idb; peek -> null');
  ok((await A.estimate()) === null || typeof (await A.estimate()) === 'object', 'estimate never throws');
  console.log(`STUDIO ASSETS UNIT OK: ${n} checks`);
})().catch(e => { console.error(e); process.exit(1); });
