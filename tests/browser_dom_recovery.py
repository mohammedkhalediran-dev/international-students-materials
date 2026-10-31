from playwright.sync_api import sync_playwright
from pathlib import Path
import json
source=(Path(__file__).resolve().parents[1]/'site/js/study-recovery-v88.js').read_text().replace('location.search',"'?file=lecture.pdf'").replace('location.href',"'https://medixa.test/pdf-notes.html?file=lecture.pdf'")
key='medixa.v88.session:https://medixa.test/lecture.pdf'
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,width,height,mode in [('desktop',1440,900,'normal'),('android-sized',390,844,'normal'),('tablet-sized',820,1180,'normal'),('blocked-read',390,844,'blocked'),('quota-write',390,844,'quota')]:
  page=b.new_page(viewport={'width':width,'height':height})
  page.set_content('<main id="pages"></main>')
  page.evaluate('''([key,mode])=>{const m=new Map([[key,JSON.stringify({version:1,document:'lecture.pdf',page:3,savedAt:1})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){if(mode==='blocked')throw Error('read blocked');return m.get(k)||null},setItem(k,v){if(mode==='quota')throw Error('quota');m.set(k,v)},removeItem(k){m.delete(k)}}});window.__testStore=m;}''',[key,mode])
  page.add_script_tag(content=source)
  page.wait_for_timeout(100)
  banner=page.locator('#mx88-recovery')
  assert banner.count()==1,(name,'banner missing')
  assert banner.get_attribute('aria-live')=='polite'
  if mode=='blocked':
   assert 'تعذر' in banner.inner_text()
   banner.locator('button').last.click()
   assert page.evaluate('([key])=>JSON.parse(window.__testStore.get(key)).page',[key])==3
  else:
   banner.locator('button').first.click()
   page.evaluate("()=>{for(let i=1;i<=3;i++){let e=document.createElement('section');e.className='page';e.textContent='Page '+i;e.style.height='900px';document.querySelector('#pages').append(e)}}")
   page.wait_for_timeout(120)
   val=page.evaluate('([key])=>JSON.parse(window.__testStore.get(key)).page',[key])
   assert val==3,(name,val)
   if mode=='quota':assert 'فشل حفظ' in banner.inner_text(),(name,banner.inner_text())
   else:
    assert banner.evaluate('(e)=>getComputedStyle(e).display')=='none'
    assert page.locator('.page').count()==3
  results.append(f'PASS {name}: {width}x{height}, {mode}')
  page.close()
 b.close()
print('\n'.join(results))
