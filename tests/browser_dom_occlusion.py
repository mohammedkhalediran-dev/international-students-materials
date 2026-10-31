from pathlib import Path
from playwright.sync_api import sync_playwright
source=(Path(__file__).resolve().parents[1]/'site/js/study-occlusion-v90.js').read_text().replace('location.search',"'?file=lecture.pdf'").replace('location.href',"'https://medixa.test/pdf-notes.html?file=lecture.pdf'")
key='medixa.occlusion.v1:https://medixa.test/lecture.pdf'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for mode in ['normal','quota','read-blocked']:
  page=b.new_page(viewport={'width':390,'height':844})
  page.set_content('<main id="pages"><section class="page" style="width:200px;height:300px;position:relative"></section></main>')
  page.evaluate("""([key,mode])=>{const m=new Map();window.confirm=()=>true;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){if(mode==='read-blocked')throw Error('read blocked');return m.get(k)??null},setItem(k,v){if(mode==='quota')throw Error('quota');m.set(k,v)}}});window.__store=m}""",[key,mode])
  page.add_script_tag(content=source)
  page.locator('#mx-mask-add').click()
  page.evaluate("""()=>{const el=document.querySelector('.page'),r=el.getBoundingClientRect();el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+20,clientY:r.top+30}));el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:r.left+100,clientY:r.top+130}));}""")
  count=page.locator('.mx-mask').count();saved=page.evaluate('([key])=>window.__store.get(key)',[key])
  if mode=='normal':
   assert count==1 and saved and len(__import__('json').loads(saved))==1,(count,saved)
   page.locator('.mx-mask').click();assert 'revealed' in page.locator('.mx-mask').get_attribute('class')
   page.locator('#mx-mask-hide').click();assert 'revealed' not in page.locator('.mx-mask').get_attribute('class')
   page.locator('.mx-mask').click(modifiers=['Alt']);assert page.locator('.mx-mask').count()==0
  else:assert count==0 and saved is None,(mode,count,saved)
  print('PASS Chromium occlusion:',mode)
  page.close()
 b.close()
