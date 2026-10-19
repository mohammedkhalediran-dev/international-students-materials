# python3 -I tests/studio_phase3_margins_browser.py — expandable margins: virtual surface, no stretching, persistence,
# shrink protection, clipped vs expanded export (rotated page too), original PDF bytes untouched.
import os, sys, json, hashlib
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8802; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO MARGINS')
URL = 'files/uploaded/studio-mixed.pdf'; KEY = 'medixa.pdf.annotations.v1:' + BASE + URL; LKEY = 'medixa.studio.layout.v1:' + BASE + URL
def stored(pg): return json.loads(pg.evaluate("k => localStorage.getItem(k)", KEY) or '[]')
def layout(pg): return json.loads(pg.evaluate("k => localStorage.getItem(k)", LKEY) or 'null')
def load(ctx):
    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept()); pg.goto(reader(BASE, URL)); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(600); return pg
def set_margins(pg, vals, page_all=False):
    pg.click('#studio-settings'); pg.click('#studio-margins-btn'); pg.wait_for_selector('#studio-margins[open]')
    for k, v in vals.items(): pg.select_option('#margin-' + k, str(v))
    if page_all: pg.check('#margin-all')
    pg.click('#margin-apply'); pg.wait_for_timeout(700)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox']); ctx = new_context(b, {URL: 'mixed.pdf'}, viewport={'width': 1300, 'height': 1000}, accept_downloads=True)
        pg = load(ctx); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        orig = open(os.path.join(FX, 'mixed.pdf'), 'rb').read(); h0 = hashlib.sha256(orig).hexdigest()
        pg.evaluate("document.querySelectorAll('section.page')[0].scrollIntoView()"); pg.wait_for_timeout(400)
        box0 = pg.evaluate("(()=>{const e=document.querySelector('section.page'),c=e.querySelector('canvas.pdf');return [c.getBoundingClientRect().width,c.getBoundingClientRect().height]})()")
        # a stroke on the page BEFORE margins exist
        pg.evaluate("MedixaStudio.setTool('pen')"); bb = pg.locator('canvas.ink').first.bounding_box(); pg.mouse.move(bb['x'] + bb['width'] * 0.3, bb['y'] + 300); pg.mouse.down(); pg.mouse.move(bb['x'] + bb['width'] * 0.6, bb['y'] + 330, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
        before = stored(pg)[0]['points']
        set_margins(pg, {'r': 0.5, 'b': 0.25})
        L = layout(pg); chk(L and L['margins'].get('1') == {'l': 0, 't': 0, 'r': 0.5, 'b': 0.25}, f'layout saved separately from ink {L}')
        pg.wait_for_timeout(600); pg.evaluate("document.querySelectorAll('section.page')[0].scrollIntoView()"); pg.wait_for_timeout(500)
        sheet = pg.evaluate("(()=>{const e=document.querySelector('section.page'),c=e.querySelector('canvas.pdf'),r=e.getBoundingClientRect(),q=c.getBoundingClientRect();return [r.width,r.height,q.width,q.height,q.left-r.left,q.top-r.top]})()")
        chk(abs(sheet[2] / sheet[0] - 1 / 1.5) < 0.01 and abs(sheet[3] / sheet[1] - 1 / 1.25) < 0.01, f'page area occupies 1/(1+r) of the sheet {sheet}')
        chk(abs(sheet[2] / sheet[3] - box0[0] / box0[1]) < 0.01, 'page aspect ratio unchanged')
        chk(stored(pg)[0]['points'] == before, 'existing annotation untouched when margins appear (no stretching)')
        # draw in the right margin
        bb = pg.locator('canvas.ink').first.bounding_box(); pg.mouse.move(bb['x'] + bb['width'] * 0.8, bb['y'] + 200); pg.mouse.down(); pg.mouse.move(bb['x'] + bb['width'] * 0.95, bb['y'] + 240, steps=6); pg.mouse.up(); pg.wait_for_timeout(400)
        s = stored(pg); m = s[-1]['points']; chk(len(s) == 2 and all(1.02 < q[0] < 1.5 for q in m), f'margin stroke stored beyond the page edge (u={[round(q[0],2) for q in m][:3]})')
        # text in the bottom margin
        pg.evaluate("MedixaStudio.setTool('text')"); pg.evaluate("scrollTo(0, document.querySelectorAll('canvas.ink')[0].getBoundingClientRect().bottom + scrollY - 500)"); pg.wait_for_timeout(400); bb = pg.locator('canvas.ink').first.bounding_box(); pg.mouse.click(bb['x'] + 80, bb['y'] + bb['height'] - 150); pg.fill('.st-editor textarea', 'هامش سفلي note'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(400)
        chk(any(x['tool'] == 'text' and x['points'][0][1] > 1 for x in stored(pg)), 'text can live in the bottom margin')
        # reload keeps layout + painting (tab position memory cleared so nothing scrolls under the test)
        pg.evaluate("localStorage.removeItem('medixa.studio.tabs.v1')")
        pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(900)
        chk(pg.evaluate("MedixaStudio.marginsOf(1).r") == 0.5, 'margins survive reload')
        painted = pg.evaluate("(()=>{const c=document.querySelectorAll('canvas.ink')[0],d=c.getContext('2d').getImageData(Math.floor(c.width*0.67),0,Math.floor(c.width*0.33),c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n})()")
        chk(painted > 100, f'margin ink repainted after reload ({painted}px)')
        # shrink protection
        pg.wait_for_timeout(1500); pg.evaluate("document.querySelectorAll('section.page')[0].scrollIntoView()"); pg.wait_for_timeout(900)
        set_margins(pg, {'r': 0, 'b': 0}); chk('كتابة' in pg.inner_text('#margin-msg') or pg.evaluate("MedixaStudio.marginsOf(1).r") > 0, 'shrinking below existing writing is refused')
        chk(pg.evaluate("MedixaStudio.marginsOf(1).r") >= 0.5 - 1e-9 or pg.evaluate("MedixaStudio.marginsOf(1).r") >= 0.45, f'right margin kept big enough ({pg.evaluate("MedixaStudio.marginsOf(1).r")})')
        pg.click('#margin-apply') if False else None; pg.keyboard.press('Escape')
        # rotated page: margin on page 3 and a stroke in it
        pg.evaluate("document.querySelectorAll('section.page')[2].scrollIntoView()"); pg.wait_for_timeout(500)
        pg.evaluate("MedixaStudio.setMargins(3,{l:0,t:0,r:0.5,b:0})"); pg.wait_for_timeout(500); pg.evaluate("document.querySelectorAll('section.page')[2].scrollIntoView()"); pg.wait_for_timeout(500)
        pg.evaluate("MedixaStudio.setTool('pen')"); bb = pg.evaluate("(()=>{const r=document.querySelectorAll('canvas.ink')[2].getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()")
        pg.mouse.move(bb[0] + bb[2] * 0.75, bb[1] + 250); pg.mouse.down(); pg.mouse.move(bb[0] + bb[2] * 0.9, bb[1] + 280, steps=6); pg.mouse.up(); pg.wait_for_timeout(400)
        e1 = pg.evaluate('MedixaStudio.marginsOf(1)')
        # export: choose clipped
        pg.click('#download'); pg.wait_for_selector('#studio-export-dlg[open]'); chk('عنصراً مكتوباً في الهوامش' in pg.inner_text('#studio-export-dlg p'), 'export warns about writing in margins')
        with pg.expect_download() as dl: pg.click('#exp-go')
        clip = os.path.join(FX, 'clip.pdf'); dl.value.save_as(clip)
        pg.evaluate("document.getElementById('download').click()"); pg.wait_for_selector('#studio-export-dlg[open]'); pg.check('input[value=expand]')
        with pg.expect_download() as dl: pg.click('#exp-go')
        exp = os.path.join(FX, 'expand.pdf'); dl.value.save_as(exp)
        v = ctx.new_page(); v.goto(BASE + 'privacy.html'); v.add_script_tag(url='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
        v.evaluate("()=>{pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}")
        JS = """async (arr) => { const doc = await pdfjsLib.getDocument({data:new Uint8Array(arr)}).promise, out=[];
          for (const n of [1,3]) { const pg=await doc.getPage(n), vp=pg.getViewport({scale:1}); const c=document.createElement('canvas'); c.width=Math.ceil(vp.width); c.height=Math.ceil(vp.height); await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
            const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let red=0, redRight=0; for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4; if(d[i]>180&&d[i+1]<130&&d[i+2]<150){red++; if(x>c.width*0.66)redRight++}}
            out.push({w:vp.width,h:vp.height,red,redRight}); } return out; }"""
        rc = v.evaluate(JS, list(open(clip, 'rb').read())); re_ = v.evaluate(JS, list(open(exp, 'rb').read()))
        chk(abs(rc[0]['w'] - 595) < 1.5 and abs(rc[0]['h'] - 842) < 1.5, f'clipped export keeps the original page size {rc[0]["w"]:.0f}x{rc[0]["h"]:.0f}')
        chk(abs(re_[0]['w'] - 595 * (1 + e1['l'] + e1['r'])) < 2 and abs(re_[0]['h'] - 842 * (1 + e1['t'] + e1['b'])) < 2, f'expanded export grows the page {re_[0]["w"]:.0f}x{re_[0]["h"]:.0f}')
        chk(re_[0]['redRight'] > 30 and rc[0]['redRight'] == 0, f'margin ink appears only in the expanded export (clip {rc[0]["redRight"]}, expand {re_[0]["redRight"]})')
        chk(re_[1]['redRight'] > 15 or re_[1]['red'] > 30, f'rotated page: margin ink exported ({re_[1]})'); chk(abs(re_[1]['w'] - 800 * 1.5) < 3, f'rotated page grows in display orientation ({re_[1]["w"]:.0f})')
        chk(hashlib.sha256(open(os.path.join(FX, 'mixed.pdf'), 'rb').read()).hexdigest() == h0, 'original PDF bytes untouched')
        chk(not errs, f'no JS errors {errs[:3]}'); b.close()
finally:
    srv.terminate()
chk.done()
