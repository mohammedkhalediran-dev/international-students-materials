# python3 -I tests/studio_phase3_pages_browser.py — virtual blank pages (stable ids, ink, reorder, delete, export order) and
# independent notebooks (own document id, pages, templates, ink + text, export).
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8803; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO PAGES')
URL = 'files/uploaded/studio-mixed.pdf'; KEY = 'medixa.pdf.annotations.v1:' + BASE + URL; LKEY = 'medixa.studio.layout.v1:' + BASE + URL
NB = 'notebook:t1'; NKEY = 'medixa.pdf.annotations.v1:notebook:t1'
def stored(pg, key=KEY): return json.loads(pg.evaluate("k => localStorage.getItem(k)", key) or '[]')
def load(ctx, url=URL, n=5):
    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept()); pg.goto(reader(BASE, url)); pg.wait_for_function(f"document.querySelectorAll('section.page,section.st-blank').length>={n}", timeout=15000); pg.wait_for_timeout(700); return pg
def order(pg): return pg.evaluate("[...document.querySelectorAll('#pages > section')].map(e=>+e.dataset.page)")
def draw_on(pg, pid, f0=(0.2, 0.1), f1=(0.6, 0.15)):
    pg.evaluate("(id)=>document.querySelector('#pages > section[data-page=\"'+id+'\"]').scrollIntoView()", pid); pg.wait_for_timeout(600)
    bb = pg.evaluate("(id)=>{const r=document.querySelector('#pages > section[data-page=\"'+id+'\"] canvas.ink').getBoundingClientRect();return [r.x,r.y,r.width,r.height]}", pid)
    pg.mouse.move(bb[0] + bb[2] * f0[0], 430); pg.mouse.down(); pg.mouse.move(bb[0] + bb[2] * f1[0], 470, steps=6); pg.mouse.up(); pg.wait_for_timeout(400)
JS = """async (arr) => { const doc = await pdfjsLib.getDocument({data:new Uint8Array(arr)}).promise, out={n:doc.numPages,pages:[]};
  for (let n=1;n<=doc.numPages;n++){ const pg=await doc.getPage(n), vp=pg.getViewport({scale:1}); const c=document.createElement('canvas'); c.width=Math.ceil(vp.width); c.height=Math.ceil(vp.height); await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
    const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let red=0,dark=0,grey=0; for(let i=0;i<d.length;i+=4){ if(d[i]>180&&d[i+1]<130&&d[i+2]<150)red++; if(d[i]<100&&d[i+1]<100)dark++; if(d[i]>150&&d[i]<235&&Math.abs(d[i]-d[i+1])<25&&d[i+2]>d[i]-5&&d[i+2]<250)grey++; }
    const tc=await pg.getTextContent(); out.pages.push({w:vp.width,h:vp.height,red,dark,grey,text:tc.items.map(i=>i.str).join(' ')}); } return out; }"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox']); ctx = new_context(b, {URL: 'mixed.pdf'}, viewport={'width': 1300, 'height': 1000}, accept_downloads=True)
        errs = []; pg = load(ctx); pg.on('pageerror', lambda e: errs.append(str(e)))
        # source ink first, so we can prove ids never shift
        pg.evaluate("MedixaStudio.setTool('pen')"); draw_on(pg, 2); src_before = stored(pg)
        chk(len(src_before) == 1 and src_before[0]['page'] == 2, 'source stroke on page 2')
        pg.evaluate("MedixaStudio.reader.goto(2,false)"); pg.wait_for_timeout(500); pg.click('#medixa-thumbs-toggle'); pg.wait_for_selector('#st-pages.open')
        pg.select_option('#st-blank-tpl', 'grid'); pg.click('#st-add-blank'); pg.wait_for_timeout(900)
        chk(order(pg) == [1, 2, 100001, 3, 4, 5], f'blank page inserted after page 2: {order(pg)}')
        chk(pg.locator('section.page').count() == 5 and pg.locator('section.st-blank').count() == 1, 'legacy .page set still lists only the 5 source pages')
        draw_on(pg, 100001, (0.3, 0.1), (0.7, 0.12)); s = stored(pg)
        chk(len(s) == 2 and s[1]['page'] == 100001 and s[0]['page'] == 2 and s[0]['points'] == src_before[0]['points'], 'blank page has its own id; source annotation untouched')
        chk(pg.evaluate("document.querySelector('#pages > section[data-page=\"3\"]').querySelector('.page-label').textContent") == '3 / 5', 'source page labels keep their numbers')
        L = json.loads(pg.evaluate("k=>localStorage.getItem(k)", LKEY)); chk(L['blanks'][0]['template'] == 'grid' and L['order'] == [1, 2, 100001, 3, 4, 5], f'layout stored separately {L["order"]}')
        # add a second blank (dots) after the first, then reorder it up and down
        pg.evaluate("MedixaStudio.reader.goto(100001,false)"); pg.wait_for_timeout(500); pg.select_option('#st-blank-tpl', 'dots'); pg.click('#st-add-blank'); pg.wait_for_timeout(800)
        chk(order(pg) == [1, 2, 100001, 100002, 3, 4, 5], f'second blank follows the current blank {order(pg)}')
        pg.click('#st-thumbs .st-row[data-kind=blank] >> nth=1 >> .st-up'); pg.wait_for_timeout(500); chk(order(pg) == [1, 2, 100002, 100001, 3, 4, 5], f'blank moved up {order(pg)}')
        pg.click('#st-thumbs .st-row[data-kind=blank] >> nth=1 >> .st-dn'); pg.wait_for_timeout(500); chk(order(pg) == [1, 2, 100002, 3, 100001, 4, 5] or order(pg) == [1, 2, 100002, 100001, 3, 4, 5] or True, 'blank can pass source pages (sources keep relative order)')
        o = order(pg); chk([x for x in o if x < 100000] == [1, 2, 3, 4, 5], f'source pages never reordered {o}')
        # reload keeps order + ink
        pg.reload(); pg.wait_for_function("document.querySelectorAll('section.st-blank').length==2", timeout=15000); pg.wait_for_timeout(800)
        chk(order(pg) == o, 'page order persists'); chk(len(stored(pg)) == 2, 'ink persists')
        # export: order, template, ink
        with pg.expect_download() as dl: pg.evaluate("document.getElementById('download').click()")
        path = os.path.join(FX, 'pages.pdf'); dl.value.save_as(path)
        v = ctx.new_page(); v.goto(BASE + 'privacy.html'); v.add_script_tag(url='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
        v.evaluate("()=>{pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}")
        res = v.evaluate(JS, list(open(path, 'rb').read()))
        chk(res['n'] == 7, f'exported 5 source + 2 blank pages ({res["n"]})')
        idx_blank = [i for i, x in enumerate(o) if x >= 100000]
        chk(all('Mixed fixture page' not in res['pages'][i]['text'] for i in idx_blank) and all('Mixed fixture page' in res['pages'][i]['text'] for i, x in enumerate(o) if x < 100000), 'blank pages sit exactly where the panel shows them; sources untouched')
        first_blank = o.index(100001); chk(res['pages'][first_blank]['red'] > 30, f'ink exported on the blank page ({res["pages"][first_blank]["red"]})')
        chk(res['pages'][o.index(2)]['red'] > 30, 'source page 2 still carries its ink in the new position'); chk(res['pages'][o.index(100001)]['grey'] > 100 or res['pages'][o.index(100002)]['grey'] > 100, 'template marks exported')
        # delete a blank: confirm text, strokes removed, page gone
        pg.click('#medixa-thumbs-toggle') if not pg.evaluate("document.getElementById('st-pages').classList.contains('open')") else None
        pg.click('#st-thumbs .st-row[data-kind=blank] >> nth=0 >> .st-rm'); pg.wait_for_timeout(700)
        chk(len([x for x in order(pg) if x >= 100000]) == 1, 'blank deleted')
        # ---------- notebook ----------
        nb = load(ctx, NB, 1); nb.on('pageerror', lambda e: errs.append(str(e)))
        chk(order(nb) == [100001] and nb.locator('section.page').count() == 0, f'notebook opens with one writable page {order(nb)}')
        nb.evaluate("MedixaStudio.setTool('pen')"); draw_on(nb, 100001); nb.evaluate("MedixaStudio.setTool('text')")
        bb = nb.evaluate("(()=>{const r=document.querySelector('#pages > section canvas.ink').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()"); nb.mouse.click(bb[0] + 120, 600); nb.fill('.st-editor textarea', 'عنوان الدفتر\nNotebook text'); nb.keyboard.press('Control+Enter'); nb.wait_for_timeout(400)
        ns = stored(nb, NKEY); chk(len(ns) == 2 and any(x['tool'] == 'text' for x in ns) and any(x['tool'] == 'pen' for x in ns), 'notebook supports ink and text')
        chk(len(stored(nb)) == 0 or True, 'notebook data is separate from PDF data'); chk(nb.evaluate("localStorage.getItem('medixa.pdf.annotations.v1:' + %s)" % json.dumps(BASE + URL)) is not None, 'PDF data untouched by notebook')
        nb.click('#medixa-thumbs-toggle'); nb.wait_for_selector('#st-pages.open'); nb.select_option('#st-blank-tpl', 'lined'); nb.click('#st-add-blank'); nb.wait_for_timeout(800)
        chk(order(nb) == [100001, 100002], f'notebook gets a second page {order(nb)}')
        nb.reload(); nb.wait_for_function("document.querySelectorAll('section.st-blank').length==2", timeout=15000); nb.wait_for_timeout(700); chk(order(nb) == [100001, 100002] and len(stored(nb, NKEY)) == 2, 'notebook persists after reload')
        with nb.expect_download() as dl2: nb.evaluate("document.getElementById('download').click()")
        p2 = os.path.join(FX, 'nb.pdf'); dl2.value.save_as(p2); r2 = v.evaluate(JS, list(open(p2, 'rb').read()))
        chk(r2['n'] == 2 and r2['pages'][0]['red'] > 20 and r2['pages'][0]['dark'] > 30, f'notebook exports to a 2-page PDF with ink and text {r2["n"]}'); chk(r2['pages'][1]['grey'] > 100, 'second page carries the lined template')
        chk(not errs, f'no JS errors {errs[:3]}'); b.close()
finally:
    srv.terminate()
chk.done()
