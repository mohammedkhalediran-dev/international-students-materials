# python3 -I tests/step47_ui_audit.py — Step 47 UI audit guard (headless Chromium, simulated server; not a real device).
# At 390 and 820 px, light and dark: no horizontal page scroll, no text under 12px, header and footer controls at least
# 44px tall and 24px wide (touch; text links can be narrower), and muted text at least 4.5:1 on white. Covers the main pages and the login page.
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import guest_mode  # noqa: E402 — صفحة الدخول أولاً (Step 60): الفحوص القديمة تعمل كزائر
import subprocess, time, os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PORT = 8800; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
PAGES = ['index.html', 'semester.html?id=3', 'course.html?id=medical-immunology', 'study.html?id=medical-immunology&lec=1', 'workspace.html', 'login.html']
PROBE = r"""() => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const tiny = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let t;
  while (t = w.nextNode()) { const e = t.parentElement; if (!t.textContent.trim() || !e || !vis(e)) continue; if (e.closest('.mm-world')) continue; /* Step 53: نصوص الرسم التوضيحي داخل بانر الرئيسية (مخفية عن قارئ الشاشة وتُصغَّر مع الرسم كصورة) */ const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12) tiny.push(t.textContent.trim().slice(0, 20) + ' ' + fs); }
  const small = [...document.querySelectorAll('.site-header button, .site-header a, .site-header select, .footer-links a')].filter(vis)
    .map(e => [e.id || e.className || e.tagName, e.getBoundingClientRect()]).filter(([, r]) => r.height < 43.5 || r.width < 24).map(([k, r]) => k + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  return {h: document.documentElement.scrollWidth - document.documentElement.clientWidth, tiny: [...new Set(tiny)].slice(0, 5), small};
}"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for (w, h) in [(390, 844), (820, 1180)]:
            for theme in ['light', 'dark']:
                ctx = b.new_context(viewport={'width': w, 'height': h}); ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
                pg = ctx.new_page(); pg.goto(BASE + 'index.html'); pg.evaluate("t => localStorage.setItem('ms.theme', JSON.stringify(t))", theme)
                for u in PAGES:
                    pg.goto(BASE + u); pg.wait_for_timeout(900)
                    r = pg.evaluate(PROBE); tag = f'{w}/{theme}/{u}'
                    chk(r['h'] <= 1, f'{tag}: no horizontal scroll ({r["h"]}px)')
                    chk(not r['tiny'], f'{tag}: no text under 12px {r["tiny"]}')
                    if u != 'login.html': chk(not r['small'], f'{tag}: header/footer controls at least 44px {r["small"]}')
                if theme == 'light':
                    cr = pg.evaluate("""() => { const d = document.createElement('p'); d.style.color = 'var(--color-muted)'; document.body.append(d);
                      const m = getComputedStyle(d).color.match(/\\d+/g).map(Number); d.remove(); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
                      const L = .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); return 1.05 / (L + .05); }""")
                    chk(cr >= 4.5, f'{w}: muted text contrast on white {cr:.2f}')
                ctx.close()
        b.close()
finally:
    srv.terminate()
print('STEP47 UI AUDIT FAILED' if fails else f'STEP47 UI AUDIT OK: {n} checks')
sys.exit(1 if fails else 0)
