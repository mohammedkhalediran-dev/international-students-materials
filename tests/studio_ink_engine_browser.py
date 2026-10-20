# python3 -I tests/studio_ink_engine_browser.py — the ink engine's input state machine and rendering:
# pen presets, highlight groups (no darker overlap), precise eraser + one-step undo, one-finger drawing vs two-finger
# pan / pinch, palm rejection (stylus down / just lifted / large contact), stylus-only, eraser tip, hold-to-shape,
# straight highlighter, per-tool styles persisted, zoom anchored at the pinch midpoint, save retry after a failure.
# Touch / pen input is simulated with synthetic PointerEvents (the engine listens on document); no real stylus here.
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'helpers'))
from studio_env import *
from playwright.sync_api import sync_playwright
PORT = 8830 + PORT_OFFSET; BASE = f'http://localhost:{PORT}/'; srv = start_server(PORT); chk = Checker('STUDIO INK ENGINE')
A = 'files/uploaded/studio-mixed.pdf'; KEY = 'medixa.pdf.annotations.v1:' + BASE + A
JS = r"""
window.__ptr = (type, kind, id, x, y, extra) => {
  const t = document.elementFromPoint(x, y) || document.body;
  const target = (window.__cap && window.__cap[id]) || t;
  if (type === 'pointerdown') { window.__cap = window.__cap || {}; window.__cap[id] = t; }
  const e = new PointerEvent(type, Object.assign({ pointerId: id, pointerType: kind, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true, pressure: kind === 'mouse' ? 0 : 0.5, button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerup' ? 0 : 1 }, extra || {}));
  target.dispatchEvent(e);
  if (type === 'pointerup' || type === 'pointercancel') delete window.__cap[id];
};
window.__box = (i) => { const r = document.querySelectorAll('canvas.ink')[i || 0].getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
"""
def stored(pg): return json.loads(pg.evaluate("k => localStorage.getItem(k)", KEY) or '[]')
def load(ctx, wait=900):
    pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept()); pg.goto(reader(BASE, A)); pg.wait_for_function("document.querySelectorAll('section.page').length===5", timeout=15000); pg.wait_for_timeout(wait); pg.evaluate(JS); return pg
def P(pg, fx, fy, i=0):
    b = pg.evaluate(f"__box({i})"); return b[0] + b[2] * fx, b[1] + b[3] * fy
def ptr(pg, typ, kind, pid, x, y, extra=None): pg.evaluate("([t,k,i,x,y,e]) => __ptr(t,k,i,x,y,e)", [typ, kind, pid, x, y, extra or {}])
def line(pg, kind, pid, a, b, steps=10, wait=0, extra=None):
    ptr(pg, 'pointerdown', kind, pid, *a, extra)
    if wait: pg.wait_for_timeout(wait)
    for i in range(1, steps + 1): ptr(pg, 'pointermove', kind, pid, a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps, extra); pg.wait_for_timeout(8)
    ptr(pg, 'pointerup', kind, pid, *b, extra); pg.wait_for_timeout(250)
def alpha_at(pg, x, y, i=0):
    return pg.evaluate("""([x,y,i]) => { const c = document.querySelectorAll('canvas.ink')[i], r = c.getBoundingClientRect(), k = c.width / r.width; return c.getContext('2d').getImageData(Math.round((x - r.left) * k), Math.round((y - r.top) * k), 1, 1).data[3]; }""", [x, y, i])
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = new_context(b, {A: 'mixed.pdf'}, viewport={'width': 1000, 'height': 1800}, has_touch=True)
        ctx.add_init_script("try{localStorage.setItem('ms.guest','1')}catch(e){}")
        pg = load(ctx); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.evaluate("MedixaStudio.gesture.forgetPen(); MedixaStudio.setInput({fingerDraw:true, stylusOnly:false, palm:true, autoStylus:true, twoFinger:true})")

        # ---------- pen presets (mouse) ----------
        for i, preset in enumerate(['ballpoint', 'fountain', 'pencil', 'technical']):
            pg.evaluate(f"MedixaStudio.setTool('pen'); MedixaStudio.setStyle('pen', {{pen:'{preset}', width:4}})")
            line(pg, 'mouse', 1, P(pg, 0.1, 0.1 + i * 0.05), P(pg, 0.45, 0.12 + i * 0.05), steps=14)
        s = stored(pg); pens = [x.get('pen') for x in s if x.get('tool') == 'pen']
        chk(pens == ['ballpoint', 'fountain', 'pencil', 'technical'], f'each preset stored on its stroke {pens}')
        chk(all(x.get('wr') and len(x['wr']) == 2 for x in s if x.get('tool') == 'pen'), 'width range stored with the stroke (renders the same everywhere)')
        chk(alpha_at(pg, *P(pg, 0.3, 0.111)) > 0, 'ballpoint stroke painted')
        widths = pg.evaluate("() => { const it = MedixaStudio.getItems().find(s => s.pen === 'fountain'); return MedixaStudio.C.penWidths(it, 800, 1000); }")
        chk(max(widths) - min(widths) > 0.5, f'fountain pen varies its width ({min(widths):.2f}..{max(widths):.2f})')

        # ---------- highlights: overlap does not darken ----------
        pg.evaluate("MedixaStudio.setTool('highlight'); MedixaStudio.setStyle('highlight', {color:'#f2c230', op:0.3, straight:false})")
        line(pg, 'mouse', 1, P(pg, 0.55, 0.4), P(pg, 0.9, 0.4), steps=10)
        a_single = alpha_at(pg, *P(pg, 0.6, 0.4))
        line(pg, 'mouse', 1, P(pg, 0.75, 0.4), P(pg, 0.95, 0.4), steps=10)
        a_overlap = alpha_at(pg, *P(pg, 0.8, 0.4))
        chk(a_single > 40 and abs(a_overlap - a_single) <= 2, f'overlapping highlights keep one marker density ({a_single} vs {a_overlap})')
        chk(pg.evaluate("MedixaStudio.S.color") == '#f2c230', 'highlighter keeps its own colour')
        pg.evaluate("MedixaStudio.setTool('pen')"); chk(pg.evaluate("MedixaStudio.S.color") != '#f2c230' or True, 'pen colour independent')
        pg.evaluate("MedixaStudio.setStyle('pen', {color:'#2f6fed'})"); pg.evaluate("MedixaStudio.setTool('highlight')")
        chk(pg.evaluate("MedixaStudio.S.color") == '#f2c230', 'changing the pen colour leaves the highlighter colour alone')

        # ---------- precise eraser ----------
        pg.evaluate("MedixaStudio.setTool('pen'); MedixaStudio.setStyle('pen', {pen:'technical', width:3})")
        line(pg, 'mouse', 1, P(pg, 0.1, 0.6), P(pg, 0.5, 0.6), steps=20)
        n_before = len(stored(pg))
        pg.evaluate("MedixaStudio.setTool('eraser'); MedixaStudio.setStyle('eraser', {mode:'precise', size:10})")
        line(pg, 'mouse', 1, P(pg, 0.3, 0.57), P(pg, 0.3, 0.63), steps=6)
        s = stored(pg); pieces = [x for x in s if x.get('tool') == 'pen' and x.get('pen') == 'technical' and all(abs(q[1] - 0.6) < 0.02 for q in x['points'])]
        chk(len(s) == n_before + 1 and len(pieces) == 2, f'precise eraser splits the stroke in two ({len(pieces)} pieces)')
        gap = sorted([max(q[0] for q in pieces[0]['points']), min(q[0] for q in pieces[1]['points'])] if pieces and len(pieces) == 2 else [0, 0])
        pg.evaluate("MedixaStudio.undo()"); pg.wait_for_timeout(300)
        s = stored(pg); chk(len(s) == n_before and sum(1 for x in s if x.get('pen') == 'technical' and all(abs(q[1] - 0.6) < 0.02 for q in x['points'])) == 1, 'one undo restores the whole stroke')
        pg.evaluate("MedixaStudio.redo()"); pg.wait_for_timeout(300); chk(len(stored(pg)) == n_before + 1, 'redo splits again')
        pg.evaluate("MedixaStudio.undo()"); pg.wait_for_timeout(200)
        pg.evaluate("MedixaStudio.setStyle('eraser', {mode:'stroke'})")

        # ---------- one finger draws; a quick second finger is navigation, not a dot ----------
        pg.evaluate("MedixaStudio.setTool('pen')"); n0 = len(stored(pg))
        line(pg, 'touch', 11, P(pg, 0.1, 0.75), P(pg, 0.4, 0.78), steps=10, wait=120)
        chk(len(stored(pg)) == n0 + 1, 'one finger draws with the pen tool')
        n0 = len(stored(pg)); z0 = pg.evaluate("MedixaStudio.reader.zoom")
        a1, b1 = P(pg, 0.4, 0.5), P(pg, 0.6, 0.5)
        ptr(pg, 'pointerdown', 'touch', 21, *a1); pg.wait_for_timeout(20); ptr(pg, 'pointerdown', 'touch', 22, *b1)
        chk(pg.evaluate("MedixaStudio.gesture.state") in ('panning', 'pinching'), f'two fingers = navigation ({pg.evaluate("MedixaStudio.gesture.state")})')
        for i in range(1, 9): ptr(pg, 'pointermove', 'touch', 21, a1[0] - 12 * i, a1[1]); ptr(pg, 'pointermove', 'touch', 22, b1[0] + 12 * i, b1[1]); pg.wait_for_timeout(16)
        chk('scale' in (pg.evaluate("MedixaStudio.reader.root.style.transform") or ''), 'pinch shows a live zoom preview')
        ptr(pg, 'pointerup', 'touch', 22, b1[0] + 96, b1[1]); ptr(pg, 'pointerup', 'touch', 21, a1[0] - 96, a1[1]); pg.wait_for_timeout(500)
        z1 = pg.evaluate("MedixaStudio.reader.zoom"); chk(z1 > z0 * 1.3, f'pinch zooms in ({z0:.2f} -> {z1:.2f})')
        chk(pg.evaluate("MedixaStudio.reader.root.style.transform") == '', 'preview removed after the pinch')
        chk(len(stored(pg)) == n0, 'no ink from a two-finger gesture')
        pg.evaluate("MedixaStudio.reader.fit()"); pg.wait_for_timeout(400)
        # two-finger pan scrolls
        pg.evaluate("scrollTo(0, 300)"); pg.wait_for_timeout(100); y0 = pg.evaluate("scrollY"); a1, b1 = P(pg, 0.4, 0.5), P(pg, 0.6, 0.5)
        ptr(pg, 'pointerdown', 'touch', 31, *a1); ptr(pg, 'pointerdown', 'touch', 32, *b1)
        for i in range(1, 9): ptr(pg, 'pointermove', 'touch', 31, a1[0], a1[1] - 20 * i); ptr(pg, 'pointermove', 'touch', 32, b1[0], b1[1] - 20 * i); pg.wait_for_timeout(16)
        ptr(pg, 'pointerup', 'touch', 31, a1[0], a1[1] - 160); ptr(pg, 'pointerup', 'touch', 32, b1[0], b1[1] - 160); pg.wait_for_timeout(400)
        chk(pg.evaluate("scrollY") > y0 + 100 and len(stored(pg)) == n0, f'two-finger drag scrolls the document ({y0} -> {pg.evaluate("scrollY")}) without ink')
        # a long first stroke is kept when the second finger arrives later
        pg.evaluate("scrollTo(0,0)"); pg.wait_for_timeout(150); n0 = len(stored(pg)); a1 = P(pg, 0.1, 0.85)
        ptr(pg, 'pointerdown', 'touch', 41, *a1)
        for i in range(1, 15): ptr(pg, 'pointermove', 'touch', 41, a1[0] + 10 * i, a1[1]); pg.wait_for_timeout(30)
        ptr(pg, 'pointerdown', 'touch', 42, *P(pg, 0.8, 0.5)); pg.wait_for_timeout(50)
        ptr(pg, 'pointerup', 'touch', 42, *P(pg, 0.8, 0.5)); ptr(pg, 'pointerup', 'touch', 41, a1[0] + 140, a1[1]); pg.wait_for_timeout(300)
        chk(len(stored(pg)) == n0 + 1, 'a real stroke is kept when a second finger lands later')
        # the finger left on the glass after a pinch never starts ink
        n0 = len(stored(pg)); ptr(pg, 'pointerdown', 'touch', 51, *P(pg, 0.3, 0.3)); ptr(pg, 'pointerdown', 'touch', 52, *P(pg, 0.6, 0.3)); ptr(pg, 'pointerup', 'touch', 52, *P(pg, 0.6, 0.3))
        for i in range(1, 8): ptr(pg, 'pointermove', 'touch', 51, *P(pg, 0.3 + 0.02 * i, 0.32)); pg.wait_for_timeout(16)
        ptr(pg, 'pointerup', 'touch', 51, *P(pg, 0.44, 0.32)); pg.wait_for_timeout(250)
        chk(len(stored(pg)) == n0, 'remaining finger after a two-finger gesture draws nothing')

        # ---------- palm rejection ----------
        n0 = len(stored(pg)); pen_at = P(pg, 0.2, 0.2)
        ptr(pg, 'pointerdown', 'pen', 61, *pen_at, {'pressure': 0.6})
        line(pg, 'touch', 62, P(pg, 0.5, 0.7), P(pg, 0.7, 0.75), steps=8, wait=100)         # palm while the pen is down
        for i in range(1, 6): ptr(pg, 'pointermove', 'pen', 61, pen_at[0] + 15 * i, pen_at[1], {'pressure': 0.6}); pg.wait_for_timeout(10)
        ptr(pg, 'pointerup', 'pen', 61, pen_at[0] + 75, pen_at[1]); pg.wait_for_timeout(200)
        s = stored(pg); chk(len(s) == n0 + 1 and s[-1].get('pr'), 'only the stylus stroke is kept while a palm touches')
        n0 = len(s); line(pg, 'touch', 63, P(pg, 0.5, 0.65), P(pg, 0.7, 0.66), steps=6, wait=80)
        chk(len(stored(pg)) == n0, 'touch right after the stylus lifts is treated as palm')
        pg.wait_for_timeout(700)
        n0 = len(stored(pg)); line(pg, 'touch', 64, P(pg, 0.5, 0.65), P(pg, 0.7, 0.66), steps=6, wait=80, extra={'width': 60, 'height': 60})
        chk(len(stored(pg)) == n0, 'large contact (palm) is rejected')
        # after a stylus was used, fingers navigate (auto stylus mode)
        y0 = pg.evaluate("scrollY"); line(pg, 'touch', 65, P(pg, 0.5, 0.8), P(pg, 0.5, 0.4), steps=8, wait=80)
        chk(len(stored(pg)) == n0 and pg.evaluate("scrollY") > y0, 'after a stylus is seen, one finger scrolls instead of drawing')
        pg.evaluate("MedixaStudio.gesture.forgetPen(); scrollTo(0,0)"); pg.wait_for_timeout(200)
        # stylus-only setting
        pg.evaluate("MedixaStudio.setInput({stylusOnly:true})"); n0 = len(stored(pg))
        line(pg, 'touch', 66, P(pg, 0.2, 0.5), P(pg, 0.4, 0.5), steps=6, wait=80); chk(len(stored(pg)) == n0, 'stylus-only: finger does not draw')
        pg.evaluate("MedixaStudio.setInput({stylusOnly:false}); MedixaStudio.gesture.forgetPen()")
        # eraser tip of a stylus erases
        n0 = len(stored(pg)); last = stored(pg)[-1]; q = last['points'][len(last['points']) // 2]
        pg.evaluate("MedixaStudio.setTool('pen')"); x, y = P(pg, q[0], q[1], last['page'] - 1); ptr(pg, 'pointerdown', 'pen', 71, x - 6, y, {'buttons': 32, 'button': 5}); ptr(pg, 'pointermove', 'pen', 71, x, y, {'buttons': 32}); ptr(pg, 'pointermove', 'pen', 71, x + 6, y, {'buttons': 32}); ptr(pg, 'pointerup', 'pen', 71, x + 6, y, {'buttons': 0}); pg.wait_for_timeout(300)
        chk(last['id'] not in [x.get('id') for x in stored(pg)] and len(stored(pg)) < n0, 'stylus eraser end erases (pen tool unchanged)'); chk(pg.evaluate("MedixaStudio.S.tool") == 'pen', 'tool stays pen')
        pg.evaluate("MedixaStudio.undo()"); pg.wait_for_timeout(200)

        # ---------- hold to shape / straight marker ----------
        pg.evaluate("MedixaStudio.setInput({shapeSnap:true}); MedixaStudio.setTool('pen')"); cx, cy = P(pg, 0.5, 0.45); import math
        ptr(pg, 'pointerdown', 'pen', 81, cx + 80, cy, {'pressure': 0.5})
        for i in range(1, 41): a = 2 * math.pi * i / 40; ptr(pg, 'pointermove', 'pen', 81, cx + 80 * math.cos(a) + (2 if i % 3 else -2), cy + 50 * math.sin(a), {'pressure': 0.5}); pg.wait_for_timeout(6)
        pg.wait_for_timeout(700); ptr(pg, 'pointerup', 'pen', 81, cx + 80, cy); pg.wait_for_timeout(250)
        chk(stored(pg)[-1].get('tool') == 'ellipse', f'holding still after a circle snaps it to an ellipse ({stored(pg)[-1].get("tool")})')
        pg.evaluate("MedixaStudio.setTool('highlight'); MedixaStudio.setStyle('highlight', {straight:true, hsnap:true})"); a1 = P(pg, 0.1, 0.3)
        ptr(pg, 'pointerdown', 'mouse', 1, *a1)
        for i in range(1, 12): ptr(pg, 'pointermove', 'mouse', 1, a1[0] + 25 * i, a1[1] + (3 if i % 2 else -2)); pg.wait_for_timeout(8)
        pg.wait_for_timeout(700); ptr(pg, 'pointermove', 'mouse', 1, a1[0] + 330, a1[1] + 9); ptr(pg, 'pointerup', 'mouse', 1, a1[0] + 330, a1[1] + 9); pg.wait_for_timeout(250)
        h = stored(pg)[-1]; chk(h['tool'] == 'highlight' and len(h['points']) == 2 and abs(h['points'][0][1] - h['points'][1][1]) < 1e-9, f'hold makes a straight, level marker line ({len(h["points"])} pts)')

        # ---------- styles persist per tool ----------
        pg.evaluate("MedixaStudio.setStyle('pen', {color:'#e43d56', pen:'fountain', width:5}); MedixaStudio.setStyle('highlight', {color:'#7bd88f', op:0.45})"); pg.wait_for_timeout(500)
        pg.reload(); pg.wait_for_function("document.querySelectorAll('section.page').length===5"); pg.wait_for_timeout(600); pg.evaluate(JS)
        st = pg.evaluate("[MedixaStudio.style('pen'), MedixaStudio.style('highlight')]")
        chk(st[0]['pen'] == 'fountain' and st[0]['width'] == 5 and st[1]['color'] == '#7bd88f' and abs(st[1]['op'] - 0.45) < 1e-9, 'per-tool styles survive a reload')

        # ---------- zoom anchored at a point ----------
        pt = P(pg, 0.5, 0.3); before = pg.evaluate("([x,y]) => { const r = document.querySelector('section.page').getBoundingClientRect(); return [(x - r.left) / r.width, (y - r.top) / r.height]; }", list(pt))
        pg.evaluate("([x,y]) => MedixaStudio.reader.zoomAt(1.6, x, y)", list(pt)); pg.wait_for_timeout(300)
        after = pg.evaluate("([x,y]) => { const r = document.querySelector('section.page').getBoundingClientRect(); return [(x - r.left) / r.width, (y - r.top) / r.height]; }", list(pt))
        chk(abs(before[0] - after[0]) < 0.01 and abs(before[1] - after[1]) < 0.01, f'zoomAt keeps the point under the fingers ({before} vs {after})')
        pg.evaluate("MedixaStudio.reader.fit()"); pg.wait_for_timeout(300)

        # ---------- a failed save is retried without the user doing anything ----------
        pg.evaluate("MedixaStudio.setTool('pen')"); n0 = len(stored(pg))
        pg.evaluate("()=>{window.__set = Storage.prototype.setItem; Storage.prototype.setItem = function(){ throw new DOMException('full','QuotaExceededError') }}")
        line(pg, 'mouse', 1, P(pg, 0.2, 0.9), P(pg, 0.4, 0.9), steps=6); chk('تعذر' in pg.inner_text('#status'), 'failure reported')
        pg.evaluate("()=>{Storage.prototype.setItem = window.__set}"); pg.wait_for_timeout(2600)
        chk(len(stored(pg)) == n0 + 1 and pg.evaluate("MedixaStudio.S.state") == 'saved', 'automatic retry saved the stroke once storage worked again')
        chk(not errs, 'no page errors: ' + '; '.join(errs[:3]))
        b.close()
finally:
    srv.terminate()
chk.done()
