# python3 -I tests/studio_annotations_browser.py — «ملاحظاتي» as an annotation navigator: summary line, kind chips (and the
# old 'sticky'/'text' values), grouped cards per page, quotes, image previews, search, click -> page + flashes, live
# updates (add / undo / delete), per-page count pills on thumbnails, night mode, and the phone sheet.
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8842 + PORT_OFFSET; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO ANNOTATIONS')
URL = 'files/uploaded/studio-mixed.pdf'; KEY = 'medixa.pdf.annotations.v1:' + BASE + URL
def stored(pg): return json.loads(pg.evaluate("k => localStorage.getItem(k)", KEY) or '[]')
def load(ctx):
    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept()); pg.goto(reader(BASE, URL))
    pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(600); return pg
ADD = """() => {
  const M = MedixaStudio, C = M.C, mk = o => Object.assign({ id: C.newId(), v: 2, rev: 1, color: '#e43d56', width: 3 }, o);
  const Q = 'Cardiac output equals stroke volume times heart rate. '.repeat(3).trim();
  const items = [
    mk({ page: 1, tool: 'texthl', color: '#f2c230', op: 0.35, points: [[0.1, 0.2], [0.6, 0.23]], rects: [[0.1, 0.2, 0.6, 0.23]], quote: Q }),
    mk({ page: 1, tool: 'pen', points: [[0.1, 0.5], [0.3, 0.52], [0.4, 0.55]] }),
    mk({ page: 1, tool: 'pen', points: [[0.15, 0.6], [0.35, 0.62]] }),
    mk({ page: 3, tool: 'pen', color: '#2f6fed', points: [[0.2, 0.4], [0.5, 0.45]] }),
    mk({ page: 1, tool: 'sticky', color: '#18334b', text: 'High yield\\nSA node paces the heart', w: 0.28, h: 0.1, size: 18, points: [[0.5, 0.7]] }),
    mk({ page: 2, tool: 'rectangle', color: '#2f6fed', points: [[0.2, 0.2], [0.4, 0.3]] }),
    mk({ page: 3, tool: 'image', asset: 'img_' + '0123456789abcdef'.repeat(2), w: 0.2, h: 0.1, k: 1.414, points: [[0.1, 0.1]] })
  ];
  M.commit(items.map(s => M.addItem(s)));
  return items.map(s => s.id);
}"""
CARDS = "[...document.querySelectorAll('#st-notes-list .st-note')].map(c=>[c.dataset.kind,+c.dataset.page,c.innerText])"
def cards(pg): return pg.evaluate(CARDS)
def summary(pg): return pg.inner_text('#st-notes-sum')
def chip(pg, f): pg.click(f'#st-notes .st-chip[data-f="{f}"]'); pg.wait_for_timeout(80); return len(cards(pg))
def flash_box(pg, n): return pg.evaluate("""(n)=>{const sec=document.querySelector('#pages > section[data-page="'+n+'"]'),fs=sec?[...sec.querySelectorAll('.st-src-flash')]:[];
  if(!fs.length)return null;const a=sec.getBoundingClientRect(),b=fs[0].getBoundingClientRect();return {n:fs.length,box:[(b.left-a.left)/a.width,(b.top-a.top)/a.height,b.width/a.width,b.height/a.height]}}""", n)
def badge(pg, n): return pg.evaluate("(n)=>{const t=document.querySelector('#st-thumbs .st-th[data-page=\"'+n+'\"] .st-th-b');return t&&!t.hidden?t.innerText.trim():''}", n)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        # ================= desktop / tablet landscape: both panels docked =================
        ctx = new_context(b, {URL: 'mixed.pdf'}, viewport={'width': 1300, 'height': 900})
        ctx.add_init_script("try{localStorage.setItem('ms.guest','1')}catch(e){}")
        errs = []; pg = load(ctx); pg.on('pageerror', lambda e: errs.append(str(e)))
        ids = pg.evaluate(ADD); pg.wait_for_timeout(300)
        chk(len(stored(pg)) == 7, f'7 annotations saved through addItem + commit ({len(stored(pg))})')
        pg.click('#st-notes-toggle'); pg.wait_for_selector('#st-notes.open'); pg.wait_for_timeout(250)
        chk(summary(pg) == 'المجموع: 1 ملاحظة · 1 تظليل · 3 كتابة · 1 شكل · 1 صورة', f'summary line ({summary(pg)})')
        c = cards(pg)
        chk([(k, n) for k, n, _ in c] == [('texthl', 1), ('pen', 1), ('sticky', 1), ('shape', 2), ('image', 3), ('pen', 3)], f'cards in page order then top-to-bottom, strokes grouped {[(k, n) for k, n, _ in c]}')
        chk('كتابة بخط اليد · عنصران' in c[1][2] and 'صفحة 1' in c[1][2], f'grouped handwriting card on page 1 ({c[1][2]!r})')
        chk('كتابة بخط اليد · عنصر واحد' in c[5][2] and 'صفحة 3' in c[5][2], f'grouped handwriting card on page 3 ({c[5][2]!r})')
        chk('أشكال · عنصر واحد' in c[3][2], f'shape card ({c[3][2]!r})')
        q = pg.inner_text('#st-notes-list .st-note[data-kind=texthl] .st-ann-q')
        chk(q.startswith('Cardiac output equals stroke volume') and q.endswith('…') and len(q) <= 141, f'quote shown and cut at 140 chars ({len(q)})')
        chk(pg.evaluate("getComputedStyle(document.querySelector('#st-notes-list .st-note[data-kind=texthl]')).getPropertyValue('--note-fill').trim()") == '#f2c230', 'quote card carries the highlight colour bar')
        chk('High yield' in c[2][2] and 'SA node' in c[2][2], 'sticky note card shows title and body')
        chk(pg.locator('#st-notes-list .st-note[data-kind=image] .st-ann-img').count() == 1 and not pg.evaluate("document.querySelector('.st-ann-img').classList.contains('has-img')"), 'image card shows a neutral tile when the picture is not on this device')
        # ---- chips ----
        vis = pg.evaluate("[...document.querySelectorAll('#st-notes .st-chip')].filter(b=>!b.hidden).map(b=>b.dataset.f)")
        chk(vis == ['all', 'notes', 'hl', 'ink', 'shape', 'img'], f'six kind chips {vis}')
        counts = {f: chip(pg, f) for f in ['notes', 'hl', 'ink', 'shape', 'img', 'all']}
        chk(counts == {'notes': 1, 'hl': 1, 'ink': 2, 'shape': 1, 'img': 1, 'all': 6}, f'filter counts {counts}')
        pg.click('#st-notes .st-chip[data-f="hl"]'); pg.wait_for_timeout(80)
        chk(pg.locator('#st-notes .st-chip[aria-pressed=true]').get_attribute('data-f') == 'hl', 'active chip is pressed')
        chk(summary(pg).startswith('المجموع: 1 ملاحظة'), 'summary counts the whole file, not the filter')
        pg.evaluate("MedixaStudio.panels.setFilter('sticky')"); pg.wait_for_timeout(80); s1 = cards(pg)
        pg.evaluate("MedixaStudio.panels.setFilter('text')"); pg.wait_for_timeout(80); s2 = cards(pg)
        chk(len(s1) == 1 and s1[0][0] == 'sticky' and len(s2) == 0, f"old filter values 'sticky'/'text' still work ({len(s1)}, {len(s2)})")
        pg.click('#st-notes .st-chip[data-f="all"]'); pg.wait_for_timeout(80)
        # ---- search: notes text + highlight quotes ----
        pg.fill('#st-notes-q', 'stroke volume'); pg.wait_for_timeout(120); r = cards(pg)
        chk(len(r) == 1 and r[0][0] == 'texthl', f'search finds a word inside a highlight quote {[(k, n) for k, n, _ in r]}')
        pg.fill('#st-notes-q', 'SA NODE'); pg.wait_for_timeout(120); r = cards(pg)
        chk(len(r) == 1 and r[0][0] == 'sticky', 'search matches note body (case-insensitive)')
        pg.fill('#st-notes-q', 'zzz nothing'); pg.wait_for_timeout(120)
        chk(len(cards(pg)) == 0 and 'لا توجد نتائج مطابقة' in pg.inner_text('#st-notes-list'), 'search with no match explains itself')
        pg.fill('#st-notes-q', ''); pg.wait_for_timeout(120); chk(len(cards(pg)) == 6, 'clearing the search restores every card')
        # ---- click -> page + flashes ----
        pg.click('#st-notes-list .st-note[data-kind=pen][data-page="3"]'); pg.wait_for_timeout(1000)
        cur = pg.evaluate("MedixaStudio.reader.current()"); f = flash_box(pg, 3)
        chk(cur == 3, f'handwriting card on page 3 navigates there ({cur})')
        chk(f and f['n'] == 1, f'the stroke is outlined on the page ({f})')
        chk(pg.evaluate("document.getElementById('st-notes').classList.contains('open')"), 'wide screens keep the panel open after a jump')
        pg.click('#st-notes-list .st-note[data-kind=texthl]'); pg.wait_for_timeout(1000)
        cur = pg.evaluate("MedixaStudio.reader.current()"); f = flash_box(pg, 1)
        chk(cur == 1, f'quote card navigates to page 1 ({cur})')
        chk(f and f['n'] == 1 and all(abs(a - e) < 0.012 for a, e in zip(f['box'], [0.1, 0.2, 0.5, 0.03])), f'flash sits exactly on the highlighted text rect ({f})')
        pg.wait_for_timeout(400); pg.click('#st-notes-list .st-note[data-kind=pen][data-page="1"]'); pg.wait_for_timeout(900)
        f = flash_box(pg, 1); chk(f and f['n'] == 2, f'a grouped card outlines each of its strokes ({f})')
        chk(pg.evaluate("document.querySelectorAll('.st-src-flash').length") == 2, 'earlier flashes on the page are replaced, not stacked')
        # ---- thumbnails: per-page counts ----
        pg.click('#medixa-thumbs-toggle'); pg.wait_for_selector('#st-pages.open'); pg.wait_for_timeout(500)
        bs = [badge(pg, n) for n in range(1, 6)]
        chk(bs == ['4', '1', '2', '', ''], f'thumbnail pills count annotations per page {bs}')
        chk(pg.evaluate("document.querySelector('#st-thumbs .st-th[data-page=\"1\"]').getAttribute('aria-label')") == 'الصفحة 1 — 4 تعليقات', 'thumbnail label speaks the count')
        inside = pg.evaluate("(()=>{const t=document.querySelector('#st-thumbs .st-th[data-page=\"3\"]'),b=t.querySelector('.st-th-b'),a=t.getBoundingClientRect(),r=b.getBoundingClientRect();return r.left>=a.left&&r.right<=a.right&&r.top>=a.top&&r.bottom<=a.bottom&&getComputedStyle(b).backgroundColor})()")
        chk(inside == 'rgb(22, 140, 140)', f'pill is teal and inside its thumbnail ({inside})')
        # ---- live updates: add, undo, delete ----
        pg.evaluate("(()=>{const M=MedixaStudio;M.commit([M.addItem({id:M.C.newId(),v:2,rev:1,page:4,tool:'pen',color:'#e43d56',width:3,points:[[.2,.2],[.4,.25]]})])})()"); pg.wait_for_timeout(450)
        chk(badge(pg, 4) == '1' and '4 كتابة' in summary(pg) and len(cards(pg)) == 7, f'new stroke updates pill, summary and list ({badge(pg, 4)!r}, {summary(pg)})')
        pg.evaluate("MedixaStudio.undo()"); pg.wait_for_timeout(450)
        chk(badge(pg, 4) == '' and '3 كتابة' in summary(pg) and len(cards(pg)) == 6, 'undo updates them back')
        rect_id = ids[5]; pg.evaluate("(id)=>{const M=MedixaStudio;M.commit(M.removeItems([id]))}", rect_id); pg.wait_for_timeout(450)
        chk(pg.evaluate("document.querySelector('#st-notes .st-chip[data-f=shape]').hidden") and 'شكل' not in summary(pg) and badge(pg, 2) == '', 'a kind that is gone loses its chip, summary part and pill')
        pg.evaluate("MedixaStudio.undo()"); pg.wait_for_timeout(450)
        chk(not pg.evaluate("document.querySelector('#st-notes .st-chip[data-f=shape]').hidden") and badge(pg, 2) == '1', 'undo brings the shape back')
        # ---- a real picture from the on-device store gets a preview ----
        real = pg.evaluate("""async()=>{const c=document.createElement('canvas');c.width=60;c.height=40;const x=c.getContext('2d');x.fillStyle='#d0342c';x.fillRect(0,0,60,40);
          const blob=await new Promise(r=>c.toBlob(r,'image/png')),a=await MedixaAssets.put(blob),M=MedixaStudio;
          M.commit([M.addItem({id:M.C.newId(),v:2,rev:1,page:2,tool:'image',asset:a.id,w:.3,h:.2,k:1.414,points:[[.5,.5]]})]);return a.id}""")
        pg.wait_for_function("[...document.querySelectorAll('#st-notes-list .st-note[data-kind=image][data-page=\"2\"] .st-ann-img')].some(e=>e.classList.contains('has-img'))", timeout=5000)
        px = pg.evaluate("(()=>{const c=document.querySelector('#st-notes-list .st-note[data-kind=image][data-page=\"2\"] canvas'),d=c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data;return [d[0],d[1],d[2]]})()")
        chk(px[0] > 180 and px[1] < 90, f'image card draws a 44px preview of the real picture ({px})')
        chk('2 صورة' in summary(pg), f'summary counts both pictures ({summary(pg)})')
        # ---- touch targets and night mode ----
        small = pg.evaluate("[...document.querySelectorAll('#st-notes .st-chip,#st-notes-list .st-note,#st-notes .st-x,#st-notes-q')].filter(e=>!e.hidden&&e.offsetParent).map(e=>e.getBoundingClientRect()).filter(r=>r.height<43.5).length")
        chk(small == 0, f'every control in the panel is at least 44px tall ({small} smaller)')
        spill = pg.evaluate("[...document.querySelectorAll('#st-notes-list .st-note')].filter(c=>{const r=c.getBoundingClientRect();return [...c.querySelectorAll('*')].some(x=>x.getBoundingClientRect().bottom>r.bottom+0.5)}).length")
        chk(pg.evaluate("document.getElementById('st-notes-list').scrollHeight>document.getElementById('st-notes-list').clientHeight") and spill == 0, f'a long list scrolls; cards keep their height instead of squeezing ({spill} spill)')
        pg.evaluate("document.body.classList.add('medixa-dark')"); pg.wait_for_timeout(100)
        dark = pg.evaluate("[getComputedStyle(document.getElementById('st-notes-sum')).backgroundColor,getComputedStyle(document.querySelector('#st-notes-list .st-note')).backgroundColor,getComputedStyle(document.querySelector('#st-notes-list .st-note-p')).color]")
        chk(dark == ['rgb(22, 59, 61)', 'rgb(34, 49, 60)', 'rgb(143, 216, 216)'], f'night mode colours for summary, cards and page labels {dark}')
        pg.evaluate("document.body.classList.remove('medixa-dark')")
        chk(not errs, f'no page errors (desktop) {errs[:2]}'); ctx.close()

        # ================= phone: the panel is a sheet; a tap jumps and closes it =================
        ctx = new_context(b, {URL: 'mixed.pdf'}, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        ctx.add_init_script("try{localStorage.setItem('ms.guest','1')}catch(e){}")
        errs = []; pg = load(ctx); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.evaluate(ADD); pg.wait_for_timeout(300)
        pg.tap('#st-notes-toggle'); pg.wait_for_selector('#st-notes.open'); pg.wait_for_timeout(250)
        box = pg.evaluate("(()=>{const r=document.getElementById('st-notes').getBoundingClientRect();return [r.left,r.right,r.top,r.bottom]})()")
        chk(box[0] >= 0 and box[1] <= 390 and box[2] > 0 and box[3] <= 844, f'phone: the panel fits the screen as a sheet ({box})')
        chk(pg.evaluate("getComputedStyle(document.querySelector('#st-notes .st-chips')).flexWrap") == 'nowrap', 'phone: chips stay in one scrollable row')
        chk(pg.evaluate("document.documentElement.scrollWidth") <= 390, 'phone: no sideways page scroll')
        chk(summary(pg).startswith('المجموع:') and len(cards(pg)) == 6, 'phone: same summary and cards')
        pg.tap('#st-notes-list .st-note[data-kind=shape]'); pg.wait_for_timeout(1100)
        chk(not pg.evaluate("document.getElementById('st-notes').classList.contains('open')"), 'phone: tapping a card closes the sheet')
        cur = pg.evaluate("MedixaStudio.reader.current()"); f = flash_box(pg, 2)
        chk(cur == 2 and f and f['n'] == 1, f'phone: jumps to page 2 and outlines the rectangle ({cur}, {f})')
        chk(not errs, f'no page errors (phone) {errs[:2]}')
        b.close()
finally:
    srv.terminate()
chk.done()
