# python3 -I tests/studio_assets_browser.py — مخزن صور مساحة الدراسة على الجهاز (IndexedDB): التحضير والتصغير والشفافية،
# عدم التكرار، القراءة للتصدير، فك الترميز مرة واحدة مع ذاكرة محدودة (iPad)، النسخ الاحتياطي والاستعادة، ورسائل الأخطاء.
import os, sys, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8821; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO ASSETS')
SRC = os.path.join(ROOT, 'site', 'js', 'studio-assets.js')
ID = re.compile(r'^img_[0-9a-f]{32}$')
HELP = r"""
window.T = {
  /* a gradient + disc + label picture; clear=true leaves a transparent background; seed makes each one distinct */
  async mk(w, h, type, opts) {
    opts = opts || {}; const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    if (!opts.clear) { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#17324d'); g.addColorStop(1, '#168c8c'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
    x.fillStyle = '#e43d56'; x.beginPath(); x.arc(w / 2, h / 2, Math.min(w, h) / 3, 0, 7); x.fill();
    x.fillStyle = '#ffffff'; x.font = Math.max(8, Math.round(h / 6)) + 'px sans-serif'; x.fillText('M' + (opts.seed || 0), w / 10, h / 4);
    const b = await new Promise(r => c.toBlob(r, type, 0.92)); c.width = 0; c.height = 0; return b;
  },
  async err(p) { try { await p; return 'resolved'; } catch (e) { return { code: e && e.code, msg: e && e.message, isErr: e instanceof Error }; } },
  hex(u, n) { return Array.from(u.slice(0, n || 4), x => x.toString(16).padStart(2, '0')).join(''); },
  has(u, s) { const t = new TextEncoder().encode(s); outer: for (let i = 0; i + t.length <= u.length; i++) { for (let j = 0; j < t.length; j++) if (u[i + j] !== t[j]) continue outer; return true; } return false; },
  keep: {}
};
"""
def open_page(ctx):
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + 'privacy.html'); pg.add_script_tag(path=SRC); pg.add_script_tag(content=HELP)
    return pg, errs
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = new_context(b, {}); pg, errs = open_page(ctx)
        chk(pg.evaluate("typeof MedixaAssets === 'object' && MedixaAssets.LIMITS.budget === 120e6"), 'MedixaAssets loaded (desktop decode budget 120 MP)')

        # 1) transparent PNG keeps PNG + alpha
        r = pg.evaluate("async () => { const b = await T.mk(300, 200, 'image/png', { clear: true }); T.keep.png = b; return MedixaAssets.put(b); }")
        chk(ID.match(r['id']) and r['type'] == 'image/png' and r['alpha'] is True and (r['w'], r['h']) == (300, 200) and r['dup'] is False and r['size'] > 0, f'transparent PNG -> png with alpha: {r}')
        png_id = r['id']

        # 2) 4000x3000 JPEG is shrunk to 2400 px and stays JPEG
        r = pg.evaluate("async () => { const b = await T.mk(4000, 3000, 'image/jpeg'); T.keep.big = b; const t = performance.now(); const r = await MedixaAssets.put(b); r.ms = performance.now() - t; return r; }")
        chk((r['w'], r['h']) == (2400, 1800) and r['type'] == 'image/jpeg' and r['alpha'] is False, f'4000x3000 JPEG -> 2400x1800 jpeg ({r["ms"]:.0f} ms)')
        jpg_id = r['id']

        # 3) the same picture again is stored once
        r = pg.evaluate("() => MedixaAssets.put(T.keep.big)")
        chk(r['id'] == jpg_id and r['dup'] is True and (r['w'], r['h']) == (2400, 1800), 'duplicate put -> same id, dup')
        chk(pg.evaluate("async () => (await MedixaAssets.put(T.keep.png)).dup"), 'duplicate PNG -> dup')

        # 4) get / bytes / has / ids round trip
        r = pg.evaluate("""async (ids) => { const [p, j] = ids; const g = await MedixaAssets.get(j), bj = await MedixaAssets.bytes(j), bp = await MedixaAssets.bytes(p);
            return { g: { id: g.id, type: g.type, w: g.w, h: g.h, alpha: g.alpha, size: g.size, created: g.created, blob: g.blob instanceof Blob && g.blob.size },
                     bj: { magic: T.hex(bj.bytes, 3), type: bj.type, len: bj.bytes.length, u8: bj.bytes instanceof Uint8Array }, bp: { magic: T.hex(bp.bytes, 8), type: bp.type },
                     has: await MedixaAssets.has(j), hasNot: await MedixaAssets.has('img_' + '0'.repeat(32)), ids: await MedixaAssets.ids(),
                     none: [await MedixaAssets.get('img_' + '0'.repeat(32)), await MedixaAssets.bytes('img_' + '0'.repeat(32)), await MedixaAssets.dataUrl('img_' + '0'.repeat(32)), await MedixaAssets.get('../etc')] }; }""", [png_id, jpg_id])
        g = r['g']
        chk(g['id'] == jpg_id and g['type'] == 'image/jpeg' and (g['w'], g['h']) == (2400, 1800) and g['alpha'] is False and g['blob'] == g['size'] and isinstance(g['created'], (int, float)), f'get() record shape: {g}')
        chk(r['bj']['magic'] == 'ffd8ff' and r['bj']['type'] == 'image/jpeg' and r['bj']['len'] == g['size'] and r['bj']['u8'], 'bytes(jpeg) -> Uint8Array with JPEG magic (pdf-lib embedJpg)')
        chk(r['bp']['magic'] == '89504e470d0a1a0a' and r['bp']['type'] == 'image/png', 'bytes(png) -> PNG magic (pdf-lib embedPng)')
        chk(r['has'] is True and r['hasNot'] is False and set(r['ids']) == {png_id, jpg_id}, 'has() / ids()')
        chk(r['none'] == [None, None, None, None], 'unknown or malformed ids -> null')

        # 5) decode cache: size, peek after, one shared decode for concurrent calls
        r = pg.evaluate("""async (ids) => { const [p, j] = ids; const before = MedixaAssets.peek(j); const im = await MedixaAssets.bitmap(j);
            const a = MedixaAssets.bitmap(p), b2 = MedixaAssets.bitmap(p), [x, y] = await Promise.all([a, b2]);
            return { before, w: im.width, h: im.height, peekSame: MedixaAssets.peek(j) === im, sharedPromise: a === b2, sameImg: x === y && MedixaAssets.peek(p) === x,
                     again: (await MedixaAssets.bitmap(j)) === im, pw: x.width, kind: im.constructor.name, missing: await MedixaAssets.bitmap('img_' + 'f'.repeat(32)) }; }""", [png_id, jpg_id])
        chk(r['before'] is None and (r['w'], r['h']) == (2400, 1800) and r['peekSame'], f'bitmap() size {r["w"]}x{r["h"]} ({r["kind"]}) and peek() returns it')
        chk(r['sharedPromise'] and r['sameImg'] and r['again'] and r['pw'] == 300, 'concurrent bitmap() calls share one decode; cached afterwards')
        chk(r['missing'] is None, 'bitmap(unknown id) -> null')

        # 6) WebP input becomes PNG (transparent) or JPEG (opaque)
        r = pg.evaluate("""async () => { const o = await T.mk(640, 480, 'image/webp'), t = await T.mk(640, 480, 'image/webp', { clear: true, seed: 2 });
            return { otype: o.type, ttype: t.type, o: await MedixaAssets.put(o), t: await MedixaAssets.put(t) }; }""")
        chk(r['otype'] == 'image/webp' and r['o']['type'] == 'image/jpeg' and r['o']['alpha'] is False, f'opaque WebP -> jpeg: {r["o"]}')
        chk(r['ttype'] == 'image/webp' and r['t']['type'] == 'image/png' and r['t']['alpha'] is True, f'transparent WebP -> png: {r["t"]}')

        # 7) location metadata is not kept: a JPEG with an EXIF block is re-encoded without it
        r = pg.evaluate("""async () => { const src = new Uint8Array(await (await T.mk(800, 600, 'image/jpeg', { seed: 7 })).arrayBuffer());
            const tiff = [0x4D, 0x4D, 0, 0x2A, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0], body = [...new TextEncoder().encode('Exif'), 0, 0, ...tiff];
            const app1 = [0xFF, 0xE1, (body.length + 2) >> 8, (body.length + 2) & 255, ...body], withExif = new Uint8Array([0xFF, 0xD8, ...app1, ...src.slice(2)]);
            const r = await MedixaAssets.put(new Blob([withExif], { type: 'image/jpeg' })), out = (await MedixaAssets.bytes(r.id)).bytes;
            return { inHad: T.has(withExif, 'Exif'), outHas: T.has(out, 'Exif'), r }; }""")
        chk(r['inHad'] and not r['outHas'] and r['r']['type'] == 'image/jpeg' and (r['r']['w'], r['r']['h']) == (800, 600), 'EXIF block dropped on insert')

        # 8) refusals: rejected Error objects with a code and an Arabic message, never a synchronous throw
        r = pg.evaluate("""async () => { let sync = false, p; try { p = MedixaAssets.put(undefined); } catch (e) { sync = true; }
            const head = new Uint8Array(33); head.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]); new DataView(head.buffer).setUint32(16, 10000); new DataView(head.buffer).setUint32(20, 7000);
            const junk = new Uint8Array(4096); for (let i = 0; i < junk.length; i++) junk[i] = (i * 7919) & 255;
            return { sync, promise: p instanceof Promise, undef: await T.err(p),
                     text: await T.err(MedixaAssets.put(new Blob(['just some notes'], { type: 'text/plain' }))),
                     garbage: await T.err(MedixaAssets.put(new Blob([junk], { type: 'image/png' }))),
                     big: await T.err(MedixaAssets.put(new Blob([new Uint8Array(26 * 1024 * 1024)], { type: 'image/jpeg' }))),
                     dims: await T.err(MedixaAssets.put(new Blob([head], { type: 'image/png' }))),
                     badUrl: await T.err(MedixaAssets.putDataUrl('javascript:alert(1)')),
                     ids: (await MedixaAssets.ids()).length }; }""")
        chk(not r['sync'] and r['promise'] and r['undef']['code'] == 'type', 'put(undefined) -> rejected promise, no synchronous throw')
        chk(r['text']['code'] == 'type' and r['text']['isErr'] and r['text']['msg'] == 'نوع الصورة غير مدعوم. استعمل JPG أو PNG أو WebP.', f'text/plain -> type with Arabic message: {r["text"]}')
        chk(r['garbage']['code'] == 'decode' and r['garbage']['isErr'] and re.search('[؀-ۿ]', r['garbage']['msg'] or ''), f'garbage bytes typed image/png -> decode: {r["garbage"]}')
        chk(r['big']['code'] == 'size', f'26 MB -> size: {r["big"]}')
        chk(r['dims']['code'] == 'dims', f'70 MP header -> dims (refused before decoding): {r["dims"]}')
        chk(r['badUrl']['code'] == 'type', 'putDataUrl(non data URL) -> type')
        chk(r['ids'] == 5, f'refused inputs stored nothing ({r["ids"]} images)')

        # 9) JSON backup: dataUrl -> putDataUrl gives the same id (strokes keep pointing at their picture)
        urls = pg.evaluate("async (ids) => Promise.all(ids.map(i => MedixaAssets.dataUrl(i)))", [png_id, jpg_id])
        chk(urls[0].startswith('data:image/png;base64,') and urls[1].startswith('data:image/jpeg;base64,'), 'dataUrl() -> base64 data URLs of the stored type')
        r = pg.evaluate("async (u) => Promise.all(u.map(x => MedixaAssets.putDataUrl(x)))", urls)
        chk([x['id'] for x in r] == [png_id, jpg_id] and all(x['dup'] for x in r), 'putDataUrl on the same device -> same ids, dup')
        chk(pg.evaluate("async () => (await MedixaAssets.estimate() || {}).quota > 0"), 'estimate() reports storage quota')
        # older Safari: no createImageBitmap / OffscreenCanvas -> <img> + <canvas> path; no crypto.subtle -> same ids from the JS SHA-256
        r = pg.evaluate("""async (pngId) => { const cib = window.createImageBitmap, oc = window.OffscreenCanvas; window.createImageBitmap = undefined; window.OffscreenCanvas = undefined;
            try { const r = await MedixaAssets.put(await T.mk(3000, 1500, 'image/png', { clear: true, seed: 5 })), im = await MedixaAssets.bitmap(r.id);
                  return { r, el: im instanceof HTMLImageElement, nw: im.naturalWidth, nh: im.naturalHeight, peek: MedixaAssets.peek(r.id) === im }; }
            finally { window.createImageBitmap = cib; window.OffscreenCanvas = oc; } }""", png_id)
        chk(r['r']['type'] == 'image/png' and r['r']['alpha'] is True and (r['r']['w'], r['r']['h']) == (2400, 1200) and r['el'] and (r['nw'], r['nh']) == (2400, 1200) and r['peek'], f'fallback decoders (img + canvas): {r}')
        r = pg.evaluate("""async () => { Object.defineProperty(window.crypto, 'subtle', { value: undefined, configurable: true });
            try { return { off: !window.crypto.subtle, r: await MedixaAssets.put(T.keep.png) }; } finally { delete window.crypto.subtle; } }""")
        chk(r['off'] and r['r']['id'] == png_id and r['r']['dup'] is True and pg.evaluate("!!crypto.subtle"), 'without crypto.subtle the JS SHA-256 gives the same id')
        chk(not errs, 'no page errors (main): ' + '; '.join(errs[:2]))
        ctx.close()

        # restore on a fresh device (empty IndexedDB)
        ctx2 = new_context(b, {}); pg2, errs2 = open_page(ctx2)
        r = pg2.evaluate("""async (u) => { const before = await MedixaAssets.ids(), out = [];
            for (const x of u) { const r = await MedixaAssets.putDataUrl(x), b = await MedixaAssets.bytes(r.id); out.push({ r, len: b.bytes.length, url: await MedixaAssets.dataUrl(r.id) }); }
            return { before, out }; }""", urls)
        chk(r['before'] == [] and [x['r']['id'] for x in r['out']] == [png_id, jpg_id] and not any(x['r']['dup'] for x in r['out']), 'putDataUrl on a fresh device -> same ids, stored')
        chk([x['url'] for x in r['out']] == urls, 'restored bytes are identical (dataUrl matches)')
        o = r['out']; chk(o[0]['r']['alpha'] is True and o[0]['r']['type'] == 'image/png' and (o[1]['r']['w'], o[1]['r']['h']) == (2400, 1800) and o[1]['r']['alpha'] is False, 'restored records keep type, size and alpha')
        # a WebP data URL from elsewhere is prepared like a fresh insert
        r = pg2.evaluate("async () => { const b = await T.mk(320, 240, 'image/webp', { seed: 9 }); const u = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); return MedixaAssets.putDataUrl(u); }")
        chk(r['type'] == 'image/jpeg' and (r['w'], r['h']) == (320, 240), 'putDataUrl(WebP) -> re-encoded jpeg')

        # IndexedDB unavailable -> 'idb' (rejected), and the store recovers once it is back
        pg3, errs3 = open_page(ctx2)
        r = pg3.evaluate("""async () => { const o = IDBFactory.prototype.open; IDBFactory.prototype.open = function () { throw new DOMException('blocked', 'SecurityError'); };
            let sync = false, p; try { p = MedixaAssets.has('img_' + 'a'.repeat(32)); } catch (e) { sync = true; }
            const a = await T.err(p), b2 = await T.err(MedixaAssets.bitmap('img_' + 'b'.repeat(32))); IDBFactory.prototype.open = o;
            return { sync, a, b: b2, after: await MedixaAssets.ids() }; }""")
        chk(not r['sync'] and r['a']['code'] == 'idb' and r['b']['code'] == 'idb' and re.search('[؀-ۿ]', r['a']['msg'] or ''), f'IndexedDB failure -> rejected idb error: {r["a"]}')
        chk(len(r['after']) == 3, 'store usable again after IndexedDB comes back')
        # storage full -> 'quota', nothing half-written
        r = pg3.evaluate("""async () => { const o = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { throw new DOMException('full', 'QuotaExceededError'); };
            const b = await T.mk(200, 100, 'image/jpeg', { seed: 11 }), e = await T.err(MedixaAssets.put(b)); IDBObjectStore.prototype.put = o;
            const n = (await MedixaAssets.ids()).length, ok = await MedixaAssets.put(b); return { e, n, ok, n2: (await MedixaAssets.ids()).length }; }""")
        chk(r['e']['code'] == 'quota' and re.search('مساحة', r['e']['msg'] or ''), f'quota exceeded -> quota error: {r["e"]}')
        chk(r['n'] == 3 and r['ok']['dup'] is False and r['n2'] == 4, 'after a quota error the image can be saved once space is back')
        chk(not errs2 and not errs3, 'no page errors (restore/failures): ' + '; '.join((errs2 + errs3)[:2]))
        ctx2.close()

        # touch device (iPad): 40 MP decode budget; old decodes are closed, the one just returned never is
        ctx3 = new_context(b, {}, has_touch=True, is_mobile=True, viewport={'width': 820, 'height': 1180},
                           user_agent='Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')
        pg4, errs4 = open_page(ctx3)
        chk(pg4.evaluate("MedixaAssets.LIMITS.budget") == 40e6, 'touch device decode budget is 40 MP')
        r = pg4.evaluate("""async () => { const ids = [], ims = [];
            for (let i = 0; i < 11; i++) { const r = await MedixaAssets.put(await T.mk(2400, 1800, 'image/jpeg', { seed: 100 + i })); ids.push(r.id); ims.push(await MedixaAssets.bitmap(r.id)); }
            const cached = ids.filter(i => MedixaAssets.peek(i)), last = ims[ims.length - 1];
            const px = cached.reduce((s, i) => { const m = MedixaAssets.peek(i); return s + m.width * m.height; }, 0);
            const firstAgain = await MedixaAssets.bitmap(ids[0]);
            return { distinct: new Set(ids).size, cached: cached.length, px, firstClosed: ims[0].width === 0, firstEvicted: !cached.includes(ids[0]),
                     lastOk: last.width === 2400 && MedixaAssets.peek(ids[10]) === last, reload: firstAgain.width === 2400 && firstAgain !== ims[0],
                     lastStill: last.width === 2400 }; }""")
        chk(r['distinct'] == 11 and r['firstEvicted'] and r['firstClosed'], f'oldest decode evicted and closed ({r["cached"]} of 11 kept)')
        chk(r['px'] <= 40e6 and r['lastOk'], f'cache within 40 MP ({r["px"] / 1e6:.1f} MP) and the latest image is kept open')
        chk(r['reload'] and r['lastStill'], 'evicted image decodes again on demand; the image just returned is never closed')
        chk(not errs4, 'no page errors (touch): ' + '; '.join(errs4[:2]))
        b.close()
finally:
    srv.terminate()
chk.done()
