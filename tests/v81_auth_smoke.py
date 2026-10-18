# python3 -I tests/v81_auth_smoke.py — فحص دخان لدمج MEDIXA v8.1 مع نظام الدخول:
# كل الصفحات تُحمَّل بلا أخطاء JavaScript، زر الحساب في الرأس، التبليغات، صفحة الكتابة على PDF (احتياطي الصور)، أدوات الدراسة.
import subprocess, time, os, urllib.parse
# MEDIXA_CDN_DIR (اختياري): مجلد فيه pdfjs-dist-3.11.174/package و pdf-lib-1.17.1/package ليعمل الفحص بلا إنترنت (npm pack pdfjs-dist@3.11.174 pdf-lib@1.17.1)
CDN = os.environ.get('MEDIXA_CDN_DIR')
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PORT = 8774; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
        errs = []
        if CDN:
            files = {'pdf.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.worker.min.js', 'pdf-lib.min.js': 'pdf-lib-1.17.1/package/dist/pdf-lib.min.js'}
            def cdn(route):
                name = route.request.url.split('/')[-1].split('?')[0]
                route.fulfill(path=os.path.join(CDN, files[name]), content_type='application/javascript') if name in files else route.abort()
            ctx.route('**/cdnjs.cloudflare.com/**', cdn)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'cdnjs' not in m.text and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
        pages = ['index.html', 'workspace.html', 'workspace.html?view=search', 'workspace.html?view=lectures', 'workspace.html?view=favorites',
                 'workspace.html?view=planner', 'workspace.html?view=questions', 'workspace.html?view=settings', 'semester.html?id=3',
                 'course.html?id=medical-immunology-1', 'study.html?id=medical-immunology-1&lecture=1', 'upload.html', 'login.html', 'admin.html', 'announce.html', 'privacy.html', 'terms.html']
        for u in pages:
            errs.clear()
            pg.goto(BASE + u); pg.wait_for_timeout(900)
            chk(not errs, f'{u}: no JS errors {errs[:2]}')
            chk(pg.locator('body').inner_text().strip() != '', f'{u}: has content')
        # زر الحساب في رأس الصفحات الرئيسية
        for u in ['index.html', 'semester.html?id=3', 'course.html?id=medical-immunology-1', 'workspace.html']:
            pg.goto(BASE + u); pg.wait_for_timeout(1200)
            chk(pg.locator('#accountBtn').count() == 1, f'{u}: account button present')
        # الصفحة الرئيسية: بطاقات الكورسات وأحدث المحاضرات
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(900)
        chk(pg.locator('#semesters a, #semesters .card').count() >= 1, 'home: semester cards')
        chk(pg.locator('#latest a').count() >= 1, 'home: latest lectures list')
        # صفحة الكتابة على PDF: الصفحات تظهر حتى بلا مكتبة CDN (احتياطي الصور)
        f = urllib.parse.quote('files/المناعة-الطبية/المحاضرة-1-Overview-of-the-Immune-System.pdf')
        pg.goto(BASE + 'pdf-notes.html?file=' + f); pg.wait_for_timeout(3500)
        chk(pg.locator('section.page').count() >= 1, f"pdf-notes: pages visible (got {pg.locator('section.page').count()})")
        has_ink = pg.evaluate("() => { const c = document.querySelector('canvas.pdf'); if (!c) return false; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] < 250 || d[i+1] < 250 || d[i+2] < 250) return true; return false; }")
        chk(has_ink, 'pdf-notes: page canvas is not blank (raster fallback drawn)')
        chk(pg.locator('#study-launch').count() == 1, 'pdf-notes: study tools button')
        pg.locator('#study-launch').click(); pg.wait_for_timeout(600)
        chk(pg.locator('text=بطاقات').count() >= 1 or pg.locator('[class*=study]').count() >= 1, 'pdf-notes: study panel opens')
        # الدخول ما زال يعمل: زائر
        pg.goto(BASE + 'index.html'); pg.wait_for_timeout(1200)
        chk(pg.locator('#accountBtn').inner_text().strip() in ('تسجيل الدخول', 'Log in'), 'guest sees login button')
        b.close()
finally:
    srv.terminate()
print('V8.1 SMOKE FAILED' if fails else f'V8.1 SMOKE OK: {n} checks', f'({len(fails)} failed)' if fails else '')
raise SystemExit(1 if fails else 0)
