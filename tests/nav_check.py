# python3 -I tests/nav_check.py [مجلد_اللقطات] — فحص القائمة الجانبية: الكمبيوتر والطي والدرج والحالة النشطة واللغات والوضع الليلي
import os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
PORT = 8767
BASE = f'http://localhost:{PORT}/'
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None
srv = subprocess.Popen(['python3', '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
fails = []
n = 0
AR = re.compile(r'[؀-ۿ]')


def chk(c, m):
    global n
    n += 1
    if not c:
        fails.append(m)
        print('FAIL', m)


def ctx_for(b, lang='ar', w=1440, h=900, theme=None, init=None):
    c = b.new_context(viewport={'width': w, 'height': h})
    js = f"try{{localStorage.setItem('ms.lang','\"{lang}\"')}}catch(e){{}}"
    if theme:
        js += f"try{{localStorage.setItem('ms.theme','\"{theme}\"')}}catch(e){{}}"
    if init:
        js += init
    c.add_init_script(js)
    return c


def shot(pg, name):
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.screenshot(path=os.path.join(SHOTS, name + '.png'))


def lum(rgb):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def rgb(s):
    return [float(x) for x in re.findall(r'[\d.]+', s)[:3]]


def active_count(pg):
    return pg.locator('#sidebar [aria-current="page"]').count()


try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium')

        # ---------- 1) الكمبيوتر، عربي، الرئيسية ----------
        c = ctx_for(b)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + 'index.html')
        pg.wait_for_timeout(900)
        sb = pg.locator('#sidebar')
        w = sb.bounding_box()['width']
        chk(abs(w - 280) <= 1, f'عرض القائمة 280 (الفعلي {w})')
        chk(pg.evaluate('document.documentElement.dir') == 'rtl', 'اتجاه rtl')
        bb = sb.bounding_box()
        chk(abs(bb['x'] + bb['width'] - (1440 - 16)) <= 1.5 and abs(bb['y'] - 16) <= 1.5, f'بطاقة عائمة على اليمين بهامش 16 {bb}')
        chk(pg.evaluate('parseFloat(getComputedStyle(document.getElementById("sidebar")).borderTopLeftRadius)') >= 12 and pg.evaluate('getComputedStyle(document.getElementById("sidebar")).boxShadow') != 'none', 'حواف مستديرة وظل')
        labels = pg.eval_on_selector_all('#sidebar a .nav-label', 'els=>els.map(e=>e.textContent.trim())')
        chk(labels == ['الرئيسية', 'الكورسات والمواد', 'الكورس الأول', 'الكورس الثاني', 'الكورس الثالث', 'أحدث المحاضرات', 'المفضلة', 'الأساتذة', 'أدوات الطالب', 'حسابي', 'ملفاتي المعلّق عليها', 'المساعدة'], f'عناصر القائمة الفعّالة فقط: {labels}')
        soon = pg.eval_on_selector_all('#sidebar .is-soon', 'els=>els.map(e=>[e.querySelector(".nav-label").textContent.trim(), e.tagName, e.getAttribute("aria-disabled"), e.hasAttribute("href"), e.tabIndex])')
        want = ['مخطط الدراسة', 'التقويم والامتحانات', 'بنك الأسئلة', 'نتائج التدريب', 'درجاتي الجامعية', 'الملف الشخصي', 'الإعدادات']
        chk([x[0] for x in soon] == want, f'العناصر غير المتاحة تظهر رمادية: {[x[0] for x in soon]}')
        chk(all(x[1] == 'SPAN' and x[2] == 'true' and not x[3] and x[4] < 0 for x in soon), 'غير المتاحة بلا رابط وغير قابلة للتركيز')
        chk('تسجيل الخروج' not in pg.inner_text('#sidebar'), 'تسجيل الخروج مخفي (لا جلسة دخول)')
        chk(pg.locator('#sidebar .is-soon .badge').count() == 7, 'شارة «قريباً» على كل عنصر غير متاح')
        ub = pg.inner_text('#sidebar .sb-user')
        chk('زائر' in ub and 'تقدّمك محفوظ على هذا الجهاز' in ub, f'كتلة الحساب للزائر بلا اسم وهمي: {ub!r}')
        chk(pg.evaluate('getComputedStyle(document.getElementById("navSub-courses").parentElement).visibility') == 'hidden', 'الكورسات المغلقة غير قابلة للتركيز')
        chk(pg.locator('#sidebar a:not([href])').count() == 0 and pg.locator('#sidebar a[href="#"]').count() == 0, 'لا روابط معطلة')
        chk(active_count(pg) == 1, f'حالة نشطة واحدة (الفعلي {active_count(pg)})')
        chk(pg.get_attribute('#sidebar [aria-current="page"]', 'data-nav') == 'home', 'الرئيسية نشطة عند الأعلى')
        hs = pg.eval_on_selector_all('#sidebar .nav-link, #sidebar .nav-sublink, #sidebar .nav-toggle', 'els=>els.filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect().height)')
        chk(all(h >= 43.5 for h in hs), f'ارتفاع الصفوف 44px على الأقل: min={min(hs)}')
        chk(pg.locator('#sidebar .sb-top .brand').is_visible() and pg.locator('#sidebar .sb-foot').is_visible(), 'الشعار أعلى والأدوات أسفل ظاهران')
        chk(pg.evaluate('document.querySelector("#sidebar .brand").textContent.trim()') == 'Medixa', 'شعار الموقع الحالي (Medixa)')
        # السلوك: ضغط الكورسات والمواد يوسّع المجموعة بزر مستقل
        tog = pg.locator('#sidebar .nav-toggle')
        chk(tog.get_attribute('aria-expanded') == 'false', 'المجموعة مغلقة في الرئيسية')
        tog.click()
        chk(tog.get_attribute('aria-expanded') == 'true' and pg.locator('#navSub-courses').is_visible(), 'زر التوسيع يفتح الكورسات')
        shot(pg, '01-desktop-expanded-ar')
        # التمرير إلى قسم يغيّر الحالة النشطة (واحدة فقط)
        pg.evaluate('document.getElementById("latest").scrollIntoView()')
        pg.wait_for_timeout(500)
        chk(active_count(pg) == 1 and pg.get_attribute('#sidebar [aria-current="page"]', 'data-nav') == 'latest', 'التمرير إلى أحدث المحاضرات ينقل التمييز')
        pg.evaluate('location.hash="#favorites"')
        pg.wait_for_timeout(400)
        chk(pg.get_attribute('#sidebar [aria-current="page"]', 'data-nav') == 'favorites' and active_count(pg) == 1, 'رابط المفضلة نشط')

        # ---------- 2) الطي ----------
        pg.goto(BASE + 'index.html')
        pg.wait_for_timeout(600)
        pg.click('#sbCollapse')
        pg.wait_for_timeout(400)
        w = pg.locator('#sidebar').bounding_box()['width']
        chk(abs(w - 76) <= 1, f'عرض القائمة المطوية 76 (الفعلي {w})')
        chk(pg.evaluate('JSON.parse(localStorage.getItem("ms.nav"))') == 'min', 'تفضيل الطي محفوظ')
        chk(pg.get_attribute('#sbCollapse', 'aria-expanded') == 'false', 'aria-expanded=false عند الطي')
        chk(abs(pg.evaluate('parseFloat(getComputedStyle(document.body).paddingInlineStart)') - (76 + 16)) <= 1, 'المحتوى يتكيّف مع عرض القائمة المطوية')
        chk(pg.evaluate('document.documentElement.scrollWidth') <= 1440, 'لا تمرير أفقي بعد الطي')
        # الاسم متاح للقارئ الشاشي وكتلميح عند المرور والتركيز
        chk('الرئيسية' in pg.locator('#sidebar .nav-link[data-nav=home]').inner_text() or pg.locator('#sidebar .nav-link[data-nav=home] .nav-label').text_content() == 'الرئيسية', 'الاسم يبقى في الشجرة للقارئ الشاشي')
        pg.hover('#sidebar .nav-link[data-nav=latest]')
        pg.wait_for_timeout(200)
        chk(pg.locator('.nav-tip').is_visible() and pg.inner_text('.nav-tip').strip() == 'أحدث المحاضرات', 'تلميح الاسم عند مرور الفأرة')
        shot(pg, '02-desktop-collapsed-hover-ar')
        pg.mouse.move(700, 500)
        pg.wait_for_timeout(150)
        chk(not pg.locator('.nav-tip').is_visible(), 'التلميح يختفي بعد المرور')
        pg.focus('#sidebar .nav-link[data-nav=favorites]')
        pg.keyboard.press('Tab')
        pg.keyboard.press('Shift+Tab')
        pg.wait_for_timeout(150)
        chk(pg.locator('.nav-tip').is_visible() and pg.inner_text('.nav-tip').strip() == 'المفضلة', 'تلميح الاسم عند تركيز لوحة المفاتيح')
        pg.reload()
        pg.wait_for_timeout(700)
        chk(abs(pg.locator('#sidebar').bounding_box()['width'] - 76) <= 1, 'الطي يبقى بعد إعادة التحميل')
        pg.click('#sbCollapse')
        pg.wait_for_timeout(300)
        chk(abs(pg.locator('#sidebar').bounding_box()['width'] - 280) <= 1, 'التوسيع يعيد 280')
        chk(not errs, f'أخطاء JS: {errs}')
        c.close()

        # ---------- 3) صفحة الكورس والمادة: مجموعة مفتوحة وحالة واحدة ----------
        c = ctx_for(b)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + 'semester.html?id=3')
        pg.wait_for_timeout(900)
        chk(pg.get_attribute('#sidebar .nav-toggle', 'aria-expanded') == 'true', 'صفحة الكورس: المجموعة مفتوحة تلقائياً')
        chk(active_count(pg) == 1 and pg.get_attribute('#sidebar [aria-current="page"]', 'data-nav') == 'sem-3', 'صفحة الكورس: الكورس الثالث هو النشط وحده')
        chk(pg.locator('#sidebar .is-parent').count() == 1 and pg.locator('#sidebar .nav-link[data-nav=courses][aria-current]').count() == 0, 'الأب مميّز بدرجة أخف بلا حالة نشطة ثانية')
        sty = pg.evaluate('''()=>{const a=document.querySelector("#sidebar .nav-link[data-nav=courses]"),b=document.querySelector("#sidebar .nav-sublink[aria-current=page]");return [getComputedStyle(a).backgroundColor,getComputedStyle(b).backgroundColor,getComputedStyle(a,"::before").content,getComputedStyle(b,"::before").content]}''')
        chk(sty[0] != sty[1] and sty[2] in ('none', 'normal') and sty[3] != 'none', f'الأب بلا شريط والنشط بشريط: {sty}')
        shot(pg, '03-semester-page-ar')
        chk(not errs, f'أخطاء JS صفحة الكورس: {errs}')
        pg.goto(BASE + 'course.html?id=medical-immunology')
        pg.wait_for_timeout(900)
        chk(pg.get_attribute('#sidebar .nav-toggle', 'aria-expanded') == 'true' and pg.get_attribute('#sidebar [aria-current="page"]', 'data-nav') == 'sem-3' and active_count(pg) == 1, 'صفحة المادة: كورسها نشط والمجموعة مفتوحة')
        shot(pg, '04-course-page-ar')
        # متابعة القراءة تظهر بعد فتح مادة وتشير إليها فعلاً
        pg.goto(BASE + 'index.html')
        pg.wait_for_timeout(700)
        r = pg.locator('#sidebar .nav-link[data-nav=resume]')
        chk(r.count() == 1 and 'medical-immunology' in (r.get_attribute('href') or ''), 'متابعة القراءة تظهر وتفتح آخر مادة')
        pg.goto(BASE + 'study.html?id=medical-immunology&lec=1')
        pg.wait_for_timeout(900)
        chk(pg.get_attribute('#sidebar [aria-current="page"]', 'data-nav') == 'sem-3', 'صفحة وضع الدراسة: كورسها نشط')
        c.close()

        # ---------- 4) الهاتف 390 واللوحي 768: درج ----------
        for (vw, vh) in [(390, 844), (768, 900)]:
            for lang in ['ar', 'en']:
                c = ctx_for(b, lang, vw, vh)
                pg = c.new_page()
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                pg.goto(BASE + 'index.html')
                pg.wait_for_timeout(900)
                tag = f'{vw}/{lang}'
                chk(pg.evaluate('document.documentElement.scrollWidth') <= vw, f'{tag}: لا تمرير أفقي')
                bb = pg.locator('#sidebar').bounding_box()
                vis = pg.evaluate('getComputedStyle(document.getElementById("sidebar")).visibility')
                chk(vis == 'hidden' and pg.evaluate('document.getElementById("sidebar").inert'), f'{tag}: الدرج المغلق مخفي وغير قابل للتركيز')
                chk(pg.get_attribute('#menuBtn', 'aria-expanded') == 'false', f'{tag}: aria-expanded=false')
                pg.click('#menuBtn')
                pg.wait_for_timeout(450)
                bb = pg.locator('#sidebar').bounding_box()
                exp_w = min(320, vw * 0.88)
                chk(abs(bb['width'] - exp_w) <= 1.5, f'{tag}: عرض الدرج {bb["width"]} ≈ {exp_w}')
                if lang == 'en':
                    chk(abs(bb['x']) <= 1, f'{tag}: يفتح من اليسار في الإنجليزية')
                else:
                    chk(abs(bb['x'] + bb['width'] - vw) <= 1, f'{tag}: يفتح من اليمين في العربية')
                chk(abs(bb['y']) <= 1 and abs(bb['height'] - vh) <= 1, f'{tag}: الدرج بطول الشاشة كاملة')
                chk(pg.get_attribute('#menuBtn', 'aria-expanded') == 'true', f'{tag}: aria-expanded=true')
                chk(pg.evaluate('getComputedStyle(document.documentElement).overflow') == 'hidden', f'{tag}: الصفحة الخلفية لا تتمرر')
                chk(pg.evaluate('getComputedStyle(document.getElementById("scrim")).visibility') == 'visible', f'{tag}: خلفية معتمة ظاهرة')
                chk(pg.evaluate('document.activeElement.id') == 'sbClose', f'{tag}: التركيز على زر الإغلاق')
                chk(pg.locator('#sbClose').is_visible() and pg.locator('#sbCollapse').is_hidden(), f'{tag}: زر إغلاق ظاهر وزر الطي مخفي')
                chk(pg.get_attribute('#sidebar', 'aria-modal') == 'true', f'{tag}: role=dialog وaria-modal')
                # حبس التركيز
                inside = True
                for _ in range(14):
                    pg.keyboard.press('Tab')
                    inside = inside and pg.evaluate('document.getElementById("sidebar").contains(document.activeElement)')
                chk(inside, f'{tag}: التركيز محصور داخل الدرج')
                inside = True
                for _ in range(4):
                    pg.keyboard.press('Shift+Tab')
                    inside = inside and pg.evaluate('document.getElementById("sidebar").contains(document.activeElement)')
                chk(inside, f'{tag}: Shift+Tab محصور')
                # الأدوات السفلية ظاهرة وروابطها قابلة للتمرير
                fb = pg.locator('#sidebar .sb-foot').bounding_box()
                sc = pg.locator('#sidebar .sb-scroll').bounding_box()
                chk(fb['y'] + fb['height'] <= vh + 1 and sc['y'] + sc['height'] <= fb['y'] + 1, f'{tag}: الأدوات السفلية ظاهرة بلا تداخل')
                if vw == 390 and lang == 'ar':
                    shot(pg, '05-mobile-open-ar')
                    pg.locator('#sidebar .nav-toggle').click()
                    pg.wait_for_timeout(200)
                    shot(pg, '06-mobile-open-semesters-ar')
                # Escape
                pg.keyboard.press('Escape')
                pg.wait_for_timeout(450)
                chk(pg.evaluate('document.activeElement.id') == 'menuBtn', f'{tag}: Escape يغلق ويعيد التركيز لزر الفتح')
                chk(pg.evaluate('getComputedStyle(document.documentElement).overflow') != 'hidden', f'{tag}: التمرير يعود بعد الإغلاق')
                # الضغط خارج القائمة
                pg.click('#menuBtn')
                pg.wait_for_timeout(400)
                x = (vw - 10) if lang == 'en' else 10
                pg.mouse.click(x, 400)
                pg.wait_for_timeout(450)
                chk(pg.get_attribute('#menuBtn', 'aria-expanded') == 'false' and pg.evaluate('document.activeElement.id') == 'menuBtn', f'{tag}: الضغط خارج القائمة يغلقها')
                # اختيار رابط
                pg.click('#menuBtn')
                pg.wait_for_timeout(400)
                pg.click('#sidebar .nav-link[data-nav=latest]')
                pg.wait_for_timeout(500)
                chk(pg.get_attribute('#menuBtn', 'aria-expanded') == 'false', f'{tag}: اختيار رابط يغلق الدرج')
                chk(not errs, f'{tag}: أخطاء JS {errs}')
                c.close()

        # ---------- 5) شاشة قصيرة: الروابط وحدها تتمرر ----------
        c = ctx_for(b, 'ar', 1440, 520)
        pg = c.new_page()
        pg.goto(BASE + 'index.html')
        pg.wait_for_timeout(700)
        pg.locator('#sidebar .nav-toggle').click()
        d = pg.evaluate('''()=>{const s=document.querySelector("#sidebar .sb-scroll");return [s.scrollHeight>s.clientHeight, getComputedStyle(s).overflowY, document.querySelector("#sidebar .sb-foot").getBoundingClientRect().bottom]}''')
        chk(d[0] and d[1] == 'auto' and d[2] <= 505, f'شاشة قصيرة: منطقة الروابط تتمرر والأدوات ثابتة {d}')
        c.close()

        # ---------- 6) الإنجليزية والفارسية على الكمبيوتر ----------
        c = ctx_for(b, 'en')
        pg = c.new_page()
        pg.goto(BASE + 'index.html')
        pg.wait_for_timeout(900)
        bb = pg.locator('#sidebar').bounding_box()
        chk(abs(bb['x'] - 16) <= 1.5 and abs(bb['width'] - 280) <= 1, 'الإنجليزية: القائمة على اليسار بعرض 280')
        txt = pg.inner_text('#sidebar')
        chk(not AR.search(txt), f'الإنجليزية: لا نص عربي في القائمة: {txt[:200]!r}')
        chk('Guest' in txt and 'Soon' in txt, 'الإنجليزية: الزائر وقريباً مترجمان')
        for want in ['Home', 'Semesters and subjects', 'My study', 'Help', 'Study organizer']:
            chk(want in txt, f'الإنجليزية: «{want}» موجود')
        chk(not AR.search(pg.get_attribute('#sbCollapse', 'aria-label') or ''), 'الإنجليزية: aria-label لزر الطي مترجم')
        shot(pg, '07-desktop-en')
        pg.click('#sbCollapse')
        pg.wait_for_timeout(300)
        chk(abs(pg.locator('#sidebar').bounding_box()['width'] - 76) <= 1, 'الإنجليزية: الطي 76')
        chk(pg.evaluate('document.documentElement.scrollWidth') <= 1440, 'الإنجليزية: لا تمرير أفقي بعد الطي')
        c.close()
        c = ctx_for(b, 'fa')
        pg = c.new_page()
        pg.goto(BASE + 'index.html')
        pg.wait_for_timeout(900)
        txt = pg.inner_text('#sidebar')
        chk(not re.search('[يكة]', txt) and 'دراستي' not in txt, f'الفارسية: مترجمة بحروف فارسية: {txt[:160]!r}')
        shot(pg, '08-desktop-fa')
        c.close()

        # ---------- 7) الوضع الليلي ----------
        c = ctx_for(b, 'ar', 1440, 900, theme='dark')
        pg = c.new_page()
        pg.goto(BASE + 'semester.html?id=3')
        pg.wait_for_timeout(900)
        chk(pg.evaluate('document.documentElement.getAttribute("data-theme")') == 'dark', 'الوضع الليلي مفعّل')
        cols = pg.evaluate('''()=>{const g=(s,p)=>getComputedStyle(document.querySelector(s))[p];return {surf:g("#sidebar","backgroundColor"),act:g("#sidebar [aria-current=page]","color"),actbg:g("#sidebar [aria-current=page]","backgroundColor"),txt:g("#sidebar .nav-link[data-nav=latest]","color"),mut:g("#sidebar .nav-title","color")}}''')
        r1 = ratio(rgb(cols['act']), rgb(cols['actbg']))
        r2 = ratio(rgb(cols['txt']), rgb(cols['surf']))
        r3 = ratio(rgb(cols['mut']), rgb(cols['surf']))
        chk(r1 >= 4.5 and r2 >= 4.5 and r3 >= 4.5, f'تباين ليلي: نشط {r1:.1f} نص {r2:.1f} عنوان {r3:.1f}')
        chk(sum(rgb(cols['surf'])) < 300, f'سطح القائمة الليلي كحلي داكن {cols["surf"]}')
        shot(pg, '09-desktop-dark-ar')
        c.close()
        c = ctx_for(b, 'ar', 1440, 900)
        pg = c.new_page()
        pg.goto(BASE + 'semester.html?id=3')
        pg.wait_for_timeout(900)
        cols = pg.evaluate('''()=>{const g=(s,p)=>getComputedStyle(document.querySelector(s))[p];return {surf:g("#sidebar","backgroundColor"),act:g("#sidebar [aria-current=page]","color"),actbg:g("#sidebar [aria-current=page]","backgroundColor"),mut:g("#sidebar .nav-title","color"),txt:g("#sidebar .nav-link[data-nav=latest]","color")}}''')
        chk(cols['surf'] == 'rgb(23, 50, 77)' and cols['txt'] == 'rgb(234, 241, 247)' and cols['act'] == 'rgb(111, 224, 216)', f'ألوان النهاري المطلوبة {cols}')
        chk(ratio(rgb(cols['act']), rgb(cols['actbg'])) >= 4.5 and ratio(rgb(cols['mut']), rgb(cols['surf'])) >= 4.5, 'تباين نهاري كافٍ')
        c.close()

        # ---------- 8) حركة مخفّضة ----------
        c = b.new_context(viewport={'width': 390, 'height': 800}, reduced_motion='reduce')
        pg = c.new_page()
        pg.goto(BASE + 'index.html')
        pg.wait_for_timeout(700)
        chk(pg.evaluate('getComputedStyle(document.getElementById("sidebar")).transitionDuration') in ('0s',), 'تقليل الحركة: لا انتقال')
        c.close()
        b.close()
finally:
    srv.terminate()

print(f'nav OK: {n} checks' if not fails else f'nav FAILED: {len(fails)} of {n}')
sys.exit(1 if fails else 0)
