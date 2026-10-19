# python3 -I tests/step57_grades_browser.py — Step 57: درجاتي الجامعية في Chromium على الخادم المحلي (حسابات وبيانات وهمية فقط).
# Covers: admin pastes a table (Excel copy) → column guess → masked preview → upload; batch and people lists; student links with a
# differently written passport and sees only their own grades; wrong / already-claimed passport messages; guest gate; admin unlink;
# sidebar link; English; 390/1440, dark/light, no horizontal scroll; no passport kept in the page or in browser storage.
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import guest_mode  # noqa: E402 — صفحة الدخول أولاً (Step 60): الفحوص القديمة تعمل كزائر
import subprocess, time, os
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SHOTS = os.environ.get('SHOTS')
PORT = 8857; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
LOGIN = """async ([email, sub, name]) => { const t = await (await fetch('/__test/token?email=' + encodeURIComponent(email) + '&sub=' + sub + '&name=' + encodeURIComponent(name))).text();
  return (await fetch('/api/auth/google', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({credential: t})})).status; }"""
def ctx(b, w=1440, h=1000, theme=None, lang=None):
    c = b.new_context(viewport={'width': w, 'height': h}, service_workers='block')
    c.route('https://fonts.googleapis.com/**', lambda r: r.abort()); c.route('https://accounts.google.com/**', lambda r: r.abort())
    init = "try{localStorage.setItem('ms.push.asked','1');localStorage.setItem('ms.sem','3');"
    if theme: init += "localStorage.setItem('ms.theme', JSON.stringify('%s'));" % theme
    if lang: init += "localStorage.setItem('ms.lang', JSON.stringify('%s'));" % lang
    c.add_init_script(init + "}catch(e){}")
    return c
def shot(pg, name):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, name), full_page=True)
def no_hscroll(pg): return pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')

# جدول وهمي كما يُنسخ من Excel (Tab) بعناوين عربية
TABLE = "اسم الطالب\tرقم الجواز\tالمادة\tالدرجة\n" + "\n".join([
    "Student Alpha\tX1234567\tPhysiology of Kidney\t88",
    "Student Alpha\tX1234567\tMedical immunology\t74",
    "Student Beta\tY7654321\tPhysiology of Kidney\t61",
    "Student Beta\tY7654321\tMedical immunology\t57",
    "Student Beta\tY7654321\tفسلجة الكلى\t70",
])
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        # --- المشرف يرفع
        ca = ctx(b); pa = ca.new_page(); errs = []; pa.on('pageerror', lambda e: errs.append(str(e)))
        pa.on('dialog', lambda d: d.accept())
        pa.goto(BASE + 'index.html'); chk(pa.evaluate(LOGIN, ['boss@x.com', 'sub-boss', 'محمد خالد']) == 200, 'admin signs in')
        pa.goto(BASE + 'grades-admin.html'); pa.wait_for_selector('#grApp:not([hidden])', timeout=8000)
        chk(pa.locator('#grGate').is_hidden(), 'admin sees the app, not the gate')
        pa.fill('#grTitleIn', 'Course 3 — test batch')
        pa.fill('#grPaste', TABLE); pa.wait_for_selector('#grMap:not([hidden])')
        mapped = pa.evaluate("[...document.querySelectorAll('#grMap select')].map(s => s.getAttribute('data-col') + '=' + s.value).join(',')")
        chk(mapped == 'name=0,passport=1,course=2,grade=3', 'columns guessed from Arabic headers: ' + mapped)
        prev = pa.inner_text('#grPrevBody')
        chk('X1234567' not in prev and '•••567' in prev, 'preview masks passports')
        chk('2' in pa.inner_text('#grPrevStats') and '5' in pa.inner_text('#grPrevStats'), 'preview counts students and rows')
        shot(pa, 'admin-preview.png')
        pa.click('#grUpload'); pa.wait_for_function("document.getElementById('grUpStatus').textContent.includes('5')", timeout=8000)
        chk(pa.input_value('#grPaste') == '' and pa.locator('#grMap').is_hidden(), 'pasted data cleared after upload')
        pa.wait_for_function("document.querySelectorAll('#grBatches .gr-item').length === 1", timeout=8000)
        chk('Course 3 — test batch' in pa.inner_text('#grBatches'), 'batch listed')
        chk(pa.locator('#grPeople .gr-item').count() == 2 and 'X1234567' not in pa.content(), 'people listed without passports')
        # --- طالب أ
        cs = ctx(b, theme='dark'); ps = cs.new_page(); serr = []; ps.on('pageerror', lambda e: serr.append(str(e)))
        ps.goto(BASE + 'index.html'); ps.evaluate(LOGIN, ['alpha@x.com', 'sub-a', 'Alpha'])
        link = ps.locator('#sidebar a[href="grades.html"]')
        chk(link.count() >= 1, 'sidebar has an enabled grades link')
        ps.goto(BASE + 'grades.html'); ps.wait_for_selector('#grClaim', timeout=8000)
        chk(ps.evaluate("[...document.querySelectorAll('#sidebar a[href=\"grades.html\"]')].some(a => a.getAttribute('aria-current') === 'page' || a.classList.contains('is-active') || a.classList.contains('active'))"), 'sidebar marks grades as current page')
        # Step 61: «درجاتي» تطلب الملف الشخصي أولاً (الاسم كما في الجامعة + الجواز)
        ps.fill('#grFullName', 'Alpha'); ps.fill('#grPassport', 'X1234567'); ps.click('#grClaimBtn'); ps.wait_for_selector('#grClaimMsg:not([hidden])')
        chk('اسمك الكامل' in ps.inner_text('#grClaimMsg'), 'one-word name refused before sending')
        ps.fill('#grFullName', 'Student Alpha'); ps.fill('#grPassport', ' x-123 4567 '); ps.click('#grClaimBtn'); ps.wait_for_selector('#grList:not([hidden]) .gr-table', timeout=8000)
        txt = ps.inner_text('#grList')
        chk('88' in txt and '74' in txt and 'Student Alpha' in txt, 'student sees own grades')
        chk('61' not in txt and '57' not in txt and 'Beta' not in txt, 'student does not see another student')
        stor = ps.evaluate("JSON.stringify(localStorage) + JSON.stringify(sessionStorage) + document.body.innerHTML")
        chk('1234567' not in stor, 'passport not kept in page or browser storage')
        chk(no_hscroll(ps), 'student page: no horizontal scroll (1440 dark)')
        shot(ps, 'student-dark.png')
        ps.reload(); ps.wait_for_selector('#grList:not([hidden]) .gr-table', timeout=8000)
        chk(ps.locator('#grClaim').is_hidden(), 'after reload grades show directly (no passport again)')
        # --- طالب آخر يحاول رقم أ
        ce = ctx(b, 390, 844); pe = ce.new_page(); eerr = []; pe.on('pageerror', lambda e: eerr.append(str(e)))
        pe.goto(BASE + 'index.html'); pe.evaluate(LOGIN, ['eve@x.com', 'sub-e', 'Eve'])
        pe.goto(BASE + 'grades.html'); pe.wait_for_selector('#grClaim', timeout=8000)
        pe.fill('#grFullName', 'Eve Somebody'); pe.fill('#grPassport', 'X1234567'); pe.click('#grClaimBtn'); pe.wait_for_selector('#grClaimMsg:not([hidden])')
        chk('مربوط بحساب آخر' in pe.inner_text('#grClaimMsg'), 'claimed passport refused with a clear message')
        chk(no_hscroll(pe), 'student page: no horizontal scroll (390)')
        shot(pe, 'student-390.png')
        # --- زائر
        cg = ctx(b, 390, 844); pg = cg.new_page(); pg.goto(BASE + 'grades.html'); pg.wait_for_selector('#grGate:not([hidden])', timeout=8000)
        chk(pg.locator('#grLogin').is_visible() and pg.locator('#grClaim').is_hidden(), 'guest sees the sign-in gate')
        chk(pg.evaluate("fetch('/api/grades/me').then(r => r.status)") == 401, 'guest API refused')
        # --- الطالب لا يدخل صفحة الإدارة
        ps.goto(BASE + 'grades-admin.html'); ps.wait_for_selector('#grGate:not([hidden])', timeout=8000)
        chk(ps.locator('#grApp').is_hidden(), 'student cannot open admin page')
        chk(ps.evaluate("fetch('/api/grades/admin/summary').then(r => r.status)") == 403, 'student admin API refused')
        # --- المشرف يفك الربط
        pa.reload(); pa.wait_for_function("document.querySelectorAll('#grPeople .gr-item').length === 2", timeout=8000)
        pa.locator('#grPeople .gr-item', has_text='Student Alpha').locator('button').click()
        pa.wait_for_function("!document.querySelector('#grPeople').textContent.includes('alpha@x.com')", timeout=8000)
        ps.goto(BASE + 'grades.html'); ps.wait_for_selector('#grClaim', timeout=8000)
        chk(ps.locator('#grPassport').is_visible() and ps.locator('#grList').is_hidden(), 'after unlink the student sees the passport field again')
        chk(ps.input_value('#grFullName') == 'Student Alpha', 'profile name kept after unlink')
        # --- الإنجليزية
        cn = ctx(b, lang='en'); pn = cn.new_page(); pn.goto(BASE + 'index.html'); pn.evaluate(LOGIN, ['beta@x.com', 'sub-b', 'Beta'])
        pn.goto(BASE + 'grades.html'); pn.wait_for_selector('#grClaim', timeout=8000)
        import re
        ui = pn.evaluate("(() => { const m = document.querySelector('main').cloneNode(true); const g = m.querySelector('#grList'); if (g) g.remove(); return m.innerText || m.textContent; })()")
        ar = re.findall(r'[؀-ۿ]+', ui)
        chk(not ar, 'English page has no Arabic UI text left: ' + ' '.join(ar[:8]))
        pn.fill('#grFullName', 'Student Beta'); pn.fill('#grPassport', 'Y7654321'); pn.click('#grClaimBtn'); pn.wait_for_selector('.gr-table', timeout=8000)
        chk('Subject' in pn.inner_text('#grList') and '61' in pn.inner_text('#grList'), 'English grades table')
        chk('فسلجة الكلى' in pn.inner_text('#grList'), 'Arabic course name shown exactly as uploaded in English mode')
        # --- Step 61: صفحة الملف الشخصي
        cd = ctx(b, 390, 844); pd = cd.new_page(); derr = []; pd.on('pageerror', lambda e: derr.append(str(e)))
        pd.goto(BASE + 'index.html'); pd.evaluate(LOGIN, ['delta@x.com', 'sub-d', 'Delta G'])
        chk(pd.locator('#sidebar a[href="profile.html"]').count() >= 1, 'sidebar has an enabled profile link')
        pd.goto(BASE + 'profile.html'); pd.wait_for_selector('#pfAccount:not([hidden])', timeout=8000)
        acc = pd.inner_text('#pfAccount')
        chk('delta@x.com' in acc and 'Delta G' in acc and 'الكورس الثالث' in acc, 'profile shows Google name, email and semester automatically: ' + acc)
        chk('غير مكتمل' in acc and pd.locator('#pfGrades a[href="grades.html"]').count() == 0, 'grades box locked while the profile is incomplete')
        chk(pd.evaluate("[...document.querySelectorAll('#sidebar a[href=\"profile.html\"]')].some(a => a.getAttribute('aria-current') === 'page' || a.classList.contains('is-active') || a.classList.contains('active'))"), 'sidebar marks profile as current page')
        pd.fill('#grFullName', 'Delta Gamma Student'); pd.fill('#grPassport', 'D5550001'); pd.click('#grClaimBtn')
        pd.wait_for_selector('#pfGrades a[href="grades.html"]', timeout=8000)
        chk('مكتمل' in pd.inner_text('#pfAccount') and pd.locator('#grPassport').count() == 0, 'after saving: complete, passport field gone')
        chk('D5550001' not in pd.evaluate("JSON.stringify(localStorage) + document.body.innerHTML"), 'passport not kept on the profile page')
        chk(no_hscroll(pd), 'profile page: no horizontal scroll (390)'); shot(pd, 'profile-390.png')
        pd.click('#pfGrades a[href="grades.html"]'); pd.wait_for_selector('#grList:not([hidden]) .tt-empty', timeout=8000)
        chk('تلقائياً' in pd.inner_text('#grList'), 'grades page open with a waiting message before any upload')
        cg2 = ctx(b); pg2 = cg2.new_page(); pg2.goto(BASE + 'profile.html'); pg2.wait_for_selector('#grGate:not([hidden])', timeout=8000)
        chk(pg2.locator('#grLogin').is_visible(), 'guest sees sign-in gate on profile')
        # المشرف: تحميل قائمة الطلاب
        pa.reload(); pa.wait_for_selector('#grApp:not([hidden])', timeout=8000)
        with pa.expect_download() as dl: pa.click('#grRoster')
        csv = open(dl.value.path(), encoding='utf-8-sig').read()
        chk(csv.startswith('Student code,Full name') and 'Delta Gamma Student' in csv and 'delta@x.com' in csv and 'D5550001' not in csv, 'roster CSV downloaded without passports')
        code = [l.split(',')[0] for l in csv.splitlines() if 'delta@x.com' in l][0]
        roster_fill = csv.replace('delta@x.com,3,,', 'delta@x.com,3,Anatomy,93')
        pa.fill('#grTitleIn', 'Roster batch'); pa.fill('#grPaste', roster_fill.split('\n', 0)[0]); pa.wait_for_selector('#grMap:not([hidden])')
        chk(code in pa.inner_text('#grPrevBody'), 'preview shows the student code')
        pa.click('#grUpload'); pa.wait_for_function("document.getElementById('grUpStatus').textContent.includes('1')", timeout=8000)
        pd.reload(); pd.wait_for_selector('#grList .gr-table', timeout=8000)
        chk('93' in pd.inner_text('#grList'), 'grade uploaded by student code reaches the student')
        chk(not derr, 'no profile page errors: ' + '; '.join(derr))
        cl = ctx(b, theme='light'); pl = cl.new_page(); pl.goto(BASE + 'index.html'); pl.evaluate(LOGIN, ['boss@x.com', 'sub-boss', 'محمد خالد'])
        pl.goto(BASE + 'grades-admin.html'); pl.wait_for_selector('#grApp:not([hidden])', timeout=8000)
        chk(no_hscroll(pl), 'admin page: no horizontal scroll (1440 light)'); shot(pl, 'admin-light.png')
        pl.set_viewport_size({'width': 390, 'height': 844}); pl.wait_for_timeout(300); chk(no_hscroll(pl), 'admin page: no horizontal scroll (390)')
        chk(not errs and not serr and not eerr, 'no page errors: ' + '; '.join(errs + serr + eerr))
        b.close()
finally:
    srv.terminate()
print(('STEP57 GRADES FAILED (%d failed of %d)' % (len(fails), n)) if fails else 'STEP57 GRADES OK: %d checks' % n)
raise SystemExit(1 if fails else 0)
