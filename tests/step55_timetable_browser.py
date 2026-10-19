# python3 -I tests/step55_timetable_browser.py — Step 55: الجدول الجامعي في Chromium على الخادم المحلي (حسابات وبيانات اختبار فقط).
# Covers: homepage section placement and visibility (course 3 / admin only), tomorrow's cards, guest & other-course denial
# (UI + API), weekly view (day/week navigation, details dialog, cancel/reschedule indicators), admin page (add, conflict
# warning, publish, cancel a date), import (pasted text and a text PDF → preview → check → approve), 390/768/1440, dark/light.
# MEDIXA_CDN_DIR (optional): local pdfjs-dist-3.11.174 for the PDF import step without internet. SHOTS=dir saves screenshots.
import subprocess, time, os, sys, datetime
from playwright.sync_api import sync_playwright
os.environ.setdefault('PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS', '1')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CDN = os.environ.get('MEDIXA_CDN_DIR'); SHOTS = os.environ.get('SHOTS')
PORT = 8855; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
LOGIN = """async ([email, sub, name]) => { const t = await (await fetch('/__test/token?email=' + encodeURIComponent(email) + '&sub=' + sub + '&name=' + encodeURIComponent(name))).text();
  return (await fetch('/api/auth/google', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({credential: t})})).status; }"""
API = """async ([path, body]) => { const r = await fetch('/api/timetable/admin/' + path, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)}); return [r.status, await r.json()]; }"""
SEM = """async (v) => (await fetch('/api/sync', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({items: {'ms.sem': {v, t: Date.now()}}})})).status"""
def ctx(b, w=1440, h=1000, theme=None):
    c = b.new_context(viewport={'width': w, 'height': h}, service_workers='block')
    c.route('https://fonts.googleapis.com/**', lambda r: r.abort()); c.route('https://accounts.google.com/**', lambda r: r.abort())
    if CDN:
        files = {'pdf.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.worker.min.js'}
        def cdn(route):
            name = route.request.url.split('/')[-1].split('?')[0]
            route.fulfill(path=os.path.join(CDN, files[name]), content_type='application/javascript') if name in files else route.abort()
        c.route('**/cdnjs.cloudflare.com/**', cdn)
    # الكورس محدد مسبقاً: لا تظهر نافذة «في أي كورس أنت؟»
    c.add_init_script("try{localStorage.setItem('ms.push.asked','1');" + ("localStorage.setItem('ms.theme', JSON.stringify('%s'));" % theme if theme else "") + "}catch(e){}")
    return c
def shot(pg, name):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, name), full_page=False)
def home_ready(pg): pg.wait_for_function("document.querySelector('#ttHome .tt-card') || document.querySelector('#ttHome .tt-empty')", timeout=8000); pg.wait_for_timeout(700)

today = datetime.date.today(); tom = today + datetime.timedelta(days=1)
wd = (tom.weekday() + 1) % 7  # Python Monday=0 → JS getDay (Sunday=0)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        # --- admin seeds the timetable through the real API
        ca = ctx(b); pa = ca.new_page(); errs = []; pa.on('pageerror', lambda e: errs.append(str(e)))
        pa.goto(BASE + 'index.html'); chk(pa.evaluate(LOGIN, ['boss@x.com', 'sub-boss', 'محمد خالد']) == 200, 'admin signs in')
        for subj, topic, s, e, room, lec in [('Pediatrics', 'Neonatal Medicine', '09:00', '10:30', 'A', 'د. أحمد'), ('Internal Medicine', 'Cardiovascular Examination', '11:00', '12:30', 'B', 'د. سارة'), ('Surgery', 'Acute Abdomen', '14:00', '15:30', 'C', 'د. علي')]:
            st, body = pa.evaluate(API, ['save', {'subject': subj, 'topic': topic, 'lecturer': lec, 'room': room, 'repeat': 'weekly', 'weekday': wd, 'start': s, 'end': e, 'publish': True}])
            chk(st == 200, 'seed ' + subj)
        st, _ = pa.evaluate(API, ['save', {'subject': 'Secret Draft', 'repeat': 'weekly', 'weekday': wd, 'start': '16:00', 'end': '17:00'}])
        chk(st == 200, 'seed draft')

        # --- course-3 student: homepage (dark, like the reference) at 1440 and 390
        for w, h in [(1440, 1000), (768, 1000), (390, 844)]:
            cs = ctx(b, w, h, 'dark'); ps = cs.new_page(); ps.on('pageerror', lambda e: errs.append(str(e)))
            ps.goto(BASE + 'index.html'); ps.evaluate(LOGIN, ['s3@x.com', 'sub-s3', 'طالب ثالث']); ps.evaluate(SEM, 3)
            ps.goto(BASE + 'index.html'); home_ready(ps)
            chk(ps.locator('#ttHome').is_visible(), f'{w}: section visible for course 3')
            order = ps.evaluate("[...document.querySelectorAll('#main > section')].map(s => s.id)")
            chk(order[:3] == ['home', 'ttHome', 'semesters'], f'{w}: placed under the banner, above semesters {order[:4]}')
            cards = ps.locator('#ttHome .tt-card')
            chk(cards.count() == 3, f'{w}: three lectures tomorrow (draft hidden)')
            txt = ps.inner_text('#ttHome')
            chk(all(x in txt for x in ['Pediatrics', '09:00 – 10:30', 'Neonatal Medicine', 'القاعة A', 'د. أحمد', 'Surgery', 'الجدول الجامعي', 'رسمي', 'محاضرات غداً', 'عرض الأسبوع كامل']) and 'Secret Draft' not in txt, f'{w}: subject, time, lecturer, room, header')
            xs = [cards.nth(i).bounding_box()['x'] for i in range(3)]
            chk(xs[0] < xs[1] < xs[2], f'{w}: earliest lecture first, left to right as in the reference')
            chk(ps.evaluate("document.documentElement.scrollWidth <= innerWidth"), f'{w}: no horizontal page scroll')
            if w == 1440:
                chk(abs(cards.nth(0).bounding_box()['y'] - cards.nth(2).bounding_box()['y']) < 2, '1440: cards in one row')
                bg = ps.evaluate("getComputedStyle(document.querySelector('#ttHome .tt-panel')).borderTopColor")
                chk(bg == 'rgb(30, 123, 215)', 'dark: blue panel border as the reference ' + bg)
            if w == 390:
                chk(ps.locator('#ttWeekLink').bounding_box()['width'] > 300, '390: full-width week button')
                chk(min(cards.nth(0).bounding_box()['height'], 999) >= 140, '390: readable card height')
            shot(ps, f'home-dark-{w}.png')
            if w == 1440:
                ps.locator('#ttHome .tt-card').first.click(); ps.wait_for_url('**/timetable.html?date=*'); ps.wait_for_selector('.tt-col .tt-card')
                chk(ps.locator('.tt-col').count() == 7, 'weekly: 7 day columns on desktop')
                chk(ps.locator('.tt-col.is-selected .tt-card').count() == 3, 'weekly: tomorrow selected from the card')
                ps.wait_for_timeout(800)
                shot(ps, 'week-dark-1440.png')
            cs.close()

        # --- light theme snapshot
        cl = ctx(b, 1440, 1000, 'light'); pl = cl.new_page(); pl.goto(BASE + 'index.html'); pl.evaluate(LOGIN, ['s3@x.com', 'sub-s3', 'طالب ثالث']); pl.goto(BASE + 'index.html'); home_ready(pl)
        chk(pl.evaluate("getComputedStyle(document.querySelector('#ttHome .tt-card')).color") != 'rgb(238, 246, 255)', 'light theme uses light card tokens'); shot(pl, 'home-light-1440.png'); cl.close()

        # --- other course and guest: hidden in UI, refused by the server
        co = ctx(b); po = co.new_page(); po.goto(BASE + 'index.html'); po.evaluate(LOGIN, ['s2@x.com', 'sub-s2', 'طالب ثاني']); po.evaluate(SEM, 2)
        po.goto(BASE + 'index.html'); po.wait_for_timeout(1200)
        chk(po.locator('#ttHome').is_hidden(), 'course 2: no timetable on homepage')
        t1 = tom.isoformat()
        chk(po.evaluate(f"fetch('/api/timetable?from={t1}&to={t1}').then(r => r.status)") == 403, 'course 2: API refuses (403)')
        po.goto(BASE + 'timetable.html'); po.wait_for_timeout(1000)
        chk(po.locator('#ttGate').is_visible() and 'غير متاح لحسابك' in po.inner_text('#ttGate') and po.locator('.tt-card').count() == 0, 'course 2: weekly page denied')
        chk(po.evaluate("fetch('/api/timetable/admin/list').then(r => r.status)") == 403, 'course 2: admin API refused')
        co.close()
        cg = ctx(b); pgst = cg.new_page(); pgst.goto(BASE + 'index.html'); pgst.wait_for_timeout(1200)
        chk(pgst.locator('#ttHome').is_hidden(), 'guest: no timetable on homepage')
        chk(pgst.evaluate(f"fetch('/api/timetable?from={t1}&to={t1}').then(r => r.status)") == 401, 'guest: API refuses (401)')
        pgst.goto(BASE + 'timetable.html'); pgst.wait_for_timeout(1000)
        chk('سجّل الدخول' in pgst.inner_text('#ttGate'), 'guest: login gate on weekly page')
        pgst.goto(BASE + 'timetable-admin.html'); pgst.wait_for_timeout(800)
        chk(pgst.locator('#ttGate').is_visible() and pgst.locator('#ttApp').is_hidden(), 'guest: admin page gated')
        cg.close()

        # --- admin page: cancel one date, reschedule another, add with conflict warning
        pa.goto(BASE + 'timetable-admin.html'); pa.wait_for_selector('.tt-row')
        chk(pa.locator('#ttList .tt-row').count() == 4 and 'مسودة' in pa.inner_text('#ttList'), 'admin list shows published + draft')
        row = pa.locator('#ttList .tt-row', has_text='Surgery')
        row.get_by_role('button', name='تعديل موعد: Surgery').click()
        pa.fill('#ttExcDlg [name=date]', t1); pa.fill('#ttExcDlg [name=note]', 'اعتذار الأستاذ'); pa.click('#ttExcDlg button[type=submit]')
        pa.wait_for_selector('#ttExc .tt-row'); chk('ملغاة' in pa.inner_text('#ttExc'), 'cancel one date listed')
        row = pa.locator('#ttList .tt-row', has_text='Internal Medicine')
        row.get_by_role('button', name='تعديل موعد: Internal Medicine').click()
        pa.fill('#ttExcDlg [name=date]', t1); pa.select_option('#ttExcDlg [name=action]', 'move')
        pa.fill('#ttExcDlg [name=new_start]', '12:30'); pa.fill('#ttExcDlg [name=new_end]', '13:30'); pa.fill('#ttExcDlg [name=new_room]', 'D'); pa.click('#ttExcDlg button[type=submit]')
        pa.wait_for_function("document.querySelectorAll('#ttExc .tt-row').length === 2")
        pa.click('#ttAdd'); pa.fill('#ttEdit [name=subject]', 'Clash'); pa.select_option('#ttEdit [name=weekday]', str(wd)); pa.fill('#ttEdit [name=start]', '09:30'); pa.fill('#ttEdit [name=end]', '10:00')
        pa.click('#ttEditSave'); pa.wait_for_selector('#ttEditMsg .tt-warn')
        chk('Pediatrics' in pa.inner_text('#ttEditMsg') and pa.inner_text('#ttEditSave') == 'حفظ رغم التعارض', 'conflict warning before saving')
        pa.click('#ttEdit [data-close]')
        shot(pa, 'admin-1440.png')

        # student sees the indicators
        cs = ctx(b, 390, 844, 'dark'); ps = cs.new_page(); ps.goto(BASE + 'index.html'); ps.evaluate(LOGIN, ['s3@x.com', 'sub-s3', 'طالب ثالث'])
        ps.goto(BASE + 'index.html'); home_ready(ps)
        txt = ps.inner_text('#ttHome')
        chk('ملغاة' in txt and 'موعد معدّل' in txt and '12:30 – 13:30' in txt and 'القاعة D' in txt, 'homepage shows cancelled + rescheduled indicators')
        ps.goto(BASE + f'timetable.html?date={t1}'); ps.wait_for_selector('.tt-col.is-selected .tt-card')
        chk(ps.locator('.tt-days').is_visible() and ps.locator('.tt-col:visible').count() == 1, '390: day tabs, one day at a time')
        ps.locator('.tt-col.is-selected .tt-card', has_text='Surgery').click(); ps.wait_for_selector('#ttDetail[open]')
        dt = ps.inner_text('#ttDetail')
        chk('Acute Abdomen' in dt and 'ملغاة' in dt and 'اعتذار الأستاذ' in dt and 'د. علي' in dt, 'details dialog: topic, status, note, lecturer')
        ps.wait_for_timeout(400); shot(ps, 'week-detail-390.png'); ps.click('#ttDetail [data-close]')
        label = ps.inner_text('.tt-week-label'); ps.click('#ttNext'); ps.wait_for_timeout(500)
        chk(ps.inner_text('.tt-week-label') != label, 'next week navigates')
        ps.click('#ttToday'); ps.wait_for_timeout(400)
        chk(ps.locator('.tt-day.is-today').count() == 1, 'current week highlights today')
        chk(ps.evaluate("document.documentElement.scrollWidth <= innerWidth"), '390 weekly: no horizontal scroll')
        cs.close()

        # --- import: pasted text → preview → check → approve as drafts → publish all
        pa.goto(BASE + 'timetable-admin.html'); pa.wait_for_selector('.tt-row')
        pa.click('#ttImportBtn'); pa.click('#ttImport summary')
        pa.fill('#ttPaste', 'الأربعاء\n8:30-10:00 Pathology | Inflammation | د. حسن | القاعة 2\n10:30-12:00 Pharmacology | Autonomic Drugs | Dr. Noor | Hall 3\nالخميس 1-2:30 Immunology')
        pa.click('#ttPasteGo'); pa.wait_for_selector('#ttRows tr')
        chk(pa.locator('#ttRows tr').count() == 3, 'pasted text → 3 preview rows')
        chk(pa.locator('#ttRows tr').nth(2).locator('input[type=time]').first.input_value() == '13:00', 'afternoon hours inferred (1 → 13:00)')
        pa.locator('#ttRows tr').nth(1).locator('input').nth(3).fill('Pharmacology II')  # editable preview
        pa.click('#ttCheck'); pa.wait_for_function("document.getElementById('ttImpStatus').textContent.includes('لا أخطاء')")
        pa.click('#ttApprove'); pa.wait_for_function("document.getElementById('ttPreview').hidden")
        chk('Pharmacology II' in pa.inner_text('#ttList') and pa.locator('#ttList .tt-chip.is-draft').count() == 4, 'approved rows saved as drafts (edited value kept)')
        if CDN:
            from reportlab.pdfgen import canvas as rc
            pdf = os.path.join(os.environ.get('TMPDIR', '/tmp'), 'tt55.pdf')
            c = rc.Canvas(pdf); c.setFont('Helvetica', 11)
            for x, s in [(60, 'Time'), (170, 'Sunday'), (280, 'Monday'), (390, 'Tuesday')]: c.drawString(x, 780, s)
            for y, tm, cells in [(750, '8:00-9:00', {170: 'Anatomy', 390: 'Biochemistry'}), (720, '9:15-10:15', {280: 'Histology'})]:
                c.drawString(60, y, tm)
                for x, s in cells.items(): c.drawString(x, y, s)
            c.save()
            pa.click('#ttImportBtn'); pa.set_input_files('#ttFile', pdf); pa.wait_for_selector('#ttRows tr', timeout=15000)
            subs = sorted(pa.locator('#ttRows tr').nth(i).locator('input').nth(2).input_value() for i in range(pa.locator('#ttRows tr').count()))
            chk(subs == ['Anatomy', 'Biochemistry', 'Histology'], 'text PDF grid → rows ' + str(subs))
            pa.click('#ttImpClose')
        pa.click('#ttPublishAll'); pa.wait_for_function("document.querySelectorAll('#ttList .tt-chip.is-draft').length === 0")
        chk(True, 'publish all drafts')
        st, body = pa.evaluate(API, ['check', {'rows': [{'subject': 'X', 'repeat': 'weekly', 'weekday': wd, 'start': '09:00', 'end': '10:00'}]}])
        chk(st == 200 and any(c.get('existing') for c in body['conflicts']), 'server conflict check against published lectures')
        chk(not errs, 'no page errors: ' + '; '.join(errs[:3]))
        b.close()
finally:
    srv.terminate()
print(f'step55 timetable browser: {n - len(fails)}/{n} passed')
sys.exit(1 if fails else 0)
