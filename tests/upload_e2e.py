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
pdf = os.path.join(tmp, 'Lecture 2 - Innate Immunity Slides.pdf')
size = 5 * 1024 * 1024 + 777
with open(pdf, 'wb') as f:
    f.write(b'%PDF-1.7\n' + os.urandom(size - 9))
pdf2 = os.path.join(tmp, 'Lecture 2 handout.pdf')
with open(pdf2, 'wb') as f:
    f.write(b'%PDF-1.7\n' + os.urandom(3000))
txt = os.path.join(tmp, 'notes.txt')
with open(txt, 'w') as f: f.write('not a pdf')
CID = 'medical-immunology'

try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        p = ctx.new_page(); errs = []
        p.on('pageerror', lambda e: errs.append(str(e)))
        p.on('dialog', lambda d: d.accept())
        p.goto(BASE + 'upload.html'); p.wait_for_timeout(500)

        chk(p.locator('#appArea').is_hidden(), 'النموذج مخفي قبل الدخول')
        p.fill('#code', 'wrong-code-123'); p.click('#loginBtn'); p.wait_for_timeout(500)
        chk(p.locator('#loginMsg').is_visible(), 'رسالة خطأ للرمز الخاطئ')
        p.fill('#code', 'test-code-sara'); p.click('#loginBtn'); p.wait_for_timeout(700)
        chk(p.locator('#appArea').is_visible(), 'يظهر النموذج بعد الرمز الصحيح')
        chk('سارة' in p.inner_text('#who'), 'يظهر اسم المشرفة')
        chk(p.evaluate('document.documentElement.scrollWidth') <= 390, 'لا تمرير أفقي على الهاتف')
        chk(p.locator('#send').is_disabled(), 'زر الرفع معطل بلا ملفات')

        # بلا مادة: لا تُضاف ملفات
        p.set_input_files('#file', pdf2); p.wait_for_timeout(200)
        chk(p.locator('#queue .up-row').count() == 0 and p.locator('#formMsg').is_visible(), 'يطلب اختيار المادة أولاً')

        p.select_option('#course', CID); p.wait_for_timeout(200)
        chk(p.locator('#board').inner_text().strip() != '', 'لوحة المادة تظهر')
        sem_ok = p.evaluate("(id) => MS.course(id).semester === MS.currentSemester()", CID)
        chk(p.is_checked('#latest') == sem_ok, 'خيار أحدث المحاضرات الافتراضي حسب الكورس')

        p.set_input_files('#file', txt); p.wait_for_timeout(200)
        chk('PDF' in p.inner_text('#formMsg') and p.locator('#queue .up-row').count() == 0, 'يرفض ملفاً ليس PDF')

        # دفعة من ملفين: الرقم والاسم من اسم الملف
        p.set_input_files('#file', [pdf, pdf2]); p.wait_for_timeout(300)
        rows = p.locator('#queue .up-row')
        chk(rows.count() == 2, 'صفان في القائمة')
        chk(rows.nth(0).locator('.r-number').input_value() == '2', 'الرقم يُقرأ من اسم الملف')
        chk(rows.nth(0).locator('.r-title').input_value() == 'Innate Immunity', 'العنوان المقترح: ' + rows.nth(0).locator('.r-title').input_value())
        chk(rows.nth(0).locator('.r-label').input_value() == 'Slides', 'الاسم الظاهر Slides')
        chk(rows.nth(1).locator('.r-label').input_value() == 'Handout', 'الاسم الظاهر Handout')
        chk(rows.nth(1).locator('.r-title').input_value() == 'Innate Immunity', 'الملف الثاني يأخذ عنوان المحاضرة نفسها')
        # حقل ناقص يمنع الرفع
        rows.nth(1).locator('.r-label').fill('')
        p.click('#send'); p.wait_for_timeout(200)
        chk(p.locator('#queue .up-row.is-error').count() == 1, 'الصف الناقص يُظلَّل')
        rows.nth(1).locator('.r-label').fill('Handout')
        p.set_checked('#latest', True)
        p.click('#send')
        p.wait_for_selector('#formMsg.is-ok', timeout=40000)
        p.wait_for_timeout(600)
        chk(p.locator('#queue .up-row').count() == 0, 'القائمة تفرغ بعد النجاح')
        chk(p.locator('#list .up-item').count() == 2, 'ملفان في قائمة المرفوعات')
        chk('سارة' in p.inner_text('#list'), 'يظهر اسم من رفع')

        # رابط اختبار تفاعلي
        p.select_option('#linkType', 'quiz')
        p.fill('#linkUrl', 'quiz.example.com/immune')
        chk(p.input_value('#linkLabel') == 'Interactive quiz', 'اسم الرابط المقترح')
        p.click('#linkSend'); p.wait_for_timeout(700)
        chk(p.locator('#list .up-item').count() == 3, 'الرابط يظهر في القائمة')

        # صفحة المادة
        p2 = ctx.new_page(); p2.on('pageerror', lambda e: errs.append(str(e)))
        p2.goto(BASE + 'course.html?id=' + CID); p2.wait_for_timeout(900)
        q = p2.locator('a[href^="https://quiz.example.com"]')
        chk(q.count() == 1 and q.first.get_attribute('target') == '_blank', 'الاختبار التفاعلي يفتح في تبويب جديد')
        link = p2.locator('a.file-link', has_text='Slides')
        chk(link.count() >= 1, 'الملف المرفوع يظهر في صفحة المادة')
        url = p2.evaluate("""() => { var a=[].slice.call(document.querySelectorAll('a.file-link')).filter(x=>(x.getAttribute('href')||'').indexOf('api/file/')===0)[0]; return a.getAttribute('href'); }""")
        info = p2.evaluate("""async (u) => { var r = await fetch(u); var b = await r.arrayBuffer(); return [r.status, r.headers.get('content-type'), b.byteLength]; }""", url)
        chk(info[0] == 200 and info[1] == 'application/pdf', f'الملف يُقرأ: {info}')
        p2.close()

        # تعديل: تغيير الاسم الظاهر لعنصر
        item = p.locator('#list .up-item', has_text='Handout')
        item.locator('.up-edit').click(); p.wait_for_timeout(200)
        p.locator('#list .e-label').fill('Handout v2')
        p.locator('#list .up-edit-form button[type=submit]').click(); p.wait_for_timeout(700)
        chk(p.locator('#list .up-item', has_text='Handout v2').count() == 1, 'التعديل يُحفظ')

        # التصفية
        p.select_option('#filterType', 'quiz'); p.wait_for_timeout(200)
        chk(p.locator('#list .up-item').count() == 1, 'التصفية حسب النوع')
        p.select_option('#filterType', ''); p.wait_for_timeout(200)
        p.select_option('#filterBy', index=1); p.wait_for_timeout(200)
        chk(p.locator('#list .up-item').count() == 3, 'التصفية حسب المساعد')

        # الرئيسية تعمل
        p3 = ctx.new_page(); p3.on('pageerror', lambda e: errs.append(str(e)))
        p3.goto(BASE + 'index.html'); p3.wait_for_timeout(900)
        in_latest = 'Innate Immunity' in p3.inner_text('#latestList')
        chk(in_latest == sem_ok, 'أحدث المحاضرات تتبع الكورس: ' + str(in_latest))
        p3.close()

        # الحذف
        for _ in range(3):
            p.locator('#list .up-del').first.click(); p.wait_for_timeout(700)
        chk(p.locator('#list .up-item').count() == 0, 'الحذف يفرغ القائمة')
        p4 = ctx.new_page(); p4.goto(BASE + 'course.html?id=' + CID); p4.wait_for_timeout(700)
        chk(p4.locator('a[href^="https://quiz.example.com"]').count() == 0, 'الرابط المحذوف يختفي من المادة')
        p4.close()

        p.click('#logout')
        chk(p.locator('#loginCard').is_visible(), 'الخروج يعيد شاشة الدخول')
        chk(not errs, 'لا أخطاء جافاسكربت: ' + str(errs))
        b.close()
finally:
    srv.terminate()

print(f'{passes} passed, {len(fails)} failed' if fails else f'upload e2e OK: {passes} checks')
sys.exit(1 if fails else 0)
