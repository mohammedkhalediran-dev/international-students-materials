# python3 -I tests/studio_phase2_browser.py — Phase 2 gate: shapes, lasso on mixed objects (move/resize/duplicate/delete/nudge,
# undo/redo after transform), text + sticky (Arabic multiline, reload, export), Zoom Writing at several scales, custom toolbar.
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8794; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO PHASE 2')
URL = 'files/uploaded/studio-mixed.pdf'; KEY = 'medixa.pdf.annotations.v1:' + BASE + URL
def stored(pg): return json.loads(pg.evaluate("k => localStorage.getItem(k)", KEY) or '[]')
def box(pg, n, top=130):
    pg.evaluate("([i,t])=>{const c=document.querySelectorAll('canvas.ink')[i];scrollBy(0,c.getBoundingClientRect().top-t)}", [n, top]); pg.wait_for_timeout(150); return pg.locator('canvas.ink').nth(n).bounding_box()
def at(pg, n, fu, fv):
    b = box(pg, n); return (b['x'] + b['width'] * fu, b['y'] + b['height'] * fv)
def drag(pg, n, f0, f1, steps=10):
    b = box(pg, n); x0, y0 = b['x'] + b['width'] * f0[0], b['y'] + b['height'] * f0[1]; x1, y1 = b['x'] + b['width'] * f1[0], b['y'] + b['height'] * f1[1]
    pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move(x1, y1, steps=steps); pg.mouse.up(); pg.wait_for_timeout(120)
def tool(pg, t): pg.click(f'#studio-toolbar [data-tool={t}]') if pg.locator(f'#studio-toolbar [data-tool={t}]').is_visible() else pg.evaluate(f"MedixaStudio.setTool('{t}')")
def load(ctx, **kw):
    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept()); pg.goto(reader(BASE, URL)); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(500); return pg
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = new_context(b, {URL: 'mixed.pdf'}, viewport={'width': 900, 'height': 1300}, accept_downloads=True)
        pg = load(ctx); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        # ---------- toolbar ----------
        names = pg.eval_on_selector_all('#studio-toolbar [data-tool]', 'els => els.map(e => e.getAttribute("aria-label"))')
        chk(len(names) == 10 and all(names), f'toolbar: 10 accessible tools {names}')
        sizes = pg.eval_on_selector_all('#studio-toolbar button', 'els => els.filter(e=>e.offsetParent).map(e => [e.getBoundingClientRect().width, e.getBoundingClientRect().height])')
        chk(all(w >= 43.5 and h >= 43.5 for w, h in sizes), f'toolbar: all targets >= 44px ({[s for s in sizes if s[0] < 43.5 or s[1] < 43.5][:3]})')
        # ---------- shapes ----------
        tool(pg, 'line'); drag(pg, 0, (0.1, 0.1), (0.4, 0.13)); tool(pg, 'rectangle'); drag(pg, 0, (0.5, 0.08), (0.8, 0.2)); tool(pg, 'ellipse'); drag(pg, 0, (0.1, 0.2), (0.3, 0.3))
        pg.click('#studio-settings'); pg.check('#studio-snap'); pg.click('#studio-settings'); tool(pg, 'line'); drag(pg, 0, (0.1, 0.35), (0.5, 0.38)); pg.click('#studio-settings'); pg.uncheck('#studio-snap'); pg.click('#studio-settings'); pg.wait_for_timeout(200)
        s = stored(pg); chk([x['tool'] for x in s] == ['line', 'rectangle', 'ellipse', 'line'], f'shapes saved as vector {[x["tool"] for x in s]}')
        ln = s[3]['points']; chk(abs(ln[1][1] - ln[0][1]) < 1e-6, f'angle snap makes the line horizontal ({ln})')
        pg.click('#undo'); pg.wait_for_timeout(100); chk(len(stored(pg)) == 3, 'shape undo')
        pg.click('#redo'); pg.wait_for_timeout(100)
        # ---------- text (Arabic multiline + English) and sticky ----------
        tool(pg, 'text'); b0 = box(pg, 0); pg.mouse.click(*at(pg, 0, 0.1, 0.4))
        pg.fill('.st-editor textarea', 'مرحباً بالقلب\nالدورة الدموية Heart'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(250)
        tool(pg, 'sticky'); pg.mouse.click(*at(pg, 0, 0.55, 0.4)); pg.fill('.st-editor textarea', 'High yield: SA node'); pg.click('.st-ok'); pg.wait_for_timeout(250)
        s = stored(pg); texts = [x for x in s if x['tool'] in ('text', 'sticky')]
        chk(len(texts) == 2 and texts[0]['text'] == 'مرحباً بالقلب\nالدورة الدموية Heart' and texts[1]['tool'] == 'sticky', 'text + sticky saved with Arabic multiline intact')
        chk(all(0 < t['h'] < 0.5 and 0 < t['w'] <= 1 for t in texts), 'notes sized to content')
        pg.mouse.dblclick(*at(pg, 0, 0.12, 0.41)); pg.wait_for_timeout(200)
        chk(pg.locator('.st-editor textarea').count() == 1 and 'مرحباً' in pg.input_value('.st-editor textarea'), 'double click reopens text for editing')
        pg.fill('.st-editor textarea', 'مرحباً بالقلب\nالدورة الدموية Heart\nسطر ثالث'); pg.click('.st-ok'); pg.wait_for_timeout(250)
        chk('سطر ثالث' in [x for x in stored(pg) if x['tool'] == 'text'][0]['text'], 'text edit saved')
        pg.click('#undo'); pg.wait_for_timeout(150); chk('سطر ثالث' not in [x for x in stored(pg) if x['tool'] == 'text'][0]['text'], 'text edit undone')
        pg.click('#redo'); pg.wait_for_timeout(150)
        # XSS-style content stays inert text
        tool(pg, 'text'); pg.mouse.click(*at(pg, 0, 0.1, 0.5)); pg.fill('.st-editor textarea', '<img src=x onerror=window.__pwn=1>'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(250)
        chk(pg.evaluate('window.__pwn') is None and pg.locator('img[src=x]').count() == 0, 'markup in notes is never interpreted')
        # ---------- lasso on mixed objects ----------
        tool(pg, 'pen'); drag(pg, 0, (0.15, 0.55), (0.35, 0.6)); n_all = len(stored(pg))
        tool(pg, 'lasso'); b0 = box(pg, 0)
        before = {x['id']: x for x in stored(pg)}
        # polygon around the top-left region (line, ellipse, rectangle not fully) -> use a big loop around the left half
        def loop(pts):
            b = box(pg, 0); xy = [(b['x'] + b['width'] * u, b['y'] + b['height'] * v) for u, v in pts]
            pg.mouse.move(*xy[0]); pg.mouse.down()
            for q in xy[1:] + [xy[0]]: pg.mouse.move(*q, steps=4)
            pg.mouse.up(); pg.wait_for_timeout(150)
        loop([(0.05, 0.05), (0.47, 0.05), (0.47, 0.65), (0.05, 0.65)])
        sel_ids = pg.evaluate("MedixaStudio.selection.sel.ids.slice()")
        kinds = sorted(before[i]['tool'] for i in sel_ids)
        chk('ellipse' in kinds and 'line' in kinds and 'text' in kinds and 'pen' in kinds and 'rectangle' not in kinds, f'lasso selects mixed objects fully inside: {kinds}')
        pg.evaluate("MedixaStudio.selection.types.ink = false"); pg.evaluate("MedixaStudio.selection.clear()"); loop([(0.05, 0.05), (0.47, 0.05), (0.47, 0.65), (0.05, 0.65)])
        kinds2 = sorted(before[i]['tool'] for i in pg.evaluate("MedixaStudio.selection.sel.ids.slice()"))
        chk('pen' not in kinds2 and 'ellipse' in kinds2, f'selectable-type filter excludes ink: {kinds2}'); pg.evaluate("MedixaStudio.selection.types.ink = true"); pg.evaluate("MedixaStudio.selection.clear()")
        loop([(0.05, 0.05), (0.47, 0.05), (0.47, 0.65), (0.05, 0.65)]); sel_ids = pg.evaluate("MedixaStudio.selection.sel.ids.slice()")
        # move: drag from inside the selection box
        bx = pg.evaluate("(ids)=>{const it=MedixaStudio.S.items.filter(s=>ids.includes(s.id));const b=it.map(s=>MedixaStudio.C.bounds(s));return [Math.min(...b.map(x=>x[0])),Math.min(...b.map(x=>x[1])),Math.max(...b.map(x=>x[2])),Math.max(...b.map(x=>x[3]))]}", sel_ids)
        cx, cy = (bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2; drag(pg, 0, (cx, cy), (cx + 0.1, cy + 0.05)); pg.wait_for_timeout(200)
        after = {x['id']: x for x in stored(pg)}
        moved = all(abs(after[i]['points'][0][0] - before[i]['points'][0][0] - 0.1) < 0.01 and abs(after[i]['points'][0][1] - before[i]['points'][0][1] - 0.05) < 0.01 for i in sel_ids)
        chk(moved, 'lasso move translates every selected object canonically')
        chk(len(pg.evaluate("MedixaStudio.S.hist.undoStack")) > 0, 'transform is a history command')
        pg.click('#undo'); pg.wait_for_timeout(200); back = {x['id']: x for x in stored(pg)}
        chk(all(back[i]['points'] == before[i]['points'] for i in sel_ids), 'undo after transform restores exact geometry (one command for the whole selection)')
        pg.click('#redo'); pg.wait_for_timeout(200)
        # resize from SE handle
        bx = pg.evaluate("(ids)=>{const it=MedixaStudio.S.items.filter(s=>ids.includes(s.id));const b=it.map(s=>MedixaStudio.C.bounds(s));return [Math.min(...b.map(x=>x[0])),Math.min(...b.map(x=>x[1])),Math.max(...b.map(x=>x[2])),Math.max(...b.map(x=>x[3]))]}", sel_ids)
        w0 = bx[2] - bx[0]; pad = 6 / pg.evaluate("document.querySelector('canvas.ink').getBoundingClientRect().width")
        drag(pg, 0, (bx[2], bx[3]), (bx[0] + w0 * 0.5, bx[1] + (bx[3] - bx[1]) * 0.5)); pg.wait_for_timeout(200)
        bx2 = pg.evaluate("(ids)=>{const it=MedixaStudio.S.items.filter(s=>ids.includes(s.id));const b=it.map(s=>MedixaStudio.C.bounds(s));return [Math.min(...b.map(x=>x[0])),Math.min(...b.map(x=>x[1])),Math.max(...b.map(x=>x[2])),Math.max(...b.map(x=>x[3]))]}", sel_ids)
        chk((bx2[2] - bx2[0]) < w0 * 0.8 and abs(bx2[0] - bx[0]) < 0.01, f'lasso resize scales about the opposite corner ({w0:.3f} -> {bx2[2]-bx2[0]:.3f})')
        # keyboard nudge, duplicate, delete, escape
        x_before = [x for x in stored(pg) if x['id'] == sel_ids[0]][0]['points'][0][0]
        pg.keyboard.press('Shift+ArrowRight'); pg.wait_for_timeout(200); x_after = [x for x in stored(pg) if x['id'] == sel_ids[0]][0]['points'][0][0]
        chk(0 < x_after - x_before < 0.05, f'keyboard nudge moves ({x_after - x_before:.4f})')
        n0 = len(stored(pg)); pg.click('#sel-dup'); pg.wait_for_timeout(250); chk(len(stored(pg)) == n0 + len(sel_ids), 'duplicate selection')
        pg.click('#sel-del'); pg.wait_for_timeout(250); chk(len(stored(pg)) == n0, 'delete selection (duplicates only)')
        pg.click('#undo'); pg.wait_for_timeout(200); chk(len(stored(pg)) == n0 + len(sel_ids), 'undo delete restores selection as one command')
        pg.keyboard.press('Escape'); chk(pg.evaluate("MedixaStudio.selection.sel.ids.length") == 0, 'Escape clears selection')
        # ---------- reload keeps notes; export puts text where it belongs (incl. rotated + cropped pages) ----------
        tool(pg, 'text')
        for i in (2, 3):
            b2 = box(pg, i); pg.mouse.click(*at(pg, i, 0.3, 0.3)); pg.fill('.st-editor textarea', 'اختبار Rotated'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(250)
        pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(600)
        chk(len([x for x in stored(pg) if x['tool'] in ('text', 'sticky')]) >= 5, 'notes survive reload')
        with pg.expect_download() as dl: pg.click('#download')
        path = os.path.join(FX, 'p2.pdf'); dl.value.save_as(path); data = open(path, 'rb').read(); chk(data[:5] == b'%PDF-', 'export with text, shapes and lasso moves')
        v = ctx.new_page(); v.goto(BASE + 'privacy.html'); v.add_script_tag(url='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
        v.evaluate("()=>{pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}")
        res = v.evaluate("""async (arr) => { const doc = await pdfjsLib.getDocument({data:new Uint8Array(arr)}).promise, out=[];
          for (const n of [3,4]) { const pgx=await doc.getPage(n), vp=pgx.getViewport({scale:1}); const c=document.createElement('canvas'); c.width=Math.ceil(vp.width); c.height=Math.ceil(vp.height); await pgx.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
            const d=c.getContext('2d').getImageData(Math.round(0.3*vp.width),Math.round(0.3*vp.height),Math.round(0.28*vp.width),Math.round(0.08*vp.height)).data; let dark=0; for(let i=0;i<d.length;i+=4) if(d[i]<90&&d[i+1]<90&&d[i+2]<120) dark++; out.push(dark); } return out; }""", list(data))
        chk(all(d > 40 for d in res), f'exported text is upright and positioned on rotated/cropped pages ({res} dark px)')
        v.close()
        # ---------- Zoom Writing ----------
        pg.evaluate("localStorage.removeItem(MedixaStudio.S.key)"); pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(500)
        pg.click('#studio-toolbar [data-tool=zoom]'); pg.wait_for_selector('#zw:not([hidden])'); pg.wait_for_timeout(300)
        chk(pg.locator('#zw-canvas').count() == 1 and pg.is_visible('#zw-canvas'), 'zoom writing strip opens')
        for mag in (2, 4, 6):
            pg.select_option('#zw-mag', str(mag)); pg.wait_for_timeout(250); n0 = len(stored(pg))
            R = pg.evaluate("(()=>{const z=MedixaStudio.zoomWriting.zw,pg=MedixaStudio.page(z.page);return z.R(pg)})()")
            sb = pg.locator('#zw-canvas').bounding_box(); y = sb['y'] + sb['height'] * 0.5
            pg.mouse.move(sb['x'] + sb['width'] * 0.25, y); pg.mouse.down(); pg.mouse.move(sb['x'] + sb['width'] * 0.5, y + 10, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
            s = stored(pg); last = s[-1]; chk(len(s) == n0 + 1, f'zoom x{mag}: stroke saved')
            exp_u = R['u0'] + 0.25 * R['wU']; exp_v = R['v0'] + 0.5 * R['hV']
            chk(abs(last['points'][0][0] - exp_u) < 0.004 and abs(last['points'][0][1] - exp_v) < 0.01, f'zoom x{mag}: lands at mapped page coordinate ({last["points"][0]} vs {exp_u:.4f},{exp_v:.4f})')
            wpage = pg.evaluate("MedixaStudio.page(MedixaStudio.zoomWriting.zw.page).cssW"); chk(abs(last['width'] - pg.evaluate('MedixaStudio.S.width') / mag) < 0.01, f'zoom x{mag}: stored width is magnified-down ({last["width"]:.2f})')
            chk(R['wU'] > 0 and abs(R['wU'] - (sb['width'] / mag) / wpage) < 0.005, f'zoom x{mag}: region size follows magnification')
        # target moves and clamps at edges
        pg.evaluate("(()=>{const z=MedixaStudio.zoomWriting.zw;z.cu=5;z.cv=5})()"); pg.click('#zw-right'); pg.wait_for_timeout(200)
        R = pg.evaluate("(()=>{const z=MedixaStudio.zoomWriting.zw;return z.R(MedixaStudio.page(z.page))})()"); chk(R['u0'] + R['wU'] <= 1.0001 and R['v0'] + R['hV'] <= 1.0001 and R['u0'] >= 0, f'region clamped inside page {R}')
        pg.click('#zw-newline'); pg.click('#zw-close'); pg.wait_for_timeout(200); chk(pg.is_hidden('#zw'), 'zoom writing closes'); chk(pg.evaluate("MedixaStudio.S.tool") != 'zoom', 'tool restored after close')
        # rotation / resize keeps the region on the page
        pg.click('#studio-toolbar [data-tool=zoom]'); pg.set_viewport_size({'width': 700, 'height': 1000}); pg.wait_for_timeout(500)
        R = pg.evaluate("(()=>{const z=MedixaStudio.zoomWriting.zw;return z.R(MedixaStudio.page(z.page))})()"); chk(R['u0'] >= 0 and R['u0'] + R['wU'] <= 1.0001, 'region restored inside page after viewport change'); pg.click('#zw-close')
        # ---------- toolbar customization persists ----------
        pg.set_viewport_size({'width': 900, 'height': 1000}); pg.click('#studio-settings'); pg.click('#studio-customize'); pg.wait_for_selector('#studio-cust[open]')
        pg.uncheck('#cust-ellipse'); pg.click('[aria-label="تقديم قلم"]') if False else None
        pg.click('[aria-label="تأخير قلم"]'); pg.check('#cust-side'); pg.click('#studio-cust >> text=إغلاق'); pg.wait_for_timeout(200)
        order = pg.eval_on_selector_all('#studio-toolbar [data-tool]', 'els => els.map(e => e.dataset.tool)')
        chk('ellipse' not in order and order.index('pen') == 1 and order[0] == 'highlight', f'custom order + hidden tool applied {order}')
        chk(pg.get_attribute('#studio-toolbar', 'data-side') == 'end', 'left-handed placement')
        pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(500)
        order2 = pg.eval_on_selector_all('#studio-toolbar [data-tool]', 'els => els.map(e => e.dataset.tool)'); chk(order2 == order, 'toolbar config persisted')
        pg.click('#studio-settings'); pg.click('#studio-customize'); pg.wait_for_selector('#studio-cust[open]'); pg.click('#studio-cust >> text=إعادة الضبط'); pg.click('#studio-cust >> text=إغلاق'); pg.wait_for_timeout(200)
        chk(pg.eval_on_selector_all('#studio-toolbar [data-tool]', 'els => els.length') == 10 and pg.get_attribute('#studio-toolbar', 'data-side') == 'start', 'reset restores defaults')
        # compact overflow: active tool is always visible
        pg.set_viewport_size({'width': 390, 'height': 800}); pg.wait_for_timeout(400)
        vis = pg.eval_on_selector_all('#studio-toolbar .st-tools > [data-tool]', 'els => els.map(e => e.dataset.tool)'); chk(len(vis) <= 5 and pg.locator('.st-more').count() == 1, f'compact toolbar collapses to overflow {vis}')
        pg.evaluate("MedixaStudio.setTool('zoom')"); pg.wait_for_timeout(300); pg.evaluate("MedixaStudio.zoomWriting.close()"); pg.evaluate("MedixaStudio.setTool('rectangle')"); pg.wait_for_timeout(300)
        vis = pg.eval_on_selector_all('#studio-toolbar .st-tools > [data-tool]', 'els => els.map(e => e.dataset.tool)'); chk('rectangle' in vis, f'active tool stays visible in compact mode {vis}')
        chk(not errs, f'no JS errors {errs[:3]}'); b.close()
finally:
    srv.terminate()
chk.done()
