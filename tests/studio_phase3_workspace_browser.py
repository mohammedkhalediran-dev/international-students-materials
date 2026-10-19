# python3 -I tests/studio_phase3_workspace_browser.py — document tabs (history/position/dirty/close/reopen), split view
# (divider pointer + keyboard, min sizes, independent pane, narrow switcher, persistence) and focus mode.
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8804; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO WORKSPACE')
A = 'files/uploaded/studio-mixed.pdf'; AKEY = 'medixa.pdf.annotations.v1:' + BASE + A
def stored(pg, key=AKEY): return json.loads(pg.evaluate("k => localStorage.getItem(k)", key) or '[]')
def load(ctx, url=A, ready="document.querySelectorAll('#pages > section').length>=1"):
    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept()); pg.goto(reader(BASE, url)); pg.wait_for_function(ready, timeout=15000); pg.wait_for_timeout(800); return pg
def stroke(pg, x0=180, y0=430, x1=420, y1=470):
    pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move(x1, y1, steps=6); pg.mouse.up(); pg.wait_for_timeout(350)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox']); ctx = new_context(b, {A: 'mixed.pdf'}, viewport={'width': 1300, 'height': 900}); errs = []
        pg = load(ctx); pg.on('pageerror', lambda e: errs.append(str(e)))
        # ---------- tabs ----------
        chk(pg.locator('#st-tabs .st-tab').count() == 1 and pg.locator('#st-tabs .st-tab.current').count() == 1, 'current document is a tab')
        pg.evaluate("MedixaStudio.setTool('pen')"); stroke(pg); pg.evaluate("scrollTo(0,300)"); pg.wait_for_timeout(700)
        chk(len(stored(pg)) == 1, 'stroke saved in document A')
        pg.click('#st-tab-plus'); pg.wait_for_selector('#st-tabmenu[open]'); pg.click('.st-new-nb'); pg.wait_for_selector('#st-nbdlg[open]'); pg.fill('#st-nb-title', 'دفتر الفسيولوجيا'); pg.click('#st-nb-create')
        pg.wait_for_function("location.search.includes('notebook')", timeout=10000); pg.wait_for_function("document.querySelectorAll('#pages > section').length>=1"); pg.wait_for_timeout(900)
        chk(pg.locator('#st-tabs .st-tab').count() == 2, 'new notebook opens as a second tab'); chk('دفتر الفسيولوجيا' in pg.inner_text('#st-tabs .st-tab.current'), 'notebook tab shows its title')
        nkey = 'medixa.pdf.annotations.v1:' + pg.evaluate("new URL(new URLSearchParams(location.search).get('file'), location.href).href")
        pg.evaluate("MedixaStudio.setTool('pen')"); stroke(pg); chk(len(stored(pg, nkey)) == 1, 'notebook has its own stroke store'); chk(len(stored(pg, AKEY)) == 1, 'document A untouched by notebook')
        # switch back: position + history restored
        pg.click('#st-tabs .st-tab:not(.current) .st-tab-b'); pg.wait_for_function("location.search.includes('mixed')", timeout=10000); pg.wait_for_function("document.querySelectorAll('section.page').length===5"); pg.wait_for_timeout(1500)
        chk(pg.evaluate("scrollY") > 150, f'reading position restored ({pg.evaluate("scrollY")})')
        chk(pg.evaluate("MedixaStudio.S.hist.undoStack.length") == 1, 'undo history of document A survived the tab switch'); pg.evaluate("MedixaStudio.undo()"); pg.wait_for_timeout(500); chk(len(stored(pg, AKEY)) == 0, 'undo works across tab switches'); pg.evaluate("MedixaStudio.redo()"); pg.wait_for_timeout(500)
        # dirty indicator on a failing save
        pg.evaluate("()=>{window.__set = Storage.prototype.setItem; Storage.prototype.setItem = function(k){ if (String(k).indexOf('annotations') >= 0) throw new DOMException('full','QuotaExceededError'); return window.__set.apply(this, arguments) }}")
        pg.evaluate("MedixaStudio.setTool('pen')"); pg.evaluate("scrollTo(0,0)"); pg.wait_for_timeout(300); stroke(pg, 200, 430, 380, 450); pg.wait_for_timeout(500)
        chk(pg.locator('#st-tabs .st-tab.current .st-dirty').count() == 1, 'unsaved changes are marked on the tab'); pg.evaluate("()=>{Storage.prototype.setItem = window.__set}")
        # close a non-active tab: removed, recoverable
        nb_src = pg.evaluate("MedixaStudio.tabs.state().open.find(t=>t.src.startsWith('notebook:')).src")
        pg.click('#st-tabs .st-tab:not(.current) .st-tab-x'); pg.wait_for_timeout(300); chk(pg.locator('#st-tabs .st-tab').count() == 1, 'closing a tab removes it from the strip')
        chk(len(stored(pg, nkey)) == 1, 'closing a tab never deletes its data')
        pg.click('#st-tab-plus'); pg.wait_for_selector('#st-tabmenu[open]'); chk('دفتر الفسيولوجيا' in pg.inner_text('#st-tabmenu'), 'closed notebook can be reopened from the menu'); pg.keyboard.press('Escape')
        # ---------- split view ----------
        pg.evaluate("MedixaStudio.setTool('pen')")
        pg.click('#medixa-split-toggle'); pg.wait_for_selector('#st-tabmenu[open]'); pg.click('#st-tabmenu .st-menu-b >> text=دفتر الفسيولوجيا'); pg.wait_for_selector('#st-split.open'); pg.wait_for_timeout(1800)
        fr = pg.frame_locator('#st-pane2'); w0 = pg.evaluate("document.getElementById('st-split').getBoundingClientRect().width")
        chk(w0 > 280, f'second pane opens ({w0:.0f}px)')
        inner = [f for f in pg.frames if 'embed=1' in f.url][0]; inner.wait_for_function("document.querySelectorAll('#pages > section').length>=1"); inner.wait_for_timeout(500)
        before = len(stored(pg, nkey)); box = pg.evaluate("(()=>{const r=document.getElementById('st-pane2').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()")
        inner.evaluate("MedixaStudio.setTool('pen')"); pg.mouse.move(box[0] + 100, box[1] + 330); pg.mouse.down(); pg.mouse.move(box[0] + 220, box[1] + 350, steps=6); pg.mouse.up(); pg.wait_for_timeout(500)
        chk(len(stored(pg, nkey)) == before + 1, 'drawing in the second pane goes to the notebook'); chk(len(stored(pg, AKEY)) == 1 or len(stored(pg, AKEY)) == 2, 'first pane document unaffected by second-pane drawing')
        chk(inner.evaluate("MedixaStudio.S.tool") == 'pen' and pg.evaluate("MedixaStudio.S.tool") == 'pen', 'each pane has its own tool state'); pg.evaluate("MedixaStudio.setTool('highlight')"); chk(inner.evaluate("MedixaStudio.S.tool") == 'pen', 'changing the tool in one pane does not change the other')
        # divider: pointer + keyboard + min sizes
        dv = pg.locator('#st-divider').bounding_box(); pg.mouse.move(dv['x'] + dv['width'] / 2, dv['y'] + 200); pg.mouse.down(); pg.mouse.move(dv['x'] + 200, dv['y'] + 200, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
        w1 = pg.evaluate("document.getElementById('st-split').getBoundingClientRect().width"); chk(abs(w1 - w0) > 60, f'dragging the divider resizes the pane ({w0:.0f} -> {w1:.0f})')
        pg.focus('#st-divider'); before_w = w1; pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(150); w2 = pg.evaluate("document.getElementById('st-split').getBoundingClientRect().width"); chk(abs(w2 - before_w) >= 20, f'keyboard resizes the divider ({before_w:.0f} -> {w2:.0f})')
        pg.keyboard.press('Home'); pg.wait_for_timeout(100); chk(pg.evaluate("document.getElementById('st-split').getBoundingClientRect().width") >= 279, 'minimum pane width enforced (Home)')
        pg.keyboard.press('End'); pg.wait_for_timeout(100); mw = pg.evaluate("document.querySelector('main#pages').getBoundingClientRect().width"); chk(mw >= 270, f'first pane keeps a readable minimum width ({mw:.0f})')
        chk(pg.evaluate("document.getElementById('st-divider').getAttribute('aria-valuenow')") is not None, 'divider exposes its value to assistive tech')
        # persistence + resize across reload
        pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length===5"); pg.wait_for_timeout(2000); chk(pg.locator('#st-split.open').count() == 1, 'split view restored after reload')
        # narrow portrait: pane switcher
        pg.set_viewport_size({'width': 700, 'height': 900}); pg.wait_for_timeout(800)
        chk(pg.evaluate("document.body.classList.contains('st-split-narrow')"), 'narrow screens switch to one pane at a time')
        pg.click('#st-sw-second'); pg.wait_for_timeout(500); chk(pg.is_visible('#st-pane2') and not pg.is_visible('main#pages'), 'switcher shows the second pane alone')
        pg.click('#st-sw-main'); pg.wait_for_timeout(500); chk(pg.is_visible('main#pages') and not pg.is_visible('#st-pane2'), 'switcher returns to the first pane')
        pg.set_viewport_size({'width': 1300, 'height': 900}); pg.wait_for_timeout(500); pg.click('#st-split-close'); pg.wait_for_timeout(300); chk(pg.locator('#st-split.open').count() == 0, 'split view closes')
        # same document in both panes is refused
        pg.evaluate("window.__alert = null; window.alert = m => { window.__alert = m }"); pg.evaluate("MedixaStudio.split.open(new URLSearchParams(location.search).get('file'))"); chk(pg.evaluate("window.__alert") is not None and pg.locator('#st-split.open').count() == 0, 'opening the same document twice is refused')
        # ---------- focus mode ----------
        pg.click('#medixa-focus'); pg.wait_for_timeout(300)
        vis = lambda sel: pg.evaluate(f"(()=>{{const e=document.querySelector('{sel}');if(!e)return false;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0}})()")
        chk(not vis('header') and not vis('#st-tabs') and not vis('.st-panel.open'), 'focus mode removes secondary navigation')
        chk(vis('#studio-toolbar') and vis('#st-focus-status') and vis('#medixa-focus-exit'), 'tools, save status and an exit button stay'); chk(vis('#mx-reader-nav'), 'page controls stay')
        ex = pg.locator('#medixa-focus-exit').bounding_box(); chk(ex['height'] >= 43.5, f'exit button is a real touch target ({ex["height"]:.0f}px)')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200); chk(vis('header'), 'Escape leaves focus mode')
        chk(not errs, f'no JS errors {errs[:3]}'); b.close()
finally:
    srv.terminate()
chk.done()
