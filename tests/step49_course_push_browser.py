# python3 -I tests/step49_course_push_browser.py — Step 49: «كورسي» + Web Push, headless Chromium + simulated server.
# The browser's push service is stubbed (no network): PushManager.subscribe returns a subscription with real P-256 keys
# generated in the page, and the dev server captures what the site would send to https://push.test/... .
# Real Apple/Google push delivery and real devices are NOT exercised here.
import subprocess, time, os, sys, json, urllib.request
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PORT = 8802; BASE = f'http://localhost:{PORT}/'
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
STUB = """(() => {
  const name = %s;
  // like a real browser, the subscription survives reloads (kept in localStorage for the stub)
  const wrap = j => j && {endpoint: j.endpoint, toJSON: () => j, unsubscribe: async () => { localStorage.removeItem('stub.sub'); return true; }};
  let current = wrap(JSON.parse(localStorage.getItem('stub.sub') || 'null'));
  const make = async () => {
    const kp = await crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, true, ['deriveBits']);
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    const b = a => btoa(String.fromCharCode(...a)).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
    const j = {endpoint: 'https://push.test/' + name, expirationTime: null, keys: {p256dh: b(raw), auth: b(crypto.getRandomValues(new Uint8Array(16)))}};
    localStorage.setItem('stub.sub', JSON.stringify(j));
    return wrap(j);
  };
  Object.defineProperty(Notification, 'permission', {get: () => localStorage.getItem('stub.perm') || 'default', configurable: true});
  Notification.requestPermission = async () => { localStorage.setItem('stub.perm', 'granted'); return 'granted'; };
  PushManager.prototype.subscribe = async function () { current = current || await make(); return current; };
  PushManager.prototype.getSubscription = async function () { current = wrap(JSON.parse(localStorage.getItem('stub.sub') || 'null')); return current; };
})();"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort()); ctx.route('https://accounts.google.com/**', lambda r: r.abort())
        ctx.add_init_script(STUB % json.dumps('student3'))
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))

        # 1. first visit: choose the semester, land on its page
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(1200)
        chk(pg.locator('#myCourseDialog[open]').count() == 1, 'first visit asks for the semester')
        pg.click('#myCourseDialog .mc-option[data-sem="3"]'); pg.wait_for_url('**/semester.html?id=3', timeout=5000); pg.wait_for_timeout(800)
        chk(pg.evaluate("JSON.parse(localStorage.getItem('ms.sem'))") == 3, 'ms.sem saved')
        chk('الكورس الثالث' in pg.locator('.mc-change').text_content(), 'sidebar shows my semester')
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(1000)
        chk(pg.locator('#myCourseDialog[open]').count() == 0, 'not asked again once chosen')
        chk(pg.locator('.semester-tile.is-current').count() == 1 and '03' in pg.locator('.semester-tile.is-current').inner_text(), 'home marks semester 3 as current')

        # 2. notifications on (semester 3)
        chk(pg.locator('.sb-push').is_visible(), 'notifications row visible when the server has keys')
        pg.click('.sb-push .push-btn'); pg.wait_for_function("document.querySelector('.sb-push').getAttribute('data-state') === 'on'", timeout=8000)
        chk('إيقاف الإشعارات' in pg.locator('.sb-push .push-btn').inner_text(), 'button switches to turn off')

        # second student, semester 2
        ctx2 = b.new_context(); ctx2.route('https://fonts.googleapis.com/**', lambda r: r.abort()); ctx2.add_init_script(STUB % json.dumps('student2'))
        p2 = ctx2.new_page(); p2.goto(BASE + 'index.html'); p2.wait_for_timeout(1000)
        p2.click('#myCourseDialog .mc-option[data-sem="2"]'); p2.wait_for_url('**/semester.html?id=2'); p2.wait_for_timeout(800)
        p2.click('.sb-push .push-btn'); p2.wait_for_function("document.querySelector('.sb-push').getAttribute('data-state') === 'on'", timeout=8000)

        # 3. new lecture for a semester-3 course -> only student3
        before = len(pushlog())
        st = post('api/link', {'courseId': 'medical-immunology', 'number': 2, 'type': 'lecture', 'title': 'Innate immunity', 'label': 'Slides', 'url': 'https://example.com/l2'}, {'x-upload-code': 'test-code-sara', 'origin': BASE.rstrip('/')})
        chk(st == 200, f'lecture link uploaded ({st})')
        got = pushlog()[before:]
        chk([g['endpoint'] for g in got] == ['https://push.test/student3'], f'lecture notification only to semester 3: {[g["endpoint"] for g in got]}')
        chk(got and got[0]['headers'].get('content-encoding') == 'aes128gcm', 'encrypted push request')

        # 4. student3 changes to semester 2 -> next semester-3 lecture reaches nobody, semester-2 lecture reaches both
        pg.click('.mc-change'); pg.click('#myCourseDialog .mc-option[data-sem="2"]'); pg.wait_for_timeout(1200)
        chk(pg.evaluate("JSON.parse(localStorage.getItem('ms.sem'))") == 2, 'semester changed from the sidebar')
        before = len(pushlog())
        post('api/link', {'courseId': 'medical-immunology', 'number': 3, 'type': 'lecture', 'title': 'Adaptive', 'label': 'Slides', 'url': 'https://example.com/l3'}, {'x-upload-code': 'test-code-sara'})
        chk(len(pushlog()) == before, 'after changing semester, semester-3 lecture is not sent to them')
        sem2 = [c for c in ['anatomy-digestive'] ][0]
        post('api/link', {'courseId': sem2, 'number': 1, 'type': 'lecture', 'title': 'Stomach', 'label': 'Slides', 'url': 'https://example.com/s1'}, {'x-upload-code': 'test-code-sara'})
        chk(sorted(g['endpoint'] for g in pushlog()[before:]) == ['https://push.test/student2', 'https://push.test/student3'], 'semester-2 lecture reaches both semester-2 students')
        # old upload hidden from latest -> no notification
        before = len(pushlog())
        post('api/link', {'courseId': sem2, 'number': 2, 'type': 'lecture', 'title': 'Old', 'label': 'Old', 'url': 'https://example.com/s2', 'showInLatest': False}, {'x-upload-code': 'test-code-sara'})
        chk(len(pushlog()) == before, 'upload hidden from latest lectures sends no notification')

        # 5. announcement -> everyone
        adm = b.new_context(); ap = adm.new_page(); ap.goto(BASE + 'index.html')
        ap.evaluate("""async () => { const t = await (await fetch('/__test/token?email=boss%40x.com&sub=sub-boss&name=Boss')).text();
            await fetch('/api/auth/google', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({credential: t})}); }""")
        before = len(pushlog())
        st = ap.evaluate("fetch('/api/announcements', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({title: 'امتحان المناعة', body: 'الأحد'})}).then(r => r.status)")
        chk(st == 200, 'announcement published')
        chk(sorted(g['endpoint'] for g in pushlog()[before:]) == ['https://push.test/student2', 'https://push.test/student3'], 'announcement reaches all subscribers')

        # 6. turn off
        pg.click('.sb-push .push-btn'); pg.wait_for_function("document.querySelector('.sb-push').getAttribute('data-state') === 'off'", timeout=8000)
        before = len(pushlog())
        ap.evaluate("fetch('/api/announcements', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({title: 'ثاني', body: ''})})"); ap.wait_for_timeout(500)
        chk([g['endpoint'] for g in pushlog()[before:]] == ['https://push.test/student2'], 'turned-off device no longer receives')
        chk(not errs, f'no JS errors {errs[:2]}')

        # 7. iPhone outside the home screen: explains how to enable
        ios = b.new_context(user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', viewport={'width': 390, 'height': 844})
        ios.add_init_script("delete window.PushManager; localStorage.setItem('ms.sem', '3');")
        ip = ios.new_page(); ip.goto(BASE + 'index.html'); ip.wait_for_timeout(1200)
        chk(ip.locator('.sb-push').get_attribute('data-state') == 'ios', 'iPhone in Safari: home-screen instructions state')
        chk('الشاشة الرئيسية' in ip.locator('.sb-push .push-note').text_content(), 'instructions mention Add to Home Screen')
        b.close()
finally:
    srv.terminate()
print('STEP49 COURSE PUSH FAILED' if fails else f'STEP49 COURSE PUSH OK: {n} checks')
sys.exit(1 if fails else 0)
