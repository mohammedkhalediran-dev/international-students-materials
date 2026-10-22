# python3 -I tests/step39_login_integration.py — Step 39: login UI merged into Step 38.
# Simulated environment only: tests/dev_server.mjs (mock D1 + KV) and a locally signed test Google token.
# Real Google Sign-In, real Cloudflare D1 and physical devices are NOT exercised here.
# Checks: login screen renders at phone/tablet/desktop without horizontal scroll, login -> next page,
# Study Mode / PDF reader reachable while signed in, logout, and that Step 38 study storage keys survive.
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import guest_mode  # noqa: E402 — صفحة الدخول أولاً (Step 60): الفحوص القديمة تعمل كزائر
import subprocess, time, os, sys, json, urllib.parse
from playwright.sync_api import sync_playwright
# Since Step 45 the service worker fetches the pinned CDN files itself; let routing see those requests (Chromium).
os.environ.setdefault('PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS', '1')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CDN = os.environ.get('MEDIXA_CDN_DIR')
SHOTS = os.environ.get('MEDIXA_SHOTS')  # optional folder for screenshots
PORT = 8779; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)

PDF = 'files/المناعة-الطبية/المحاضرة-1-Overview-of-the-Immune-System.pdf'
ABS = BASE + urllib.parse.quote(PDF)
# Step 38 study data written by the reader modules (not part of account sync); must never be touched by login/logout.
SEED = {
    'medixa.study.v1:' + ABS: json.dumps({'quiz': [{'q': 'Q1', 'a': 'A1'}], 'notes': {'1': 'my note'}}),
    'medixa.pdf.annotations.v1:' + ABS: json.dumps({'1': [{'tool': 'pen', 'points': [[1, 2], [3, 4]]}]}),
    'medixa.study.masks.v1:' + ABS: '{broken json kept as-is',
    'ms.notes': json.dumps({'x': 'note'}),
}
STUDY_NEXT = 'study.html?id=medical-immunology&lec=1'

def google_login(pg, email='sara@test.com', sub='sub-sara', name='Sara Test'):
    return pg.evaluate("""async ([email, sub, name]) => {
      const t = await (await fetch('/__test/token?email=' + encodeURIComponent(email) + '&sub=' + sub + '&name=' + encodeURIComponent(name))).text();
      const r = await fetch('/api/auth/google', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({credential: t})});
      return r.status;
    }""", [email, sub, name])

def read_seed(pg):
    return pg.evaluate("keys => Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)]))", list(SEED))

try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1366, 'height': 900})
        ctx.route('https://accounts.google.com/**', lambda r: r.abort())
        ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        if CDN:
            files = {'pdf.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.worker.min.js', 'pdf-lib.min.js': 'pdf-lib-1.17.1/package/dist/pdf-lib.min.js'}
            def cdn(route):
                name = route.request.url.split('/')[-1].split('?')[0]
                route.fulfill(path=os.path.join(CDN, files[name]), content_type='application/javascript') if name in files else route.abort()
            ctx.route('**/cdnjs.cloudflare.com/**', cdn)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))

        # 0. existing student study data (guest, before any login)
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(500)
        pg.evaluate("seed => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); }", SEED)

        # 1. login screen renders and is responsive
        login_url = BASE + 'login.html?next=' + urllib.parse.quote(STUDY_NEXT, safe='')
        for (w, h, tag) in [(390, 844, 'phone'), (820, 1180, 'tablet'), (1366, 900, 'desktop')]:
            pg.set_viewport_size({'width': w, 'height': h}); errs.clear()
            pg.goto(login_url); pg.wait_for_timeout(1300)
            chk(not errs, f'login {tag}: no JS errors {errs[:2]}')
            chk(pg.locator('#googleBtn').is_visible(), f'login {tag}: Google button visible')
            chk(pg.locator('[data-auth="guest"]').is_visible(), f'login {tag}: guest option visible')
            over = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            chk(over <= 1, f'login {tag}: no horizontal scroll (overflow {over}px)')
            chk(pg.locator('link[href^="css/login.css"]').count() == 1, f'login {tag}: login stylesheet linked')
            if SHOTS: pg.screenshot(path=os.path.join(SHOTS, f'login_{tag}.png'), full_page=True)
        pg.set_viewport_size({'width': 1366, 'height': 900})
        # the redesigned login's own styles apply (it has hover transitions, no keyframe animations)
        trans = pg.evaluate("[...document.querySelectorAll('*')].some(e => getComputedStyle(e).transitionProperty.includes('transform'))")
        chk(trans, 'login: redesigned login hover transitions active')

        # 2. login (simulated Google credential) then continue to the requested page
        chk(google_login(pg) == 200, 'google login accepted by server (mock D1)')
        pg.goto(login_url); pg.wait_for_timeout(1200)
        chk('Sara Test' in pg.inner_text('#actions'), 'login page shows signed-in name')
        pg.locator('#actions button').first.click(); pg.wait_for_url('**/study.html*', timeout=6000); pg.wait_for_timeout(1500)
        chk('id=medical-immunology' in pg.url and 'lec=1' in pg.url, f'navigation after login goes to next page ({pg.url})')
        chk(pg.locator('#accountBtn').inner_text().strip() == 'Sara', 'study page header shows account')
        chk(pg.locator('body').inner_text().strip() != '', 'study mode page has content')

        # 3. Study Mode (PDF reader + study tools) reachable while signed in
        errs.clear()
        pg.goto(BASE + 'pdf-notes.html?file=' + urllib.parse.quote(PDF)); pg.wait_for_timeout(3500)
        chk(not [e for e in errs if 'cdnjs' not in e], f'pdf reader: no JS errors while signed in {errs[:2]}')
        chk(pg.locator('section.page').count() >= 1, 'pdf reader: pages rendered')
        chk(pg.locator('#study-launch').count() == 1, 'pdf reader: study tools button present')
        chk(read_seed(pg) == SEED, 'Step 38 study data unchanged after login and opening the reader')

        # 4. logout
        pg.goto(BASE + 'login.html'); pg.wait_for_timeout(1000)
        pg.click('#actions button:last-child'); pg.wait_for_url('**/login.html', timeout=6000); pg.wait_for_timeout(800)
        me = pg.evaluate("fetch('/api/auth/me').then(r => r.status)")
        chk(me != 200, f'session ended after logout (auth/me {me})')
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(1200)
        chk(pg.locator('#accountBtn').inner_text().strip() == 'تسجيل الدخول', 'header back to login button after logout')
        chk(read_seed(pg) == SEED, 'Step 38 study data unchanged after logout (logout clears only synced ms.* keys)')

        # 5. study mode still accessible as guest
        errs.clear(); pg.goto(BASE + STUDY_NEXT); pg.wait_for_timeout(1200)
        chk(not errs, f'study mode as guest: no JS errors {errs[:2]}')
        b.close()
finally:
    srv.terminate()
print('STEP39 LOGIN INTEGRATION FAILED' if fails else f'STEP39 LOGIN INTEGRATION OK: {n} checks', f'({len(fails)} failed)' if fails else '')
sys.exit(1 if fails else 0)
