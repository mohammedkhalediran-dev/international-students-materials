# python3 -I tests/step60_login_first.py — Step 61 (أُنشئ باسم Step 60): صفحة الدخول أولاً، مع بقاء «المتابعة كزائر» (حسابات اختبار فقط).
import subprocess, time, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PORT = 8860; BASE = f'http://localhost:{PORT}/'
# CLEAN_URLS=1: مثل Cloudflare (‎/login.html ← ‎/login). هذا ما سبّب إعادة التحميل المتكررة في صفحة الدخول.
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env={**os.environ, 'CLEAN_URLS': '1'}); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
LOGIN = """async ([email, sub, name]) => { const t = await (await fetch('/__test/token?email=' + encodeURIComponent(email) + '&sub=' + sub + '&name=' + encodeURIComponent(name))).text();
  return (await fetch('/api/auth/google', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({credential: t})})).status; }"""
def ctx(b, w=390, h=844):
    c = b.new_context(viewport={'width': w, 'height': h}, service_workers='block')
    c.route('https://fonts.googleapis.com/**', lambda r: r.abort()); c.route('https://accounts.google.com/**', lambda r: r.abort())
    return c
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        # 1. first visit → login page, remembering where the student wanted to go
        c = ctx(b); pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + 'index.html'); pg.wait_for_url('**/login?gate=1&next=index*', timeout=5000)
        loads = []; pg.on('load', lambda: loads.append(1)); pg.wait_for_timeout(2500)
        chk('/login' in pg.url and len(loads) == 0, f'home → login page first, and it stays (no reload loop: {len(loads)} reloads)')
        chk(pg.locator('[data-auth="guest"]').is_visible(), 'guest option still offered')
        pg.goto(BASE + 'course.html?id=medical-immunology'); pg.wait_for_url('**/login?**', timeout=5000)
        chk('next=course%3Fid%3Dmedical-immunology' in pg.url, 'deep link kept in next')
        # 2. guest → goes on, and is not asked again on this device
        pg.click('[data-auth="guest"]'); pg.wait_for_url('**/course?id=medical-immunology', timeout=5000)
        chk(pg.evaluate("localStorage.getItem('ms.guest')") == '1', 'guest choice remembered')
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(1200)
        chk('/login' not in pg.url, 'guest not redirected again')
        pg.goto(BASE + 'privacy.html'); pg.wait_for_timeout(500)
        chk(pg.url.endswith('/privacy'), 'privacy page open')
        c.close()
        # 3. signed in (old session, no local flag) → login page continues by itself
        c = ctx(b); pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + 'privacy.html'); chk(pg.evaluate(LOGIN, ['s1@x.com', 'sub-s1', 'طالب']) == 200, 'test student signs in')
        pg.goto(BASE + 'timetable.html'); pg.wait_for_url('**/timetable', timeout=8000)
        chk(pg.url.endswith('/timetable') and pg.evaluate("localStorage.getItem('ms.authed')") == '1', 'existing session passes through login automatically')
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(1200)
        chk('/login' not in pg.url, 'signed-in student stays on the site')
        # 4. logout → login page shown again next time
        pg.evaluate("MSAuth.logout()"); pg.wait_for_timeout(300)
        pg.goto(BASE + 'index.html'); pg.wait_for_url('**/login?**', timeout=5000)
        chk('/login' in pg.url, 'after sign-out the login page comes first again')
        # 5. expired session with a stale local flag → sent to login after the check
        pg.evaluate("localStorage.setItem('ms.authed','1')"); pg.goto(BASE + 'index.html'); pg.wait_for_url('**/login?**', timeout=8000)
        chk('/login' in pg.url and pg.evaluate("localStorage.getItem('ms.authed')") is None, 'stale flag cleared, login shown')
        chk(not errs, 'no page errors: ' + '; '.join(errs[:3]))
        b.close()
finally:
    srv.terminate()
print(f'step60 login first: {n - len(fails)}/{n} passed')
sys.exit(1 if fails else 0)
