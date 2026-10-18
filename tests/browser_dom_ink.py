from pathlib import Path
from playwright.sync_api import sync_playwright
import json
source=(Path(__file__).resolve().parents[1]/'site/js/study-ink-backup-v89.js').read_text().replace('location.search',"'?file=lecture.pdf'").replace('location.href',"'https://medixa.test/pdf-notes.html?file=lecture.pdf'")
doc='https://medixa.test/lecture.pdf'; key='medixa.pdf.annotations.v1:'+doc
stroke={'page':1,'tool':'pen','points':[[1,2],[3,4]]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for mode in ['normal','duplicate','wrong-document','quota']:
  page=b.new_page(); page.set_content('<main id="pages"></main>')
  initial=[stroke] if mode=='duplicate' else []
  page.evaluate('''([key,initial,mode])=>{const m=new Map([[key,JSON.stringify(initial)]]);window.confirm=()=>true;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return m.get(k)??null},setItem(k,v){if(mode==='quota')throw Error('quota');m.set(k,v)},removeItem(k){m.delete(k)}}});window.__store=m;}''',[key,initial,mode])
  page.add_script_tag(content=source)
  backup={'format':'medixa-ink-v1','document':('https://medixa.test/other.pdf' if mode=='wrong-document' else doc),'strokes':[stroke,stroke]}
  page.locator('#mx89-import').set_input_files({'name':'ink.json','mimeType':'application/json','buffer':json.dumps(backup).encode()})
  page.wait_for_function("document.querySelector('#mx89-status').textContent !== 'لا تشمل النسخة ملف PDF.'")
  current=page.evaluate('([key])=>JSON.parse(window.__store.get(key))',[key]); status=page.locator('#mx89-status').inner_text()
  if mode=='normal':assert len(current)==1 and 'أُضيفت 1' in status,(current,status)
  if mode=='duplicate':assert len(current)==1 and 'لا توجد' in status,(current,status)
  if mode=='wrong-document':assert len(current)==0 and 'فشل الاستيراد' in status,(current,status)
  if mode=='quota':assert len(current)==0 and 'فشل الاستيراد' in status,(current,status)
  print('PASS Chromium ink:',mode);page.close()
 b.close()
