# python3 -I tests/upload_e2e.py — فحص صفحة الرفع من المتصفح: الدخول، رفع ملف كبير على قطع، ظهوره في المادة، الحذف
# يشغّل tests/dev_server.mjs (دالة الرفع بمخزن في الذاكرة) ويقدّم مجلد site.
import os, sys, subprocess, time, tempfile
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 8773
BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', os.path.join(HERE, 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
fails = []; passes = 0
def chk(c, m):
    global passes
    if c: passes += 1
    else: fails.append(m); print('FAIL', m)

tmp = tempfile.mkdtemp()
pdf = os.path.join(tmp, 'Big_Lecture-Slides.pdf')
size = 5 * 1024 * 1024 + 777
with open(pdf, 'wb') as f:
    f.write(b'%PDF-1.7\n' + os.urandom(size - 9))
txt = os.path.join(tmp, 'notes.txt')
with open(txt, 'w') as f: f.write('not a pdf')

try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        p = ctx.new_page(); errs = []
        p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(BASE + 'upload.html'); p.wait_for_timeout(500)

        # الدخول
        chk(p.locator('#appArea').is_hidden(), 'النموذج مخفي قبل الدخول')
        p.fill('#code', 'wrong-code-123'); p.click('#loginBtn'); p.wait_for_timeout(500)
        chk(p.locator('#loginMsg').is_visible(), 'رسالة خطأ للرمز الخاطئ')
        p.fill('#code', 'test-code-sara'); p.click('#loginBtn'); p.wait_for_timeout(700)
        chk(p.locator('#appArea').is_visible(), 'يظهر النموذج بعد الرمز الصحيح')
        chk('سارة' in p.inner_text('#who'), 'يظهر اسم المشرفة')
        chk(p.evaluate('document.documentElement.scrollWidth') <= 390, 'لا تمرير أفقي على الهاتف')

        # التحقق الأولي في المتصفح
        p.click('#send'); p.wait_for_timeout(200)
        chk(p.locator('#formMsg').is_visible(), 'يمنع الرفع بحقول ناقصة')
        p.select_option('#course', 'medical-immunology'); p.fill('#number', '2')
        p.fill('#title', 'Innate Immunity')
        p.set_input_files('#file', txt); p.click('#send'); p.wait_for_timeout(300)
        chk('PDF' in p.inner_text('#formMsg'), 'يرفض ملفاً ليس PDF')

        # رفع ملف 5 ميغا على قطع
        p.set_input_files('#file', pdf); p.wait_for_timeout(200)
        chk(p.input_value('#label') == 'Big Lecture Slides', 'الاسم الظاهر يؤخذ من اسم الملف: ' + p.input_value('#label'))
        p.click('#send')
        p.wait_for_selector('#formMsg.is-ok', timeout=30000)
        chk('تم رفع الملف' in p.inner_text('#formMsg'), 'رسالة نجاح')
        p.wait_for_timeout(500)
        chk(p.locator('#list .up-item').count() == 1, 'يظهر الملف في قائمة المرفوعات')

        # ظهوره في صفحة المادة (محاضرة جديدة رقم 2 أو إضافة إلى موجودة)
        p2 = ctx.new_page(); p2.on('pageerror', lambda e: errs.append(str(e)))
        p2.goto(BASE + 'course.html?id=medical-immunology'); p2.wait_for_timeout(900)
        link = p2.locator('a.file-link', has_text='Big Lecture Slides')
        chk(link.count() == 1, 'الملف المرفوع يظهر في صفحة المادة')
        url = p2.evaluate("""() => { var a=[].slice.call(document.querySelectorAll('a.file-link')).filter(x=>x.textContent.indexOf('Big Lecture Slides')>-1)[0]; return a.getAttribute('href'); }""")
        chk(url.startswith('api/file/'), 'الرابط من مسار الرفع: ' + url)
        info = p2.evaluate("""async (u) => { var r = await fetch(u); var b = await r.arrayBuffer(); var h = await fetch(u, {method:'HEAD'}); return [r.status, r.headers.get('content-type'), b.byteLength, h.status]; }""", url)
        chk(info[0] == 200 and info[1] == 'application/pdf' and info[2] == size and info[3] == 200, f'الملف يُقرأ كاملاً: {info}')
        link.first.locator('xpath=ancestor::details[1]/summary').click()  # المحاضرات مطويّة افتراضياً
        link.first.click(); p2.wait_for_timeout(600)
        chk(p2.locator('#viewerFrame').get_attribute('src') not in (None, '', 'about:blank'), 'يفتح في العارض')
        p2.close()

        # الصفحة الرئيسية تعمل وتحسب الملف
        p3 = ctx.new_page(); p3.on('pageerror', lambda e: errs.append(str(e)))
        p3.goto(BASE + 'index.html'); p3.wait_for_timeout(900)
        chk(p3.locator('#semGrid .quick-item').count() > 0, 'الرئيسية تعرض بطاقات الكورسات')
        chk('Big Lecture Slides' in p3.inner_text('#latestList') or 'Innate Immunity' in p3.inner_text('body'), 'الملف المرفوع يظهر في الرئيسية')
        p3.close()

        # الحذف
        p.once('dialog', lambda d: d.accept())
        p.click('#list .up-del'); p.wait_for_timeout(800)
        chk(p.locator('#list .up-item').count() == 0, 'الحذف يفرغ القائمة')
        p4 = ctx.new_page(); p4.goto(BASE + 'course.html?id=medical-immunology'); p4.wait_for_timeout(700)
        chk(p4.locator('a.file-link', has_text='Big Lecture Slides').count() == 0, 'الملف المحذوف يختفي من المادة')
        p4.close()

        # خروج
        p.click('#logout')
        chk(p.locator('#loginCard').is_visible(), 'الخروج يعيد شاشة الدخول')
        chk(not errs, 'لا أخطاء جافاسكربت: ' + str(errs))
        b.close()
finally:
    srv.terminate()

print(f'{passes} passed, {len(fails)} failed' if fails else f'upload e2e OK: {passes} checks')
sys.exit(1 if fails else 0)
