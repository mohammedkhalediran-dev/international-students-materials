# python3 -I tests/studio_phase4_browser.py — Smart Study Layer: text-anchored highlight, highlight→flashcard (source-linked,
# scheduler), highlight→MCQ (validation, explanation), study masks (page coordinates incl. margins/rotation), scanned pages,
# exact source return, changed/missing source, existing data preserved, nothing leaves the browser.
import os, sys, json, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8805 + PORT_OFFSET; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO SMART')
A = 'files/uploaded/studio-mixed.pdf'; SC = 'files/uploaded/studio-scan.pdf'
def ab(u): return BASE + u
INK = lambda u: 'medixa.pdf.annotations.v1:' + ab(u); STUDY = lambda u: 'medixa.study.v1:' + ab(u); OCC = lambda u: 'medixa.occlusion.v1:' + ab(u)
def ls(pg, key, d='null'): return json.loads(pg.evaluate("k => localStorage.getItem(k)", key) or d)
def load(ctx, u=A, n=5):
    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept()); pg.goto(reader(BASE, u)); pg.wait_for_function(f"document.querySelectorAll('section.page').length>={n}", timeout=15000); pg.wait_for_timeout(1500); return pg
def span_rect(pg, page_index):
    return pg.evaluate("""(i)=>{const sp=document.querySelectorAll('section.page')[i].querySelector('.st-text span');if(!sp)return null;const r=sp.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,sp.textContent]}""", page_index)
def sel_span(pg, page_index):
    pg.evaluate("""(i)=>{const sp=document.querySelectorAll('section.page')[i].querySelector('.st-text span');const r=document.createRange();r.selectNodeContents(sp);const s=getSelection();s.removeAllRanges();s.addRange(r)}""", page_index); pg.wait_for_selector('#st-seltools:not([hidden])', timeout=5000)
def to_top(pg, i): pg.evaluate("(i)=>document.querySelectorAll('section.page')[i].scrollIntoView()", i); pg.wait_for_timeout(900)
JS = """async (arr) => { const doc = await pdfjsLib.getDocument({data:new Uint8Array(arr)}).promise, out=[];
  for (const n of [1,3,4]) { const pg=await doc.getPage(n), vp=pg.getViewport({scale:1}); const c=document.createElement('canvas'); c.width=Math.ceil(vp.width); c.height=Math.ceil(vp.height); await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
    const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let y=0; for(let i=0;i<d.length;i+=4){ if(d[i]>220&&d[i+1]>180&&d[i+2]<200&&d[i+2]>80)y++; } const tc=await pg.getTextContent(); out.push({y,text:tc.items.map(i=>i.str).join(' ')}); } return out; }"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox']); ctx = new_context(b, {A: 'mixed.pdf', SC: 'scan.pdf'}, viewport={'width': 1300, 'height': 1000}, accept_downloads=True); errs = []; hosts = set()
        ctx.on('request', lambda r: hosts.add(re.sub(r'^https?://([^/]+).*', r'\1', r.url)))
        # an existing card with scheduler fields must survive untouched
        seed = ctx.new_page(); seed.goto(BASE + 'privacy.html'); legacy = {'id': 'legacy1', 'question': 'Old Q', 'answer': 'Old A', 'page': 2, 'reps': 3, 'interval': 6, 'ease': 2.5, 'due': 1}
        seed.evaluate("([k,v])=>localStorage.setItem(k,v)", [STUDY(A), json.dumps({'masks': [], 'cards': [legacy], 'notes': [], 'quiz': [], 'maps': []})]); seed.close()
        pg = load(ctx); pg.on('pageerror', lambda e: errs.append(str(e)))
        chk(pg.evaluate("document.querySelectorAll('section.page')[0].querySelectorAll('.st-text span').length") > 0, 'selectable text layer exists on pages with text')
        chk(pg.evaluate("document.querySelectorAll('section.st-blank .st-text').length") == 0, 'no text layer on virtual pages')
        # ---------- text-anchored highlight (real mouse selection) ----------
        pg.evaluate("MedixaStudio.setTool('select')"); to_top(pg, 0); r = span_rect(pg, 0)
        y = (r[1] + r[3]) / 2; pg.mouse.move(r[0] + 3, y); pg.mouse.down(); pg.mouse.move(r[2] - 3, y, steps=10); pg.mouse.up(); pg.wait_for_selector('#st-seltools:not([hidden])', timeout=5000)
        chk(pg.locator('#st-seltools .st-sel-hl').count() == 4 and pg.locator('#st-seltools .st-sel-card').count() == 1, 'selecting text shows highlight colours, card, question and mask actions')
        pg.click('#st-seltools .st-sel-hl >> nth=0'); pg.wait_for_timeout(500)
        hl = [x for x in ls(pg, INK(A), '[]') if x['tool'] == 'texthl']; chk(len(hl) == 1 and hl[0]['page'] == 1 and 'fixture' in hl[0]['quote'], f'text-anchored highlight saved with its quote {hl and hl[0]["quote"]}')
        chk(all(0 <= q[0] < q[2] <= 1 and 0 <= q[1] < q[3] <= 1 for q in hl[0]['rects']) and hl[0].get('rects') and hl[0]['tool'] == 'texthl', 'rects are normalized page coordinates'); chk(hl[0]['tool'] != 'highlight', 'distinct from freehand highlighter')
        chk(pg.evaluate("getSelection().isCollapsed"), 'selection cleared after highlighting'); chk(pg.is_hidden('#st-seltools'), 'action bar closes')
        # rotated (90) and rotated+cropped (270) pages, programmatic selection
        for i in (2, 3): to_top(pg, i); sel_span(pg, i); pg.click('#st-seltools .st-sel-hl >> nth=0'); pg.wait_for_timeout(400)
        pages_hl = sorted(x['page'] for x in ls(pg, INK(A), '[]') if x['tool'] == 'texthl'); chk(pages_hl == [1, 3, 4], f'highlights on rotated pages {pages_hl}')
        # undo / erase treat it as one object
        pg.evaluate("MedixaStudio.undo()"); pg.wait_for_timeout(300); chk(len([x for x in ls(pg, INK(A), '[]') if x['tool'] == 'texthl']) == 2, 'undo removes the whole highlight'); pg.evaluate("MedixaStudio.redo()"); pg.wait_for_timeout(300)
        # reload: painted again; export: highlight present, original text kept
        pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length>=5", timeout=15000); pg.wait_for_timeout(1800)
        painted = pg.evaluate("(()=>{const c=document.querySelectorAll('canvas.ink')[0],d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n})()"); chk(painted > 200, f'highlight repainted after reload ({painted}px)')
        with pg.expect_download() as dl: pg.evaluate("document.getElementById('download').click()")
        path = os.path.join(FX, 'p4.pdf'); dl.value.save_as(path); v = ctx.new_page(); v.goto(BASE + 'privacy.html'); v.add_script_tag(url='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
        v.evaluate("()=>{pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}"); res = v.evaluate(JS, list(open(path, 'rb').read()))
        chk(all(x['y'] > 150 for x in res), f'exported PDF carries the text highlight on pages 1, 3 and 4 ({[x["y"] for x in res]})'); chk(all('Mixed fixture' in x['text'] for x in res), 'original text still selectable in the export'); v.close()
        # ---------- highlight -> flashcard ----------
        pg.evaluate("MedixaStudio.setTool('select')"); to_top(pg, 0); sel_span(pg, 0); pg.click('#st-seltools .st-sel-card'); pg.wait_for_selector('#st-draft[open]')
        chk('fixture' in pg.input_value('#st-d-a') and 'صفحة 1' in pg.inner_text('#st-draft .st-cite'), 'card draft is prefilled from the selection and cites the real page')
        pg.click('#st-d-save'); chk('اكتب الأمام' in pg.inner_text('#st-d-err'), 'empty front is rejected'); pg.click('#st-d-cloze'); chk('_____' in pg.input_value('#st-d-q'), 'cloze helper (existing text-card logic) fills the question')
        pg.fill('#st-d-q', 'What does the fixture page say?'); pg.click('#st-d-save'); pg.wait_for_timeout(500)
        data = ls(pg, STUDY(A)); cards = data['cards']; new = [c for c in cards if c['id'] != 'legacy1']
        chk(len(new) == 1 and new[0]['source']['pageId'] == 1 and new[0]['source']['documentId'] == ab(A) and re.fullmatch(r'[0-9a-f]{16}', new[0]['source']['documentVersion']) and new[0]['source']['rects'] and 'fixture' in new[0]['source']['quote'], f'card saved with a complete source anchor {new and new[0].get("source",{}).get("documentVersion")}')
        chk([c for c in cards if c['id'] == 'legacy1'][0] == legacy, 'existing card and its scheduler fields untouched')
        # scheduler: the new card is a normal due card in the existing review tab
        pg.click('#study-launch'); pg.click('[data-study-tab=review]'); pg.wait_for_timeout(300); chk('What does the fixture page say?' in pg.inner_text('#study-content') or 'Old Q' in pg.inner_text('#study-content'), 'cards enter the existing review queue')
        pg.click('[data-study-tab=cards]'); pg.wait_for_timeout(300); chk('المنطقة' in pg.inner_text('#study-content') and pg.locator('#study-content [data-st-src]').count() == 1, 'only the anchored card gets a "region" return button')
        # return to the exact source
        to_top(pg, 4); pg.click('#study-launch') if not pg.evaluate("document.getElementById('study-panel').classList.contains('open')") else None; pg.click('[data-study-tab=cards]'); pg.click('#study-content [data-st-src]'); pg.wait_for_timeout(1500)
        chk(pg.evaluate("MedixaStudio.reader.current()") == 1, 'source button returns to the page'); chk(pg.locator('section.page >> nth=0 >> .st-src-flash').count() >= 1, 'and flashes the exact region')
        fl = pg.evaluate("(()=>{const f=document.querySelector('.st-src-flash').getBoundingClientRect(),s=document.querySelector('section.page .st-text span').getBoundingClientRect();return [f.left-s.left,f.top-s.top,f.width/s.width,f.height/s.height]})()"); chk(abs(fl[0]) < 6 and abs(fl[1]) < 8 and 0.9 < fl[2] < 1.2, f'flash overlays the original text ({[round(x,2) for x in fl]})')
        # changed / missing source
        d2 = ls(pg, STUDY(A)); d2['cards'][-1]['source']['documentVersion'] = 'deadbeefdeadbeef'; pg.evaluate("([k,v])=>localStorage.setItem(k,v)", [STUDY(A), json.dumps(d2)]); pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length>=5"); pg.wait_for_timeout(1500)
        pg.click('#study-launch'); pg.click('[data-study-tab=cards]'); pg.click('#study-content [data-st-src]'); pg.wait_for_selector('#studio-banner.open'); chk('تغيّر ملف المحاضرة' in pg.inner_text('#studio-banner'), 'changed lecture version is explained, not hidden')
        d3 = ls(pg, STUDY(A)); d3['cards'][-1]['source']['pageId'] = 99; pg.evaluate("([k,v])=>localStorage.setItem(k,v)", [STUDY(A), json.dumps(d3)]); pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length>=5"); pg.wait_for_timeout(1500)
        pg.click('#study-launch'); pg.click('[data-study-tab=cards]'); pg.click('#study-content [data-st-src]'); pg.wait_for_selector('#studio-banner.open'); chk('لم تعد موجودة' in pg.inner_text('#studio-banner') and 'fixture' in pg.inner_text('#studio-banner'), 'missing source page gives a recoverable message with the saved quote')
        # ---------- highlight -> MCQ ----------
        pg.evaluate("MedixaStudio.setTool('select')"); to_top(pg, 0); sel_span(pg, 0); pg.click('#st-seltools .st-sel-mcq'); pg.wait_for_selector('#st-draft[open]'); chk(pg.is_visible('#st-ai-note') and 'غير متاح' in pg.inner_text('#st-ai-note'), 'AI generation is clearly marked unavailable (manual drafting)')
        pg.click('#st-d-save'); chk('نص السؤال' in pg.inner_text('#st-d-err'), 'stem required'); pg.fill('#st-d-q', 'Which page is this?')
        for i, t in enumerate(['one', 'two', 'two', 'four']): pg.fill(f'#st-d-o{i}', t)
        pg.check('#st-d-c1'); pg.click('#st-d-save'); chk('مختلفة' in pg.inner_text('#st-d-err'), 'duplicate options rejected'); pg.fill('#st-d-o2', 'three')
        pg.evaluate("document.querySelectorAll('[name=st-correct]').forEach(r=>r.checked=false)"); pg.click('#st-d-save'); chk('خياراً واحداً' in pg.inner_text('#st-d-err'), 'exactly one correct answer required'); pg.check('#st-d-c1'); pg.fill('#st-d-x', 'It is page 1 of the fixture.'); pg.click('#st-d-save'); pg.wait_for_timeout(500)
        qz = ls(pg, STUDY(A))['quiz']; chk(len(qz) == 1 and qz[0]['correct'] == 1 and qz[0]['explanation'].startswith('It is page 1') and qz[0]['source']['pageId'] == 1 and qz[0]['options'] == ['one', 'two', 'three', 'four'], 'question saved with one correct answer, explanation and citation')
        pg.click('#study-launch'); pg.click('[data-study-tab=quiz]'); pg.wait_for_timeout(300); qid = qz[0]['id']
        pg.click(f'[data-answer="{qid}:0"]'); chk('✗' in pg.inner_text(f'#feedback-{qid}') and 'page 1 of the fixture' in pg.inner_text(f'#feedback-{qid}'), 'wrong answer shows the right letter and explanation')
        pg.click(f'[data-answer="{qid}:1"]'); chk('✓' in pg.inner_text(f'#feedback-{qid}'), 'correct answer accepted'); pg.click('#study-close')
        # ---------- masks (page coordinates; margins and rotation) ----------
        pg.evaluate("MedixaStudio.setTool('select')"); pg.evaluate("MedixaStudio.setMargins(1,{l:0,t:0,r:0.5,b:0})"); pg.wait_for_timeout(700); to_top(pg, 0); sel_span(pg, 0); sr = span_rect(pg, 0); pg.click('#st-seltools .st-sel-mask'); pg.wait_for_timeout(500)
        ms = ls(pg, OCC(A), '[]'); chk(len(ms) >= 1 and ms[0]['page'] == 1 and 0 <= ms[0]['x'] < 1 and ms[0]['w'] > 0.02, f'mask stored in page coordinates {ms and ms[0]}')
        mr = pg.evaluate("(()=>{const m=document.querySelector('section.page .mx-mask').getBoundingClientRect();return [m.left,m.top,m.right,m.bottom]})()")
        chk(mr[0] <= sr[0] + 8 and mr[2] >= sr[2] - 8 and mr[1] <= sr[1] + 8 and mr[3] >= sr[3] - 8, f'mask covers the selected text even with a margin on the page ({[round(x) for x in mr]} vs {[round(x) for x in sr[:4]]})')
        to_top(pg, 2); sel_span(pg, 2); sr3 = span_rect(pg, 2); pg.click('#st-seltools .st-sel-mask'); pg.wait_for_timeout(500)
        mr3 = pg.evaluate("(()=>{const m=document.querySelectorAll('section.page')[2].querySelector('.mx-mask').getBoundingClientRect();return [m.left,m.top,m.right,m.bottom]})()")
        chk(mr3[0] <= sr3[0] + 8 and mr3[2] >= sr3[2] - 8 and mr3[1] <= sr3[1] + 8 and mr3[3] >= sr3[3] - 8, 'mask covers the selected text on the rotated page')
        pg.evaluate("MedixaStudio.setTool('pen')")
        # ---------- scanned page: no text -> honest message; region tools ----------
        sc = load(ctx, SC, 1); sc.on('pageerror', lambda e: errs.append(str(e))); sc.evaluate("MedixaStudio.setTool('select')"); sc.wait_for_selector('#studio-banner.open', timeout=6000); chk('بلا نص' in sc.inner_text('#studio-banner'), 'scanned page: text extraction unavailable is stated, not faked')
        sc.evaluate("MedixaStudio.setTool('region')"); to_top(sc, 0); bb = sc.evaluate("(()=>{const r=document.querySelector('canvas.ink').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()")
        sc.mouse.move(bb[0] + bb[2] * 0.1, 420); sc.mouse.down(); sc.mouse.move(bb[0] + bb[2] * 0.6, 520, steps=6); sc.mouse.up(); sc.wait_for_selector('#st-seltools:not([hidden])'); chk(sc.locator('#st-seltools .st-sel-hl').count() == 0, 'region has no text highlight (nothing to anchor)')
        sc.click('#st-seltools .st-sel-card'); sc.wait_for_selector('#st-draft[open]'); chk('منطقة من الصورة' in sc.inner_text('#st-draft .st-cite'), 'region card cites an image region'); sc.fill('#st-d-q', 'What is in this region?'); sc.fill('#st-d-a', 'A blue rectangle'); sc.click('#st-d-save'); sc.wait_for_timeout(500)
        rc = ls(sc, STUDY(SC))['cards'][0]; chk(rc['source']['quote'] == '' and len(rc['source']['rects']) == 1, 'region card stored without invented text')
        sc.evaluate("MedixaStudio.setTool('region')"); sc.mouse.move(bb[0] + bb[2] * 0.1, 420); sc.mouse.down(); sc.mouse.move(bb[0] + bb[2] * 0.4, 480, steps=6); sc.mouse.up(); sc.wait_for_selector('#st-seltools:not([hidden])'); sc.click('#st-seltools .st-sel-mask'); sc.wait_for_timeout(500); chk(len(ls(sc, OCC(SC), '[]')) == 1, 'region mask saved')
        # ---------- privacy: nothing left the browser; draft survives reload ----------
        ext = [h for h in hosts if not h.startswith('localhost')]; chk(set(ext) <= {'cdnjs.cloudflare.com', 'fonts.googleapis.com'}, f'no lecture text sent anywhere (external hosts: {ext})')
        pg.evaluate("MedixaStudio.setTool('select')"); to_top(pg, 0); sel_span(pg, 0); pg.click('#st-seltools .st-sel-card'); pg.wait_for_selector('#st-draft[open]'); pg.fill('#st-d-q', 'half written draft'); pg.wait_for_timeout(300)
        pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length>=5"); pg.wait_for_timeout(2500); chk('مسودة' in pg.inner_text('#studio-banner'), 'unfinished draft is offered back after reload')
        pg.click('#studio-banner button >> text=متابعة'); pg.wait_for_selector('#st-draft[open]'); chk(pg.input_value('#st-d-q') == 'half written draft', 'draft restored with its text')
        chk(not errs, f'no JS errors {errs[:3]}'); b.close()
finally:
    srv.terminate()
chk.done()
