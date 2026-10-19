# python3 -I tests/step44_summary_browser.py — Step 44 read-only study summary on course.html (headless Chromium, simulated server).
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import guest_mode  # noqa: E402 — صفحة الدخول أولاً (Step 60): الفحوص القديمة تعمل كزائر
import subprocess, time, os, sys, json, urllib.parse
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PORT = 8788; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
PATH = 'المناعة-الطبية/المحاضرة-1-Overview-of-the-Immune-System.pdf'
URL = 'files/' + '/'.join(urllib.parse.quote(x, safe='') for x in PATH.split('/'))   # same as course.html fileUrl()
ABS = BASE + URL
now = int(time.time() * 1000)
SEED = {
    'medixa.pdf.annotations.v1:' + ABS: json.dumps([{'page': 1, 'tool': 'pen', 'points': [[0, 0], [1, 1]]}, {'page': 3, 'tool': 'pen', 'points': [[0, 0], [1, 1]]}]),
    'medixa.study.v1:' + ABS: json.dumps({'cards': [{'q': 'a', 'due': now - 1000, 'lastReviewed': now - 86400000}, {'q': 'b', 'due': now + 10 * 86400000}, {'q': 'c'}], 'notes': [{'body': 'n'}], 'masks': []}),
    'medixa.v85.' + URL + '.splitNotes': json.dumps({'1': 'x', '2': ' ', '4': 'y'}),
    'medixa.occlusion.v1:' + ABS: '{corrupt',
}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(); ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + 'index.html'); pg.evaluate("s => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }", SEED)
        before = pg.evaluate("JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().filter(k => k.startsWith('medixa.')).map(k => [k, localStorage.getItem(k)])))")
        pg.goto(BASE + 'course.html?id=medical-immunology'); pg.wait_for_timeout(1500)
        s = pg.evaluate("u => MedixaStudySummary.forFile(u)", URL)
        chk(s['strokes'] == 2 and s['inkPages'] == 2, f'ink counted {s}')
        chk(s['cards'] == 3 and s['due'] == 2, f'cards and due (new card counts as due) {s}')
        chk(s['notes'] == 3, f'notes: 1 card-panel note + 2 non-empty split notes {s}')
        chk(s['masks'] == 0, 'corrupted masks skipped')
        chk(s['last'] == now - 86400000, 'last studied from card review')
        box = pg.locator('.file-study').first
        chk(box.count() == 1, 'summary shown under the lecture file')
        txt = box.inner_text() if box.count() else ''
        chk('بطاقات' in txt and 'للمراجعة الآن' in txt and 'آخر دراسة' in txt, 'summary text: ' + txt)
        after = pg.evaluate("JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().filter(k => k.startsWith('medixa.')).map(k => [k, localStorage.getItem(k)])))")
        chk(before == after, 'summary never writes study data')
        if os.environ.get('MEDIXA_SHOTS'): box.screenshot(path=os.path.join(os.environ['MEDIXA_SHOTS'], 'summary.png')); pg.locator('.files').first.screenshot(path=os.path.join(os.environ['MEDIXA_SHOTS'], 'summary_list.png'))
        pg.evaluate("localStorage.setItem('ms.lang', JSON.stringify('en'))"); pg.reload(); pg.wait_for_timeout(1500)
        t_en = pg.locator('.file-study').first.inner_text()
        chk('cards' in t_en and 'Due now' in t_en and not any('؀' <= ch <= 'ۿ' for ch in t_en), 'English summary fully translated: ' + t_en)
        pg.evaluate("localStorage.setItem('ms.lang', JSON.stringify('ar'))")
        pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('medixa.')).forEach(k => localStorage.removeItem(k))"); pg.reload(); pg.wait_for_timeout(1200)
        chk(pg.locator('.file-study').count() == 0, 'no summary when there is no study data')
        chk(not errs, f'no JS errors {errs[:2]}')
        b.close()
finally:
    srv.terminate()
print('STEP44 SUMMARY BROWSER FAILED' if fails else f'STEP44 SUMMARY BROWSER OK: {n} checks')
sys.exit(1 if fails else 0)
