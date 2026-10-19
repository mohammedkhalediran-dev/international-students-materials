# python3 -I tests/studio_ipad_memory_browser.py — قارئ الكتابة والتظليل على iPad (محاكاة لمس وشاشة بكثافة 2):
# سفاري يُفرغ اللوحات (صفحات بيضاء) عند تجاوز ميزانية الذاكرة؛ هنا نتأكد أن كل لوحة ≤ 4 ملايين بكسل،
# وأن الصفحات المرسومة في الذاكرة قليلة أثناء التمرير، وأن الصفحة الظاهرة مرسومة فعلاً (ليست بيضاء)، مع التكبير أيضاً.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8807; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO IPAD MEMORY')
DOC = 'files/فسيولوجيا-الكلية/المحاضرة-1-Kidney-Slides.pdf'  # 17 صفحة ممسوحة (الأثقل في الموقع)
STATS = """() => { const cs = [...document.querySelectorAll('section.page canvas')]; const live = cs.filter(c => c.width > 4);
  return { maxPx: Math.max(0, ...live.map(c => c.width * c.height)), totalPx: live.reduce((a, c) => a + c.width * c.height, 0),
           pdfLive: [...document.querySelectorAll('section.page canvas.pdf')].filter(c => c.width > 4).length }; }"""
VISIBLE_INK = """() => { const ps = [...document.querySelectorAll('section.page')]; const p = ps.find(s => { const r = s.getBoundingClientRect(); return r.top < innerHeight / 2 && r.bottom > innerHeight / 2; });
  const c = p && p.querySelector('canvas.pdf'); if (!c || c.width < 5) return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let k = 0;
  for (let i = 0; i < d.length; i += 4 * 97) if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) k++; return k; }"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = new_context(b, {}, viewport={'width': 820, 'height': 1180}, device_scale_factor=2, has_touch=True, is_mobile=True,
                          user_agent='Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')
        ctx.add_init_script("try{localStorage.setItem('ms.guest','1')}catch(e){}")
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(reader(BASE, DOC)); pg.wait_for_function("document.querySelectorAll('section.page').length>=17", timeout=20000); pg.wait_for_timeout(2500)
        worst = {'maxPx': 0, 'totalPx': 0, 'pdfLive': 0}
        for i in range(0, 17, 2):
            pg.evaluate("(i)=>document.querySelectorAll('section.page')[i].scrollIntoView()", i); pg.wait_for_timeout(700)
            s = pg.evaluate(STATS); worst = {k: max(worst[k], s[k]) for k in worst}
        chk(worst['maxPx'] <= 4_000_000, f"every canvas ≤ 4M px (max {worst['maxPx']:,})")
        chk(worst['pdfLive'] <= 6, f"few page images kept while scrolling (max {worst['pdfLive']})")
        chk(worst['totalPx'] <= 60_000_000, f"total canvas pixels bounded (max {worst['totalPx']:,})")
        pg.wait_for_timeout(1200); chk(pg.evaluate(VISIBLE_INK) > 50, 'visible page is actually drawn (not blank)')
        # zoom in (writing at large size) must stay within the budget and still draw
        pg.evaluate("()=>{const b=[...document.querySelectorAll('button')].find(x=>/تكبير|zoom ?in|\\+/i.test((x.getAttribute('aria-label')||'')+x.textContent));b&&b.click();b&&b.click();b&&b.click();}"); pg.wait_for_timeout(2000)
        s = pg.evaluate(STATS)
        chk(s['maxPx'] <= 4_000_000, f"zoomed: canvas still ≤ 4M px ({s['maxPx']:,})")
        chk(pg.evaluate(VISIBLE_INK) > 50, 'zoomed: visible page drawn')
        chk(not errs, 'no page errors: ' + '; '.join(errs[:2]))
        b.close()
finally:
    srv.terminate()
chk.done()
