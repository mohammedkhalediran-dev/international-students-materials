# python3 -I tests/studio_phase1_browser.py — Phase 1 gate: draw on a real mixed-size/mixed-rotation PDF, save, reload,
# erase/undo/redo, export, and reopen the exported PDF independently to verify ink, page count and original text.
import os, sys, json, math, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8791; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO PHASE 1')
URL = 'files/uploaded/studio-mixed.pdf'; KEY = 'medixa.pdf.annotations.v1:' + BASE + URL
def stored(pg): return json.loads(pg.evaluate("k => localStorage.getItem(k)", KEY) or '[]')
def page_box(pg, n):
    pg.locator('canvas.ink').nth(n).scroll_into_view_if_needed(); pg.wait_for_timeout(150); return pg.locator('canvas.ink').nth(n).bounding_box()
def stroke(pg, n, f0, f1, steps=12):
    b = page_box(pg, n); x0, y0 = b['x'] + b['width'] * f0[0], b['y'] + b['height'] * f0[1]; x1, y1 = b['x'] + b['width'] * f1[0], b['y'] + b['height'] * f1[1]
    pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move(x1, y1, steps=steps); pg.mouse.up(); pg.wait_for_timeout(120)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        for dpr in (1, 2):
            ctx = new_context(b, {URL: 'mixed.pdf'}, viewport={'width': 900, 'height': 1000}, device_scale_factor=dpr, accept_downloads=True)
            pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: d.accept())
            pg.goto(reader(BASE, URL)); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(500)
            chk('جاهز' in pg.inner_text('#status'), f'dpr{dpr}: ready status')
            # canvas backing store follows DPR, CSS size does not
            cw = pg.evaluate("()=>{const c=document.querySelector('canvas.ink');return [c.width,c.getBoundingClientRect().width]}")
            chk(abs(cw[0] - cw[1] * dpr) <= 1, f'dpr{dpr}: backing = css*dpr {cw}')
            # pen on every page (rotations 0,0,90,270(cropbox),180), highlighter on page 1
            for i in range(5): stroke(pg, i, (0.2, 0.2), (0.7, 0.55))
            pg.click('[data-tool=highlight]'); stroke(pg, 0, (0.2, 0.7), (0.8, 0.7)); pg.click('[data-tool=pen]')
            pg.wait_for_timeout(500)
            items = stored(pg)
            chk(len(items) == 6, f'dpr{dpr}: 6 strokes saved ({len(items)})')
            chk(all(s.get('id') and s.get('v') == 2 and all(0 <= c <= 1 for pt in s['points'] for c in pt) for s in items), f'dpr{dpr}: v2 ids and canonical coordinates')
            first = items[0]['points'][0]; chk(abs(first[0] - 0.2) < 0.02 and abs(first[1] - 0.2) < 0.02, f'dpr{dpr}: stored start ~ (0.2,0.2) = {first}')
            chk(pg.inner_text('#status').startswith('محفوظ') or 'محفوظ' in pg.inner_text('#status'), f'dpr{dpr}: saved status')
            # reload persists
            pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(600)
            chk(len(stored(pg)) == 6, f'dpr{dpr}: strokes survive reload')
            px = pg.evaluate("()=>{const c=document.querySelectorAll('canvas.ink')[0],d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n}")
            chk(px > 200, f'dpr{dpr}: reloaded strokes are painted ({px}px)')
            # eraser removes the pen stroke on page 2 only; undo restores; redo removes again
            pg.click('[data-tool=eraser]'); stroke(pg, 1, (0.45, 0.1), (0.45, 0.9), steps=20); pg.wait_for_timeout(500)
            chk(len(stored(pg)) == 5, f'dpr{dpr}: eraser removed 1 stroke ({len(stored(pg))})')
            pg.click('#undo'); pg.wait_for_timeout(500); chk(len(stored(pg)) == 6, f'dpr{dpr}: undo restores the erased stroke')
            pg.click('#redo'); pg.wait_for_timeout(500); chk(len(stored(pg)) == 5, f'dpr{dpr}: redo erases again'); pg.click('#undo'); pg.wait_for_timeout(500)
            # export → independent reopen
            with pg.expect_download() as dl: pg.click('#download')
            path = os.path.join(FX, f'export{dpr}.pdf'); dl.value.save_as(path); data = open(path, 'rb').read()
            chk(data[:5] == b'%PDF-' and len(data) > 3000, f'dpr{dpr}: exported a PDF ({len(data)} bytes)')
            v = ctx.new_page(); v.goto(BASE + 'privacy.html'); v.add_script_tag(url='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
            v.evaluate("()=>{pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}")
            res = v.evaluate("""async (arr) => {
              const doc = await pdfjsLib.getDocument({data:new Uint8Array(arr)}).promise, out = {pages:doc.numPages, texts:[], px:[]};
              for (let n=1;n<=doc.numPages;n++){ const pgx=await doc.getPage(n), vp=pgx.getViewport({scale:1}); const c=document.createElement('canvas'); c.width=Math.ceil(vp.width); c.height=Math.ceil(vp.height);
                await pgx.render({canvasContext:c.getContext('2d'),viewport:vp}).promise; const tc=await pgx.getTextContent(); out.texts.push(tc.items.map(i=>i.str).join(' '));
                const ctx=c.getContext('2d'), hit=[]; for (const f of [0.3,0.45,0.6]) { const x=Math.round((0.2+(0.7-0.2)*((f-0.2)/(0.7-0.2)))*vp.width); }
                // pen runs from (0.2,0.2) to (0.7,0.55): sample 5 points along it, count reddish pixels in a 7px box around each
                let found=0; for (let k=1;k<=5;k++){ const t=k/6,u=0.2+0.5*t,v=0.2+0.35*t,cx=Math.round(u*vp.width),cy=Math.round(v*vp.height); const d=ctx.getImageData(Math.max(0,cx-4),Math.max(0,cy-4),9,9).data; let red=false; for(let i=0;i<d.length;i+=4) if(d[i]>180&&d[i+1]<130&&d[i+2]<150) red=true; if(red) found++; }
                out.px.push(found); }
              return out; }""", list(data))
            chk(res['pages'] == 5, f'dpr{dpr}: page count preserved ({res["pages"]})')
            chk(all(('Mixed fixture page %d' % (i + 1)) in res['texts'][i] for i in range(5)), f'dpr{dpr}: original text preserved on every page')
            chk(all(f >= 4 for f in res['px']), f'dpr{dpr}: ink lands where drawn on every page incl. rotated/cropped {res["px"]}')
            chk(not errs, f'dpr{dpr}: no JS errors {errs[:2]}'); ctx.close()
        b.close()
finally:
    srv.terminate()
chk.done()
