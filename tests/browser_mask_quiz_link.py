from pathlib import Path
from playwright.sync_api import sync_playwright
src=(Path(__file__).resolve().parents[1]/'site/js/study-suite-v85.js').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':390,'height':844})
 page.route('https://medixa.test/*', lambda route: route.fulfill(status=200, body='<html><body></body></html>', content_type='text/html'));page.goto('https://medixa.test/reader?file=lecture.pdf')
 page.set_content('<header></header><main id="pages"><div class="page"></div></main>')
 page.evaluate("""()=>{const map=new Map();window.__kv=map;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}});window.alert=()=>{};window.confirm=()=>true;map.set('medixa.occlusion.v1:'+new URL('lecture.pdf',location.href).href,JSON.stringify([{page:1,x:.1,y:.2,w:.3,h:.2}]));}""")
 page.add_script_tag(content=src)
 page.locator('#medixa-suite-toggle').click();page.locator('[data-view=image]').click()
 assert page.locator('#iq-mask option').count()==2
 page.locator('#iq-mask').select_option(index=1)
 page.locator('#iq-q').fill('Which anatomy?');page.locator('#iq-a').fill('Left atrium');page.locator('#iq-add').click()
 assert 'قناع مرتبط' in page.locator('.suite-quiz').inner_text()
 page.locator('[data-iqinput="0"]').fill('left atrium');page.locator('[data-iqcheck="0"]').click()
 assert 'صحيح' in page.locator('#iq-feedback-0').inner_text()
 quiz=page.evaluate("""()=>JSON.parse([...window.__kv].find(([k])=>k.endsWith('imageQuiz'))[1])""")
 assert len(quiz)==1 and 'maskRef' in quiz[0]
 page.evaluate("""()=>{window.__kv.set('medixa.occlusion.v1:'+new URL('lecture.pdf',location.href).href,'[]')}""")
 page.locator('[data-view=dashboard]').click();page.locator('[data-view=image]').click()
 assert 'القناع الأصلي غير موجود' in page.locator('.suite-quiz').inner_text()
 print('PASS Chromium mask quiz link, scoring, missing mask, mobile viewport')
 b.close()
