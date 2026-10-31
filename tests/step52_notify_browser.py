# python3 -I tests/step52_notify_browser.py — Step 52: notification preferences + real service-worker push display (headless Chromium).
# The push service is stubbed like tests/step49_course_push_browser.py; a real push is delivered to the real sw.js through
# the Chrome DevTools Protocol (ServiceWorker.deliverPushMessage). Real phones/lock screens are NOT exercised here.
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import guest_mode  # noqa: E402 — صفحة الدخول أولاً (Step 60): الفحوص القديمة تعمل كزائر
import subprocess, time, os, sys, json, urllib.request
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
PORT = 8803; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
def pushlog(): return json.loads(urllib.request.urlopen(BASE + '__test/pushlog').read())
def post(path, body, headers=None):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(), headers={'content-type': 'application/json', **(headers or {})}, method='POST')
    try: return urllib.request.urlopen(req).status
    except urllib.error.HTTPError as e: return e.code
import ast  # the push-service stub is shared with step49 (evaluated as the Python string literal it is)
STUB = next(ast.literal_eval(nd.value) for nd in ast.parse(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'step49_course_push_browser.py'), encoding='utf8').read()).body
            if isinstance(nd, ast.Assign) and getattr(nd.targets[0], 'id', '') == 'STUB')
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort()); ctx.route('https://accounts.google.com/**', lambda r: r.abort())
        ctx.add_init_script(STUB % json.dumps('prefs3')); ctx.add_init_script("localStorage.setItem('ms.sem', '3');")
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(1200)
        chk(pg.locator('.sb-push .push-prefs').is_hidden(), 'customize hidden while notifications are off')
        pg.click('.sb-push .push-btn'); pg.wait_for_function("document.querySelector('.sb-push').getAttribute('data-state') === 'on'", timeout=8000)
        chk(pg.locator('.sb-push .push-prefs').is_visible(), 'customize shown once on')

        # preferences: lectures off, only one subject
        pg.click('.sb-push .push-prefs'); pg.wait_for_selector('#notifyPrefs[open]')
        chk(pg.locator('#notifyPrefs input[name=cat]').count() == 3 and pg.locator('#notifyPrefs input[name=cat]:checked').count() == 3, 'three categories, all on by default')
        chk(pg.locator('#notifyPrefs .np-courses').is_hidden(), 'subject list hidden while «all subjects» is chosen')
        pg.check('#notifyPrefs input[value=some]')
        sems = pg.evaluate("[...document.querySelectorAll('#notifyPrefs input[name=course]')].map(i => (MS.ALL_COURSES.find(c => c.id === i.value) || {}).semester)")
        chk(len(sems) > 3 and set(sems) == {3}, f'only subjects of my semester are listed ({len(sems)})')
        pg.evaluate("document.querySelectorAll('#notifyPrefs input[name=course]').forEach(i => { i.checked = i.value === 'medical-immunology'; })")
        pg.uncheck('#notifyPrefs input[value=announcement]')
        pg.click('#notifyPrefs button[type=submit]'); pg.wait_for_selector('#notifyPrefs', state='hidden', timeout=5000)
        chk(pg.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('ms.push.prefs')))") == json.dumps({"announcement": False, "courses": ["medical-immunology"]}, separators=(',', ':')), 'prefs saved on the device')

        before = len(pushlog())
        post('api/link', {'courseId': 'medical-immunology', 'number': 2, 'type': 'lecture', 'title': 'Innate', 'label': 'Slides', 'url': 'https://example.com/a'}, {'x-upload-code': 'test-code-sara'})
        chk([g['endpoint'] for g in pushlog()[before:]] == ['https://push.test/prefs3'], 'chosen subject: lecture delivered')
        before = len(pushlog())
        other = pg.evaluate("MS.ALL_COURSES.find(c => c.semester === 3 && c.id !== 'medical-immunology').id")
        post('api/link', {'courseId': other, 'number': 1, 'type': 'lecture', 'title': 'X', 'label': 'Slides', 'url': 'https://example.com/b'}, {'x-upload-code': 'test-code-sara'})
        chk(len(pushlog()) == before, 'other subject: not delivered')
        before = len(pushlog())
        post('api/link', {'courseId': 'medical-immunology', 'number': 2, 'type': 'lecture', 'title': 'Innate', 'label': 'Summary', 'url': 'https://example.com/c'}, {'x-upload-code': 'test-code-sara'})
        chk(len(pushlog()) == before, 'second file for the same lecture: no duplicate notification')
        adm = b.new_context(); ap = adm.new_page(); ap.goto(BASE + 'index.html')
        ap.evaluate("""async () => { const t = await (await fetch('/__test/token?email=boss%40x.com&sub=sub-boss&name=Boss')).text();
            await fetch('/api/auth/google', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({credential: t})}); }""")
        before = len(pushlog())
        r = ap.evaluate("fetch('/api/announcements', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({title: 'x', body: ''})}).then(r => r.json())")
        chk(len(pushlog()) == before and r.get('reach') == 0, f'announcements turned off: not delivered, sender sees reach 0 ({r.get("reach")})')

        # dialog reopens with the saved choices
        pg.click('.sb-push .push-prefs'); pg.wait_for_selector('#notifyPrefs[open]')
        chk(pg.locator('#notifyPrefs input[value=announcement]').is_checked() is False and pg.locator('#notifyPrefs input[value=some]').is_checked(), 'dialog shows saved choices')
        pg.click('#notifyPrefs .btn-secondary')

        # real sw.js: deliver a push and read the notification Chromium created
        # the default headless shell has no notification support; full Chromium in new-headless mode does
        b2 = p.chromium.launch(channel='chromium')
        ctx2 = b2.new_context(); ctx2.grant_permissions(['notifications'], origin=BASE.rstrip('/'))
        ctx2.route('https://fonts.googleapis.com/**', lambda r: r.abort()); ctx2.add_init_script("localStorage.setItem('ms.sem', '3');")
        p2 = ctx2.new_page(); p2.goto(BASE + 'index.html'); p2.wait_for_timeout(800)
        p2.evaluate("navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready)")
        cdp = ctx2.new_cdp_session(p2); regs = []
        cdp.on('ServiceWorker.workerRegistrationUpdated', lambda e: regs.extend(e['registrations']))
        cdp.send('ServiceWorker.enable'); p2.wait_for_timeout(800)
        rid = next((r['registrationId'] for r in regs if r['scopeURL'].startswith(BASE)), None)
        chk(rid is not None, 'service worker registered')
        payload = {"title": "محاضرة جديدة · المناعة الطبية", "body": "المحاضرة 4: Kidney", "url": "course.html?id=medical-immunology#lec-4", "tag": "course-medical-immunology",
                   "category": "lecture", "ts": 1800000000000, "actions": [{"action": "open", "title": "افتح المحاضرة", "url": "course.html?id=medical-immunology#lec-4"}, {"action": "file", "title": "افتح الملف", "url": "api/file/abc"}]}
        cdp.send('ServiceWorker.deliverPushMessage', {'origin': BASE.rstrip('/'), 'registrationId': rid, 'data': json.dumps(payload, ensure_ascii=False)})
        p2.wait_for_timeout(1200)
        shown = p2.evaluate("""navigator.serviceWorker.ready.then(r => r.getNotifications()).then(ns => ns.map(x => ({title: x.title, body: x.body, tag: x.tag, badge: x.badge, icon: x.icon, dir: x.dir, actions: (x.actions || []).map(a => a.title), url: x.data && x.data.url})))""")
        chk(len(shown) == 1 and shown[0]['title'] == payload['title'] and shown[0]['body'] == payload['body'], f'real Chromium notification shown {shown}')
        if shown:
            s = shown[0]
            chk(s['tag'] == 'course-medical-immunology' and s['badge'].endswith('/assets/notify-badge.png') and s['icon'].endswith('/assets/icon-192.png') and s['dir'] == 'rtl', 'tag, badge, icon, RTL')
            chk(s['actions'] == ['افتح المحاضرة', 'افتح الملف'] and s['url'].endswith('#lec-4'), f'action buttons and lecture link {s["actions"]}')
        payload2 = dict(payload, title="محاضرات جديدة · المناعة الطبية", body="المحاضرات 4 و5")
        cdp.send('ServiceWorker.deliverPushMessage', {'origin': BASE.rstrip('/'), 'registrationId': rid, 'data': json.dumps(payload2, ensure_ascii=False)})
        p2.wait_for_timeout(1200)
        shown = p2.evaluate("navigator.serviceWorker.ready.then(r => r.getNotifications()).then(ns => ns.map(x => x.body))")
        chk(shown == ['المحاضرات 4 و5'], f'same subject: the grouped notice replaces the first, not a second one {shown}')

        # course page opens the lecture when only the hash changes (tap while the page is open)
        p2.goto(BASE + 'course.html?id=medical-immunology'); p2.wait_for_timeout(1000)
        p2.evaluate("location.hash = '#lec-1'"); p2.wait_for_timeout(300)
        chk(p2.evaluate("(document.getElementById('lec-1') || {}).open === true"), 'hash change opens the lecture')
        chk(not errs, f'no JS errors {errs[:2]}')
        b2.close(); b.close()
finally:
    srv.terminate()
print('STEP52 NOTIFY FAILED' if fails else f'STEP52 NOTIFY OK: {n} checks')
sys.exit(1 if fails else 0)
