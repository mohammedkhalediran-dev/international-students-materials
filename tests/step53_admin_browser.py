# python3 -I tests/step53_admin_browser.py — Step 53: مركز الإدارة في Chromium على الخادم المحلي (حسابات اختبار فقط).
# Covers: gate for non-admins, stats, search/filters/pagination, detail, role change with confirmation, suspend/reactivate
# (session really ends), persistence after reload, CSV export, audit log, notification center (preview vs real test),
# theme persistence, keyboard/focus, mobile drawer + cards at 390/768/1440. Real Cloudflare/Google/Apple are not exercised.
import subprocess, time, os, sys, json, csv, io, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seed53 import seed
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PORT = 8821; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
LOGIN = """async ([email, sub, name]) => { const t = await (await fetch('/__test/token?email=' + encodeURIComponent(email) + '&sub=' + sub + '&name=' + encodeURIComponent(name))).text();
  return (await fetch('/api/auth/google', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({credential: t})})).status; }"""
def ctx(b, w=1440, h=1000):
    c = b.new_context(viewport={'width': w, 'height': h}, accept_downloads=True)
    c.route('https://fonts.googleapis.com/**', lambda r: r.abort()); c.route('https://accounts.google.com/**', lambda r: r.abort())
    return c
def rows(pg): return pg.locator('#rows tr:not(.skel)')
def settle(pg): pg.wait_for_function("!document.querySelector('#rows .skel')", timeout=8000); pg.wait_for_timeout(150)
try:
    cookies = seed(BASE)
    with sync_playwright() as p:
        b = p.chromium.launch()
        # --- non-admins are refused (UI gate + server)
        c0 = ctx(b); p0 = c0.new_page(); p0.goto(BASE + 'admin.html'); p0.wait_for_timeout(800)
        chk(p0.locator('#gate').is_visible() and 'سجّل الدخول' in p0.inner_text('#gateTitle') and p0.locator('#accounts').is_hidden(), 'signed-out: login gate, no data')
        p0.goto(BASE + 'index.html'); p0.evaluate(LOGIN, ['student1@test.medixa', 'seed-0', 'أحمد علي'])
        p0.goto(BASE + 'admin.html'); p0.wait_for_timeout(800)
        chk('للمشرفين فقط' in p0.inner_text('#gateTitle'), 'student: admins-only gate')
        chk(p0.evaluate("fetch('/api/auth/admin/users').then(r => r.status)") == 403, 'student: server refuses admin data')

        # --- admin, desktop
        c = ctx(b); pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + 'index.html'); chk(pg.evaluate(LOGIN, ['boss@x.com', 'sub-boss', 'محمد خالد']) == 200, 'admin signs in')
        pg.goto(BASE + 'admin.html'); settle(pg)
        chk(pg.inner_text('#meName') == 'محمد خالد', 'sidebar shows the real admin')
        chk(pg.locator('.stat').count() == 4 and pg.locator('.stat').first.locator('strong').inner_text() == '25', 'stats from the database (25 accounts)')
        chk(rows(pg).count() == 20 and pg.locator('#pages button.current').inner_text() == '1', 'first page of 20')
        first = rows(pg).first
        chk('محمد خالد' in first.inner_text() and '(أنت)' in first.inner_text() and first.locator('[data-action=status]').is_disabled(), 'own row first, suspend disabled')
        chk(pg.locator('.email').first.evaluate("e => getComputedStyle(e).direction") == 'ltr', 'emails shown LTR')
        pg.click('#pages button[data-p="2"]'); settle(pg)
        chk(rows(pg).count() == 5 and 'عرض 21–25 من 25' in pg.inner_text('#results'), 'page 2 has the remaining 5')
        pg.fill('#search', 'احمد'); pg.wait_for_timeout(600); settle(pg)
        chk(rows(pg).count() == 2 and all('أحمد' in t for t in rows(pg).all_inner_texts()), 'search: احمد finds أحمد (normalised)')
        pg.fill('#search', 'student13@'); pg.wait_for_timeout(600); settle(pg)
        chk(rows(pg).count() == 1 and 'يوسف عادل' in rows(pg).first.inner_text(), 'search by email')
        pg.fill('#search', 'لا يوجد أحد'); pg.wait_for_timeout(600); settle(pg)
        chk(pg.locator('#listState').is_visible() and 'لا توجد حسابات تطابق' in pg.inner_text('#listState'), 'no-results state')
        pg.click('#listState button'); settle(pg)
        chk(rows(pg).count() == 20, 'reset from empty state')
        pg.select_option('#semFilter', '1'); settle(pg)
        chk(rows(pg).count() == 5 and all('الكورس الأول' in t for t in rows(pg).all_inner_texts()), 'filter by semester')
        pg.select_option('#semFilter', ''); pg.select_option('#roleFilter', 'admin'); settle(pg)
        chk(rows(pg).count() == 1, 'filter by role')
        pg.click('#resetFilters'); settle(pg)

        # --- detail (focus returns to the opener)
        pg.fill('#search', 'student4@'); pg.wait_for_timeout(600); settle(pg)
        btn = rows(pg).first.locator('[data-action=detail]').last; btn.click()
        pg.wait_for_selector('#detail[open] .info-row')
        txt = pg.inner_text('#detailBody')
        chk('student4@test.medixa' in txt and 'Google' in txt and 'الكورس الأول' in txt and 'جلسات قائمة' in txt, 'detail shows real data')
        chk('seed-' not in txt and 'google_sub' not in txt, 'detail hides the Google id')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        chk(pg.evaluate("document.activeElement.getAttribute('data-action')") == 'detail', 'focus returns to the opener after Esc')

        # --- role change with confirmation, persisted after reload
        rows(pg).first.locator('[data-action=edit]').click(); pg.wait_for_selector('#editor[open]')
        chk(pg.locator('#nameInput').get_attribute('readonly') is not None and pg.locator('#roleInput option[value=admin]').is_disabled(), 'name/email read-only; admin not grantable')
        pg.select_option('#roleInput', 'rep'); pg.click('#saveBtn'); pg.wait_for_selector('#confirm[open]')
        chk('ممثل الدفعة' in pg.inner_text('#confirmText') and 'التبليغات' in pg.inner_text('#confirmText'), 'role change asks for confirmation with consequences')
        pg.click('#confirmBtn'); pg.wait_for_selector('#toast:not([hidden])'); settle(pg)
        chk('تم الحفظ في الخادم' in pg.inner_text('#toast') and 'ممثل الدفعة' in rows(pg).first.inner_text(), 'role saved after server confirmation')
        pg.reload(); settle(pg); pg.fill('#search', 'student4@'); pg.wait_for_timeout(600); settle(pg)
        chk('ممثل الدفعة' in rows(pg).first.inner_text(), 'role persists after reload')
        # semester edit
        rows(pg).first.locator('[data-action=edit]').click(); pg.wait_for_selector('#editor[open]')
        pg.select_option('#semInput', '3'); pg.click('#saveBtn'); pg.wait_for_selector('#editor', state='hidden'); settle(pg)
        chk('الكورس الثالث' in rows(pg).first.inner_text(), 'semester edit saved')
        # no change → inline message, nothing sent
        rows(pg).first.locator('[data-action=edit]').click(); pg.wait_for_selector('#editor[open]'); pg.click('#saveBtn')
        chk('لم تغيّر شيئاً' in pg.inner_text('#formError'), 'no-op save is explained inline'); pg.keyboard.press('Escape')

        # --- failure keeps input and shows a clear message
        pg.route('**/api/auth/user', lambda r: r.fulfill(status=500, body='{}', content_type='application/json'))
        rows(pg).first.locator('[data-action=edit]').click(); pg.wait_for_selector('#editor[open]')
        pg.select_option('#roleInput', 'uploader'); pg.click('#saveBtn'); pg.wait_for_selector('#confirm[open]'); pg.click('#confirmBtn'); pg.wait_for_timeout(500)
        chk(pg.locator('#confirm[open]').count() == 1 and 'أعد المحاولة' in pg.inner_text('#confirmError') and pg.input_value('#roleInput') == 'uploader' and not pg.locator('#confirmBtn').is_disabled(), 'server failure: message, input kept, retry possible')
        chk(pg.locator('#toast').is_hidden() or 'تم الحفظ' not in pg.inner_text('#toast'), 'no success message on failure')
        pg.unroute('**/api/auth/user'); pg.click('#confirmBtn'); pg.wait_for_selector('#confirm', state='hidden'); settle(pg)
        chk('رافع ملفات' in rows(pg).first.inner_text(), 'retry succeeds')

        # --- suspend: the student's existing session really ends; data kept; reactivate
        s5 = ctx(b); sp = s5.new_page(); sp.goto(BASE + 'index.html'); sp.evaluate(LOGIN, ['student5@test.medixa', 'seed-4', 'زيد كريم'])
        chk(sp.evaluate("fetch('/api/auth/me').then(r => r.status)") == 200, '(setup) student 5 signed in')
        sp.evaluate("fetch('/api/sync', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({items: {'ms.fav': {v: ['medical-immunology'], t: 5}}})})")
        pg.fill('#search', 'student5@'); pg.wait_for_timeout(600); settle(pg)
        rows(pg).first.locator('[data-action=status]').click(); pg.wait_for_selector('#confirm[open]')
        chk('محفوظة' in pg.inner_text('#confirmText'), 'suspend confirmation explains data is kept')
        pg.click('#confirmBtn'); pg.wait_for_selector('#confirm', state='hidden'); settle(pg)
        chk('موقوف' in rows(pg).first.inner_text(), 'suspended in the table')
        chk(sp.evaluate("fetch('/api/auth/me').then(r => r.status)") == 401, 'suspended student: existing session rejected')
        pg.reload(); settle(pg)
        chk(pg.locator('.stat.red strong').inner_text() == '1', 'suspended count after reload')
        pg.click('.stat.red'); settle(pg)
        chk(rows(pg).count() == 1 and pg.input_value('#statusFilter') == 'suspended', 'stat card filters suspended')
        rows(pg).first.locator('[data-action=status]').click(); pg.wait_for_selector('#confirm[open]'); pg.click('#confirmBtn'); pg.wait_for_selector('#confirm', state='hidden'); settle(pg)
        chk(sp.evaluate(LOGIN, ['student5@test.medixa', 'seed-4', 'زيد كريم']) == 200, 'reactivated student signs in again')
        chk(sp.evaluate("fetch('/api/sync').then(r => r.json()).then(d => d.data['ms.fav'].v[0])") == 'medical-immunology', 'student data kept through suspension')
        pg.click('#resetFilters'); settle(pg)

        # --- CSV export of filtered rows
        pg.select_option('#semFilter', '2'); settle(pg)
        with pg.expect_download() as dl: pg.click('#export')
        raw = open(dl.value.path(), 'rb').read()
        chk(raw[:3] == b'\xef\xbb\xbf', 'CSV starts with UTF-8 BOM')
        data = list(csv.reader(io.StringIO(raw.decode('utf-8-sig'))))
        chk(data[0][0] == 'الاسم' and len(data) == 6 and all(r[4] == 'الكورس 2' for r in data[1:]), f'CSV has only filtered rows ({len(data) - 1})')
        pg.click('#resetFilters'); settle(pg)

        # --- add user: honest explanation, no fake success
        pg.click('#add'); pg.wait_for_selector('#addInfo[open]')
        chk('Google' in pg.inner_text('#addInfo') and pg.input_value('#loginLink').endswith('/login.html'), 'add-user explains the real Google flow with the login link')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
        chk(pg.evaluate("document.activeElement.id") == 'add', 'focus returns to «إضافة مستخدم»')

        # --- audit log
        pg.click('.navbtn[data-view=activity]'); pg.wait_for_selector('#logs .log')
        log = pg.inner_text('#logs')
        chk('ممثل الدفعة' in log and 'إيقاف' in log and 'إعادة تفعيل' in log and 'تصدير' in log and 'محمد خالد' in log, 'audit lists real changes with actor')
        chk(pg.locator('#auditMissing').is_hidden(), 'audit available (migration 0005 in the test DB)')

        # --- roles
        pg.click('.navbtn[data-view=roles]'); pg.wait_for_selector('#roleCards .rolecard')
        chk(pg.locator('.rolecard').count() == 4 and 'ADMIN_EMAILS' in pg.inner_text('#roles'), 'four real roles, admin source explained')

        # --- notifications: preview vs real test
        pg.click('.navbtn[data-view=notifications]'); pg.wait_for_function("document.querySelector('#pushConfigured').textContent !== '…'")
        chk('مضبوطة' in pg.inner_text('#pushConfigured') and pg.locator('#keysBox').evaluate('e => e.open') is False, 'keys configured; key generator collapsed')
        chk(pg.locator('#pushTest').is_disabled() and 'لا يوجد جهاز مشترك لحسابك' in pg.inner_text('#mineLine'), 'no own device: real test disabled, reason shown')
        pg.click('[data-sample=announcement]')
        chk(pg.inner_text('#pvTitle').startswith('تبليغ · ') and 'لا يُرسل' in pg.inner_text('#notifications'), 'in-page preview is labelled as not sending')
        chk(pg.input_value('#pushPub') == '', 'no keys generated automatically')

        # --- theme persists
        pg.click('#themeToggle'); pg.reload(); pg.wait_for_timeout(800)
        chk(pg.evaluate("document.documentElement.getAttribute('data-admin-theme')") == 'light', 'light theme saved')
        pg.click('#themeToggle')
        chk(not errs, f'no JS errors {errs[:2]}')

        # --- tablet & phone
        for w, h in [(768, 1024), (390, 844)]:
            cm = ctx(b, w, h); pm = cm.new_page(); pm.goto(BASE + 'index.html'); pm.evaluate(LOGIN, ['boss@x.com', 'sub-boss', 'محمد خالد'])
            pm.goto(BASE + 'admin.html'); settle(pm)
            chk(pm.evaluate("document.documentElement.scrollWidth <= innerWidth"), f'{w}px: no horizontal scroll')
            chk(pm.locator('#sidebar').evaluate("e => e.getBoundingClientRect().left >= innerWidth - 2"), f'{w}px: sidebar off-canvas')
            pm.click('#menuToggle'); pm.wait_for_timeout(300)
            chk(pm.locator('#sidebar').evaluate("e => e.getBoundingClientRect().right <= innerWidth + 1 && e.getBoundingClientRect().left < innerWidth - 100") and pm.get_attribute('#menuToggle', 'aria-expanded') == 'true', f'{w}px: drawer opens')
            pm.keyboard.press('Escape'); pm.wait_for_timeout(300)
            chk(pm.get_attribute('#menuToggle', 'aria-expanded') == 'false', f'{w}px: Esc closes drawer')
            if w == 390:
                chk(pm.locator('thead').is_hidden() and rows(pm).first.evaluate("e => getComputedStyle(e).display") == 'grid' and rows(pm).count() == 10, '390px: rows become cards, 10 per page')
                small = pm.evaluate("[...document.querySelectorAll('#rows button, .toolbar .field, .pages button')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 34).length")
                chk(small == 0, f'390px: touch targets ≥34px ({small} small)')
            cm.close()
        b.close()
finally:
    srv.terminate()
print('STEP53 ADMIN FAILED' if fails else f'STEP53 ADMIN OK: {n} checks')
sys.exit(1 if fails else 0)
