# python3 -I tests/studio_search_browser.py — البحث داخل الملف في Study Studio (studio-search.js / studio-search.css).
# يحقن الملفين بعد تحميل القارئ (pdf-notes.html لا يربطهما بعد)، ويستعمل محاضرتين حقيقيتين: Guyton (نص) وKidney-Slides (ممسوح).
import os, sys, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8822 + PORT_OFFSET; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO SEARCH')
SITE = os.path.join(ROOT, 'site')
DOC = 'files/فسيولوجيا-الكلية/المحاضرة-1-Guyton-Chapter-26.pdf'
SLIDES = 'files/فسيولوجيا-الكلية/المحاضرة-1-Kidney-Slides.pdf'   # real lecture: slides that are mostly images (some pages have no text)
SCAN = 'files/uploaded/studio-scan.pdf'                             # synthetic fully scanned file (shapes only, no text at all)
MIXED = 'files/uploaded/studio-mixed.pdf'                           # synthetic: pages rotated 0/90/270(+CropBox)/180, landscape

def load(ctx, f, wait_text=True):
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(reader(BASE, f))
    pg.wait_for_selector('section.page .st-text span' if wait_text else 'section.page canvas.pdf', timeout=30000); pg.wait_for_timeout(500)
    if not pg.evaluate('!!window.MedixaSearch'):
        pg.add_style_tag(path=os.path.join(SITE, 'css', 'studio-search.css'))
        pg.add_script_tag(path=os.path.join(SITE, 'js', 'studio-search.js'))
    pg.wait_for_function('!!(window.MedixaSearch && document.getElementById("st-find"))', timeout=5000)
    return pg, errs

def count_text(pg): return pg.inner_text('#st-find-n').strip()
def idx(pg):
    m = re.match(r'^(\d+) / (\d+)$', count_text(pg)); return (int(m.group(1)), int(m.group(2))) if m else (None, None)
def wait_cur(pg): pg.wait_for_selector('.st-find-cur', timeout=8000); pg.wait_for_timeout(150)

# The current mark must cover (overlap) a text-layer span holding part of the matched word on the same page.
OVERLAP = """w => { const c = [...document.querySelectorAll('.st-find-cur')]; if (!c.length) return {ok:false, why:'no current mark'};
  const sec = c[0].closest('section'), mr = c[0].getBoundingClientRect();
  const spans = [...sec.querySelectorAll('.st-text span')].filter(s => { const r = s.getBoundingClientRect(); return r.right > mr.left && r.left < mr.right && r.bottom > mr.top && r.top < mr.bottom; });
  const txt = spans.map(s => s.textContent).join('').toLowerCase();
  return {ok: spans.length > 0 && (txt.includes(w) || txt.includes(w.slice(0, 3)) || txt.includes(w.slice(-3))), top: mr.top, h: mr.height, page: +sec.dataset.page, n: spans.length, txt: txt.slice(0, 80)}; }"""

try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = new_context(b, {SCAN: 'scan.pdf', MIXED: 'mixed.pdf'}, viewport={'width': 1280, 'height': 900})
        ctx.add_init_script("try{localStorage.setItem('ms.guest','1')}catch(e){}")
        pg, errs = load(ctx, DOC)

        # 1) normalisation
        N = lambda s: pg.evaluate('s => MedixaSearch._norm(s)', s)
        chk(N('أحمد') == 'احمد' and N('إسلام') == 'اسلام' and N('آمن') == 'امن' and N('ٱلله') == 'الله', 'alef forms -> ا')
        chk(N('مدرسة') == 'مدرسه' and N('مستشفى') == 'مستشفي', 'ة -> ه and ى -> ي')
        chk(N('مُحَمَّدٌ') == 'محمد' and N('الكـــلية') == 'الكليه', 'harakat and tatweel removed')
        chk(N('  Kid­NEY ​  Tubule ') == 'kidney tubule' and N('ﬁltration') == 'filtration' and N('ﻛﻠﻴﺔ') == 'كليه', 'case, soft hyphen, zero-width, spaces, NFKC')

        # 2) find(): total across pages = sum of per-page counts, pages in order, agrees with an independent count
        res = pg.evaluate("MedixaSearch.find('kidney')")
        tot, pages = res['total'], res['pages']
        chk(tot > 10, f'"kidney" found more than 10 times: {tot}')
        chk(tot == sum(x['count'] for x in pages) and all(x['count'] > 0 for x in pages), f'total equals the sum of per-page counts: {pages}')
        chk([x['id'] for x in pages] == sorted(x['id'] for x in pages), 'results ordered by page')
        naive = pg.evaluate("""async () => { let n = 0; for (const p of MedixaStudio.reader.pages) { if (!p.proxy) continue; const tc = await p.proxy.getTextContent();
            const s = tc.items.map(i => (i.str || '') + (i.hasEOL ? ' ' : '')).join('').toLowerCase(); n += (s.match(/kidney/g) || []).length; } return n; }""")
        chk(abs(naive - tot) <= max(1, tot // 20), f'count agrees with a plain pdf.js text count: {tot} vs {naive}')
        chk(pg.evaluate("MedixaSearch.find('zzqqxx-nothing').then(r => r.total)") == 0, 'no match -> 0')

        # 3) Ctrl+F opens the card with focus in the field; typing + Enter jumps to a marked match
        pg.evaluate('document.activeElement && document.activeElement.blur()')
        pg.keyboard.press('Control+f'); pg.wait_for_timeout(200)
        chk(pg.is_visible('#st-find') and pg.evaluate("document.activeElement.id") == 'st-find-q', 'Ctrl+F opens the search with the field focused')
        chk(pg.evaluate("[...document.querySelectorAll('#st-find button')].every(b => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && b.getAttribute('aria-label'); })"), 'buttons are 44x44 with labels')
        chk(pg.get_attribute('#st-find-q', 'aria-label') == 'ابحث في الملف', 'field has an Arabic label')
        pg.keyboard.type('Kidney'); pg.keyboard.press('Enter'); wait_cur(pg)
        i0, n0 = idx(pg)
        chk(n0 == tot and i0 is not None and 1 <= i0 <= n0, f'count shows "k / total": {count_text(pg)!r}')
        ov = pg.evaluate(OVERLAP, 'kidney')
        chk(ov['ok'], f'current mark overlaps the matched word: {ov}')
        chk(ov.get('top', 0) >= 150 and ov.get('top', 0) + ov.get('h', 0) <= 900, f'current match scrolled into view, >= 150px from the top: {ov.get("top")}')
        st = pg.evaluate('MedixaSearch._state()'); per_page = {x['id']: x['count'] for x in pages}
        ks = pg.evaluate("id => new Set([...document.querySelectorAll(`section[data-page='${id}'] .st-find-hit`)].map(m => m.dataset.k)).size", st['id'])
        chk(ks == per_page.get(st['id']), f'every match on the current page is marked: {ks} of {per_page.get(st["id"])}')
        chk(pg.evaluate("[...document.querySelectorAll('.st-find-hit')].every(m => getComputedStyle(m).pointerEvents === 'none')"), 'marks never take pointer events')

        # 4) next / prev move and wrap around
        pg.keyboard.press('Enter'); pg.wait_for_timeout(300); i1, _ = idx(pg)
        chk(i1 == i0 % n0 + 1, f'Enter -> next: {i0} -> {i1}')
        pg.keyboard.press('Shift+Enter'); pg.wait_for_timeout(300); i2, _ = idx(pg)
        chk(i2 == i0, f'Shift+Enter -> previous: {i1} -> {i2}')
        pg.evaluate("async () => { while (MedixaSearch._state().index !== 0) await MedixaSearch.prev(); }")
        pg.click('#st-find-prev'); pg.wait_for_timeout(400); wait_cur(pg)
        chk(idx(pg) == (n0, n0), f'previous from the first wraps to the last: {count_text(pg)!r}')
        ov = pg.evaluate(OVERLAP, 'kidney'); chk(ov['ok'] and ov['page'] == pages[-1]['id'], f'last match is on the last page with matches: {ov}')
        pg.click('#st-find-next'); pg.wait_for_timeout(400); wait_cur(pg)
        chk(idx(pg) == (1, n0), f'next from the last wraps to the first: {count_text(pg)!r}')
        ov = pg.evaluate(OVERLAP, 'kidney'); chk(ov['ok'] and ov['page'] == pages[0]['id'], f'first match is on the first page with matches: {ov}')

        # 5) zoom re-renders the text layer: marks are re-applied and still on the word
        pg.evaluate('MedixaStudio.reader.zoomBy(1.4)'); pg.wait_for_timeout(1800)
        ov = pg.evaluate(OVERLAP, 'kidney'); chk(ov['ok'], f'after zoom the current mark is still on the word: {ov}')
        pg.evaluate('MedixaStudio.reader.fit()'); pg.wait_for_timeout(800)

        # 6) open(query) jumps to the first match at or after the current page
        pg.evaluate("MedixaStudio.reader.goto(" + str(pages[-1]['id']) + ", false)"); pg.wait_for_timeout(600)
        cp = pg.evaluate('MedixaStudio.reader.current()')
        pg.evaluate("MedixaSearch.open('renal')"); wait_cur(pg)
        st = pg.evaluate('MedixaSearch._state()')
        chk(st['total'] > 0 and st['id'] is not None and st['id'] >= cp, f'open(query) starts at the current page: page {cp} -> match on {st["id"]}')
        chk(pg.input_value('#st-find-q') == 'renal', 'open(query) fills the field')

        # 7) Escape closes and removes every mark
        pg.focus('#st-find-q'); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        chk(not pg.is_visible('#st-find') and pg.locator('.st-find-hit').count() == 0, 'Escape closes the search and removes the marks')

        # 8) Ctrl+F inside another text field is left alone
        pg.evaluate("() => { const t = document.createElement('textarea'); t.id = 'tmp-ta'; document.body.append(t); t.focus(); }")
        pg.keyboard.press('Control+f'); pg.wait_for_timeout(200)
        chk(not pg.is_visible('#st-find'), 'Ctrl+F in another text field does not open the search')
        pg.evaluate("document.getElementById('tmp-ta').remove()")

        # 9) header button toggles the card
        chk(pg.locator('#st-find-btn').count() == 1 and pg.is_visible('#st-find-btn') and not pg.is_visible('#st-find-menu'), 'search button in the header (not in «المزيد») on wide screens')
        pg.click('#st-find-btn'); pg.wait_for_timeout(200)
        chk(pg.is_visible('#st-find') and pg.get_attribute('#st-find-btn', 'aria-expanded') == 'true', 'header button opens the search')
        pg.click('#st-find-x'); pg.wait_for_timeout(200)
        chk(not pg.is_visible('#st-find'), 'close button closes the search')
        chk(not errs, 'no page errors (text file): ' + '; '.join(errs[:2]))
        pg.close()

        # 10) rotated / cropped pages: the current mark sits on the printed words (dark pixels of the page canvas under it)
        pg, errs = load(ctx, MIXED)
        r = pg.evaluate("MedixaSearch.open('alpha beta').then(() => MedixaSearch._state())")
        chk(r['total'] == 5, f'mixed fixture: one match per page: {r}')
        INK = """() => { const m = document.querySelector('.st-find-cur'); if (!m) return -1; const sec = m.closest('section'), cv = sec.querySelector('canvas.pdf');
            const a = cv.getBoundingClientRect(), r = m.getBoundingClientRect(), kx = cv.width / a.width, ky = cv.height / a.height;
            const x = Math.max(0, Math.round((r.left - a.left) * kx)), y = Math.max(0, Math.round((r.top - a.top) * ky)), w = Math.round(r.width * kx), h = Math.round(r.height * ky);
            if (w < 2 || h < 2) return 0; const d = cv.getContext('2d').getImageData(x, y, w, h).data; let n = 0;
            for (let i = 0; i < d.length; i += 4) if (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 90) n++; return n / (w * h); }"""
        for k in range(5):
            pg.wait_for_selector('.st-find-cur', timeout=8000); pg.wait_for_timeout(500)
            st = pg.evaluate('MedixaSearch._state()'); dark = pg.evaluate(INK)
            chk(dark > 0.04, f'mixed page {st["id"]} (rotation {[0, 0, 90, 270, 180][k]}): mark covers the printed words, dark share {dark:.3f}')
            pg.click('#st-find-next')
        chk(not errs, 'no page errors (rotated pages): ' + '; '.join(errs[:2]))
        pg.close()

        # 11) scanned pages: the real slides (image pages are not searchable -> said beside the result), then a fully scanned file
        pg, errs = load(ctx, SLIDES, wait_text=False)
        r = pg.evaluate("MedixaSearch.open('kidney').then(() => MedixaSearch._state())")
        chk(r['total'] == 0 and count_text(pg) == 'لا نتائج', f'slides: no text match -> "لا نتائج": {count_text(pg)!r}')
        chk('صور بلا نص' in pg.inner_text('#st-find-msg'), 'slides: image-only pages are said to be outside the search')
        r = pg.evaluate("MedixaSearch.open('nephron').then(() => MedixaSearch._state())")
        chk(r['total'] >= 1 and idx(pg)[0] is not None and 'صور بلا نص' in pg.inner_text('#st-find-msg'), f'slides: words in the slide text are found, the note stays: {r} {count_text(pg)!r}')
        chk(not errs, 'no page errors (slides): ' + '; '.join(errs[:2]))
        pg.close()
        pg, errs = load(ctx, SCAN, wait_text=False)
        pg.evaluate("MedixaSearch.open('kidney')"); pg.wait_for_function("!MedixaSearch._state().busy && MedixaSearch._state().message", timeout=20000)
        chk(pg.inner_text('#st-find-msg').strip() == 'هذا الملف بلا نص قابل للبحث (ممسوح ضوئياً).' and pg.evaluate('MedixaSearch._state().total') == 0 and count_text(pg) == '', 'scanned file says it has no searchable text')
        chk(pg.is_disabled('#st-find-next') and pg.is_disabled('#st-find-prev'), 'scanned file: next/previous disabled')
        chk(not errs, 'no page errors (scanned file): ' + '; '.join(errs[:2]))
        pg.close(); ctx.close()

        # 12) image mode (pdf.js unreachable, saved page images): search explains it is unavailable
        ctx = b.new_context(viewport={'width': 1280, 'height': 900})
        ctx.add_init_script("try{localStorage.setItem('ms.guest','1')}catch(e){}")
        ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort()); ctx.route('**/cdnjs.cloudflare.com/**', lambda r: r.abort())
        pg, errs = load(ctx, DOC, wait_text=False)
        pg.evaluate("MedixaSearch.open('kidney')"); pg.wait_for_timeout(300)
        chk(pg.inner_text('#st-find-msg').strip() == 'البحث في النص غير متاح في وضع الصور.', 'image mode explains search is unavailable')
        chk(not errs, 'no page errors (image mode): ' + '; '.join(errs[:2]))
        ctx.close()

        # 13) phone: card spans the width with 8px sides, under the header and the page bar
        ctx = new_context(b, {}, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        ctx.add_init_script("try{localStorage.setItem('ms.guest','1')}catch(e){}")
        pg, errs = load(ctx, DOC)
        chk(not pg.is_visible('#st-find-btn'), 'phone: no extra header button (the header keeps its room)')
        pg.tap('#st-docmenu-btn'); pg.wait_for_timeout(150); pg.tap('#st-find-menu'); pg.wait_for_timeout(250)
        chk(pg.is_visible('#st-find') and pg.is_hidden('#st-docmenu'), 'phone: «المزيد» → «بحث في الملف» opens the search')
        geo = pg.evaluate("""() => { const r = document.getElementById('st-find').getBoundingClientRect(), cs = getComputedStyle(document.documentElement);
            const hdr = parseFloat(cs.getPropertyValue('--st-hdr-h')) || 52, pbar = parseFloat(cs.getPropertyValue('--st-pbar')) || 53;
            return {l: r.left, r: innerWidth - r.right, top: r.top, want: hdr + pbar + 6, sw: document.documentElement.scrollWidth, w: innerWidth}; }""")
        chk(abs(geo['l'] - 8) < 1 and abs(geo['r'] - 8) < 1 and abs(geo['top'] - geo['want']) < 2, f'phone card: 8px sides, under the page bar: {geo}')
        chk(geo['sw'] <= geo['w'], f'phone: no horizontal page scroll: {geo}')
        pg.fill('#st-find-q', 'kidney'); pg.press('#st-find-q', 'Enter'); wait_cur(pg)
        ov = pg.evaluate(OVERLAP, 'kidney'); card_bottom = pg.evaluate("document.getElementById('st-find').getBoundingClientRect().bottom")
        chk(ov['ok'] and ov['top'] >= card_bottom, f'phone: current match visible below the card: {ov} card bottom {card_bottom}')
        chk(not errs, 'no page errors (phone): ' + '; '.join(errs[:2]))
        b.close()
finally:
    srv.terminate()
chk.done()
