# python3 -I tests/auth_e2e.py — دخول Google (برمز اختبار) ومزامنة بين جهازين وصفحة الدخول وعودة الزائر.
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import guest_mode  # noqa: E402 — صفحة الدخول أولاً (Step 60): الفحوص القديمة تعمل كزائر
import subprocess, time, sys, os
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PORT = 8773; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []
def chk(c, m):
    if not c: fails.append(m); print('FAIL', m)
def google_login(pg, email='ali@test.com', sub='sub-ali', name='Ali Test'):
    # يحاكي ما يفعله زر Google: رمز موقّع يُرسل إلى الخادم
    return pg.evaluate("""async ([email, sub, name]) => {
      const t = await (await fetch('/__test/token?email=' + encodeURIComponent(email) + '&sub=' + sub + '&name=' + encodeURIComponent(name))).text();
      const r = await fetch('/api/auth/google', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({credential: t})});
      return r.status;
    }""", [email, sub, name])
try:
  with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    A = b.new_context(); B = b.new_context()
    for c in (A, B): c.route('https://accounts.google.com/**', lambda r: r.abort()); c.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    pa = A.new_page(); errs = []; pa.on('pageerror', lambda e: errs.append(str(e)))
    # صفحة الدخول: Google محجوب -> رسالة، والزائر يعمل
    pa.goto(BASE + 'login.html'); pa.wait_for_timeout(1500)
    chk(pa.locator('#googleBtn').is_visible(), 'custom google button visible when GIS unavailable')
    pa.wait_for_function("document.getElementById('notice').textContent.length > 0", timeout=12000)
    chk('زائر' in pa.inner_text('#notice'), 'offline Google message suggests guest')
    pa.click('[data-auth="guest"]'); pa.wait_for_url('**/index.html', timeout=5000)
    # ضيف يضيف مفضلة ثم يسجّل
    pa.wait_for_timeout(800)
    chk(pa.locator('#accountBtn').inner_text().strip() == 'تسجيل الدخول', 'guest sees login button in header')
    pa.evaluate("MS.favs.toggle('medical-immunology')")
    chk(google_login(pa) == 200, 'google login ok'); pa.reload(); pa.wait_for_timeout(2500)
    chk(pa.locator('#accountBtn').inner_text().strip() == 'Ali', 'header shows first name')
    # صفحة الدخول لمن سجّل: رسالة واسمه وخروج
    pa.goto(BASE + 'login.html'); pa.wait_for_timeout(1000)
    chk('Ali Test' in pa.inner_text('#actions'), 'login page shows logged-in state')
    # جهاز ب
    pb = B.new_page(); pb.on('pageerror', lambda e: errs.append(str(e)))
    pb.goto(BASE + 'index.html'); pb.wait_for_timeout(500)
    chk(google_login(pb) == 200, 'device B login ok'); pb.reload(); pb.wait_for_timeout(3000)
    favs = pb.evaluate("JSON.parse(localStorage.getItem('ms.fav')||'[]')")
    chk('medical-immunology' in favs, f'favorite synced to device B: {favs}')
    pb.evaluate("MS.progress.toggle('medical-immunology', 1)"); pb.wait_for_timeout(2500)
    pa.goto(BASE + 'index.html'); pa.wait_for_timeout(2800)
    read = pa.evaluate("JSON.parse(localStorage.getItem('ms.read')||'{}')")
    chk(read.get('medical-immunology') == [1], f'progress synced to device A: {read}')
    # خروج
    pa.goto(BASE + 'login.html'); pa.wait_for_timeout(800); pa.click('#actions button:last-child'); pa.wait_for_timeout(1000)
    chk(pa.evaluate("localStorage.getItem('ms.fav')") is None, 'logout clears synced local data')
    chk(pa.evaluate("fetch('/api/auth/me').then(r=>r.status)") == 401, 'session closed after logout')
    # الأدوار والتبليغات: طالب لا يكتب، المشرف يجعله ممثلاً، والزائر يرى التبليغ
    chk(google_login(pa) == 200, 'ali logs in again')
    pa.goto(BASE + 'announce.html'); pa.wait_for_timeout(1200)
    chk(pa.locator('#formCard').is_hidden() and 'ممثل الدفعة' in pa.inner_text('#msg'), 'student cannot use announcements page')
    C = b.new_context(); C.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    pc = C.new_page(); pc.on('pageerror', lambda e: errs.append(str(e)))
    pc.goto(BASE + 'index.html'); pc.wait_for_timeout(400)
    chk(google_login(pc, email='boss@x.com', sub='sub-boss', name='Boss') == 200, 'admin login ok')
    pc.goto(BASE + 'admin.html'); pc.wait_for_timeout(1500)
    # Step 53: مركز الإدارة الجديد — تعديل الحساب ثم تأكيد تغيير الدور
    ali = pc.locator('#rows tr', has_text='Ali Test')
    chk(ali.count() == 1 and pc.locator('#rows tr', has_text='Boss').locator('[data-action=status]').is_disabled(), 'admin page lists accounts; own row protected')
    ali.locator('[data-action=edit]').click(); pc.wait_for_selector('#editor[open]')
    pc.select_option('#roleInput', 'rep'); pc.click('#saveBtn'); pc.wait_for_selector('#confirm[open]'); pc.click('#confirmBtn'); pc.wait_for_timeout(1200)
    chk('تم الحفظ في الخادم' in pc.inner_text('#toast'), 'admin sets rep role')
    pa.reload(); pa.wait_for_timeout(1500)
    chk(pa.locator('#formCard').is_visible(), 'rep sees the announcement form')
    pa.fill('#title', 'موعد الامتحان'); pa.fill('#body', 'يوم الأحد القادم')
    pa.click('#send'); pa.wait_for_timeout(1200)
    chk('موعد الامتحان' in pa.inner_text('#list'), 'rep sees the posted announcement')
    G = b.new_context(); G.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    pg = G.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + 'index.html'); pg.wait_for_timeout(1800)
    chk(pg.locator('#announcements').is_visible() and 'موعد الامتحان' in pg.inner_text('#annList'), 'guest sees the announcement on the home page')
    pa.click('#list .btn'); pa.wait_for_timeout(1000)
    pg.reload(); pg.wait_for_timeout(1500)
    chk(pg.locator('#announcements').is_hidden(), 'section hides after the announcement is deleted')
    # الرفع بالحساب: الممثل يدخل صفحة الرفع بلا رمز
    pa.goto(BASE + 'upload.html'); pa.wait_for_timeout(1500)
    chk(pa.locator('#appArea').is_visible(), 'rep enters the upload page without a code')
    # صفحات الخصوصية والشروط وجهات الاتصال
    for u in ('privacy.html', 'terms.html'):
        pa.goto(BASE + u); pa.wait_for_timeout(300); chk(pa.locator('.doc h1').count() == 1, u + ' renders')
    pa.goto(BASE + 'login.html#contact'); pa.wait_for_timeout(500)
    chk(pa.evaluate("document.getElementById('contact').open"), 'contact dialog opens from hash')
    chk(pa.locator('.c-row').count() == 7, 'seven contact rows')
    chk(not errs, f'js errors {errs}')
    b.close()
finally: srv.terminate()
print('AUTH E2E OK' if not fails else f'{len(fails)} failures'); sys.exit(1 if fails else 0)
