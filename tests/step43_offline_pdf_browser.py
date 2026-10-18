# python3 -I tests/step43_offline_pdf_browser.py — Step 43: PDF reader when the pdf.js CDN is blocked or a PDF fails.
# Headless Chromium + simulated server. A "later upload" is simulated by routing a non-bundled URL to real PDF bytes.
import subprocess, time, os, sys, json, urllib.parse
from playwright.sync_api import sync_playwright
# Since Step 45 the service worker fetches the pinned CDN files itself; let routing see those requests (Chromium).
os.environ.setdefault('PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS', '1')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CDN = os.environ.get('MEDIXA_CDN_DIR')
PORT = 8787; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
BUNDLED = 'files/المناعة-الطبية/المحاضرة-1-Overview-of-the-Immune-System.pdf'
UPLOADED = 'files/uploaded/new-lecture.pdf'
PDF_BYTES = open(os.path.join(ROOT, 'site', BUNDLED), 'rb').read()
def reader(f): return BASE + 'pdf-notes.html?file=' + urllib.parse.quote(f, safe='')
FILES = {'pdf.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.worker.min.js', 'pdf-lib.min.js': 'pdf-lib-1.17.1/package/dist/pdf-lib.min.js'}

def context(b, cdn_ok):
    ctx = b.new_context(viewport={'width': 820, 'height': 1000})
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    if cdn_ok and CDN:
        ctx.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(path=os.path.join(CDN, FILES[r.request.url.split('/')[-1].split('?')[0]]), content_type='application/javascript') if r.request.url.split('/')[-1].split('?')[0] in FILES else r.abort())
    else:
        ctx.route('**/cdnjs.cloudflare.com/**', lambda r: r.abort())
    ctx.route('**/files/uploaded/new-lecture.pdf', lambda r: r.fulfill(body=PDF_BYTES, content_type='application/pdf'))
    return ctx

try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        # 1. CDN blocked, bundled lecture: page images, explanation, drawing and study tools work
        ctx = context(b, False); pg = ctx.new_page(); errs = []; dialogs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: (dialogs.append(d.message), d.accept()))
        pg.goto(reader(BUNDLED)); pg.wait_for_timeout(3000)
        chk(pg.locator('section.page').count() == 23, f"offline bundled: 23 page images ({pg.locator('section.page').count()})")
        chk(pg.locator('#error .mx-raster-note').count() == 1, 'offline bundled: explains that page images are shown')
        chk('جاهز' in pg.inner_text('#status'), 'offline bundled: ready status')
        box = pg.locator('canvas.ink').first.bounding_box(); x, y = box['x'] + 80, box['y'] + 80
        pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 50, y + 20, steps=4); pg.mouse.up(); pg.wait_for_timeout(200)
        ink = pg.evaluate("k => localStorage.getItem(k)", 'medixa.pdf.annotations.v1:' + BASE + urllib.parse.quote(BUNDLED))
        chk(ink and len(json.loads(ink)) == 1, 'offline bundled: drawing is saved')
        chk(pg.locator('#study-launch').count() == 1 and pg.locator('#mx-dock').count() == 1, 'offline bundled: study tools and dock present')
        pg.click('#download'); pg.wait_for_timeout(300)
        chk(any('غير متاحة' in d for d in dialogs), 'offline bundled: annotated-PDF download explains it is unavailable')
        chk(not errs, f'offline bundled: no JS errors {errs[:2]}')
        # 2. CDN blocked, lecture uploaded later (no page images): clear message + open directly + retry
        errs.clear(); pg.goto(reader(UPLOADED)); pg.wait_for_timeout(1500)
        chk('تعذر تحميل مكتبة عرض PDF' in pg.inner_text('#error'), 'offline upload: explains why it cannot show the PDF')
        href = pg.get_attribute('#error .mx-fail-open', 'href')
        chk(href == BASE + UPLOADED, f'offline upload: "open directly" points to the same-origin file ({href})')
        chk(pg.locator('#error .mx-fail-retry').count() == 1, 'offline upload: retry button')
        chk(pg.inner_text('#status') == 'تعذر عرض الملف هنا', 'offline upload: status no longer says loading')
        chk(pg.locator('#mx-dock').count() == 1, 'offline upload: dock and local study tools still load')
        with pg.expect_navigation(): pg.click('#error .mx-fail-retry')
        chk('new-lecture.pdf' in pg.url, 'offline upload: retry reloads the same lecture')
        # 3. no link for a non-http or cross-origin source
        for bad in ['javascript:alert(1)', 'https://evil.example/x.pdf']:
            pg.goto(reader(bad)); pg.wait_for_timeout(800)
            chk(pg.locator('#error .mx-fail-open').count() == 0, f'no "open directly" link for {bad}')
        chk(not errs, f'offline upload: no JS errors {errs[:2]}')
        ctx.close()
        if CDN:
            # 4. CDN available: a later upload renders with pdf.js; a missing PDF shows the recovery actions
            ctx = context(b, True); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(reader(UPLOADED)); pg.wait_for_timeout(3500)
            chk(pg.locator('section.page').count() == 23, 'online upload: rendered by pdf.js')
            chk(pg.locator('#error .mx-raster-note').count() == 0, 'online upload: no offline note')
            pg.goto(reader('files/uploaded/missing.pdf')); pg.wait_for_timeout(1500)
            chk('تعذر فتح PDF' in pg.inner_text('#error') and pg.locator('#error .mx-fail-retry').count() == 1, 'online missing file: error with retry')
            chk(not errs, f'online: no JS errors {errs[:2]}')
            ctx.close()
        else:
            print('NOTE: MEDIXA_CDN_DIR not set; online pdf.js cases skipped')
        b.close()
finally:
    srv.terminate()
print('STEP43 OFFLINE PDF BROWSER FAILED' if fails else f'STEP43 OFFLINE PDF BROWSER OK: {n} checks')
sys.exit(1 if fails else 0)
