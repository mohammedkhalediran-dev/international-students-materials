# python3 -I tests/studio_objects_browser.py — object editing on top of the lasso (studio-tools.js): rectangle selection,
# move / resize / rotate handles (one undo step each, redo), text-highlight restyle that never moves it, colour / width /
# opacity, internal copy-paste (buttons and Ctrl/Cmd+C/V), z-order, pictures (insert, flip, rotate 90°, opacity, crop with
# and without flip, full picture again, duplicate shares the asset, delete + undo, paste and drop, reload from IndexedDB,
# invalid file), the note editor's style row, the phone layout of the selection bar, and PDF export with a picture.
import os, sys, json, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8843 + PORT_OFFSET; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO OBJECTS')
URL = 'files/uploaded/studio-mixed.pdf'; KEY = 'medixa.pdf.annotations.v1:' + BASE + URL
HELP = r"""
window.T = {
  item: id => MedixaStudio.S.items.find(s => s && s.id === id),
  json: id => JSON.parse(JSON.stringify(MedixaStudio.S.items.find(s => s && s.id === id) || null)),
  hist: () => MedixaStudio.S.hist.undoStack.length,
  index: id => MedixaStudio.S.items.findIndex(s => s && s.id === id),
  bounds: id => MedixaStudio.C.bounds(T.item(id)),
  add(list) { const M = MedixaStudio, ops = list.map(s => M.addItem(Object.assign({ id: M.C.newId(), v: 2, rev: 1, page: 1, color: '#e43d56', width: 3 }, s))); M.commit(ops); return ops.map(o => o.s.id); },
  px(n, u, v) { const pg = MedixaStudio.page(n), q = pg.px(u, v), d = pg.ink.getContext('2d').getImageData(Math.round(q[0]), Math.round(q[1]), 1, 1).data; return [d[0], d[1], d[2], d[3]]; },
  client(n, u, v) { const pg = MedixaStudio.page(n), r = pg.ink.getBoundingClientRect(), e = pg.ext; return [r.left + (u + e.l) / (1 + e.l + e.r) * r.width, r.top + (v + e.t) / (1 + e.t + e.b) * r.height]; },
  /* the picture's own frame -> page point, the same mapping drawImageItem uses */
  imgAt(s, a, b) { const C = MedixaStudio.C, c = [s.points[0][0] + s.w / 2, s.points[0][1] + s.h / 2], q = [s.points[0][0] + a * s.w, s.points[0][1] + b * s.h]; return s.rot ? C.rotateIso(q, c, s.rot, s.k) : q; },
  imgPx(id, a, b) { const s = T.item(id), p = T.imgAt(s, a, b); return T.px(s.page, p[0], p[1]); },
  boxSig(n, b) { const out = []; for (let i = 1; i < 8; i++) for (let j = 1; j < 8; j++) out.push(T.px(n, b[0] + (b[2] - b[0]) * i / 8, b[1] + (b[3] - b[1]) * j / 8).join(',')); return out.join('|'); },
  async png(w, h) {   /* left half red, right half blue, a green band across the top of the left half */
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.fillStyle = '#ff0000'; x.fillRect(0, 0, w / 2, h); x.fillStyle = '#0000ff'; x.fillRect(w / 2, 0, w / 2, h); x.fillStyle = '#00ff00'; x.fillRect(0, 0, w / 2, h * 0.25);
    return new Promise(r => c.toBlob(r, 'image/png'));
  },
  slide(id, v) { const i = document.getElementById(id); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }
};
"""
def col(p):
    r, g, b, a = p
    if a < 20: return 'none'
    if r > 170 and g < 100 and b < 100: return 'red'
    if b > 170 and r < 100 and g < 100: return 'blue'
    if g > 170 and r < 100 and b < 100: return 'green'
    return 'other'
def load(ctx):
    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept()); pg.goto(reader(BASE, URL)); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(700); pg.evaluate(HELP); return pg
def top(pg, n=0, y=300):
    pg.evaluate("([i,t])=>{const c=document.querySelectorAll('canvas.ink')[i];scrollBy(0,c.getBoundingClientRect().top-t)}", [n, y]); settle(pg)
def cl(pg, u, v, n=1): return pg.evaluate("([n,u,v])=>T.client(n,u,v)", [n, u, v])
def mdrag(pg, a, b, steps=10, shift=False):
    if shift: pg.keyboard.down('Shift')
    pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move(*b, steps=steps); pg.mouse.up()
    if shift: pg.keyboard.up('Shift')
    pg.wait_for_timeout(200)
def J(pg, i): return pg.evaluate("id=>T.json(id)", i)
def H(pg): return pg.evaluate("T.hist()")
# two animation frames: the engine has repainted whatever the last action changed
def settle(pg): pg.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
def undo(pg): pg.evaluate("MedixaStudio.undo()"); settle(pg)
def redo(pg): pg.evaluate("MedixaStudio.redo()"); settle(pg)
def sel(pg): return pg.evaluate("MedixaStudio.selection.sel.ids.slice()")
def select(pg, ids): pg.evaluate("ids => MedixaStudio.selection.select(ids)", ids); pg.wait_for_timeout(100)
def handles(pg): return pg.evaluate("MedixaStudio.selection.handles()")
def close(a, b, e=1e-6): return all(abs(x - y) < e for x, y in zip(a, b))
def pts_close(a, b, e=1e-6): return len(a) == len(b) and all(close(p, q, e) for p, q in zip(a, b))
def count(pg, tool=None): return pg.evaluate("t => MedixaStudio.S.items.filter(s => s && (!t || s.tool === t)).length", tool)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = new_context(b, {URL: 'mixed.pdf'}, viewport={'width': 1000, 'height': 1500})
        ctx.add_init_script("try{localStorage.setItem('ms.guest','1')}catch(e){}")
        pg = load(ctx); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        top(pg)
        A, B, CC, TH = pg.evaluate("""() => T.add([
          { tool: 'pen', points: [[0.30, 0.30], [0.35, 0.32], [0.40, 0.30], [0.45, 0.32]] },
          { tool: 'rectangle', color: '#2f6fed', points: [[0.32, 0.36], [0.42, 0.42]] },
          { tool: 'pen', points: [[0.70, 0.66], [0.80, 0.68]] },
          { tool: 'texthl', color: '#f2c230', op: 0.35, points: [[0.55, 0.10], [0.75, 0.12]], rects: [[0.55, 0.10, 0.75, 0.12]], quote: 'Heart' }])""")

        # ---------- selection modes ----------
        pg.evaluate("MedixaStudio.setTool('lasso')"); pg.wait_for_timeout(100)
        chk(pg.is_visible('#studio-selbar') and pg.is_visible('#sel-mode-free') and pg.is_visible('#sel-mode-rect'), 'selection bar shows the selection-mode toggle with the lasso')
        pg.click('#sel-mode-rect')
        chk(pg.evaluate("MedixaStudio.selection.mode()") == 'rect' and pg.evaluate("localStorage.getItem('medixa.studio.lassomode.v1')") == 'rect' and pg.get_attribute('#sel-mode-rect', 'aria-pressed') == 'true', 'rectangle mode chosen and remembered')
        mdrag(pg, cl(pg, 0.25, 0.25), cl(pg, 0.5, 0.46))
        chk(sorted(sel(pg)) == sorted([A, B]), f'rectangle selection selects only the items inside ({len(sel(pg))})')
        types = pg.eval_on_selector_all('#studio-selbar .st-types input', 'els => els.map(e => e.dataset.type)')
        chk(types == ['ink', 'shape', 'text', 'img', 'hl'], f'selectable types include pictures and text highlights {types}')
        pg.evaluate("MedixaStudio.selection.setMode('free')"); pg.evaluate("MedixaStudio.selection.clear()")
        loop = [cl(pg, u, v) for u, v in [(0.65, 0.62), (0.85, 0.62), (0.85, 0.72), (0.65, 0.72)]]
        pg.mouse.move(*loop[0]); pg.mouse.down()
        for q in loop[1:] + [loop[0]]: pg.mouse.move(*q, steps=4)
        pg.mouse.up(); pg.wait_for_timeout(150)
        chk(sel(pg) == [CC] and pg.evaluate("MedixaStudio.selection.mode()") == 'free', 'freeform lasso still works after switching back')

        # ---------- pen stroke: move / resize / rotate ----------
        select(pg, [A]); a0 = J(pg, A); h0 = H(pg); c = handles(pg)['centre']
        pg.evaluate("() => { const x = MedixaStudio.page(1).ink.getContext('2d'), f = x.clearRect; window.__renders = 0; x.clearRect = function () { window.__renders++; return f.apply(this, arguments); }; }")
        mdrag(pg, cl(pg, *c), cl(pg, c[0] + 0.1, c[1] + 0.05), steps=20); a1 = J(pg, A); settle(pg)
        chk(pg.evaluate("window.__renders") <= 3, f'a 20-step drag re-renders the committed ink layer at most twice (hide + commit), not per move ({pg.evaluate("window.__renders")})')
        chk(all(abs(q1[0] - q0[0] - 0.1) < 0.004 and abs(q1[1] - q0[1] - 0.05) < 0.004 for q0, q1 in zip(a0['points'], a1['points'])) and H(pg) == h0 + 1, 'move: pen stroke translated, one undo step')
        undo(pg); chk(J(pg, A)['points'] == a0['points'], 'undo move restores the exact points')
        redo(pg); chk(J(pg, A)['points'] == a1['points'], 'redo move')
        hd = handles(pg); bb = pg.evaluate("id => T.bounds(id)", A); se = hd['se']; ow, oh = se[0] - bb[0], se[1] - bb[1]; h0 = H(pg)
        mdrag(pg, cl(pg, *se), cl(pg, bb[0] + ow * 1.5, bb[1] + oh * 1.5)); bb2 = pg.evaluate("id => T.bounds(id)", A); r = (bb2[2] - bb2[0]) / (bb[2] - bb[0]); ry = (bb2[3] - bb2[1]) / (bb[3] - bb[1])
        chk(abs(r - 1.5) < 0.06 and abs(r - ry) < 0.03 and abs(bb2[0] - bb[0]) < 0.003 and abs(bb2[1] - bb[1]) < 0.003 and H(pg) == h0 + 1, f'resize: pen stroke scales uniformly about the opposite corner ({r:.3f} x {ry:.3f}), one undo step')
        before_resize = J(pg, A); undo(pg); chk(J(pg, A)['points'] == a1['points'], 'undo resize'); redo(pg); chk(J(pg, A)['points'] == before_resize['points'], 'redo resize')
        pg.evaluate("MedixaStudio.setSnap(true)")
        hd = handles(pg); c = hd['centre']; ro = hd['rot']; p0 = J(pg, A)['points']; h0 = H(pg)
        chk(ro[1] < hd['box'][1] and abs(ro[0] - (hd['box'][0] + hd['box'][2]) / 2) < 1e-9, 'rotate handle sits above the frame, centred')
        mdrag(pg, cl(pg, *ro), cl(pg, c[0] + 0.2, c[1] + 0.003), steps=12)
        exp = pg.evaluate("([pts, c]) => pts.map(p => MedixaStudio.C.rotateIso(p, c, Math.PI / 2, MedixaStudio.aspect(1)))", [p0, c]); got = J(pg, A)['points']
        chk(pts_close(got, exp, 1e-6) and H(pg) == h0 + 1, 'rotate: pen stroke turned exactly 90° about the frame centre (angle snap), one undo step')
        undo(pg); chk(J(pg, A)['points'] == p0, 'undo rotate'); redo(pg); chk(pts_close(J(pg, A)['points'], exp, 1e-6), 'redo rotate')
        pg.evaluate("MedixaStudio.setSnap(false)")

        # ---------- rectangle: move / resize / rotate (Shift snaps) ----------
        select(pg, [B]); b0 = J(pg, B); h0 = H(pg); c = handles(pg)['centre']
        mdrag(pg, cl(pg, *c), cl(pg, c[0] + 0.05, c[1] + 0.02)); b1 = J(pg, B)
        chk(all(abs(q1[0] - q0[0] - 0.05) < 0.004 and abs(q1[1] - q0[1] - 0.02) < 0.004 for q0, q1 in zip(b0['points'], b1['points'])) and H(pg) == h0 + 1, 'move: rectangle translated, one undo step')
        hd = handles(pg); bb = pg.evaluate("id => T.bounds(id)", B); se = hd['se']; h0 = H(pg)
        mdrag(pg, cl(pg, *se), cl(pg, se[0] + 0.06, se[1] + 0.01)); bb2 = pg.evaluate("id => T.bounds(id)", B)
        chk((bb2[2] - bb2[0]) > (bb[2] - bb[0]) + 0.04 and abs(bb2[0] - bb[0]) < 0.003 and H(pg) == h0 + 1, f'resize: rectangle grows from the opposite corner ({bb[2]-bb[0]:.3f} -> {bb2[2]-bb2[0]:.3f}), one undo step')
        b2 = J(pg, B); undo(pg); chk(J(pg, B)['points'] == b1['points'], 'undo rectangle resize'); redo(pg)
        hd = handles(pg); c = hd['centre']; ro = hd['rot']; h0 = H(pg); cw = pg.evaluate("MedixaStudio.page(1).cssW"); ch = pg.evaluate("MedixaStudio.page(1).cssH")
        d = math.hypot(0, (c[1] - ro[1]) * ch)   # turn the knob 45° clockwise (with Shift: snapped)
        tgt = (c[0] + d * math.sin(math.radians(47)) / cw, c[1] - d * math.cos(math.radians(47)) / ch)
        mdrag(pg, cl(pg, *ro), cl(pg, *tgt), steps=12, shift=True); b3 = J(pg, B)
        chk(abs((b3.get('rot') or 0) - math.pi / 4) < 1e-9 and abs(b3.get('k', 0) - pg.evaluate("MedixaStudio.aspect(1)")) < 1e-9 and pts_close(b3['points'], b2['points'], 1e-9) and H(pg) == h0 + 1, f'rotate: rectangle rot = 45° (Shift snaps to 15°), centre kept, one undo step ({b3.get("rot")})')
        undo(pg); chk(not J(pg, B).get('rot'), 'undo rectangle rotation clears rot'); redo(pg); chk(abs((J(pg, B).get('rot') or 0) - math.pi / 4) < 1e-9, 'redo rectangle rotation')
        chk(pg.evaluate("MedixaStudio.selection.handleRadius('mouse')") >= 16, 'handle hit radius on desktop')
        NT = pg.evaluate("() => T.add([{ tool: 'text', color: '#18334b', text: 'upright', size: 18, w: 0.2, h: 0.05, points: [[0.60, 0.50]] }])[0]")
        select(pg, [NT]); hn = handles(pg); chk(hn is not None and hn['rot'] is None, 'a note alone gets resize handles but no rotate knob (notes stay upright)')
        undo(pg)

        # ---------- text highlight: recolour + opacity, never moved ----------
        pg.evaluate("MedixaStudio.selection.clear()"); pg.mouse.click(*cl(pg, 0.65, 0.11)); pg.wait_for_timeout(200)
        chk(sel(pg) == [TH], 'a tap selects the text highlight')
        chk(handles(pg) is None, 'no move / resize / rotate handles when only a text highlight is selected')
        chk(not pg.is_visible('#sel-width') and not pg.is_visible('#sel-copy') and not pg.is_visible('#sel-dup') and pg.is_visible('#sel-op') and pg.is_visible('#sel-del') and pg.is_visible('#studio-selbar .sel-sw'), 'bar offers colour, opacity and delete for a text highlight')
        th0 = J(pg, TH); h0 = H(pg); pg.click('#studio-selbar .sel-sw[data-color="#2f6fed"]'); pg.wait_for_timeout(150)
        chk(J(pg, TH)['color'] == '#2f6fed' and H(pg) == h0 + 1, 'text highlight recoloured from the bar, one undo step')
        pg.evaluate("MedixaStudio.selection.applyStyle({op: 0.6})"); chk(J(pg, TH)['op'] == 0.6, 'text highlight opacity applied')
        mdrag(pg, cl(pg, 0.65, 0.11), cl(pg, 0.75, 0.2)); select(pg, [TH]); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(150)
        th1 = J(pg, TH); chk(th1['rects'] == th0['rects'] and th1['points'] == th0['points'], 'text highlight rects unchanged after a move attempt and a nudge')
        undo(pg); undo(pg); chk(J(pg, TH)['color'] == '#f2c230' and abs(J(pg, TH)['op'] - 0.35) < 1e-9, 'undo restores highlight colour and opacity')

        # ---------- applyStyle and the bar sliders ----------
        select(pg, [A, B]); h0 = H(pg); oldc = (J(pg, A)['color'], J(pg, B)['color']); oldw = (J(pg, A)['width'], J(pg, B)['width'])
        n = pg.evaluate("MedixaStudio.selection.applyStyle({color: '#168c8c', width: 6})")
        chk(n == 2 and J(pg, A)['color'] == J(pg, B)['color'] == '#168c8c' and J(pg, A)['width'] == J(pg, B)['width'] == 6 and H(pg) == h0 + 1, 'applyStyle: colour + width on ink and shapes, one undo step')
        undo(pg); chk((J(pg, A)['color'], J(pg, B)['color']) == oldc and (J(pg, A)['width'], J(pg, B)['width']) == oldw, 'undo applyStyle restores both')
        chk(pg.evaluate("MedixaStudio.selection.count()") == 2, 'selection count')
        h0 = H(pg); pg.evaluate("T.slide('sel-width', 9)"); pg.wait_for_timeout(100)
        chk(J(pg, A)['width'] == 9 and J(pg, B)['width'] == 9 and H(pg) == h0 + 1, 'thickness slider: live preview, one undo step on release')
        undo(pg)

        # ---------- copy / paste (buttons, keyboard) ----------
        n0 = count(pg); h0 = H(pg); pa = J(pg, A)['points'][0]
        pg.click('#sel-copy'); pg.click('#sel-paste'); pg.wait_for_timeout(200); new = sel(pg)
        chk(len(new) == 2 and not set(new) & {A, B} and count(pg) == n0 + 2 and H(pg) == h0 + 1, 'paste: new ids, auto-selected, one undo step')
        cp = [J(pg, i) for i in new]; cpa = [x for x in cp if x['tool'] == 'pen'][0]
        chk(close(cpa['points'][0], [pa[0] + 0.02, pa[1] + 0.02], 1e-9) and cpa['page'] == 1, 'pasted copy offset by +0.02 on the current page')
        undo(pg); chk(count(pg) == n0 and all(J(pg, i) is None for i in new), 'undo removes the pasted copies')
        select(pg, [A]); pg.keyboard.press('Control+c'); pg.keyboard.press('Control+v'); settle(pg)
        k = sel(pg); chk(count(pg) == n0 + 1 and len(k) == 1 and k[0] != A and J(pg, k[0])['tool'] == 'pen', 'Ctrl+C / Ctrl+V copies through the internal clipboard')
        undo(pg); chk(count(pg) == n0, 'undo keyboard paste')

        # ---------- z-order ----------
        select(pg, [A]); i0 = pg.evaluate("id => T.index(id)", A); last = count(pg) - 1; h0 = H(pg)
        pg.click('#sel-front'); chk(pg.evaluate("id => T.index(id)", A) == last and H(pg) == h0 + 1, f'«إلى الأمام» moves to the top of the drawing order ({i0} -> {last})')
        undo(pg); chk(pg.evaluate("id => T.index(id)", A) == i0, 'undo restores the order')
        pg.click('#sel-back'); chk(pg.evaluate("id => T.index(id)", A) == 0, '«إلى الخلف» moves to the bottom')
        undo(pg); chk(pg.evaluate("id => T.index(id)", A) == i0, 'undo restores the order again')

        # ---------- pictures ----------
        top(pg); n0 = count(pg)
        img = pg.evaluate("async () => { const b = await T.png(300, 150); const s = await MedixaStudio.images.insert(b); return s && JSON.parse(JSON.stringify(s)); }")
        I = img and img['id']; pg.wait_for_function("a => MedixaAssets.peek(a)", arg=img['asset'], timeout=8000); settle(pg)
        chk(img and img['tool'] == 'image' and img['asset'].startswith('img_') and count(pg) == n0 + 1 and img['page'] == 1, 'insert(): image item added to the visible page')
        chk(pg.evaluate("a => MedixaAssets.has(a)", img['asset']), 'the pixels are in MedixaAssets (IndexedDB)')
        chk(sel(pg) == [I] and pg.evaluate("MedixaStudio.S.tool") == 'lasso' and handles(pg) is not None, 'inserted picture is selected with handles (lasso tool)')
        chk(img['w'] <= 0.5 + 1e-9 and abs(img['h'] * img['k'] / img['w'] - 0.5) < 1e-6 and abs(img['k'] - pg.evaluate("MedixaStudio.aspect(1)")) < 1e-9 and img.get('rot') == 0 and img.get('op') == 1, 'picture keeps its 2:1 aspect on the page (h = ar * w / k)')
        chk([col(pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [I, a, bb])) for a, bb in [(0.25, 0.75), (0.75, 0.75), (0.25, 0.1)]] == ['red', 'blue', 'green'], 'picture rendered from the asset store')
        chk(pg.is_visible('#sel-fliph') and pg.is_visible('#sel-flipv') and pg.is_visible('#sel-rot90') and pg.is_visible('#sel-crop') and pg.is_visible('#sel-op') and not pg.is_visible('#sel-width'), 'one picture selected: flip / rotate / crop / opacity controls')
        # crop (interactive handle, then cancel)
        s0 = J(pg, I); pg.click('#sel-crop'); pg.wait_for_timeout(100)
        chk(pg.is_visible('#sel-crop-ok') and pg.is_visible('#sel-crop-cancel') and not pg.is_visible('#sel-del'), 'crop mode shows only «تم» / «إلغاء»')
        se = pg.evaluate("i => T.imgAt(T.item(i), 1, 1)", I); tgt = pg.evaluate("i => T.imgAt(T.item(i), 0.6, 1)", I)
        mdrag(pg, cl(pg, *se), cl(pg, *tgt)); r = pg.evaluate("MedixaStudio.selection.crop.rect")
        chk(r and abs(r[2] - 0.6) < 0.02 and r[0] == 0 and r[3] == 1, f'crop handle drags the kept area ({r})')
        h0 = H(pg); pg.click('#sel-crop-cancel'); pg.wait_for_timeout(100); chk(J(pg, I) == s0 and H(pg) == h0 and pg.evaluate("MedixaStudio.selection.crop.rect") is None, 'cancel leaves the picture as it was')
        pg.click('#sel-crop'); pg.keyboard.press('Escape'); chk(pg.evaluate("MedixaStudio.selection.crop.rect") is None and sel(pg) == [I] and pg.is_visible('#sel-crop'), 'Escape leaves crop mode and keeps the picture selected')
        # crop: keep the left half; the kept part stays in place
        pg.click('#sel-crop'); pg.evaluate("MedixaStudio.selection.crop.rect = [0, 0, 0.5, 1]"); right = pg.evaluate("i => T.imgAt(T.item(i), 0.75, 0.5)", I); h0 = H(pg)
        pg.click('#sel-crop-ok'); settle(pg); s1 = J(pg, I)
        chk(s1['crop'] == [0, 0, 0.5, 1] and abs(s1['w'] - s0['w'] / 2) < 1e-9 and abs(s1['h'] - s0['h']) < 1e-9 and pts_close(s1['points'], s0['points'], 1e-9) and H(pg) == h0 + 1, 'crop writes [x0,y0,x1,y1] and keeps the visible part in place, one undo step')
        chk(col(pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [I, 0.9, 0.75])) == 'red' and col(pg.evaluate("p => T.px(1, p[0], p[1])", right)) == 'none', 'cropped render: only the left (red) half is drawn')
        undo(pg); chk(not J(pg, I).get('crop') and abs(J(pg, I)['w'] - s0['w']) < 1e-12, 'undo crop'); redo(pg); chk(J(pg, I)['crop'] == [0, 0, 0.5, 1], 'redo crop')
        chk(pg.is_visible('#sel-uncrop'), '«إعادة الصورة كاملة» offered for a cropped picture')
        pg.click('#sel-uncrop'); settle(pg); s2 = J(pg, I)
        chk(not s2.get('crop') and abs(s2['w'] - s0['w']) < 1e-9 and pts_close(s2['points'], s0['points'], 1e-9) and col(pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [I, 0.75, 0.75])) == 'blue', 'full picture again: original box restored around the kept part')
        # flips
        h0 = H(pg); pg.click('#sel-fliph'); settle(pg)
        chk(J(pg, I).get('fx') is True and col(pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [I, 0.25, 0.75])) == 'blue' and H(pg) == h0 + 1, 'flip horizontal mirrors the picture (one undo step)')
        undo(pg); chk(not J(pg, I).get('fx') and col(pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [I, 0.25, 0.75])) == 'red', 'undo flip'); redo(pg)
        # crop while flipped: the displayed left half is the right half of the bitmap
        before = pg.evaluate("i => T.imgAt(T.item(i), 0.25, 0.75)", I)
        pg.click('#sel-crop'); pg.evaluate("MedixaStudio.selection.crop.rect = [0, 0, 0.5, 1]"); pg.click('#sel-crop-ok'); settle(pg)
        chk(J(pg, I)['crop'] == [0.5, 0, 1, 1] and col(pg.evaluate("p => T.px(1, p[0], p[1])", before)) == 'blue', 'crop of a flipped picture maps through the mirror (what you see stays)')
        pg.click('#sel-uncrop'); pg.wait_for_timeout(200); pg.click('#sel-fliph'); pg.wait_for_timeout(200)
        chk(not J(pg, I).get('crop') and not J(pg, I).get('fx') and pts_close(J(pg, I)['points'], s0['points'], 1e-9), 'back to the original picture')
        pg.click('#sel-flipv'); settle(pg)
        chk(J(pg, I).get('fy') is True and col(pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [I, 0.25, 0.9])) == 'green', 'flip vertical moves the top band to the bottom')
        undo(pg)
        # rotate 90°
        bx = pg.evaluate("i => T.bounds(i)", I); sig0 = pg.evaluate("b => T.boxSig(1, b)", bx); cen = [s0['points'][0][0] + s0['w'] / 2, s0['points'][0][1] + s0['h'] / 2]; h0 = H(pg)
        pg.click('#sel-rot90'); settle(pg); s3 = J(pg, I)
        chk(abs(s3['rot'] - math.pi / 2) < 1e-9 and close([s3['points'][0][0] + s3['w'] / 2, s3['points'][0][1] + s3['h'] / 2], cen, 1e-9) and H(pg) == h0 + 1, 'rotate 90°: rot += 90° about the centre, one undo step')
        chk(pg.evaluate("b => T.boxSig(1, b)", bx) != sig0 and col(pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [I, 0.25, 0.75])) == 'red', 'rotated picture renders turned (pixels differ; its own frame still matches)')
        undo(pg); chk(not J(pg, I).get('rot'), 'undo rotate'); redo(pg); chk(abs(J(pg, I)['rot'] - math.pi / 2) < 1e-9, 'redo rotate')
        # opacity
        h0 = H(pg); pg.evaluate("T.slide('sel-op', 50)"); settle(pg); a = pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [I, 0.75, 0.5])[3]
        chk(J(pg, I)['op'] == 0.5 and 100 < a < 160 and H(pg) == h0 + 1, f'opacity slider: op 0.5 rendered (alpha {a}), one undo step')
        undo(pg); chk(J(pg, I)['op'] == 1 and pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [I, 0.75, 0.5])[3] > 240, 'undo opacity')
        # duplicate shares the asset; delete + undo restores it
        pg.click('#sel-dup'); pg.wait_for_timeout(200); D = sel(pg)[0]
        chk(D != I and J(pg, D)['asset'] == img['asset'] and J(pg, D)['tool'] == 'image', 'duplicate picture keeps the same asset id (no re-upload)')
        pg.click('#sel-del'); pg.wait_for_timeout(200)
        chk(J(pg, D) is None and pg.evaluate("a => MedixaAssets.has(a)", img['asset']), 'delete removes the item, the asset stays in IndexedDB')
        undo(pg); chk(J(pg, D) is not None and col(pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [D, 0.25, 0.75])) == 'red', 'undo delete brings the picture back, rendered')
        undo(pg); chk(J(pg, D) is None, 'undo duplicate')
        select(pg, [I]); pg.keyboard.press('Delete'); settle(pg); chk(J(pg, I) is None and sel(pg) == [], 'Delete key removes the selected picture')
        undo(pg); chk(J(pg, I) is not None and col(pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [I, 0.25, 0.75])) == 'red', 'undo brings it back'); select(pg, [I])
        # system clipboard paste and drop
        n0 = count(pg)
        pg.evaluate("""async () => { const b = await T.png(120, 120), dt = new DataTransfer(); dt.items.add(new File([b], 'clip.png', { type: 'image/png' }));
          document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }""")
        pg.wait_for_function(f"MedixaStudio.S.items.length === {n0 + 1}", timeout=5000); P = sel(pg)
        chk(len(P) == 1 and J(pg, P[0])['tool'] == 'image' and abs(J(pg, P[0])['h'] * J(pg, P[0])['k'] / J(pg, P[0])['w'] - 1) < 1e-6, 'an image pasted from the system clipboard is inserted and selected')
        undo(pg)
        drop = cl(pg, 0.5, 0.88)
        pg.evaluate("""async (xy) => { const b = await T.png(300, 150), dt = new DataTransfer(); dt.items.add(new File([b], 'drop.png', { type: 'image/png' }));
          const t = document.elementFromPoint(xy[0], xy[1]); const o = { dataTransfer: dt, bubbles: true, cancelable: true, clientX: xy[0], clientY: xy[1] };
          window.__dragOk = !t.dispatchEvent(new DragEvent('dragover', o)); t.dispatchEvent(new DragEvent('drop', o)); }""", drop)
        pg.wait_for_function(f"MedixaStudio.S.items.length === {n0 + 1}", timeout=5000); Dr = J(pg, sel(pg)[0])
        chk(pg.evaluate("window.__dragOk") and Dr['tool'] == 'image' and Dr['page'] == 1 and close([Dr['points'][0][0] + Dr['w'] / 2, Dr['points'][0][1] + Dr['h'] / 2], [0.5, 0.88], 0.01), 'a dropped image lands where it was dropped')
        undo(pg)
        # invalid file
        n0 = count(pg)
        res = pg.evaluate("() => MedixaStudio.images.insert(new Blob(['hello, not a picture'], { type: 'text/plain' }))"); pg.wait_for_timeout(200)
        chk(res is None and count(pg) == n0 and pg.is_visible('#studio-banner') and 'نوع الصورة غير مدعوم' in pg.inner_text('#studio-banner'), 'invalid file: Arabic error banner, nothing added')
        pg.click('#studio-banner button')
        chk(pg.evaluate("typeof MedixaStudio.images.pick") == 'function', 'images.pick() is available for the toolbar button')

        # ---------- note editor: style row ----------
        pg.evaluate("MedixaStudio.setTool('text')"); pg.mouse.click(*cl(pg, 0.02, 0.70)); pg.wait_for_selector('.st-editor textarea')
        chk(pg.locator('.st-editor .st-ed-size').count() == 1 and pg.get_attribute('.st-editor textarea', 'dir') == 'auto', 'editor has a style row; dir=auto for Arabic and English')
        pg.select_option('.st-editor .st-ed-size', '28'); pg.click('.st-editor .st-ed-b'); pg.click('.st-editor .st-ed-i')
        pg.fill('.st-editor textarea', 'Bold نص عريض\nsecond line'); pg.keyboard.press('Control+Enter'); settle(pg)
        tx = pg.evaluate("JSON.parse(JSON.stringify(MedixaStudio.S.items.filter(s => s.tool === 'text').slice(-1)[0]))")
        chk(tx['size'] == 28 and tx.get('bold') is True and tx.get('italic') is True and tx['text'] == 'Bold نص عريض\nsecond line', 'new note: size / bold / italic from the style row, multiline kept')
        chk(pg.evaluate("MedixaStudio.style('text').size") == 28, 'the next note starts with the same style')
        h0 = H(pg); pg.mouse.dblclick(*cl(pg, 0.05, 0.71)); pg.wait_for_selector('.st-editor textarea')
        chk(pg.input_value('.st-editor .st-ed-size') == '28' and pg.get_attribute('.st-editor .st-ed-b', 'aria-pressed') == 'true', 'editing shows the note\'s own style')
        pg.select_option('.st-editor .st-ed-size', '14'); pg.click('.st-editor .st-ed-b'); pg.click('.st-ok'); settle(pg)
        t2 = J(pg, tx['id']); chk(t2['size'] == 14 and not t2.get('bold') and t2.get('italic') is True and H(pg) == h0 + 1, 'style edit is one undo step')
        undo(pg); t3 = J(pg, tx['id']); chk(t3['size'] == 28 and t3.get('bold') is True, 'undo style edit')
        L = pg.evaluate("() => T.add([{ tool: 'text', color: '#18334b', text: 'legacy note', w: 0.18, h: 0.05, points: [[0.80, 0.30]] }])[0]"); h0 = H(pg)
        pg.mouse.click(*cl(pg, 0.85, 0.32)); pg.wait_for_selector('.st-editor textarea')
        chk(pg.input_value('.st-editor .st-ed-size') == '18' and pg.get_attribute('.st-editor .st-ed-b', 'aria-pressed') == 'false', 'an older note without size/bold opens with the defaults')
        pg.click('.st-ok'); pg.wait_for_timeout(200); chk(H(pg) == h0 and 'size' not in J(pg, L), 'saving an unchanged older note changes nothing')

        # ---------- reload: the picture comes back from IndexedDB ----------
        pg.evaluate("MedixaStudio.flush()"); pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(700); pg.evaluate(HELP); top(pg)
        pg.wait_for_function("() => { const s = T.item(%s); return s && MedixaAssets.peek(s.asset); }" % json.dumps(I), timeout=8000); settle(pg)
        chk(J(pg, I) is not None and abs(J(pg, I)['rot'] - math.pi / 2) < 1e-9 and col(pg.evaluate("([i,a,b]) => T.imgPx(i,a,b)", [I, 0.25, 0.75])) == 'red', 'after reload the picture renders from IndexedDB')

        # ---------- PDF export with a picture ----------
        data = pg.evaluate("async () => { const out = await MedixaStudio.exportPdf(await MedixaStudio.reader.getBytes(), { margins: 'clip' }); return Array.from(out); }")
        chk(bytes(data[:5]) == b'%PDF-', 'PDF export succeeds with a picture present')
        bi = pg.evaluate("i => T.bounds(i)", I)
        v = ctx.new_page(); v.goto(BASE + 'privacy.html'); v.add_script_tag(url='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
        v.evaluate("()=>{pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}")
        rb = v.evaluate("""async ([arr, b]) => { const doc = await pdfjsLib.getDocument({data:new Uint8Array(arr)}).promise, p = await doc.getPage(1), vp = p.getViewport({scale:1});
          const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height); await p.render({canvasContext:c.getContext('2d'), viewport:vp}).promise;
          const d = c.getContext('2d').getImageData(Math.round(b[0]*vp.width), Math.round(b[1]*vp.height), Math.max(1, Math.round((b[2]-b[0])*vp.width)), Math.max(1, Math.round((b[3]-b[1])*vp.height))).data;
          let red = 0, blue = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] > 170 && d[i+1] < 100 && d[i+2] < 100) red++; if (d[i+2] > 170 && d[i] < 100 && d[i+1] < 100) blue++; } return [red, blue]; }""", [data, bi])
        chk(rb[0] > 200 and rb[1] > 200, f'the picture is in the exported PDF where it is on screen ({rb} red/blue px)')
        v.close()
        chk(not errs, f'no page errors {errs[:3]}')
        ctx.close()

        # ---------- phone: one row above the drawing bar, inside the viewport ----------
        ctx = new_context(b, {URL: 'mixed.pdf'}, viewport={'width': 390, 'height': 844}, has_touch=True)
        ctx.add_init_script("try{localStorage.setItem('ms.guest','1')}catch(e){}")
        pg = load(ctx); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        top(pg, 0, 160)
        X = pg.evaluate("() => T.add([{ tool: 'pen', points: [[0.3, 0.3], [0.5, 0.35]] }])[0]")
        img = pg.evaluate("async () => { const s = await MedixaStudio.images.insert(await T.png(200, 200)); return s && s.id; }"); settle(pg)
        chk(pg.evaluate("MedixaStudio.selection.handleRadius('touch')") >= 22 and pg.evaluate("MedixaStudio.selection.handleRadius('mouse')") >= 22, 'touch device: handle hit radius >= 22 px')
        for ids, what in (([X], 'ink'), ([img], 'picture')):
            select(pg, ids); pg.wait_for_timeout(200)
            sb = pg.locator('#studio-selbar').bounding_box(); tb = pg.locator('#studio-toolbar').bounding_box()
            chk(sb and sb['x'] >= 0 and sb['x'] + sb['width'] <= 390 + 0.5 and sb['y'] >= 0 and sb['y'] + sb['height'] <= 844, f'phone ({what}): selection bar inside the viewport {sb}')
            chk(tb and sb['y'] + sb['height'] <= tb['y'] + 1 and sb['height'] < 70, f'phone ({what}): one row just above the drawing bar ({sb["height"]:.0f}px tall)')
            hs = pg.eval_on_selector_all('#studio-selbar button', 'els => els.filter(e => e.offsetParent).map(e => e.getBoundingClientRect().height)')
            chk(hs and min(hs) >= 43.5, f'phone ({what}): 44px targets in the bar ({min(hs) if hs else None})')
        chk(pg.evaluate("(() => { const b = document.getElementById('studio-selbar'); return getComputedStyle(b).overflowX === 'auto' && getComputedStyle(b).flexWrap === 'nowrap'; })()"), 'phone: the bar scrolls sideways instead of wrapping')
        chk(not errs, f'no page errors on the phone {errs[:3]}')
        b.close()
finally:
    srv.terminate()
chk.done()
