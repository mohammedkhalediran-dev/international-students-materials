# python3 -I tests/step41_dock_browser.py — Step 41 reader dock in headless Chromium (simulated server; not a real phone/iPad).
# At 390, 820 and 1280 px: every dock control is the top element at its centre (nothing covers it), popups open above
# the dock without covering it, the last PDF page can scroll fully above the dock, and no JS errors.
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import guest_mode  # noqa: E402 — صفحة الدخول أولاً (Step 60): الفحوص القديمة تعمل كزائر
import subprocess, time, os, sys, urllib.parse
from playwright.sync_api import sync_playwright
# Since Step 45 the service worker fetches the pinned CDN files itself; let routing see those requests (Chromium).
os.environ.setdefault('PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS', '1')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CDN = os.environ.get('MEDIXA_CDN_DIR'); SHOTS = os.environ.get('MEDIXA_SHOTS')
PORT = 8784; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
PDF = 'files/المناعة-الطبية/المحاضرة-1-Overview-of-the-Immune-System.pdf'
IDS = ['mx-reader-nav', 'mx-occlusion', 'mx-timer-float', 'mx86-open', 'mx87-backup', 'mx-ink-toggle', 'mx-save-state']
TOP = """id => { const el = document.getElementById(id); el.scrollIntoView({inline: 'center', block: 'nearest'});
  const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return !!hit && (hit === el || el.contains(hit)); }"""
CLEAR = """([popup, dockId]) => { const p = document.getElementById(popup).getBoundingClientRect(), d = document.getElementById(dockId).getBoundingClientRect();
  const s = getComputedStyle(document.getElementById(popup)); return s.display !== 'none' && p.height > 0 && p.bottom <= d.top + 1 && p.top >= 0; }"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for (w, h, tag) in [(390, 844, 'phone'), (820, 1180, 'ipad'), (1280, 800, 'desktop')]:
            ctx = b.new_context(viewport={'width': w, 'height': h})
            ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
            if CDN:
                files = {'pdf.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.worker.min.js', 'pdf-lib.min.js': 'pdf-lib-1.17.1/package/dist/pdf-lib.min.js'}
                ctx.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(path=os.path.join(CDN, files[r.request.url.split('/')[-1].split('?')[0]]), content_type='application/javascript') if r.request.url.split('/')[-1].split('?')[0] in files else r.abort())
            pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(BASE + 'pdf-notes.html?file=' + urllib.parse.quote(PDF)); pg.wait_for_timeout(2500)
            kids = pg.evaluate("[...document.getElementById('mx-dock').children].map(e => e.id)")
            chk(kids == IDS, f'{tag}: dock holds the tools in order ({kids})')
            for i in IDS: chk(pg.evaluate(TOP, i), f'{tag}: {i} not covered by another element')
            # popups open above the dock and do not cover it
            for (btn, popup) in [('mx87-backup', 'mx87-panel'), ('mx-ink-toggle', 'mx-ink-panel'), ('mx86-open', 'mx86-panel')]:
                pg.evaluate("id => document.getElementById(id).scrollIntoView({inline: 'center', block: 'nearest'})", btn)
                pg.click('#' + btn); pg.wait_for_timeout(250)
                chk(pg.evaluate(CLEAR, [popup, 'mx-dock']), f'{tag}: {popup} opens above the dock')
                if SHOTS and btn == 'mx-ink-toggle': pg.screenshot(path=os.path.join(SHOTS, f'dock_{tag}_ink.png'))
                pg.click('#' + btn) if btn != 'mx86-open' else pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
                if btn == 'mx86-open' and pg.evaluate("getComputedStyle(document.getElementById('mx86-panel')).display") != 'none':
                    pg.evaluate("document.getElementById('mx86-open').click()")
            chk(pg.get_attribute('#mx-ink-toggle', 'aria-expanded') == 'false', f'{tag}: ink toggle closes')
            # the ink panel's own export still works from inside the popup
            pg.click('#mx-ink-toggle'); pg.wait_for_timeout(150)
            with pg.expect_download() as dl: pg.click('#mx89-export')
            chk(dl.value.suggested_filename == 'medixa-ink-backup.json', f'{tag}: ink export works from the popup')
            pg.click('#mx-ink-toggle')
            # page navigation still works from the dock
            pg.fill('#mx-reader-nav [data-mx-page]', '3'); pg.press('#mx-reader-nav [data-mx-page]', 'Enter'); pg.wait_for_timeout(400)
            # last page can scroll fully above the dock
            pg.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)"); pg.wait_for_timeout(300)
            gap = pg.evaluate("(() => { const pages = document.querySelectorAll('section.page'); const last = pages[pages.length - 1].getBoundingClientRect(); return document.getElementById('mx-dock').getBoundingClientRect().top - last.bottom; })()")
            chk(gap >= 0, f'{tag}: last page fully visible above the dock (gap {gap:.0f}px)')
            over = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            chk(over <= 1, f'{tag}: no horizontal page scroll ({over}px)')
            chk(not errs, f'{tag}: no JS errors {errs[:2]}')
            if SHOTS: pg.screenshot(path=os.path.join(SHOTS, f'dock_{tag}.png'))
            ctx.close()
        b.close()
finally:
    srv.terminate()
print('STEP41 DOCK BROWSER FAILED' if fails else f'STEP41 DOCK BROWSER OK: {n} checks')
sys.exit(1 if fails else 0)
