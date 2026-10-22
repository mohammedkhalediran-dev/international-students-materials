# python3 -I tests/step63_pdf_sync_browser.py — Step 63: كتابة الطالب وتظليله وبطاقاته على PDF تُحفظ في حسابه وتظهر على جهاز ثانٍ.
# جهازان (سياقان منفصلان) بحساب واحد وهمي: رفع، تنزيل على جهاز جديد، تعارض ثم دمج بلا ضياع، حذف ينتشر، زائر لا يرفع شيئاً.
# يحتاج MEDIXA_CDN_DIR (pdf.js محلي) كباقي فحوص القارئ.
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import guest_mode  # noqa: E402,F401 — يضع ms.guest
import subprocess, time, os, sys, json, urllib.parse
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CDN = os.environ.get('MEDIXA_CDN_DIR')
if not CDN:
    print('SKIP: MEDIXA_CDN_DIR not set (needs local pdf.js)'); sys.exit(0)
PORT = 8863; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
PDF = 'files/المناعة-الطبية/المحاضرة-1-Overview-of-the-Immune-System.pdf'
URL = BASE + 'pdf-notes.html?file=' + urllib.parse.quote(PDF)
ABS = BASE + urllib.parse.quote(PDF)
INK = 'medixa.pdf.annotations.v1:' + ABS
STUDY = 'medixa.study.v1:' + ABS
FILES = {'pdf.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.worker.min.js', 'pdf-lib.min.js': 'pdf-lib-1.17.1/package/dist/pdf-lib.min.js'}
LOGIN = """async ([email, sub, name]) => { const t = await (await fetch('/__test/token?email=' + encodeURIComponent(email) + '&sub=' + sub + '&name=' + encodeURIComponent(name))).text();
  return (await fetch('/api/auth/google', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({credential: t})})).status; }"""
def cdn(route):
    name = route.request.url.split('/')[-1].split('?')[0]
    if name in FILES: route.fulfill(path=os.path.join(CDN, FILES[name]), content_type='application/javascript')
    else: route.abort()
def device(b, login=True):
    c = b.new_context(viewport={'width': 1280, 'height': 900}, service_workers='block')
    c.route('https://fonts.googleapis.com/**', lambda r: r.abort()); c.route('**/cdnjs.cloudflare.com/**', cdn)
    p = c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    navs = []; p.on('framenavigated', lambda f: navs.append(f.url) if f == p.main_frame else None)
    if login: p.goto(BASE + 'index.html'); chk(p.evaluate(LOGIN, ['alpha@x.com', 'sub-a', 'Alpha']) == 200, 'sign in')
    return c, p, errs, navs
def stroke(i, page): return {'id': f'T{i}', 'v': 2, 'rev': 1, 'page': page, 'tool': 'pen', 'points': [[0.1, 0.1 + i / 100], [0.5, 0.5]], 'color': '#e43d56', 'width': 3}
def draw(p, i, page):
    p.evaluate("s => { MedixaStudio.addItem(s); MedixaStudio.markDirty(); }", stroke(i, page))
def ids(p): return sorted(p.evaluate("() => MedixaStudio.getItems().map(s => s.id)"))
def open_doc(p):
    p.goto(URL); p.wait_for_function("window.MedixaStudio && MedixaStudio.S && MedixaStudio.S.state !== undefined && document.querySelectorAll('.page').length > 0", timeout=20000)
    p.wait_for_function("window.MedixaPdfSync", timeout=10000); p.wait_for_timeout(1500)
def settle(p):   # بعد إعادة تحميل الدمج
    p.wait_for_timeout(3500); p.wait_for_function("window.MedixaStudio && document.querySelectorAll('.page').length > 0", timeout=20000); p.wait_for_function("window.MedixaPdfSync", timeout=10000); p.wait_for_timeout(1200)
def server_rows(p, doc):
    return p.evaluate("async d => (await (await fetch('/api/pdfnotes?doc=' + d, {cache: 'no-store'})).json()).rows", doc)
def state(p): return p.evaluate("() => document.getElementById('acct-sync') && document.getElementById('acct-sync').dataset.state")
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        # --- الجهاز أ: يكتب ويحفظ
        ca, A, ea, na = device(b); open_doc(A)
        doc = A.evaluate("MedixaPdfSync.doc"); chk(len(doc) == 24, 'doc id is 24 hex')
        draw(A, 1, 1); draw(A, 2, 1); draw(A, 3, 2)
        A.evaluate("MedixaStudyStore.addCard({question: 'What is X?', answer: 'Y', page: 1})")
        A.wait_for_timeout(800); A.evaluate("MedixaPdfSync.tick()"); A.wait_for_timeout(1500)
        rows = server_rows(A, doc); keys = sorted(r['k'] for r in rows)
        chk(keys == ['ink:1', 'ink:2', 'study'], f'server holds per-page rows: {keys}')
        chk(state(A) == 'saved', f'badge says saved: {state(A)}')
        chk(len(json.loads([r for r in rows if r['k'] == 'ink:1'][0]['d'])) == 2, 'page 1 row has 2 strokes')
        # --- الجهاز ب (جديد): يجد كل شيء بعد فتح الصفحة
        cb, B, eb, nb = device(b); open_doc(B); settle(B)
        chk(ids(B) == ['T1', 'T2', 'T3'], f'new device received strokes: {ids(B)}')
        chk(B.evaluate("MedixaStudyStore.cards.length") == 1, 'new device received the flashcard')
        chk(len([u for u in nb if 'pdf-notes' in u]) <= 2, f'page reloaded at most once: {len(nb)} navigations')
        chk(state(B) == 'saved', f'device B badge: {state(B)}')
        # --- تعارض: كلاهما يكتب على الصفحة 1
        draw(B, 4, 1); draw(B, 5, 2); B.evaluate("MedixaPdfSync.tick()"); B.wait_for_timeout(1500)
        draw(A, 6, 1); A.evaluate("MedixaPdfSync.tick()"); A.wait_for_timeout(1500)
        chk(state(A) == 'conflict', f'device A is told about the conflict: {state(A)}')
        chk('T6' in ids(A) and 'T4' not in ids(A), 'device A keeps its own strokes untouched while the page is open')
        A.locator('#acct-sync button').click(); settle(A)
        chk(ids(A) == ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'], f'merge keeps everything from both devices: {ids(A)}')
        A.wait_for_timeout(500); A.evaluate("MedixaPdfSync.tick()"); A.wait_for_timeout(1000)
        r1 = [r for r in server_rows(A, doc) if r['k'] == 'ink:1'][0]
        chk(sorted(s['id'] for s in json.loads(r1['d'])) == ['T1', 'T2', 'T4', 'T6'], 'merged page 1 uploaded to the account')
        chk(state(A) == 'saved', f'badge saved after merge: {state(A)}')
        # --- الجهاز ب يرى كتابة أ بعد إعادة التحميل، ثم حذف ينتشر
        B.reload(); settle(B)
        chk(ids(B) == ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'], f'device B sees A strokes after reload: {ids(B)}')
        B.evaluate("() => { MedixaStudio.removeItems(['T2']); MedixaStudio.markDirty(); }"); B.wait_for_timeout(800)
        B.evaluate("MedixaPdfSync.tick()"); B.wait_for_timeout(1500)
        A.reload(); settle(A)
        chk('T2' not in ids(A) and len(ids(A)) == 5, f'deletion on B reached A: {ids(A)}')
        # --- لا يتكرر التحميل، ولا أخطاء
        before = len(na); A.wait_for_timeout(8000)
        chk(len(na) == before, 'no reload loop while idle')
        chk(not ea and not eb, 'no page errors: ' + '; '.join(ea + eb))
        # --- بيانات تالفة محلياً لا يُكتب فوقها
        cc, C, ec, nc = device(b); open_doc(C)
        C.evaluate("(k) => localStorage.setItem(k, '{broken json')", INK); C.reload(); C.wait_for_timeout(5000)
        chk(C.evaluate("(k) => localStorage.getItem(k)", INK) == '{broken json', 'corrupt local data is never overwritten by the sync')
        # --- زائر: لا رفع، والملاحظات محلية
        cg, G, eg, ng = device(b, login=False); open_doc(G); G.wait_for_timeout(1000)
        chk(state(G) == 'guest', f'guest sees the sign-in hint: {state(G)}')
        chk(G.locator('#acct-sync a[href^="login.html"]').count() == 1, 'guest badge links to login')
        draw(G, 9, 1); G.wait_for_timeout(500); G.evaluate("MedixaPdfSync.tick()"); G.wait_for_timeout(500)
        chk(G.evaluate("(k) => JSON.parse(localStorage.getItem(k) || '[]').length", INK) == 1, 'guest strokes stay on the device')
        chk(G.evaluate("fetch('/api/pdfnotes?doc=' + MedixaPdfSync.doc).then(r => r.status)") == 401, 'guest API refused')
        b.close()
finally:
    srv.terminate()
print(('STEP63 PDF SYNC FAILED (%d failed of %d)' % (len(fails), n)) if fails else 'STEP63 PDF SYNC OK: %d checks' % n)
raise SystemExit(1 if fails else 0)
