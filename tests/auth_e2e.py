# python3 -I tests/auth_e2e.py — دخول وتسجيل ومزامنة المفضلة بين جهازين (متصفحان) على خادم الاختبار.
import subprocess, time, sys, os
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PORT = 8773; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []
def chk(c, m):
    if not c: fails.append(m); print('FAIL', m)
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    A = b.new_context(); B = b.new_context()
    pa = A.new_page(); errs = []; pa.on('pageerror', lambda e: errs.append(str(e)))
    # جهاز أ: يضيف مفضلة وهو غير مسجّل، ثم ينشئ حساباً
    pa.goto(BASE + 'index.html'); pa.wait_for_timeout(800)
    chk(pa.locator('#accountBtn').inner_text().strip() == 'تسجيل الدخول', 'guest sees login button')
    pa.evaluate("MS.favs.toggle('medical-immunology')")
    pa.goto(BASE + 'login.html?next=index.html'); pa.wait_for_timeout(500)
    pa.click('#tabRegister'); pa.fill('#name', 'Ali Test'); pa.fill('#email', 'ali@test.com'); pa.fill('#password', 'password123')
    pa.click('#submit'); pa.wait_for_url('**/index.html', timeout=5000); pa.wait_for_timeout(1500)
    chk(pa.locator('#accountBtn').inner_text().strip() == 'Ali', 'header shows first name')
    # جهاز ب: يدخل بنفس الحساب فيجد المفضلة
    pb = B.new_page(); pb.on('pageerror', lambda e: errs.append(str(e)))
    pb.goto(BASE + 'login.html'); pb.wait_for_timeout(500)
    pb.fill('#email', 'ali@test.com'); pb.fill('#password', 'wrongpass'); pb.click('#submit'); pb.wait_for_timeout(600)
    chk(pb.locator('#msg').is_visible(), 'wrong password shows error')
    pb.fill('#password', 'password123'); pb.click('#submit'); pb.wait_for_url('**/index.html', timeout=5000); pb.wait_for_timeout(2500)
    favs = pb.evaluate("JSON.parse(localStorage.getItem('ms.fav')||'[]')")
    chk('medical-immunology' in favs, f'favorite synced to device B: {favs}')
    # جهاز ب يضيف قراءة، فتصل إلى أ
    pb.evaluate("MS.progress.toggle('medical-immunology', 1)"); pb.wait_for_timeout(2500)
    pa.reload(); pa.wait_for_timeout(2500)
    read = pa.evaluate("JSON.parse(localStorage.getItem('ms.read')||'{}')")
    chk(read.get('medical-immunology') == [1], f'progress synced to device A: {read}')
    # خروج يمسح البيانات المحلية
    pa.goto(BASE + 'login.html'); pa.wait_for_timeout(500); pa.click('#logout'); pa.wait_for_timeout(800)
    chk(pa.evaluate("localStorage.getItem('ms.fav')") is None, 'logout clears synced local data')
    chk(not errs, f'js errors {errs}')
    b.close()
finally: srv.terminate()
print('AUTH E2E OK' if not fails else f'{len(fails)} failures'); sys.exit(1 if fails else 0)
