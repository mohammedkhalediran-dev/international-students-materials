# python3 -I tests/step48_account_sidebar.py — Step 48: after signing in, the sidebar shows the student's name and a
# sign-out button instead of the fixed «زائر» (guest). Headless Chromium + simulated server and test Google token.
import subprocess, time, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PORT = 8801; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
def google_login(pg):
    return pg.evaluate("""async () => {
      const t = await (await fetch('/__test/token?email=mona%40test.com&sub=sub-mona&name=Mona%20Ali')).text();
      return (await fetch('/api/auth/google', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({credential: t})})).status; }""")
SB = "() => { const b = document.querySelector('.sb-user'); return b ? {auth: b.getAttribute('data-auth'), name: b.querySelector('strong').textContent, text: b.textContent} : null; }"
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for (w, h) in [(1280, 900), (390, 844)]:
            ctx = b.new_context(viewport={'width': w, 'height': h}); ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort()); ctx.route('https://accounts.google.com/**', lambda r: r.abort())
            pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            for u in ['index.html', 'course.html?id=medical-immunology', 'workspace.html']:
                pg.goto(BASE + u); pg.wait_for_timeout(1200)
                s = pg.evaluate(SB)
                chk(s and s['auth'] == 'guest' and s['name'] == 'زائر' and 'سجّل الدخول لحفظ تقدّمك' in s['text'], f'{w} {u}: guest sidebar with sign-in link {s}')
            chk(google_login(pg) == 200, f'{w}: test login accepted')
            for u in ['index.html', 'semester.html?id=3', 'course.html?id=medical-immunology', 'study.html?id=medical-immunology&lec=1', 'workspace.html']:
                pg.goto(BASE + u); pg.wait_for_timeout(1500)
                s = pg.evaluate(SB)
                chk(s and s['auth'] == 'user' and s['name'] == 'Mona Ali' and 'زائر' not in s['text'] and 'تسجيل الخروج' in s['text'], f'{w} {u}: signed-in sidebar shows name and sign-out {s}')
            if w < 1081:
                pg.click('#menuBtn'); pg.wait_for_timeout(400)
            chk(pg.locator('.sb-auth-action').is_visible(), f'{w}: sign-out button visible in the sidebar')
            pg.click('.sb-auth-action'); pg.wait_for_timeout(2000)
            s = pg.evaluate(SB)
            chk(s and s['auth'] == 'guest' and s['name'] == 'زائر', f'{w}: after sign-out the sidebar is guest again {s}')
            chk(pg.evaluate("fetch('/api/auth/me').then(r => r.status)") != 200, f'{w}: session ended')
            pg.evaluate("localStorage.setItem('ms.lang', JSON.stringify('en'))"); chk(google_login(pg) == 200, 'login again'); pg.reload(); pg.wait_for_timeout(1500)
            t = pg.evaluate(SB)['text']
            chk('Your progress is saved to your account' in t and 'Sign out' in t, f'{w}: English sidebar account text: {t!r}')
            pg.evaluate("localStorage.setItem('ms.lang', JSON.stringify('ar'))")
            chk(not errs, f'{w}: no JS errors {errs[:2]}')
            ctx.close()
        b.close()
finally:
    srv.terminate()
print('STEP48 ACCOUNT SIDEBAR FAILED' if fails else f'STEP48 ACCOUNT SIDEBAR OK: {n} checks')
sys.exit(1 if fails else 0)
