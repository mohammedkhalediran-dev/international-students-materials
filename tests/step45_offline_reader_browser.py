# python3 -I tests/step45_offline_reader_browser.py — Step 45: the service worker keeps the pinned pdf.js / pdf-lib files,
# so a lecture opened once online still renders with pdf.js offline. Headless Chromium with a real service worker;
# the CDN is served from local npm copies (MEDIXA_CDN_DIR) through Playwright routing. Not a real device.
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import guest_mode  # noqa: E402 — صفحة الدخول أولاً (Step 60): الفحوص القديمة تعمل كزائر
import subprocess, time, os, sys, urllib.parse
from playwright.sync_api import sync_playwright
# Lets Playwright routing see requests made by the service worker (Chromium).
os.environ.setdefault('PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS', '1')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CDN = os.environ.get('MEDIXA_CDN_DIR')
if not CDN:
    print('SKIP: MEDIXA_CDN_DIR not set (needs local pdfjs-dist and pdf-lib copies)'); sys.exit(0)
PORT = 8789; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
FILES = {'pdf.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.worker.min.js', 'pdf-lib.min.js': 'pdf-lib-1.17.1/package/dist/pdf-lib.min.js'}
BUNDLED = 'files/المناعة-الطبية/المحاضرة-1-Overview-of-the-Immune-System.pdf'
PDF_BYTES = open(os.path.join(ROOT, 'site', BUNDLED), 'rb').read()
def reader(f): return BASE + 'pdf-notes.html?file=' + urllib.parse.quote(f, safe='')
cdn_hits = []
def cdn(route):
    name = route.request.url.split('/')[-1].split('?')[0]
    cdn_hits.append(name)
    route.fulfill(path=os.path.join(CDN, FILES[name]), content_type='application/javascript', headers={'access-control-allow-origin': '*'}) if name in FILES else route.abort()
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(service_workers='allow')
        ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        ctx.route('**/cdnjs.cloudflare.com/**', cdn)
        ctx.route('**/files/uploaded/seen.pdf', lambda r: r.fulfill(body=PDF_BYTES, content_type='application/pdf'))
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(500)
        pg.evaluate("navigator.serviceWorker.ready.then(() => true)"); pg.reload(); pg.wait_for_timeout(800)
        chk(pg.evaluate("!!navigator.serviceWorker.controller"), 'service worker controls the site')
        pg.goto(reader('files/uploaded/seen.pdf')); pg.wait_for_timeout(3500)
        chk(pg.locator('section.page').count() == 23, 'online: later-uploaded lecture rendered by pdf.js')
        cached = pg.evaluate("""async () => { const out = []; for (const k of await caches.keys()) { const c = await caches.open(k);
            for (const r of await c.keys()) if (r.url.includes('cdnjs')) out.push(r.url.split('/').pop()); } return out.sort(); }""")
        chk(set(['pdf.min.js', 'pdf-lib.min.js']).issubset(set(cached)), f'pinned CDN libraries cached ({cached})')
        # offline: no network at all
        ctx.unroute('**/cdnjs.cloudflare.com/**'); ctx.unroute('**/files/uploaded/seen.pdf'); ctx.set_offline(True)
        errs.clear(); cdn_hits.clear()
        pg.goto(reader('files/uploaded/seen.pdf')); pg.wait_for_timeout(4000)
        chk(pg.locator('section.page').count() == 23, f"offline: the lecture opened before still renders ({pg.locator('section.page').count()} pages)")
        chk(pg.locator('#error .mx-raster-note').count() == 0, 'offline: pdf.js used, not the page-image fallback')
        chk(not errs, f'offline: no JS errors {errs[:2]}')
        pg.goto(reader('files/uploaded/never-opened.pdf')); pg.wait_for_timeout(2500)
        chk(pg.locator('#error .mx-fail-retry').count() == 1, 'offline: a never-opened lecture shows the explanation and retry')
        b.close()
finally:
    srv.terminate()
print('STEP45 OFFLINE READER FAILED' if fails else f'STEP45 OFFLINE READER OK: {n} checks')
sys.exit(1 if fails else 0)
