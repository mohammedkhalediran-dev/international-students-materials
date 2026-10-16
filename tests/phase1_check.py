# python3 -I phase1_check.py — فحوص المرحلة الأولى: البحث والتصفية، الاتجاه لكل لغة، العروض، لوحة المفاتيح، الحالات الفارغة والمسودات
import re,sys,subprocess,time,json
from playwright.sync_api import sync_playwright
BASE='http://localhost:8771/'
srv=subprocess.Popen(['python3','-m','http.server','8771','-d',__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'..','site')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
fails=[];passes=0
def chk(c,m):
    global passes
    if c: passes+=1
    else: fails.append(m); print('FAIL',m)
def page(b,lang,w=1280):
    c=b.new_context(viewport={'width':w,'height':900})
    c.add_init_script("try{localStorage.setItem('ms.lang',%s)}catch(e){}"%json.dumps(json.dumps(lang)))
    p=c.new_page(); p.errs=[]; p.on('pageerror',lambda e:p.errs.append(str(e))); return p
def count(p): return p.locator('#groups .course-card').count()
try:
  with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    # 1) الاتجاه واللغة
    for lang,d in [('ar','rtl'),('fa','rtl'),('en','ltr')]:
        p=page(b,lang)
        for url in ['index.html','course.html?id=medical-immunology']:
            p.goto(BASE+url); p.wait_for_timeout(900)
            chk(p.evaluate('document.documentElement.dir')==d,f'{lang} {url} dir={d}')
            chk(p.evaluate('document.documentElement.lang')==lang,f'{lang} {url} lang attr')
            chk(not p.errs,f'{lang} {url} js errors {p.errs}')
            for w in [360,390,768,1440]:
                p.set_viewport_size({'width':w,'height':900}); p.wait_for_timeout(120)
                chk(p.evaluate('document.documentElement.scrollWidth')<=w,f'{lang} {url} no h-scroll at {w}')
            p.set_viewport_size({'width':1280,'height':900})
        p.context.close()
    # 2) البحث والتصفية على البيانات الحقيقية
    p=page(b,'ar'); p.goto(BASE+'index.html'); p.wait_for_timeout(900)
    total=p.evaluate('COURSES.length'); basic=p.evaluate('COURSES.filter(c=>c.category=="basic").length')
    chk(p.locator('#semGrid .quick-item').count()==p.evaluate('SEMESTERS.length'),'home shows one card per semester')
    p2=page(b,'ar'); p2.goto(BASE+'semester.html?id=3'); p2.wait_for_timeout(700)
    chk(p2.locator('.course-card').count()==p.evaluate('COURSES.filter(c=>c.semester==3).length'),'semester page lists all its subjects'); chk(not p2.errs,f'semester page js errors {p2.errs}')
    mb=p2.locator('.cc-more:visible').first
    chk(mb.count()==1,'long professor list shows "show more"')
    if mb.count():
        pid=mb.get_attribute('aria-controls'); h0=p2.evaluate(f'document.getElementById("{pid}").clientHeight')
        mb.focus(); p2.keyboard.press('Enter'); p2.wait_for_timeout(100)
        chk(mb.get_attribute('aria-expanded')=='true' and p2.evaluate(f'document.getElementById("{pid}").clientHeight')>h0,'show more expands with keyboard')
        p2.keyboard.press('Enter'); p2.wait_for_timeout(100); chk(mb.get_attribute('aria-expanded')=='false','show more collapses')
    p2.locator('.sem-filter .chip').nth(2).click(); p2.wait_for_timeout(100)
    chk(p2.locator('.course-card:visible').count()==p.evaluate('COURSES.filter(c=>c.semester==3&&c.category=="general").length'),'semester filter: general only')
    chk(p2.locator('.course-card .cc-kicker:visible').count()==0,'general subjects have no field label')
    p2.locator('.sem-filter .chip').nth(0).click(); p2.wait_for_timeout(100)
    chk(p2.locator('.course-card:visible').count()==14,'semester filter: all'); p2.context.close()
    p2=page(b,'ar'); p2.goto(BASE+'semester.html?id=1'); p2.wait_for_timeout(500)
    chk(p2.locator('.course-card').count()==p.evaluate('COURSES.filter(c=>c.semester==1).length'),'semester 1 page lists its subjects'); p2.context.close()
    for q,exp in [('Kidney',2),('الكلية',2),('للكلية',2),('فسيولوجيا',7),('11111131',1),('Shahbazi',1),('immune',0),('xyzxyz',0),('فيزيولوجيا',0)]:
        p.fill('#search',q); p.wait_for_timeout(150); chk(count(p)==exp,f'search "{q}" -> {exp} (got {count(p)})')
    p.fill('#search','immune'); p.wait_for_timeout(150); chk(p.locator('.lec-results .latest-item').count()==1,'lecture search immune')
    # كتابة فارسية (ی/ک) تطابق النص العربي (ي/ك)
    p.fill('#search','کلیة'); p.wait_for_timeout(150); chk(count(p)==2,'persian letters normalize (کلیة)')
    p.fill('#search','',); p.click('#chips button:nth-child(2)'); p.wait_for_timeout(150); chk(count(p)==basic,'category basic filter')
    p.click('#chips button:nth-child(3)'); p.wait_for_timeout(150); chk(count(p)==total-basic,'category general filter')
    p.click('#chips button:nth-child(1)'); p.fill('#search','zzz'); p.wait_for_timeout(150)
    chk(p.locator('#groups .empty').count()==1,'empty state on no results')
    p.fill('#search','')
    # لوحة المفاتيح والتركيز الظاهر
    p.goto(BASE+'index.html'); p.wait_for_timeout(600)
    p.keyboard.press('Tab'); chk(p.evaluate('document.activeElement.className')=='skip','first Tab reaches skip link')
    seen=set();ok=True
    for i in range(40):
        p.keyboard.press('Tab')
        st=p.evaluate('''()=>{const e=document.activeElement;const s=getComputedStyle(e);const a=getComputedStyle(e,'::after');return [e.tagName,(s.outlineStyle!=='none'&&s.outlineWidth!=='0px')||a.outlineStyle!=='none'||s.boxShadow!=='none'||e.id==='examDate']}''')
        if not st[1]: ok=False; print('  no focus ring on',st[0])
    chk(ok,'visible focus on first 40 tab stops')
    p.goto(BASE+'course.html?id=medical-immunology'); p.wait_for_timeout(600)
    p.focus('.file-link'); p.keyboard.press('Enter'); p.wait_for_timeout(400)
    chk(p.evaluate('document.getElementById("viewer").open'),'viewer opens with Enter')
    p.keyboard.press('Escape'); p.wait_for_timeout(200)
    chk(not p.evaluate('document.getElementById("viewer").open'),'viewer closes with Escape')
    # حالة الخطأ: مادة غير موجودة
    p.goto(BASE+'course.html?id=nope'); p.wait_for_timeout(500)
    chk(p.locator('#content .empty').count()==1,'error state for unknown subject')
    # المسودات لا تظهر
    p.goto(BASE+'index.html'); p.wait_for_timeout(300)
    p.add_init_script('''window.addEventListener('DOMContentLoaded',()=>{})''')
    p.context.close()
    c=b.new_context(); pg=c.new_page()
    def inject(route):
        r=route.fetch(); body=r.text().replace('label: "Slides (Dr. Shahbazi)"','label: "Slides (Dr. Shahbazi)"').replace('lectures: []','lectures: [{number:9,title:"Secret draft",draft:true,files:[{label:"x",path:"x/y.pdf",added:"2030-01-01"}]}]',1)
        route.fulfill(response=r,body=body)
    pg.route('**/data/courses.js*',inject); pg.goto(BASE+'index.html'); pg.wait_for_timeout(900)
    chk('Secret draft' not in pg.inner_text('body'),'draft lecture hidden')
    pg.fill('#search','Secret'); pg.wait_for_timeout(150); chk(pg.locator('.lec-results').count()==0,'draft not searchable')
    c.close()
    # حالة خطأ: فشل تحميل البيانات
    c=b.new_context(); pg=c.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/data/courses.js*',lambda r:r.fulfill(status=404,body='')); pg.goto(BASE+'index.html'); pg.wait_for_timeout(700)
    chk(pg.locator('.load-error[role=alert]').count()==1,'data load error message shown')
    chk(not errs,f'no uncaught errors when data fails {errs}')
    c.close()
    # حالة خطأ: ملف غير موجود
    c=b.new_context(); pg=c.new_page()
    pg.route('**/*.pdf',lambda r:r.fulfill(status=404,body='') if r.request.method=='HEAD' else r.continue_())
    pg.goto(BASE+'course.html?id=medical-immunology'); pg.wait_for_timeout(600); pg.click('.file-link'); pg.wait_for_timeout(600)
    chk(not pg.evaluate('document.getElementById("viewer").open'),'missing file does not open viewer')
    chk('غير متاح' in pg.inner_text('#toast'),'missing file message shown')
    c.close()
    # حالة التحميل: مؤشر داخل نافذة الملف يختفي بعد التحميل
    c=b.new_context(); pg=c.new_page(); pg.goto(BASE+'course.html?id=medical-immunology'); pg.wait_for_timeout(600)
    pg.click('.file-link'); pg.wait_for_timeout(2500)
    chk(pg.evaluate('document.getElementById("viewerLoading").hidden'),'loading indicator hides after load')
    c.close()
finally: srv.terminate()
print(f'{passes} passed, {len(fails)} failed');sys.exit(1 if fails else 0)
