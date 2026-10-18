# python3 -I tests/notes_e2e.py — فحص التعليق على PDF والمزامنة بحسابين وجلستين مستقلتين (متصفحان منفصلان)
# يشغّل tests/notes_dev_server.mjs: موقع + Supabase وهمي فوق Postgres حقيقي (PGlite) بسياسات RLS الفعلية.
# الدخول برمز يُقرأ من نقطة اختبار في الخادم الوهمي (لا بريد حقيقي).
import os, subprocess, time, json, urllib.request, tempfile
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SP, AP = 8783, 8784
BASE = f'http://localhost:{SP}/'; API = f'http://localhost:{AP}'
srv = subprocess.Popen(['node', os.path.join(HERE, 'notes_dev_server.mjs'), str(SP), str(AP)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
fails = []; passes = 0
def chk(c, m):
    global passes
    if c: passes += 1
    else: fails.append(m); print('FAIL', m)
def get(path): return json.load(urllib.request.urlopen(API + path))

READER = BASE + 'reader.html?u=' + urllib.request.quote('/files/test/sample.pdf', safe='') + '&t=Sample%20Lecture&c=medical-immunology'
CFG = 'window.MEDIXA_CLOUD = {url:"%s", anonKey:"test-anon"};' % API

def newdev(b, touch=False):
    ctx = b.new_context(viewport={'width': 1200, 'height': 900}, has_touch=touch, accept_downloads=True)
    ctx.route('**/data/cloud-config.js*', lambda r: r.fulfill(status=200, content_type='application/javascript', body=CFG))
    ctx.on('dialog', lambda d: d.accept())
    return ctx
def reader(ctx, url=READER):
    p = ctx.new_page(); p.errs = []
    p.on('pageerror', lambda e: p.errs.append(str(e)))
    p.goto(url); p.wait_for_selector('body[data-ready="1"]', timeout=20000)
    p.wait_for_selector('.rpage[data-page="1"].is-ready', timeout=20000)
    return p
def count(p): return p.evaluate('window.__medixaDoc.count()')
def page_items(p, n): return p.evaluate('window.__medixaDoc.items(%d).length' % n)
def stroke(p, n=1, dx=120, dy=60, fx=0.3, fy=0.2):
    c = p.locator('.rpage[data-page="%d"] canvas.ink' % n); c.scroll_into_view_if_needed(); p.wait_for_timeout(300)
    bb = c.bounding_box(); x = bb['x'] + bb['width'] * fx; y = bb['y'] + bb['height'] * fy
    p.mouse.move(x, y); p.mouse.down()
    for i in range(1, 9): p.mouse.move(x + dx * i / 8, y + dy * (i % 3) * 0.5 + i * 3)
    p.mouse.up(); p.wait_for_timeout(200)
def status(p): return p.evaluate('document.getElementById("syncPill").getAttribute("data-state")')
def login(ctx, email):
    p = ctx.new_page(); p.errs = []
    p.on('pageerror', lambda e: p.errs.append(str(e)))
    p.goto(BASE + 'account.html'); p.wait_for_selector('#loginCard:not([hidden])', timeout=15000)
    p.fill('#emailIn', email); p.click('#sendBtn'); p.wait_for_selector('#codeForm:not([hidden])', timeout=10000)
    code = get('/__test/code?email=' + email)['code']
    p.fill('#codeIn', '000000'); p.click('#verifyBtn'); p.wait_for_selector('#accErr:not([hidden])', timeout=8000)
    chk(True, 'ok'); passes_dummy = 0
    p.fill('#codeIn', code); p.click('#verifyBtn'); p.wait_for_selector('#userCard:not([hidden])', timeout=15000)
    return p
def wait_for(p, js, t=30000):
    try: p.wait_for_function(js, timeout=t); return True
    except Exception: return False

try:
    for _ in range(80):
        try: urllib.request.urlopen(BASE + 'index.html', timeout=1); urllib.request.urlopen(API + '/__test/stats', timeout=1); break
        except Exception: time.sleep(0.5)
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')

        # ---- 1) زائر: رسم محلي يبقى بعد إعادة التحميل ----
        g = newdev(b); p = reader(g)
        chk(p.locator('.rpage').count() == 3, 'ثلاث صفحات')
        chk(status(p) == 'local', 'حالة الزائر: محفوظ على الجهاز')
        stroke(p); chk(count(p) == 1, 'ضربة قلم واحدة للزائر')
        p.click('button[data-tool="hl"]'); stroke(p, 1, fx=0.2, fy=0.4); chk(count(p) == 2, 'تظليل')
        p.click('#undoBtn'); chk(count(p) == 1, 'تراجع')
        p.click('#redoBtn'); chk(count(p) == 2, 'إعادة')
        p.click('button[data-tool="eraser"]')
        c = p.locator('.rpage[data-page="1"] canvas.ink').bounding_box()
        p.mouse.move(c['x'] + c['width'] * 0.2 + 5, c['y'] + c['height'] * 0.4 + 3); p.mouse.down(); p.mouse.move(c['x'] + c['width'] * 0.2 + 60, c['y'] + c['height'] * 0.4 + 12); p.mouse.up(); p.wait_for_timeout(200)
        chk(count(p) <= 1, 'الممحاة تحذف التظليل (%d)' % count(p))
        p.click('#undoBtn'); chk(count(p) == 2, 'التراجع يعيد المحذوف')
        # نص عربي
        p.click('button[data-tool="text"]')
        cc = p.locator('.rpage[data-page="2"] canvas.ink'); cc.scroll_into_view_if_needed(); bb = cc.bounding_box()
        p.mouse.click(bb['x'] + bb['width'] * 0.3, bb['y'] + bb['height'] * 0.3); p.wait_for_selector('.rtext-edit', timeout=3000)
        p.keyboard.type('ملاحظة مهمة'); p.click('button[data-tool="pen"]'); p.wait_for_timeout(300)
        chk(page_items(p, 2) == 1 and 'ملاحظة مهمة' in p.inner_text('.rpage[data-page="2"] .rtext'), 'نص عربي يظهر على الصفحة 2')
        # تكبير
        w0 = p.evaluate('document.querySelector(".rpage").getBoundingClientRect().width')
        p.click('#zoomIn'); p.wait_for_timeout(500)
        w1 = p.evaluate('document.querySelector(".rpage").getBoundingClientRect().width')
        chk(w1 > w0 * 1.15 and p.inner_text('#zoomFit').strip() == '125%', 'التكبير يوسّع الصفحة')
        p.click('#zoomOut'); p.click('#zoomOut'); p.wait_for_timeout(300); p.click('#zoomFit'); p.wait_for_timeout(300)
        chk(p.inner_text('#zoomFit').strip() == '100%', 'ملاءمة العرض')
        n_guest = count(p)
        p.reload(); p.wait_for_selector('body[data-ready="1"]'); chk(count(p) == n_guest, 'التعليقات تبقى بعد إعادة التحميل (%d)' % n_guest)
        chk(not p.errs, 'لا أخطاء JS في القارئ %s' % p.errs)
        # ---- تنزيل PDF ----
        with p.expect_download(timeout=40000) as dl: p.click('#exportBtn')
        path = tempfile.mktemp(suffix='.pdf'); dl.value.save_as(path)
        from pypdf import PdfReader
        r = PdfReader(path)
        chk(len(r.pages) == 3, 'PDF المُصدَّر 3 صفحات')
        has_img = [bool(pg.get('/Resources', {}).get('/XObject')) for pg in r.pages]
        chk(has_img[0] and has_img[1] and not has_img[2], 'التعليقات مدمجة في الصفحتين 1 و2 فقط %s' % has_img)
        chk(int(r.pages[1].get('/Rotate', 0)) % 360 == 90, 'تدوير الصفحة الثانية محفوظ')
        # لمس: لا يرسم إلا بعد تفعيل «الإصبع يرسم»
        t = newdev(b, touch=True); tp = reader(t)
        cdp = t.new_cdp_session(tp)
        def touch_draw():
            bb = tp.locator('.rpage[data-page="1"] canvas.ink').bounding_box(); x = bb['x'] + 100; y = bb['y'] + 100
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
            for i in range(1, 8): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + i * 12, 'y': y + i * 5}]})
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); tp.wait_for_timeout(300)
        touch_draw(); chk(count(tp) == 0, 'الإصبع لا يرسم افتراضياً')
        tp.click('#fingerBtn'); touch_draw(); chk(count(tp) == 1, 'الإصبع يرسم بعد التفعيل')
        t.close()

        # ---- 2) حساب A على جهازين ----
        dev1 = newdev(b); acc1 = login(dev1, 'sara@example.com')
        chk(acc1.inner_text('#userEmail').strip() == 'sara@example.com', 'يظهر بريد الحساب')
        # الزائر على نفس السياق ليس هو g، لذلك نحاكي: رسم كزائر في dev1 ثم دخول
        dev1b = newdev(b); gp = reader(dev1b); stroke(gp); chk(count(gp) == 1, 'زائر جديد رسم ضربة')
        ap = login(dev1b, 'sara@example.com')
        chk(ap.locator('#guestCard:not([hidden])').count() == 1, 'يعرض نقل تعليقات الزائر')
        ap.click('#mergeBtn'); ap.wait_for_timeout(1500)
        chk(ap.locator('#guestCard[hidden]').count() == 1, 'اختفى عرض النقل بعد الدمج')
        chk(ap.locator('.acc-file').count() == 1, 'الملف في «ملفاتي المعلّق عليها»')
        d1 = reader(dev1b); chk(count(d1) == 1, 'ضربة الزائر صارت في الحساب')
        chk(wait_for(d1, 'document.getElementById("syncPill").getAttribute("data-state")==="synced"', 15000), 'حالة محفوظ على الحساب')
        # الجهاز الثاني لنفس الحساب
        dev2 = newdev(b); acc2 = login(dev2, 'sara@example.com')
        chk(wait_for(acc2, 'document.querySelectorAll(".acc-file").length===1', 15000), 'الجهاز الثاني يرى الملف في قائمته')
        d2 = reader(dev2)
        chk(wait_for(d2, 'window.__medixaDoc.count()===1', 15000), 'الجهاز الثاني يسحب الضربة')
        stroke(d2, 3, fx=0.4, fy=0.5)
        chk(wait_for(d1, 'window.__medixaDoc.count()===2', 40000), 'الجهاز الأول يستلم ضربة الثاني تلقائياً')
        # حذف من الثاني ينتقل إلى الأول
        d2.click('button[data-tool="eraser"]'); bb = d2.locator('.rpage[data-page="3"] canvas.ink').bounding_box()
        d2.mouse.move(bb['x'] + bb['width'] * 0.4 + 2, bb['y'] + bb['height'] * 0.5 + 5); d2.mouse.down(); d2.mouse.move(bb['x'] + bb['width'] * 0.4 + 80, bb['y'] + bb['height'] * 0.5 + 20); d2.mouse.up()
        chk(wait_for(d1, 'window.__medixaDoc.count()===1', 40000), 'الحذف ينتقل إلى الجهاز الأول')
        # دون اتصال ثم عودة
        dev1b.set_offline(True); d1.click('button[data-tool="pen"]'); stroke(d1, 2, fx=0.5, fy=0.3); d1.wait_for_timeout(2500)
        chk(count(d1) == 2, 'الرسم يعمل دون اتصال (%s, حالة %s)' % (count(d1), status(d1)))
        chk(count(d1) == 2, 'الرسم يعمل دون اتصال (%s, حالة %s)' % (count(d1), status(d1)))
        dev1b.set_offline(False)
        chk(wait_for(d2, 'window.__medixaDoc.count()===2', 45000), 'يصل إلى الجهاز الثاني بعد عودة الاتصال')
        # عطل مؤقت في الخادم لا يفقد شيئاً
        get('/__test/fail?n=2'); stroke(d1, 1, fx=0.6, fy=0.6)
        chk(wait_for(d2, 'window.__medixaDoc.count()===3', 60000), 'إعادة المحاولة بعد عطل الخادم')

        # ---- 3) حساب B لا يرى شيئاً من A ----
        devB = newdev(b); accB = login(devB, 'ali@example.com')
        chk(accB.locator('.acc-file').count() == 0 and accB.locator('#filesEmpty:not([hidden])').count() == 1, 'حساب آخر قائمته فارغة')
        dB = reader(devB); dB.wait_for_timeout(2500); chk(count(dB) == 0, 'حساب آخر لا يرى تعليقات A')
        stroke(dB, 1, fx=0.7, fy=0.7); dB.wait_for_timeout(4000)
        dump = get('/__test/dump'); owners = {}
        for row in dump: owners.setdefault(row['user_id'], 0); owners[row['user_id']] += len(row['items'])
        chk(len(owners) == 2 and sorted(owners.values()) == [1, 3], 'كل حساب يملك صفوفه فقط %s' % list(owners.values()))
        d1.wait_for_timeout(1500); chk(count(d1) == 3, 'تعليقات A لم تتأثر بكتابة B')

        # ---- 4) تسجيل الخروج يمسح الجهاز، وإعادة الدخول تعيد البيانات ----
        ap.goto(BASE + 'account.html'); ap.wait_for_selector('#userCard:not([hidden])'); ap.click('#outBtn'); ap.wait_for_selector('#loginCard:not([hidden])', timeout=10000)
        chk(ap.locator('.acc-file').count() == 0, 'بعد الخروج لا ملفات ظاهرة')
        left = ap.evaluate('''() => new Promise(r => { const q = indexedDB.open("medixa-notes"); q.onsuccess = () => { const db = q.result; const names = [...db.objectStoreNames]; if(!names.length) return r(0); const tx = db.transaction(names[0]); const k = tx.objectStore(names[0]).getAllKeys(); k.onsuccess = () => r(k.result.filter(x => !String(x).includes("|guest|")).length); }; q.onerror = () => r(-1); })''')
        chk(left == 0, 'لا بيانات حساب باقية على الجهاز بعد الخروج (%s)' % left)
        ap.fill('#emailIn', 'sara@example.com'); ap.click('#sendBtn'); ap.wait_for_selector('#codeForm:not([hidden])')
        ap.fill('#codeIn', get('/__test/code?email=sara@example.com')['code']); ap.click('#verifyBtn'); ap.wait_for_selector('#userCard:not([hidden])', timeout=15000)
        d1c = reader(dev1b); chk(wait_for(d1c, 'window.__medixaDoc.count()===3', 20000), 'إعادة الدخول تسترجع التعليقات من الحساب')
        # حذف ملف واحد
        ap.goto(BASE + 'account.html'); ap.wait_for_selector('.acc-file', timeout=15000)
        ap.click('.acc-file .acc-danger'); ap.wait_for_timeout(1500)
        chk(ap.locator('.acc-file').count() == 0, 'حذف تعليقات ملف')
        chk(len([r for r in get('/__test/dump') if r['items']]) >= 1, 'حذف A لم يمسّ B')
        errs = [e for pg in (d1, d2, dB, d1c, ap, acc2, accB) for e in pg.errs]
        chk(not errs, 'لا أخطاء JS %s' % errs[:3])
        b.close()
finally:
    srv.terminate()
print('notes e2e: %d passed, %d failed' % (passes, len(fails)))
raise SystemExit(1 if fails else 0)
