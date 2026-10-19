# python3 -I tests/studio_translate_browser.py — وضع الكتابة والتظليل: تحديد سطر بلمسة واحدة (iPad) وزر «ترجمة» إلى العربية.
import os, sys, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8809; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO TRANSLATE')
DOC = 'files/فسيولوجيا-الكلية/المحاضرة-1-Physiology-of-Kidneys-Session-1.pdf'
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox']); ctx = new_context(b, {}, viewport={'width': 820, 'height': 1180}, has_touch=True, is_mobile=True, device_scale_factor=2)
        ctx.add_init_script("try{localStorage.setItem('ms.guest','1')}catch(e){}")
        opened = []; ctx.route('https://translate.google.com/**', lambda r: (opened.append(r.request.url), r.fulfill(body='ok')))
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(reader(BASE, DOC)); pg.wait_for_selector('section.page .st-text span', timeout=20000); pg.wait_for_timeout(800)
        pg.click('#studio-settings'); pg.click('#studio-toolbar .st-morepop [data-tool="select"]')   # «تحديد نص» lives in the toolbar's «المزيد»; pg.wait_for_timeout(400)
        chk(pg.evaluate("document.body.classList.contains('st-selecting')"), 'select-text tool on')
        chk('اضغط على سطر' in pg.inner_text('body'), 'first-use hint explains how to select')
        sp = pg.locator('section.page .st-text span').filter(has_text='e').first; txt = sp.inner_text().strip()
        sp.tap(); pg.wait_for_selector('#st-seltools:not([hidden])', timeout=4000)
        chk(pg.evaluate("getSelection().toString().trim()") == txt, f'one tap selects the line: {txt[:40]!r}')
        chk(pg.locator('#st-seltools .st-sel-tr').is_visible(), 'translate button shown')
        pg.locator('#st-seltools .st-sel-tr').click(); pg.wait_for_timeout(1200)
        q = urllib.parse.parse_qs(urllib.parse.urlparse(opened[0]).query) if opened else {}
        chk(opened and q.get('tl') == ['ar'] and q.get('text', [''])[0].strip() == ' '.join(txt.split()), 'translate opens Arabic translation of the selected text')
        chk(not errs, 'no page errors: ' + '; '.join(errs[:2]))
        b.close()
finally:
    srv.terminate()
chk.done()
