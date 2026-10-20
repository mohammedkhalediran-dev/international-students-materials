# python3 -I tests/studio_textactions_browser.py — شريط إجراءات النص المحدد في قارئ PDF (studio-smart.js / studio-textactions.css):
# ترجمة | بحث | شرح | نسخ | تظليل ثم بطاقة/سؤال/قناع، ولوحتا الترجمة والشرح (خدمة MEDIXA مُحاكاة بـ page.route لأن خادم
# الاختبار لا يشغّل functions)، والبحث في الملف وفي الإنترنت، والنسخ، والنافذة الصغيرة للتظليل المحفوظ، والهاتف.
import os, sys, json, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8844 + PORT_OFFSET; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO TEXT ACTIONS')
A = 'files/uploaded/studio-mixed.pdf'
OK_STATUS = {'translate': True, 'explain': True, 'signedIn': True}

mock = {}; reqs = []; web = []
def ai_route(route):
    r = route.request; path = urllib.parse.urlparse(r.url).path; key = path.rsplit('/', 1)[-1]
    reqs.append({'key': key, 'method': r.method, 'body': json.loads(r.post_data) if r.post_data else None})
    code, body = mock.get(key, (404, {'ok': False, 'error': 'not_found'}))
    route.fulfill(status=code, content_type='application/json', body=json.dumps(body))
def setup(ctx):
    ctx.add_init_script("try{localStorage.setItem('ms.guest','1');localStorage.setItem('medixa.studio.selhint','1')}catch(e){}")
    ctx.route('**/api/ai/**', ai_route)
    for host in ('https://translate.google.com/**', 'https://www.google.com/**'): ctx.route(host, lambda r: (web.append(r.request.url), r.fulfill(body='ok', content_type='text/plain')))
def load(ctx, errs):
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(reader(BASE, A)); pg.wait_for_selector('section.page .st-text span', timeout=20000); pg.wait_for_timeout(700)
    pg.evaluate("MedixaStudio.setTool('select')"); return pg
def select_line(pg, i=0):
    pg.evaluate("""(i)=>{MedixaStudio.smart.hide();const sp=document.querySelectorAll('section.page')[i].querySelector('.st-text span');sp.scrollIntoView({block:'center'});
      const r=document.createRange();r.selectNodeContents(sp);const s=getSelection();s.removeAllRanges();s.addRange(r)}""", i)
    pg.wait_for_selector('#st-seltools:not([hidden])', timeout=5000); pg.wait_for_timeout(150)
    return pg.evaluate("getSelection().toString().replace(/\\s+/g,' ').trim()")
def keys(k): return [r for r in reqs if r['key'] == k]
def visible(pg, sel): return pg.locator(sel).count() > 0 and pg.locator(sel).first.is_visible()
def inside(pg, sel, bottom_reserve=0):
    b = pg.locator(sel).bounding_box(); vw, vh = pg.evaluate("[innerWidth, innerHeight]")
    return bool(b) and b['x'] >= -0.5 and b['y'] >= -0.5 and b['x'] + b['width'] <= vw + 0.5 and b['y'] + b['height'] <= vh - bottom_reserve + 0.5, b
def wait_text(pg, sel, needle, t=5000):
    try: pg.wait_for_function("([s,n])=>{const e=document.querySelector(s);return !!e&&e.textContent.includes(n)}", arg=[sel, needle], timeout=t); return True
    except Exception: return False
HL_CENTER = """() => { const s = MedixaStudio.S.items.filter(x => x && x.tool === 'texthl').pop(); if (!s) return null; const p = MedixaStudio.reader.byId.get(s.page), q = p.pdf.getBoundingClientRect(), r = s.rects[0];
  return [q.left + (r[0] + r[2]) / 2 * q.width, q.top + (r[1] + r[3]) / 2 * q.height]; }"""
HLS = "MedixaStudio.S.items.filter(x => x && x.tool === 'texthl').map(x => ({id: x.id, color: x.color, op: x.op == null ? null : x.op}))"

try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox']); errs = []
        ctx = new_context(b, {A: 'mixed.pdf'}, viewport={'width': 1300, 'height': 1000}, permissions=['clipboard-read', 'clipboard-write']); setup(ctx)
        # ---------- 1. the action row: order, and nothing sent before a press ----------
        pg = load(ctx, errs); q = select_line(pg)
        chk('fixture' in q, f'selected real PDF text: {q!r}')
        order = pg.evaluate("[...document.querySelectorAll('#st-seltools button')].map(b => b.className.replace('st-sel-btn ', '').split(' ')[0])")
        chk(order[:4] == ['st-sel-tr', 'st-sel-find', 'st-sel-ex', 'st-sel-copy'] and order[4:8] == ['st-sel-hl'] * 4 and order[8:11] == ['st-sel-card', 'st-sel-mcq', 'st-sel-mask'], f'row is ترجمة | بحث | شرح | نسخ | تظليل, then the study actions: {order}')
        chk(pg.evaluate("document.getElementById('st-seltools').getAttribute('role')") == 'toolbar' and all(pg.evaluate("[...document.querySelectorAll('#st-seltools button')].map(b => !!b.getAttribute('aria-label'))")), 'toolbar role and an Arabic label on every button')
        chk(inside(pg, '#st-seltools')[0], 'action row inside the viewport')
        chk(not reqs, f'no /api/ai request before any press ({reqs})')
        pg.evaluate("MedixaStudio.smart.show({pageId: 1, rects: [[0.1, 0.1, 0.5, 0.3]], quote: '', kind: 'region'})")
        chk(pg.evaluate("['.st-sel-tr','.st-sel-find','.st-sel-ex','.st-sel-copy','.st-sel-hl'].every(s => !document.querySelector('#st-seltools ' + s))") and pg.locator('#st-seltools .st-sel-card').count() == 1, 'an image region (no text) gets no text actions, only the study actions')
        q = select_line(pg)
        # ---------- 2. explain panel: nothing sent before «اشرح»; Escape closes and focus returns ----------
        pg.click('#st-seltools .st-sel-ex'); pg.wait_for_selector('#st-explain:not([hidden])')
        txt = pg.inner_text('#st-explain')
        chk(pg.get_attribute('#st-explain', 'role') == 'dialog' and 'الشرح آلي وقد يخطئ؛ راجع المحاضرة.' in txt and 'يُرسل النص المحدد فقط.' in txt, 'explain panel is a dialog with the honesty notes')
        chk(pg.locator('#st-explain [data-mode]').count() == 2 and visible(pg, '#st-ex-go'), 'mode toggle مختصر / مفصّل and an «اشرح» button')
        chk(not reqs, 'opening the explain panel sends nothing (not even the status)')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
        chk(pg.is_hidden('#st-explain'), 'Escape closes the explain panel')
        chk(pg.evaluate("document.activeElement && document.activeElement.classList.contains('st-sel-ex')"), 'focus returns to the شرح button')
        # ---------- 3. translate: success, request body, direction, copy ----------
        mock.update({'status': (200, OK_STATUS), 'translate': (200, {'ok': True, 'text': 'ترجمة تجريبية من الخادم', 'from': 'en', 'to': 'ar', 'model': 'm'})})
        pg.click('#st-seltools .st-sel-tr'); pg.wait_for_selector('#st-tx:not([hidden])')
        chk(wait_text(pg, '#st-tx-out', 'ترجمة تجريبية من الخادم'), 'translation from the service is shown')
        chk(pg.get_attribute('#st-tx', 'role') == 'dialog' and 'يُرسل النص المحدد فقط إلى خدمة الترجمة في MEDIXA.' in pg.inner_text('#st-tx'), 'translate panel says exactly what is sent')
        tp = keys('translate')
        chk(len(keys('status')) == 1 and keys('status')[0]['method'] == 'GET', 'one GET api/ai/status after the press')
        chk(len(tp) == 1 and tp[0]['method'] == 'POST' and tp[0]['body'] == {'text': q, 'to': 'ar'}, f'POST api/ai/translate carries only the selected text and to=ar ({tp and tp[0]["body"]})')
        chk(pg.get_attribute('#st-tx [data-to="ar"]', 'aria-pressed') == 'true', 'English text: direction defaults to «إلى العربية»')
        chk(inside(pg, '#st-tx')[0], 'translate panel inside the viewport')
        mock['translate'] = (200, {'ok': True, 'text': 'English back', 'from': 'ar', 'to': 'en', 'model': 'm'})
        pg.click('#st-tx [data-to="en"]'); chk(wait_text(pg, '#st-tx-out', 'English back'), 'switching to «إلى الإنجليزية» translates again')
        chk(keys('translate')[-1]['body']['to'] == 'en' and len(keys('status')) == 1, 'second request has to=en; status was cached for the page load')
        pg.click('#st-tx-copy'); pg.wait_for_timeout(300)
        chk(pg.evaluate("navigator.clipboard.readText()") == 'English back', 'نسخ الترجمة copies the translation')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(150); chk(pg.is_hidden('#st-tx'), 'Escape closes the translate panel')
        # long selection: the 2000-character limit needs a second press
        n0 = len(keys('translate'))
        pg.evaluate("MedixaStudio.smart.translate({pageId: 1, rects: [[0.1, 0.05, 0.6, 0.09]], quote: 'x', text: 'renal tubule '.repeat(200).trim(), kind: 'text'}, null)")
        chk(wait_text(pg, '#st-tx-msg', '2000') and visible(pg, '#st-tx-more') and len(keys('translate')) == n0, 'a selection over 2000 characters is not sent; the limit is explained')
        pg.click('#st-tx-more'); pg.wait_for_timeout(500)
        lt = keys('translate')[n0:]; chk(len(lt) == 1 and len(lt[0]['body']['text']) <= 2000 and lt[0]['body']['text'].startswith('renal tubule'), 'second press sends the first 2000 characters only')
        pg.keyboard.press('Escape')
        # ---------- 4. explain short / detailed ----------
        q = select_line(pg); mock['explain'] = (200, {'ok': True, 'text': 'شرح موجز.\nالسطر الثاني.', 'mode': 'short', 'model': 'm'})
        pg.click('#st-seltools .st-sel-ex'); pg.wait_for_selector('#st-explain:not([hidden])'); n0 = len(keys('explain'))
        pg.click('#st-ex-go'); chk(wait_text(pg, '#st-ex-out', 'السطر الثاني'), 'short explanation shown')
        ex = keys('explain')[n0:]; chk(len(ex) == 1 and ex[0]['body'] == {'text': q, 'mode': 'short'}, f'explain request: selected text + mode short ({ex and ex[0]["body"]})')
        chk('\n' in pg.inner_text('#st-ex-out'), 'line breaks of the explanation are kept')
        mock['explain'] = (200, {'ok': True, 'text': 'شرح مفصّل كامل', 'mode': 'detailed', 'model': 'm'})
        pg.click('#st-explain [data-mode="detailed"]'); pg.wait_for_timeout(200); chk(len(keys('explain')) == n0 + 1, 'changing the mode alone sends nothing')
        pg.click('#st-ex-go'); chk(wait_text(pg, '#st-ex-out', 'شرح مفصّل كامل') and keys('explain')[-1]['body']['mode'] == 'detailed', 'detailed mode is sent and shown')
        pg.click('#st-ex-copy'); pg.wait_for_timeout(300); chk(pg.evaluate("navigator.clipboard.readText()") == 'شرح مفصّل كامل', 'explanation can be copied')
        pg.keyboard.press('Escape')
        # ---------- 5. copy the selection ----------
        q = select_line(pg); pg.click('#st-seltools .st-sel-copy'); pg.wait_for_timeout(300)
        chk(pg.evaluate("navigator.clipboard.readText()") == q, 'نسخ writes the selected text to the clipboard')
        chk(wait_text(pg, '#st-ta-toast', 'نُسخ النص', 2000), 'short toast «نُسخ النص»')
        # ---------- 6. search: in the file, on the web ----------
        q = select_line(pg); pg.click('#st-seltools .st-sel-find'); pg.wait_for_selector('#st-ta-findmenu:not([hidden])')
        chk(pg.get_attribute('#st-ta-findmenu', 'role') == 'menu' and pg.get_attribute('#st-seltools .st-sel-find', 'aria-expanded') == 'true', 'بحث opens a small menu')
        pg.click('#st-ta-find-file'); pg.wait_for_function("MedixaSearch._state().total >= 1 && !MedixaSearch._state().busy", timeout=15000)
        s = pg.evaluate("MedixaSearch._state()")
        chk(visible(pg, '#st-find') and pg.input_value('#st-find-q') == q[:80] and s['total'] >= 1, f'بحث في الملف opens the find card with the quote and finds it ({s["total"]} result)')
        pg.evaluate("MedixaSearch.close()")
        select_line(pg); pg.click('#st-seltools .st-sel-find'); pg.wait_for_selector('#st-ta-findmenu:not([hidden])')
        with pg.expect_popup() as pop: pg.click('#st-ta-find-web')
        u = pop.value.url; pop.value.close()
        chk('google.com/search?q=' in u and 'fixture' in urllib.parse.unquote_plus(u), f'بحث في الإنترنت opens Google search in a new tab ({u[:80]})')
        chk(pg.url.startswith(BASE + 'pdf-notes.html'), 'the reader itself did not navigate away')
        # ---------- 7. highlight, then the saved-highlight popover ----------
        select_line(pg); pg.click('#st-seltools .st-sel-hl >> nth=0'); pg.wait_for_timeout(300)
        hl = pg.evaluate(HLS); chk(len(hl) == 1 and hl[0]['color'] == '#f2c230', 'تظليل creates a text-anchored highlight')
        pg.evaluate("MedixaStudio.setTool('hand')"); pg.wait_for_timeout(150); x, y = pg.evaluate(HL_CENTER); pg.mouse.click(x, y)
        pg.wait_for_selector('#st-hlpop:not([hidden])', timeout=3000)
        chk(pg.get_attribute('#st-hlpop', 'role') == 'dialog' and pg.locator('#st-hlpop .st-hp-sw').count() == 4 and visible(pg, '#st-hp-op') and visible(pg, '#st-hp-del'), 'tapping the highlight (hand tool) opens its popover: colours, strength, delete')
        chk(visible(pg, '#st-hp-tr') and visible(pg, '#st-hp-find') and visible(pg, '#st-hp-ex'), 'popover offers ترجمة / شرح / بحث for its quote')
        chk(pg.get_attribute('#st-hlpop .st-hp-sw[data-color="#f2c230"]', 'aria-pressed') == 'true', 'current colour is marked')
        pg.click('#st-hlpop .st-hp-sw[data-color="#6fb1ff"]'); pg.wait_for_timeout(200)
        chk(pg.evaluate(HLS)[0]['color'] == '#6fb1ff' and pg.get_attribute('#st-hlpop .st-hp-sw[data-color="#6fb1ff"]', 'aria-pressed') == 'true', 'recolour applied')
        pg.evaluate("MedixaStudio.undo()"); pg.wait_for_timeout(150); chk(pg.evaluate(HLS)[0]['color'] == '#f2c230', 'recolour is one undo step')
        pg.evaluate("MedixaStudio.redo()"); pg.wait_for_timeout(150)
        pg.evaluate("()=>{const r=document.getElementById('st-hp-op');r.value='0.5';r.dispatchEvent(new Event('input',{bubbles:true}));r.value='0.7';r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}))}"); pg.wait_for_timeout(200)
        chk(pg.evaluate(HLS)[0]['op'] == 0.7 and '70%' in pg.inner_text('#st-hp-opv'), 'strength (opacity) applied')
        h0 = pg.evaluate("MedixaStudio.S.hist.undoStack.length"); pg.evaluate("MedixaStudio.undo()"); pg.wait_for_timeout(150)
        chk(pg.evaluate(HLS)[0]['op'] is None and pg.evaluate(HLS)[0]['color'] == '#6fb1ff', 'dragging the strength slider is one undo step')
        chk(pg.evaluate("document.getElementById('st-hp-opv').textContent") == '35%', 'popover follows undo')
        mock['translate'] = (200, {'ok': True, 'text': 'من التظليل', 'from': 'en', 'to': 'ar', 'model': 'm'}); n0 = len(keys('translate'))
        pg.click('#st-hp-tr'); chk(wait_text(pg, '#st-tx-out', 'من التظليل') and 'fixture' in keys('translate')[n0]['body']['text'], 'ترجمة from the popover sends the highlight quote')
        pg.keyboard.press('Escape')
        pg.evaluate("MedixaStudio.setTool('select')"); pg.wait_for_timeout(150); x, y = pg.evaluate(HL_CENTER); pg.mouse.click(x, y)
        pg.wait_for_selector('#st-hlpop:not([hidden])', timeout=3000); chk(pg.evaluate("getSelection().isCollapsed"), 'select tool: a tap on a saved highlight opens the popover instead of selecting the line')
        chk(inside(pg, '#st-hlpop')[0], 'popover inside the viewport')
        pg.click('#st-hp-del'); pg.wait_for_timeout(200); chk(len(pg.evaluate(HLS)) == 0 and pg.is_hidden('#st-hlpop'), 'حذف removes the highlight')
        pg.evaluate("MedixaStudio.undo()"); pg.wait_for_timeout(150); chk(len(pg.evaluate(HLS)) == 1, 'delete is one undo step')
        pg.keyboard.press('Escape')
        pg.close()

        # ---------- 8. not signed in: login link + Google fallback, no translate POST ----------
        reqs.clear(); mock.clear(); mock.update({'status': (200, {'translate': True, 'explain': True, 'signedIn': False})})
        pg = load(ctx, errs); select_line(pg); pg.click('#st-seltools .st-sel-tr'); pg.wait_for_selector('#st-tx:not([hidden])')
        chk(wait_text(pg, '#st-tx-msg', 'سجّل الدخول لاستعمال الترجمة داخل MEDIXA.'), 'signed out: asks to sign in')
        href = pg.get_attribute('#st-tx-login', 'href') or ''; nxt = urllib.parse.parse_qs(urllib.parse.urlparse(href).query).get('next', [''])[0]
        chk(href.startswith('login.html?next=') and nxt.startswith('pdf-notes.html?file='), f'login link returns to this file ({href[:70]})')
        chk(visible(pg, '#st-tx-google') and not keys('translate'), 'Google fallback offered; nothing POSTed')
        n0 = len(web)
        with pg.expect_popup() as pop: pg.click('#st-tx-google')
        pop.value.close(); gq = urllib.parse.parse_qs(urllib.parse.urlparse(web[-1]).query) if len(web) > n0 else {}
        chk(gq.get('tl') == ['ar'] and 'fixture' in gq.get('text', [''])[0], 'Google Translate opens only on press, with the selected text')
        pg.keyboard.press('Escape'); select_line(pg); pg.click('#st-seltools .st-sel-ex'); pg.wait_for_selector('#st-explain:not([hidden])')
        chk('سجّل الدخول' in pg.inner_text('#st-ex-msg') and visible(pg, '#st-ex-login'), 'explain panel already knows the student is signed out')
        pg.close()
        # ---------- 9. service not configured (503 on POST) ----------
        reqs.clear(); mock.clear(); mock.update({'status': (200, OK_STATUS), 'translate': (503, {'ok': False, 'error': 'ai_not_configured'})})
        pg = load(ctx, errs); select_line(pg); pg.click('#st-seltools .st-sel-tr'); pg.wait_for_selector('#st-tx:not([hidden])')
        chk(wait_text(pg, '#st-tx-msg', 'الترجمة الآلية غير مفعّلة على الموقع بعد.') and visible(pg, '#st-tx-google'), '503: «غير مفعّلة» + Google fallback')
        pg.keyboard.press('Escape'); select_line(pg)
        chk(pg.locator('#st-seltools .st-sel-ex').count() == 0 and pg.locator('#st-seltools .st-sel-tr').count() == 1, 'service not configured: the شرح button is no longer shown')
        pg.close()
        # ---------- 10. status says not configured; explain then says so honestly ----------
        reqs.clear(); mock.clear(); mock.update({'status': (200, {'translate': False, 'explain': False, 'signedIn': True})})
        pg = load(ctx, errs); select_line(pg); pg.click('#st-seltools .st-sel-ex'); pg.wait_for_selector('#st-explain:not([hidden])'); pg.click('#st-ex-go')
        chk(wait_text(pg, '#st-ex-msg', 'الشرح الآلي غير مفعّل على الموقع بعد.') and not keys('explain') and not pg.inner_text('#st-ex-out').strip(), 'explain not configured: honest message, no request, no invented text')
        pg.close()
        # ---------- 11. 429, 401, 502 + retry ----------
        reqs.clear(); mock.clear(); mock.update({'status': (200, OK_STATUS), 'translate': (429, {'ok': False, 'error': 'rate_limited'})})
        pg = load(ctx, errs); select_line(pg); pg.click('#st-seltools .st-sel-tr'); pg.wait_for_selector('#st-tx:not([hidden])')
        chk(wait_text(pg, '#st-tx-msg', 'كثرت الطلبات، حاول بعد دقائق.') and pg.locator('#st-tx-out').is_hidden(), '429: «كثرت الطلبات»')
        mock['translate'] = (502, {'ok': False, 'error': 'ai_failed'}); pg.click('#st-tx [data-to="en"]')
        chk(wait_text(pg, '#st-tx-msg', 'تعذّرت الترجمة الآن.') and visible(pg, '#st-tx-retry'), '502: «تعذّرت الترجمة الآن.» + retry')
        mock['translate'] = (200, {'ok': True, 'text': 'retry worked', 'from': 'ar', 'to': 'en', 'model': 'm'}); pg.click('#st-tx-retry')
        chk(wait_text(pg, '#st-tx-out', 'retry worked'), 'retry sends again and shows the result')
        mock['translate'] = (401, {'ok': False, 'error': 'auth'}); pg.click('#st-tx [data-to="ar"]')
        chk(wait_text(pg, '#st-tx-msg', 'سجّل الدخول') and visible(pg, '#st-tx-login') and pg.locator('#st-tx-out').is_hidden(), '401 on POST: login message, the old result is gone')
        pg.keyboard.press('Escape')
        n0 = len(keys('translate')); select_line(pg); pg.click('#st-seltools .st-sel-tr'); pg.wait_for_timeout(500)
        chk(len(keys('translate')) == n0 and 'سجّل الدخول' in pg.inner_text('#st-tx-msg'), 'after a 401 the next press asks to sign in without sending')
        chk(not any(r['key'] not in ('status', 'translate', 'explain') for r in reqs), 'only the three documented AI routes are called')
        pg.close()

        # ---------- 12. phone 390x844: row scrolls inside the screen; panels are bottom sheets ----------
        reqs.clear(); mock.clear(); mock.update({'status': (200, OK_STATUS), 'translate': (200, {'ok': True, 'text': 'ترجمة', 'from': 'en', 'to': 'ar', 'model': 'm'}), 'explain': (200, {'ok': True, 'text': 'شرح', 'mode': 'short', 'model': 'm'})})
        ph = new_context(b, {A: 'mixed.pdf'}, viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=2, permissions=['clipboard-read', 'clipboard-write']); setup(ph)
        pg = load(ph, errs); select_line(pg)
        ok, bb = inside(pg, '#st-seltools'); chk(ok, f'phone: action row inside the viewport {bb}')
        chk(pg.evaluate("(()=>{const b=document.getElementById('st-seltools');return b.scrollWidth>b.clientWidth+20&&getComputedStyle(b).overflowX==='auto'})()"), 'phone: the row scrolls sideways')
        tb = pg.evaluate("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--st-tb-h'))||0")
        pg.locator('#st-seltools .st-sel-tr').tap(); pg.wait_for_selector('#st-tx:not([hidden])'); wait_text(pg, '#st-tx-out', 'ترجمة')
        ok, bb = inside(pg, '#st-tx', tb); chk(ok and bb['x'] <= 9 and bb['width'] >= 370, f'phone: translate panel is a bottom sheet above the drawing bar {bb} (bar {tb}px)')
        pg.keyboard.press('Escape'); select_line(pg); pg.locator('#st-seltools .st-sel-ex').tap(); pg.wait_for_selector('#st-explain:not([hidden])')
        ok, bb = inside(pg, '#st-explain', tb); chk(ok, f'phone: explain panel inside the viewport {bb}')
        pg.keyboard.press('Escape'); select_line(pg); pg.locator('#st-seltools .st-sel-find').tap(); pg.wait_for_selector('#st-ta-findmenu:not([hidden])')
        ok, bb = inside(pg, '#st-ta-findmenu', tb); chk(ok, f'phone: search menu inside the viewport {bb}')
        pg.keyboard.press('Escape'); select_line(pg); pg.locator('#st-seltools .st-sel-hl >> nth=1').tap(); pg.wait_for_timeout(300)
        pg.evaluate("MedixaStudio.setTool('hand')"); pg.wait_for_timeout(150); x, y = pg.evaluate(HL_CENTER); pg.touchscreen.tap(x, y)
        pg.wait_for_selector('#st-hlpop:not([hidden])', timeout=3000); ok, bb = inside(pg, '#st-hlpop', tb); chk(ok, f'phone: a tap on the highlight opens its popover as a sheet {bb}')
        pg.evaluate("document.body.classList.add('medixa-dark')"); chk(pg.evaluate("getComputedStyle(document.getElementById('st-hlpop')).backgroundColor") == 'rgb(27, 38, 48)', 'dark mode styles the popover')
        pg.screenshot(path=os.path.join(FX, 'textactions-phone.png')); pg.keyboard.press('Escape'); pg.wait_for_timeout(100); chk(pg.is_hidden('#st-hlpop'), 'Escape closes the highlight popover')
        chk(not errs, 'no page errors: ' + '; '.join(errs[:3]))
        b.close()
finally:
    srv.terminate()
chk.done()
