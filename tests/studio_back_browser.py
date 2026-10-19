# python3 -I tests/studio_back_browser.py — زر الرجوع في وضع الكتابة والتظليل (iPad كتطبيق على الشاشة الرئيسية بلا زر رجوع للمتصفح).
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8808; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO BACK')
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox']); ctx = new_context(b, {}, viewport={'width': 820, 'height': 1180}, has_touch=True)
        ctx.add_init_script("try{localStorage.setItem('ms.guest','1')}catch(e){}")
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + 'course.html?id=medical-immunology'); pg.wait_for_timeout(1500)
        link = pg.locator('#annotateLink'); href = link.get_attribute('href') if link.count() else None
        if not href or href == '#':
            pg.locator('.file-link, [data-file], a[href$=".pdf"]').first.click(); pg.wait_for_timeout(1000); href = pg.locator('#annotateLink').get_attribute('href')
        chk(href and 'pdf-notes.html' in href and pg.locator('#annotateLink').get_attribute('target') is None, 'writing mode opens in the same tab')
        pg.locator('#annotateLink').click(); pg.wait_for_url('**/pdf-notes.html**'); pg.wait_for_selector('#st-back')
        chk(pg.inner_text('#st-back').strip() == '‹ رجوع' and pg.locator('#st-home').is_visible(), 'back + home shown when opened from a course')
        pg.click('#st-back'); pg.wait_for_url('**/course.html?id=medical-immunology**', timeout=5000); chk('course.html' in pg.url, 'back returns to the course page')
        pg.goto(reader(BASE, 'files/فسيولوجيا-الكلية/المحاضرة-1-Kidney-Slides.pdf')); pg.wait_for_selector('#st-back')
        chk('الرئيسية' in pg.inner_text('#st-back'), 'opened directly: home button')
        pg.click('#st-back'); pg.wait_for_url('**/index.html', timeout=5000); chk(pg.url.endswith('/index.html'), 'home button goes to the homepage')
        chk(not errs, 'no page errors: ' + '; '.join(errs[:2]))
        b.close()
finally:
    srv.terminate()
chk.done()
