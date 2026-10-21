# python3 -I tests/studio_sharp_select_browser.py — قارئ PDF (2026-10-21، بطلب محمد «النص بدقة منخفضة وليس نصاً أصلياً»):
# 1) محاضرة لها صور صفحات محفوظة تُرسم من PDF نفسه حين يتوفر pdf.js (نص حقيقي)، 2) عند التكبير يُرسم الجزء الظاهر بدقة الشاشة
# (canvas.pdf-hd) والكتابة كذلك (canvas.ink-hd) ولا تتجاوز أي لوحة ميزانية iPad، 3) شريط التحديد الأبيض بترتيب Notewise
# وتسطير وشطب يُحفظان ويُرسمان، 4) ضغطة مطوّلة بالإصبع في أداة اليد تحدد الكلمة، والمشاركة تنسخ حين لا تتوفر مشاركة النظام،
# 5) الواجهة كما في فيديو Notewise: صف واحد في الأعلى، شريط سريع للقلم والتظليل، حبة صفحة/تكبير صغيرة، أسهم جانبية، وسحابة المزامنة في الرأس.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8871 + PORT_OFFSET; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO SHARP + SELECT')
KIDNEY = 'files/فسيولوجيا-الكلية/المحاضرة-1-Guyton-Chapter-26.pdf'     # لها صور صفحات محفوظة في pdf-raster
IPAD = dict(viewport={'width': 1180, 'height': 820}, device_scale_factor=2, has_touch=True,
            user_agent='Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')
CANVAS = """() => [...document.querySelectorAll('#pages canvas')].map(c => ({cls: c.className, px: c.width * c.height, w: c.width, cssw: c.getBoundingClientRect().width}))"""
def setup(ctx): ctx.add_init_script("try{localStorage.setItem('ms.guest','1');localStorage.setItem('medixa.studio.selhint','1')}catch(e){}")
def open_doc(ctx, errs, f=KIDNEY):
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(reader(BASE, f)); pg.wait_for_selector('section.page .st-text span', timeout=30000); pg.wait_for_timeout(1200); return pg
def select_words(pg):
    return pg.evaluate("""()=>{const sp=[...document.querySelectorAll('section.page .st-text span')].find(s=>/kidney/i.test(s.textContent))||document.querySelector('section.page .st-text span');
      sp.scrollIntoView({block:'center'});const r=document.createRange();r.selectNodeContents(sp);const s=getSelection();s.removeAllRanges();s.addRange(r);return sp.textContent}""")
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox']); errs = []
        ctx = new_context(b, {}, **IPAD); setup(ctx); pg = open_doc(ctx, errs)
        # ---------- 1. نص حقيقي من PDF لا صورة محفوظة ----------
        chk(pg.evaluate("!!(MedixaStudio.reader.raster && MedixaStudio.reader.raster.length)"), 'this lecture has saved page images (the old low-resolution path)')
        drawn = pg.evaluate("""async()=>{const R=MedixaStudio.reader,p=R.pages[0];const ctx=p.pdf.getContext('2d');return {w:p.pdf.width,proxy:!!p.proxy}}""")
        chk(drawn['proxy'] and drawn['w'] > 1, f'page 1 drawn by pdf.js from the PDF itself {drawn}')
        chk(pg.evaluate("!!document.querySelector('section.page .st-text span') && /\\w{4,}/.test(document.querySelector('section.page .st-text').textContent)"), 'the page has a real text layer')
        # ---------- 2. التكبير: الجزء الظاهر بدقة الشاشة ----------
        for z in (3, 7.65):
            pg.evaluate(f"MedixaStudio.reader.setZoom({z})"); pg.wait_for_timeout(2600)
            cv = pg.evaluate(CANVAS); hd = [c for c in cv if c['cls'] == 'pdf-hd']
            chk(len(hd) >= 1 and abs(hd[0]['w'] / hd[0]['cssw'] - 2) < 0.06, f'zoom {z}: visible part drawn at screen resolution {hd[:1]}')
            chk(all(c['px'] <= 4.25e6 for c in cv), f'zoom {z}: no canvas over the iPad budget {max(c["px"] for c in cv):.0f}px')
        pg.evaluate("""()=>{MedixaStudio.addItem({id:'z1',v:2,rev:1,page:1,tool:'pen',color:'#e43d56',width:3,points:[[0.2,0.1],[0.4,0.14]]});MedixaStudio.markDirty();
          const p=document.querySelector('section.page'),r=p.getBoundingClientRect();scrollBy(0,r.top+r.height*0.1-300);document.getElementById('pages').scrollBy(r.left+r.width*0.25,0)}""")
        pg.wait_for_timeout(2200); cv = pg.evaluate(CANVAS); ink = [c for c in cv if c['cls'] == 'ink-hd']
        chk(len(ink) >= 1 and abs(ink[0]['w'] / ink[0]['cssw'] - 2) < 0.06, f'zoom 7.65: ink of the visible part at screen resolution {ink[:1]}')
        pg.evaluate("MedixaStudio.reader.setZoom(0.7)"); pg.wait_for_timeout(1500)
        chk(not [c for c in pg.evaluate(CANVAS) if c['cls'] in ('pdf-hd', 'ink-hd') and c['px'] > 1], 'zoomed out: no extra sharp layers (the page canvas is already sharp)')
        pg.evaluate("MedixaStudio.reader.setZoom(1)"); pg.wait_for_timeout(1500)
        chk(all(c['px'] <= 4.25e6 for c in pg.evaluate(CANVAS)), '100%: every canvas within the iPad budget')
        # ---------- 3. شريط التحديد ----------
        pg.evaluate("MedixaStudio.setTool('select')"); q = select_words(pg); pg.wait_for_selector('#st-seltools:not([hidden])', timeout=5000); pg.wait_for_timeout(200)
        order = pg.evaluate("[...document.querySelectorAll('#st-seltools button')].map(b=>b.className.replace('st-sel-btn ','').split(' ')[0])")
        chk(order[:7] == ['st-sel-copy', 'st-sel-hl', 'st-sel-ul', 'st-sel-st', 'st-sel-tr', 'st-sel-find', 'st-sel-share'], f'Notewise order: copy, highlight, underline, strike, translate, search, share {order}')
        chk(pg.evaluate("getComputedStyle(document.getElementById('st-seltools')).backgroundColor") == 'rgb(255, 255, 255)', 'white bar like the reference')
        chk(pg.evaluate("[...document.querySelectorAll('#st-seltools .st-sel-btn')].every(b=>b.getAttribute('aria-label') && !b.textContent.trim())"), 'icons only, every button has an Arabic label')
        bb = pg.locator('#st-seltools').bounding_box(); sel = pg.evaluate("(()=>{const r=getSelection().getRangeAt(0).getBoundingClientRect();return [r.top,r.bottom]})()")
        chk(bb['y'] + bb['height'] <= sel[0] + 1 or bb['y'] >= sel[1] - 1, 'the bar does not cover the selected text')
        pg.click('#st-seltools .st-sel-ul'); pg.wait_for_timeout(300)
        select_words(pg); pg.wait_for_selector('#st-seltools:not([hidden])'); pg.click('#st-seltools .st-sel-st'); pg.wait_for_timeout(300)
        marks = pg.evaluate("MedixaStudio.S.items.filter(x=>x&&x.tool==='texthl').map(x=>x.mark||'hl')")
        chk(marks.count('underline') == 1 and marks.count('strike') == 1, f'underline and strike saved as text-anchored marks {marks}')
        saved = pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('medixa.pdf.annotations.v1:')).map(k=>localStorage.getItem(k)).join('')")
        chk('"mark":"underline"' in saved and '"mark":"strike"' in saved, 'marks are in the saved annotations (so sync and backup carry them)')
        # رسم الخط: بكسلات ملوّنة تحت السطر
        pg.wait_for_timeout(600)
        px = pg.evaluate("""()=>{const s=MedixaStudio.S.items.find(x=>x&&x.mark==='underline'),p=MedixaStudio.reader.byId.get(s.page),r=s.rects[0],a=p.pdf.getBoundingClientRect(),
          X=a.left+(r[0]+r[2])/2*a.width,Y=a.top+r[3]*a.height;let n=0;
          for(const c of p.el.querySelectorAll('canvas.ink-hd,canvas.ink')){const cb=c.getBoundingClientRect();if(X<cb.left||X>cb.right||Y<cb.top||Y>cb.bottom)continue;const k=c.width/cb.width,
            d=c.getContext('2d').getImageData((X-cb.left)*k-6,(Y-cb.top)*k-8,12,12).data;for(let i=0;i<d.length;i+=4) if(d[i+3]>100&&d[i]>150&&d[i+1]<120) n++;}return n}""")
        chk(px > 3, f'underline is drawn under the text line ({px} red pixels)')
        pg.evaluate("MedixaStudio.undo()"); pg.wait_for_timeout(200)
        chk(pg.evaluate("MedixaStudio.S.items.filter(x=>x&&x.mark==='strike').length") == 0, 'undo removes the strike')
        # المشاركة بلا مشاركة النظام: نسخ
        ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
        pg.evaluate("delete navigator.share; Object.defineProperty(navigator,'share',{value:undefined,configurable:true})")
        q = select_words(pg); pg.wait_for_selector('#st-seltools:not([hidden])'); pg.click('#st-seltools .st-sel-share'); pg.wait_for_timeout(400)
        chk(pg.evaluate("navigator.clipboard.readText()").strip()[:10] == q.strip()[:10], 'share without the system sheet copies the text')
        # ---------- 4. ضغطة مطوّلة بالإصبع في أداة اليد ----------
        pg.evaluate("getSelection().removeAllRanges(); MedixaStudio.smart.hide(); MedixaStudio.setTool('hand')"); pg.wait_for_timeout(200)
        pt = pg.evaluate("""()=>{const sp=[...document.querySelectorAll('section.page .st-text span')].find(s=>/[A-Za-z]{5,}/.test(s.textContent));sp.scrollIntoView({block:'center'});const r=sp.getBoundingClientRect();return [r.left+Math.min(30,r.width/3),r.top+r.height/2]}""")
        pg.wait_for_timeout(300); s0 = pg.evaluate("scrollY")
        cdp = ctx.new_cdp_session(pg)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': pt[0], 'y': pt[1]}]}); pg.wait_for_timeout(700)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(400)
        word = pg.evaluate("getSelection().toString()")
        chk(len(word.strip()) >= 2 and ' ' not in word.strip(), f'long press selected one word: {word!r}')
        chk(pg.is_visible('#st-seltools'), 'the action bar appears after the long press')
        chk(abs(pg.evaluate("scrollY") - s0) < 2, 'the long press did not scroll the page')
        pg.evaluate("getSelection().removeAllRanges()"); pg.wait_for_timeout(300)
        chk(not pg.evaluate("document.body.classList.contains('st-selecting')"), 'clearing the selection gives the hand tool back (no stuck selection mode)')
        # ---------- 5. الواجهة كما في الفيديو: صف واحد في الأعلى، شريط سريع تحت الأدوات، صفحة/تكبير صغيرة، أسهم جانبية ----------
        pg.evaluate("MedixaStudio.setTool('pen')"); pg.wait_for_timeout(300)
        box = lambda sel: pg.evaluate(f"(()=>{{const e=document.querySelector({sel!r});if(!e||!e.offsetWidth)return null;const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]}})()")
        tb, nv, ac = box('#studio-toolbar'), box('#st-compact-nav'), box('#studio-hdr-actions')
        chk(tb and nv and ac and abs(tb[1] - nv[1]) < 2 and tb[0] > nv[2] and tb[2] < ac[0], f'iPad landscape: one top row, toolbar between the two pills without overlap {tb} {nv} {ac}')
        qb = box('#st-quickbar')
        chk(qb and qb[1] > tb[3] and qb[1] - tb[3] < 16 and abs((qb[0] + qb[2]) / 2 - (tb[0] + tb[2]) / 2) < 2, f'pen: quick bar centred just under the toolbar {qb}')
        chk(pg.evaluate("[document.querySelectorAll('#st-quickbar .st-size').length, document.querySelectorAll('#st-quickbar .st-swatch').length, !!document.querySelector('#st-quickbar .st-qplus'), !!document.querySelector('#st-quickbar .st-qset')]") == [3, 5, True, True], 'quick bar: 3 thicknesses, 5 colours, custom colour, settings')
        pg.click('#st-quickbar .st-swatch[data-color="#7c4dff"]'); pg.click('#st-quickbar .st-size[data-w="6"]'); pg.wait_for_timeout(150)
        chk(pg.evaluate("[MedixaStudio.S.color, MedixaStudio.S.width, document.querySelector('#st-quickbar .st-swatch[data-color=\"#7c4dff\"]').getAttribute('aria-pressed')]") == ['#7c4dff', 6, 'true'], 'quick bar colour and thickness apply to the pen')
        pg.click('#st-quickbar .st-qset'); pg.wait_for_timeout(250)
        ts = box('#st-toolset')
        chk(ts and ts[1] >= qb[3], f'settings button opens the full pen settings below the quick bar {ts}')
        pg.keyboard.press('Escape'); pg.evaluate("MedixaStudio.setTool('highlight')"); pg.wait_for_timeout(200)
        chk(pg.evaluate("[...document.querySelectorAll('#st-quickbar .st-swatch')].map(b=>b.dataset.color)[0]") == '#f2c230', 'highlighter: the quick bar offers marker colours')
        for t in ('eraser', 'hand'):
            pg.evaluate(f"MedixaStudio.setTool('{t}')"); pg.wait_for_timeout(150)
            chk(not pg.evaluate("!!document.getElementById('st-quickbar')") and not pg.evaluate("document.body.classList.contains('st-has-quick')"), f'{t}: no quick bar')
        dk, bd = box('#mx-dock'), box('#acct-sync')
        chk(dk and dk[2] - dk[0] < 200, f'page / zoom pill is small {dk}')
        chk(bd and ac and bd[0] >= ac[0] - 1 and bd[3] <= ac[3] + 1, f'the sync cloud sits in the right header pill, not on the page pill {bd}')
        pg.evaluate("MedixaStudio.reader.fit && MedixaStudio.reader.fit()"); pg.wait_for_timeout(400)
        p0 = pg.evaluate("+document.querySelector('#mx-reader-nav [data-mx-page]').value")
        pg.click('#st-edge-next'); pg.wait_for_timeout(900)
        p1 = pg.evaluate("+document.querySelector('#mx-reader-nav [data-mx-page]').value")
        chk(p1 == p0 + 1, f'edge arrow turns to the next page {p0}->{p1}')
        pg.click('#st-edge-prev'); pg.wait_for_timeout(900)
        chk(pg.evaluate("+document.querySelector('#mx-reader-nav [data-mx-page]').value") == p0, 'edge arrow turns back')
        ctx.close()
        # الهاتف: لا شريط سريع ولا أسهم جانبية (المساحة للشريط السفلي)
        ctx = new_context(b, {}, viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True); setup(ctx); pg = open_doc(ctx, errs)
        pg.evaluate("MedixaStudio.setTool('pen')"); pg.wait_for_timeout(200)
        chk(not pg.evaluate("!!document.getElementById('st-quickbar')") and not pg.is_visible('#st-edge-nav'), 'phone keeps its bottom bar: no quick bar, no edge arrows')
        chk(not errs, 'no page errors: ' + '; '.join(errs[:3]))
        b.close()
finally:
    srv.terminate()
chk.done()
