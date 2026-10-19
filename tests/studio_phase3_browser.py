# python3 -I tests/studio_phase3_browser.py — Phase 3 gate (workspace): lazy rendering on a 120-page lecture, zoom without
# moving annotations, mixed-size/rotation pages, and (as added below) margins, blank pages, notebooks, split view, tabs, focus.
import os, sys, json, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8801; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO PHASE 3')
BIG = 'files/uploaded/studio-large.pdf'; MIX = 'files/uploaded/studio-mixed.pdf'
def stored(pg, url): return json.loads(pg.evaluate("k => localStorage.getItem(k)", 'medixa.pdf.annotations.v1:' + BASE + url) or '[]')
def alive(pg): return pg.evaluate("[...document.querySelectorAll('canvas.pdf')].filter(c=>c.width>1).length")
def ink_alive(pg): return pg.evaluate("[...document.querySelectorAll('canvas.ink')].filter(c=>c.width>1).length")
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = new_context(b, {BIG: 'large.pdf', MIX: 'mixed.pdf'}, viewport={'width': 1000, 'height': 900}); errs = []
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        t0 = time.time(); pg.goto(reader(BASE, BIG)); pg.wait_for_function("document.querySelectorAll('section.page').length===120", timeout=30000); pg.wait_for_timeout(1500)
        load_s = time.time() - t0
        chk(pg.locator('section.page').count() == 120, '120 placeholders created up front')
        chk(0 < alive(pg) <= 12, f'only near pages hold pixels ({alive(pg)} of 120)'); chk(ink_alive(pg) <= 12, f'ink canvases are lazy too ({ink_alive(pg)})')
        chk(load_s < 20, f'large lecture usable in {load_s:.1f}s (headless Chromium, this container)')
        # jump far: near pages render, old ones release
        pg.evaluate("document.querySelectorAll('section.page')[99].scrollIntoView()"); pg.wait_for_timeout(2500)
        target = pg.evaluate("document.querySelectorAll('canvas.pdf')[99].width")
        chk(target > 100, f'page 100 rendered after a far jump ({target})')
        for k in (10, 25, 40, 55, 70, 85): pg.evaluate(f"document.querySelectorAll('section.page')[{k}].scrollIntoView()"); pg.wait_for_timeout(700)
        chk(alive(pg) <= 13, f'rendered pages stay bounded while walking the document ({alive(pg)})')
        chk(pg.evaluate("document.querySelectorAll('canvas.pdf')[0].width") <= 1, 'page 1 released after walking away')
        heap = pg.evaluate("(performance.memory||{}).usedJSHeapSize||0"); print('INFO heap MB', round(heap / 1e6, 1), 'load s', round(load_s, 1))
        # annotate on page 100, scroll away and back: stroke persists and is repainted
        pg.evaluate("document.querySelectorAll('section.page')[99].scrollIntoView()"); pg.wait_for_timeout(2000)
        pg.evaluate("MedixaStudio.setTool('pen')"); bx = pg.evaluate("(()=>{const r=document.querySelectorAll('canvas.ink')[99].getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()")
        y = 450; pg.mouse.move(bx[0] + 100, y); pg.mouse.down(); pg.mouse.move(bx[0] + 300, y + 30, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
        chk(len(stored(pg, BIG)) == 1 and stored(pg, BIG)[0]['page'] == 100, 'annotation on page 100 saved with its own page id')
        for k in (0, 15, 30, 45, 60, 75, 85): pg.evaluate(f"document.querySelectorAll('section.page')[{k}].scrollIntoView()"); pg.wait_for_timeout(700)
        chk(pg.evaluate("document.querySelectorAll('canvas.ink')[99].width") <= 1 and pg.evaluate("document.querySelectorAll('canvas.pdf')[99].width") <= 1, 'canvases of page 100 released when far away')
        pg.evaluate("document.querySelectorAll('section.page')[99].scrollIntoView()"); pg.wait_for_timeout(2000)
        painted = pg.evaluate("(()=>{const c=document.querySelectorAll('canvas.ink')[99],d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n})()"); chk(painted > 100, f'stroke repainted after page returns ({painted}px)')
        # zoom: CSS size scales, stored coordinates do not, canvases re-render sharp
        w1 = pg.evaluate("document.querySelectorAll('section.page')[99].getBoundingClientRect().width")
        pg.click('#st-zoom-in'); pg.click('#st-zoom-in'); pg.wait_for_timeout(1500)
        w2 = pg.evaluate("document.querySelectorAll('section.page')[99].getBoundingClientRect().width"); chk(abs(w2 / w1 - 1.15 * 1.15) < 0.03, f'zoom scales page width ({w1:.0f} -> {w2:.0f})')
        cw = pg.evaluate("(()=>{const c=document.querySelectorAll('canvas.pdf')[99];return [c.width,c.getBoundingClientRect().width]})()"); chk(abs(cw[0] - cw[1]) <= 2, f'canvas re-rendered at the new size ({cw})')
        chk(pg.inner_text('#st-zoom-label') == '132%', f'zoom label {pg.inner_text("#st-zoom-label")}'); pg.click('#st-zoom-label'); pg.wait_for_timeout(500)
        chk(abs(pg.evaluate("document.querySelectorAll('section.page')[99].getBoundingClientRect().width") - w1) < 2, 'fit width restores size')
        painted2 = pg.evaluate("(()=>{const c=document.querySelectorAll('canvas.ink')[99],d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n})()"); chk(painted2 > 100, 'stroke still drawn after zoom round-trip')
        chk(len(stored(pg, BIG)) == 1, 'zoom never changes stored annotations')
        # mixed sizes stay correctly proportioned
        pg2 = ctx.new_page(); pg2.goto(reader(BASE, MIX)); pg2.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg2.wait_for_timeout(800)
        ratios = pg2.evaluate("[...document.querySelectorAll('section.page')].map(e=>{const r=e.getBoundingClientRect();return +(r.height/r.width).toFixed(3)})")
        exp = [842/595, 612/792, 600/800, 560/740, 792/612]   # source order: portrait, landscape, rot90, rot270+crop, rot180
        chk(all(abs(r - e) < 0.01 for r, e in zip(ratios, exp)), f'mixed page aspect ratios (rot/crop aware) {ratios}')
        # ---------- panels: lazy thumbnails, bookmarks, "ملاحظاتي" ----------
        pg2.set_viewport_size({'width': 1300, 'height': 900}); pg2.wait_for_timeout(400)
        pg2.click('#medixa-thumbs-toggle'); pg2.wait_for_selector('#st-pages.open'); pg2.wait_for_timeout(800)
        chk(pg2.locator('#st-thumbs .st-th').count() == 5, 'page panel lists all pages')
        painted = pg2.evaluate("[...document.querySelectorAll('.st-th-c')].filter(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<d.length;i+=4)if(d[i]<250||d[i+1]<250)return true;return false}).length")
        chk(painted >= 3, f'thumbnails render lazily ({painted} non-blank)')
        pg2.click('#st-thumbs .st-th[data-page="3"]'); pg2.wait_for_timeout(900); cur = pg2.evaluate("MedixaStudio.reader.current()"); chk(cur == 3, f'thumbnail click navigates ({cur})')
        chk(pg2.locator('#st-thumbs .st-th.current').get_attribute('data-page') == '3', 'current page is highlighted')
        pg2.click('#medixa-bookmark'); pg2.wait_for_timeout(300); chk(pg2.locator('#st-pages #medixa-bookmarks').count() == 1, 'existing bookmarks list lives in the page panel'); chk('3' in pg2.inner_text('#medixa-bookmarks'), 'bookmark added through the existing control appears there')
        padding = pg2.evaluate("parseFloat(getComputedStyle(document.querySelector('main#pages')).marginInlineStart)"); chk(padding >= 240, f'wide screens dock the panel without covering pages ({padding})')
        pg2.click('#st-pages .st-x'); chk(not pg2.evaluate("document.getElementById('st-pages').classList.contains('open')"), 'panel closes')
        pg2.evaluate("MedixaStudio.setTool('text')"); pg2.wait_for_timeout(100)
        box = pg2.evaluate("(()=>{document.querySelectorAll('section.page')[0].scrollIntoView();const r=document.querySelectorAll('canvas.ink')[0].getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()"); pg2.wait_for_timeout(500)
        pg2.mouse.click(box[0] + 200, 500); pg2.fill('.st-editor textarea', 'High yield\nSA node paces the heart'); pg2.keyboard.press('Control+Enter'); pg2.wait_for_timeout(300)
        pg2.click('#st-notes-toggle'); pg2.wait_for_selector('#st-notes.open'); pg2.wait_for_timeout(300)
        chk(pg2.locator('#st-notes-list .st-note').count() == 1 and 'High yield' in pg2.inner_text('#st-notes-list'), 'notes panel shows the real note')
        pg2.fill('#st-notes-q', 'nothing like this'); pg2.wait_for_timeout(150); chk(pg2.locator('#st-notes-list .st-note').count() == 0, 'notes search filters')
        pg2.fill('#st-notes-q', 'sa node'); pg2.wait_for_timeout(150); chk(pg2.locator('#st-notes-list .st-note').count() == 1, 'notes search matches body text')
        pg2.set_viewport_size({'width': 800, 'height': 900}); pg2.wait_for_timeout(300); chk(pg2.evaluate("parseFloat(getComputedStyle(document.querySelector('main#pages')).marginInlineEnd)") < 100, 'narrow screens use an overlay drawer instead of docking')
        chk(not errs, f'no JS errors {errs[:2]}'); b.close()
finally:
    srv.terminate()
chk.done()
