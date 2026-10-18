# python3 -I tests/step42_two_tab_browser.py — Step 42 two-tab and corrupted-data checks in headless Chromium
# (two pages of one browser context share localStorage, like two tabs). Simulated server; not a real device.
import subprocess, time, os, sys, json, urllib.parse
from playwright.sync_api import sync_playwright
# Since Step 45 the service worker fetches the pinned CDN files itself; let routing see those requests (Chromium).
os.environ.setdefault('PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS', '1')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CDN = os.environ.get('MEDIXA_CDN_DIR')
PORT = 8785; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
PDF = 'files/المناعة-الطبية/المحاضرة-1-Overview-of-the-Immune-System.pdf'
URL = BASE + 'pdf-notes.html?file=' + urllib.parse.quote(PDF)
ABS = BASE + urllib.parse.quote(PDF)
INK, CARDS, WS = 'medixa.pdf.annotations.v1:' + ABS, 'medixa.study.v1:' + ABS, 'medixa.v86.workspace:' + PDF

def draw(pg, dx=0):
    box = pg.locator('canvas.ink').first.bounding_box()
    x, y = box['x'] + 60 + dx, box['y'] + 60
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 40, y + 30, steps=5); pg.mouse.up(); pg.wait_for_timeout(200)
def get(pg, k): return pg.evaluate("k => localStorage.getItem(k)", k)
def add_card(pg, q):
    if not pg.locator('#card-question').count():
        pg.evaluate("document.getElementById('study-launch').click()"); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelector('[data-study-tab=cards]').click()"); pg.wait_for_timeout(200)
    pg.fill('#card-question', q); pg.fill('#card-answer', 'answer ' + q)
    pg.evaluate("document.getElementById('add-card').click()"); pg.wait_for_timeout(200)

try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900})
        ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        if CDN:
            files = {'pdf.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.worker.min.js', 'pdf-lib.min.js': 'pdf-lib-1.17.1/package/dist/pdf-lib.min.js'}
            ctx.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(path=os.path.join(CDN, files[r.request.url.split('/')[-1].split('?')[0]]), content_type='application/javascript') if r.request.url.split('/')[-1].split('?')[0] in files else r.abort())
        dialogs = []
        def page():
            pg = ctx.new_page(); pg.errs = []
            pg.on('pageerror', lambda e: pg.errs.append(str(e)))
            pg.on('dialog', lambda d: (dialogs.append(d.message), d.accept()))
            pg.goto(URL); pg.wait_for_timeout(2500); return pg

        # --- ink: two tabs ---
        A = page(); Bt = page()
        draw(A); a_ink = get(A, INK)
        chk(a_ink and len(json.loads(a_ink)) == 1, 'tab A saved its stroke')
        draw(Bt, 200)
        chk(get(Bt, INK) == a_ink, "stale tab B did not overwrite tab A's ink")
        chk('تبويب آخر' in Bt.inner_text('#status'), 'tab B tells the student to reload: ' + Bt.inner_text('#status'))
        draw(A, 100)
        chk(len(json.loads(get(A, INK))) == 2, 'tab A (current) keeps saving')
        Bt.reload(); Bt.wait_for_timeout(2500); draw(Bt, 300)
        chk(len(json.loads(get(Bt, INK))) == 3, 'after reload tab B saves on top of everything')

        # --- cards: two tabs ---
        add_card(A, 'from A'); after_a = get(A, CARDS)
        chk(after_a and 'from A' in after_a, 'tab A saved its card')
        dialogs.clear(); add_card(Bt, 'from B')
        chk(get(Bt, CARDS) == after_a, "stale tab B cannot overwrite tab A's cards")
        chk(any('تبويب آخر' in d for d in dialogs), f'stale tab alerted the student: {dialogs[-1:]}')
        add_card(A, 'second A')
        chk('second A' in (get(A, CARDS) or ''), 'tab A (current) keeps saving cards')

        # --- workspace bookmark: two tabs ---
        A.reload(); Bt.reload(); A.wait_for_timeout(2500); Bt.wait_for_timeout(2500); dialogs.clear()
        A.evaluate("document.getElementById('mx86-open').click()"); A.wait_for_timeout(200)
        A.evaluate("document.getElementById('mx86-add-bookmark') && document.getElementById('mx86-add-bookmark').click()"); A.wait_for_timeout(200)
        ws_a = get(A, WS)
        Bt.evaluate("document.getElementById('mx86-open').click()"); Bt.wait_for_timeout(200)
        Bt.evaluate("window.scrollTo(0, 3000)"); Bt.wait_for_timeout(500)
        Bt.evaluate("document.getElementById('mx86-add-bookmark') && document.getElementById('mx86-add-bookmark').click()"); Bt.wait_for_timeout(200)
        chk(ws_a is not None and get(Bt, WS) == ws_a, 'stale tab cannot overwrite the workspace bookmarks')
        chk(any('تبويب آخر' in d for d in dialogs), 'workspace conflict alerted')

        errs = A.errs + Bt.errs
        chk(not errs, f'no JS errors {errs[:2]}')
        A.close(); Bt.close()

        # --- corrupted stored data is never overwritten ---
        C = ctx.new_page(); C.on('dialog', lambda d: (dialogs.append(d.message), d.accept()))
        C.goto(BASE + 'index.html'); C.evaluate("([i, c]) => { localStorage.setItem(i, '[{\"page\":1, broken'); localStorage.setItem(c, '{oops'); }", [INK, CARDS])
        C.goto(URL); C.wait_for_timeout(2500)
        chk('تالفة' in C.inner_text('#status'), 'corrupted ink reported on load: ' + C.inner_text('#status'))
        draw(C)
        chk(get(C, INK) == '[{"page":1, broken', 'corrupted ink bytes unchanged after drawing')
        add_card(C, 'x')
        chk(get(C, CARDS) == '{oops', 'corrupted cards bytes unchanged after adding a card')
        b.close()
finally:
    srv.terminate()
print('STEP42 TWO-TAB BROWSER FAILED' if fails else f'STEP42 TWO-TAB BROWSER OK: {n} checks')
sys.exit(1 if fails else 0)
