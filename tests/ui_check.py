# python3 -I ui_check.py  — اختبار الواجهة بالعربية والإنجليزية وكل نقاط الكسر
import re,sys,subprocess,time
from playwright.sync_api import sync_playwright
BASE='http://localhost:8766/'
srv=subprocess.Popen(['python3','-m','http.server','8766','-d',__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'..','site')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
AR=re.compile(r'[؀-ۿ]');fails=[]
def chk(c,m):
    if not c: fails.append(m); print('FAIL',m)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    for lang in ['ar','en','fa']:
      ctx=b.new_context(viewport={'width':1280,'height':900})
      ctx.add_init_script(f"try{{localStorage.setItem('ms.lang','\"{lang}\"')}}catch(e){{}}")
      pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
      for url in ['index.html','course.html?id=medical-immunology']:
        pg.goto(BASE+url);pg.wait_for_timeout(1200)
        chk(pg.evaluate('document.documentElement.dir')==('ltr' if lang=='en' else 'rtl'),f'{lang} {url} dir')
        for w in [360,768,1024,1440]:
            pg.set_viewport_size({'width':w,'height':900});pg.wait_for_timeout(150)
            chk(pg.evaluate('document.documentElement.scrollWidth')<=w,f'{lang} {url} overflow at {w}')
        txt='\n'.join(l for l in pg.evaluate('document.body.innerText').split('\n') if l.strip() not in ('عربي','فارسی','English'))
        if lang=='fa':
            bad=[l for l in txt.split('\n') if re.search('[يكة]',l)]
            chk(not bad,f'fa {url} Arabic-only letters left: {bad[:6]}')
        if lang=='en':
            left=[l for l in txt.split('\n') if AR.search(l)]
            chk(not left,f'{lang} {url} Arabic left: {left[:6]}')
        chk(not errs,f'{lang} {url} js errors {errs}')
      pg.set_viewport_size({'width':1280,'height':900})
      pg.goto(BASE+'index.html');pg.wait_for_timeout(800)
      pg.fill('#search','immune');pg.wait_for_timeout(300)
      chk('Overview' in pg.inner_text('#groups'),f'{lang} lecture search')
      pg.fill('#search','');pg.click('#chips .chip:nth-child(3)');pg.wait_for_timeout(300)
      chk(pg.locator('#groups .course-card').count()==10,f'{lang} shortcut general')
      pg.click('#searchBtn');chk(pg.evaluate('document.activeElement.id')=='search',f'{lang} search button')
      # dark mode + viewer dialog
      pg.goto(BASE+'course.html?id=medical-immunology');pg.wait_for_timeout(800)
      pg.click('#themeBtn');pg.click('.file-link');pg.wait_for_timeout(600)
      chk(pg.evaluate('document.getElementById("viewer").open'),f'{lang} viewer opens')
      pg.screenshot(path=f'/tmp/claude-0/-home-claude/171e765c-3adb-557c-b973-8ed3280ed659/scratchpad/dark_{lang}.png')
      ctx.close()
finally: srv.terminate()
print('UI OK' if not fails else f'{len(fails)} failures');sys.exit(1 if fails else 0)
