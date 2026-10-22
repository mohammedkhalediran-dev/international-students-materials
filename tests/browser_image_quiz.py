from pathlib import Path
from playwright.sync_api import sync_playwright
src=(Path(__file__).resolve().parents[1]/'site/js/study-suite-v85.js').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':390,'height':844})
 page.set_content('<header></header><main id="pages"><div class="page"></div></main>')
 page.evaluate('''()=>{const map=new Map();window.__kv=map;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}});window.alert=()=>{};window.confirm=()=>true;}''')
 page.add_script_tag(content=src)
 page.locator('#medixa-suite-toggle').click();page.locator('[data-view=image]').click()
 page.locator('#iq-q').fill('Name structure');page.locator('#iq-a').fill('Left atrium');page.locator('#iq-add').click()
 page.locator('[data-iqinput="0"]').fill('  LEFT  ATRIUM ');page.locator('[data-iqcheck="0"]').click()
 assert 'صحيح' in page.locator('#iq-feedback-0').inner_text()
 page.locator('[data-iqinput="0"]').fill('right ventricle');page.locator('[data-iqcheck="0"]').click()
 assert 'غير صحيح' in page.locator('#iq-feedback-0').inner_text()
 data=page.evaluate('''()=>JSON.parse([...window.__kv].find(([k])=>k.endsWith('imageQuizReviews'))[1])''')
 assert len(data)==1 and next(iter(data.values()))['attempts']==2 and next(iter(data.values()))['correct']==1,data
 print('PASS Chromium image quiz answer review and persistent history')
 b.close()
