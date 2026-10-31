# python3 -I tests/step46_text_cards_browser.py — Step 46 text-to-flashcard in headless Chromium (simulated server).
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import guest_mode  # noqa: E402 — صفحة الدخول أولاً (Step 60): الفحوص القديمة تعمل كزائر
import subprocess, time, os, sys, json, urllib.parse
from playwright.sync_api import sync_playwright
os.environ.setdefault('PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS', '1')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CDN = os.environ.get('MEDIXA_CDN_DIR')
if not CDN:
    print('SKIP: MEDIXA_CDN_DIR not set (needs local pdf.js)'); sys.exit(0)
PORT = 8790; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
PDF = 'files/المناعة-الطبية/المحاضرة-1-Overview-of-the-Immune-System.pdf'
KEY = 'medixa.study.v1:' + BASE + urllib.parse.quote(PDF)
FILES = {'pdf.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.worker.min.js', 'pdf-lib.min.js': 'pdf-lib-1.17.1/package/dist/pdf-lib.min.js'}
def open_cards(pg):
    pg.evaluate("document.getElementById('study-launch').click()"); pg.wait_for_timeout(200)
    pg.evaluate("document.querySelector('[data-study-tab=cards]').click()"); pg.wait_for_timeout(300)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        ctx.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(path=os.path.join(CDN, FILES[r.request.url.split('/')[-1].split('?')[0]]), content_type='application/javascript') if r.request.url.split('/')[-1].split('?')[0] in FILES else r.abort())
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + 'pdf-notes.html?file=' + urllib.parse.quote(PDF)); pg.wait_for_timeout(3000)
        open_cards(pg)
        chk(pg.locator('#mx-text-cards').count() == 1, 'cards tab shows the "from the page text" block')
        found = 0
        for page in range(2, 8):
            pg.fill('#mx-tc-page', str(page)); pg.click('#mx-tc-load')
            pg.wait_for_function("!document.getElementById('mx-tc-load').disabled", timeout=15000)
            found = pg.locator('.mx-tc-row').count()
            if found and pg.locator('.mx-tc-row button:has-text("فراغ")').count(): break
        chk(found > 0, f'sentences read from page {page} ({found})')
        chk(pg.input_value('#study-page') == str(page), 'card page field follows the text page field')
        first = pg.locator('.mx-tc-row').first.locator('.mx-tc-text').inner_text()
        if os.environ.get('MEDIXA_SHOTS'): pg.locator('#study-panel').screenshot(path=os.path.join(os.environ['MEDIXA_SHOTS'], 'text_cards.png'))
        pg.locator('.mx-tc-row button:has-text("فراغ")').first.click()
        q, a = pg.input_value('#card-question'), pg.input_value('#card-answer')
        chk('_____' in q and a and a not in q, f'cloze prefilled: {q!r} / {a!r}')
        before = pg.evaluate("k => localStorage.getItem(k)", KEY)
        chk(before is None or '_____' not in before, 'nothing saved until the student presses save')
        pg.evaluate("document.getElementById('add-card').click()"); pg.wait_for_timeout(300)
        cards = json.loads(pg.evaluate("k => localStorage.getItem(k)", KEY) or '{}').get('cards', [])
        chk(any(c.get('question') == q and c.get('answer') == a and c.get('page') == page for c in cards), f'card saved with page {page}')
        open_cards(pg)
        pg.fill('#mx-tc-page', str(page)); pg.click('#mx-tc-load'); pg.wait_for_function("!document.getElementById('mx-tc-load').disabled", timeout=15000)
        pg.locator('.mx-tc-row button:has-text("إجابة")').first.click()
        chk(pg.input_value('#card-question') == '' and len(pg.input_value('#card-answer')) >= 20, '"answer" puts the sentence in the answer field')
        pg.fill('#mx-tc-page', '999'); pg.click('#mx-tc-load'); pg.wait_for_timeout(800)
        chk('خارج الملف' in pg.inner_text('#mx-text-cards'), 'page out of range explained')
        chk(not errs, f'no JS errors {errs[:2]}')
        ctx.close()
        # page images only (CDN blocked): explain instead of a broken button
        ctx = b.new_context(service_workers='block'); ctx.route('**/cdnjs.cloudflare.com/**', lambda r: r.abort()); ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        pg = ctx.new_page(); pg.goto(BASE + 'pdf-notes.html?file=' + urllib.parse.quote(PDF)); pg.wait_for_timeout(2500)
        open_cards(pg)
        chk('غير متاحة' in pg.inner_text('#mx-text-cards') and pg.locator('#mx-tc-load').count() == 0, 'page-image mode explains that text is unavailable')
        b.close()
finally:
    srv.terminate()
print('STEP46 TEXT CARDS BROWSER FAILED' if fails else f'STEP46 TEXT CARDS BROWSER OK: {n} checks')
sys.exit(1 if fails else 0)
