# python3 -I tests/studio_phase1_robust_browser.py — pen pressure (CDP pen events), stylus-only pan, quota failure draft,
# two-tab conflict + explicit merge, legacy v1 data migration, malformed data preserved.
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8792; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO PHASE 1 ROBUST')
URL = 'files/uploaded/studio-mixed.pdf'; KEY = 'medixa.pdf.annotations.v1:' + BASE + URL
def stored(pg): return json.loads(pg.evaluate("k => localStorage.getItem(k)", KEY) or '[]')
def load(ctx):
    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept()); pg.goto(reader(BASE, URL)); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(400); return pg
def pen_stroke(pg, cdp, pts, pressures):
    b = pg.locator('canvas.ink').first.bounding_box(); ev = lambda t, i: dict(type=t, x=b['x'] + b['width'] * pts[i][0], y=b['y'] + b['height'] * pts[i][1], button='left', buttons=1, pointerType='pen', force=pressures[i], clickCount=1)
    cdp.send('Input.dispatchMouseEvent', ev('mousePressed', 0))
    for i in range(1, len(pts)): cdp.send('Input.dispatchMouseEvent', dict(ev('mouseMoved', i)))
    cdp.send('Input.dispatchMouseEvent', dict(ev('mouseReleased', len(pts) - 1), buttons=0)); pg.wait_for_timeout(500)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = new_context(b, {URL: 'mixed.pdf'}, viewport={'width': 900, 'height': 1000}, has_touch=True)
        # --- legacy v1 + malformed data on disk ---
        init = ctx.new_page(); init.goto(BASE + 'privacy.html')
        legacy = [{'page': 1, 'tool': 'pen', 'color': '#e43d56', 'width': 3, 'points': [[0.1, 0.1], [0.3, 0.3]]}, {'page': 2, 'tool': 'highlight', 'color': '#ffd400', 'width': 3, 'points': [[0.2, 0.2], [0.8, 0.2]]}, {'garbage': True}]
        init.evaluate("([k,v])=>localStorage.setItem(k,v)", [KEY, json.dumps(legacy)]); init.close()
        pg = load(ctx)
        painted = pg.evaluate("()=>{const c=document.querySelectorAll('canvas.ink')[0],d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n}")
        chk(painted > 50, f'legacy v1 stroke renders ({painted}px)')
        chk(stored(pg) == legacy, 'loading alone leaves legacy bytes untouched')
        pg.click('[data-tool=pen]'); b0 = pg.locator('canvas.ink').first.bounding_box(); pg.mouse.move(b0['x'] + 100, b0['y'] + 140); pg.mouse.down(); pg.mouse.move(b0['x'] + 200, b0['y'] + 160, steps=5); pg.mouse.up(); pg.wait_for_timeout(500)
        s = stored(pg);  chk(len(s) == 4 and s[2] == {'garbage': True}, 'malformed entry preserved verbatim after edit')
        chk(s[0].get('id') and s[0]['points'] == legacy[0]['points'] and s[0]['v'] == 2, 'legacy stroke migrated in place (id/v added, geometry untouched)')
        ids = [x.get('id') for x in s if x.get('id')]; chk(len(ids) == len(set(ids)), 'ids unique')
        # --- pen pressure through real pen pointer events ---
        cdp = ctx.new_cdp_session(pg)
        pen_stroke(pg, cdp, [(0.2, 0.1), (0.3, 0.12), (0.4, 0.14), (0.5, 0.16)], [0.0, 0.3, 0.7, 1.0])
        s = stored(pg); pr = s[-1].get('pr'); chk(pr and len(pr) == len(s[-1]['points']) and pr[0] == 0 and pr[-1] >= 0.9, f'pen pressure recorded incl. 0 ({pr})')
        chk(not any('pr' in x for x in s[:-1] if isinstance(x, dict) and x.get('tool') == 'pen' and x.get('id') and x is not s[-1]), 'mouse strokes carry no fake pressure')
        # --- stylus-only: touch must not draw but still pans ---
        pg.evaluate("MedixaStudio.setPenOnly(true)"); n0 = len(stored(pg))
        cdp.send('Input.dispatchTouchEvent', dict(type='touchStart', touchPoints=[dict(x=300, y=500)])); cdp.send('Input.dispatchTouchEvent', dict(type='touchMove', touchPoints=[dict(x=300, y=200)])); cdp.send('Input.dispatchTouchEvent', dict(type='touchEnd', touchPoints=[])); pg.wait_for_timeout(500)
        chk(len(stored(pg)) == n0, 'stylus-only: touch draws nothing'); chk(pg.evaluate("scrollY") > 50, f'stylus-only: touch still scrolls ({pg.evaluate("scrollY")})')
        pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(100); pen_stroke(pg, cdp, [(0.2, 0.08), (0.4, 0.08)], [0.5, 0.5]); chk(len(stored(pg)) == n0 + 1, 'stylus-only: pen still draws'); pg.evaluate("MedixaStudio.setPenOnly(false)")
        # --- storage failure: stroke kept in memory, draft saved to IndexedDB, status explains, recovery works ---
        pg.evaluate("()=>{window.__set = Storage.prototype.setItem; Storage.prototype.setItem = function(){ throw new DOMException('full','QuotaExceededError') }}")
        b1 = pg.locator('canvas.ink').first.bounding_box(); pg.mouse.move(b1['x'] + 50, b1['y'] + 200); pg.mouse.down(); pg.mouse.move(b1['x'] + 150, b1['y'] + 220, steps=4); pg.mouse.up(); pg.wait_for_timeout(700)
        chk('تعذر' in pg.inner_text('#status'), 'quota failure is reported'); chk(len(stored(pg)) == n0 + 1, 'failed write left previous valid data intact')
        draft = pg.evaluate("""async()=>{const d=await new Promise((r,j)=>{const q=indexedDB.open('medixa-studio',1);q.onsuccess=()=>r(q.result);q.onerror=j});return await new Promise(r=>{const q=d.transaction('drafts').objectStore('drafts').get(MedixaStudio.S.key);q.onsuccess=()=>r(q.result?q.result.items.length:0)})}""")
        chk(draft == n0 + 2, f'failed draft persisted durably in IndexedDB ({draft})')
        pg.evaluate("()=>{Storage.prototype.setItem = window.__set}"); pg.close()
        # --- two tabs: conflict detected, explicit merge keeps both ---
        a = load(ctx); bb = load(ctx); base_n = len(stored(a))
        def draw(pg_, y):
            pg_.bring_to_front(); pg_.wait_for_timeout(150)
            bx = pg_.locator('canvas.ink').first.bounding_box(); pg_.mouse.move(bx['x'] + 60, bx['y'] + y); pg_.mouse.down(); pg_.mouse.move(bx['x'] + 160, bx['y'] + y + 10, steps=4); pg_.mouse.up(); pg_.wait_for_timeout(600)
        draw(a, 100);  chk(len(stored(a)) == base_n + 1, 'tab A saved')
        draw(bb, 170); chk('تغيّرت' in bb.inner_text('#status') or 'تبويب' in bb.inner_text('#status'), 'tab B (stale) reports a conflict instead of overwriting')
        chk(len(stored(a)) == base_n + 1, 'stale write did not clobber tab A data')
        r = bb.evaluate("MedixaStudio.mergeAndSave()"); bb.wait_for_timeout(300)
        chk(r == 'saved' and len(stored(bb)) == base_n + 2, f'explicit merge keeps both strokes ({r}, {len(stored(bb))})')
        b.close()
finally:
    srv.terminate()
chk.done()
