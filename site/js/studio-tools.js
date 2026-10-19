/* MEDIXA Study Studio — advanced annotation tools on top of the single ink engine:
   freeform lasso (select / move / resize / duplicate / delete), text + sticky notes, Zoom Writing.
   All geometry stays in canonical page coordinates; nothing here keeps a second copy of the document. */
(function () {
  'use strict';
  const M = window.MedixaStudio; if (!M) return;
  const C = M.C, S = M.S, $ = id => document.getElementById(id);
  const DPR = () => Math.min(3, window.devicePixelRatio || 1);
  const TEAL = '#168c8c';

  /* =============================== selection (lasso) =============================== */
  const types = { ink: true, shape: true, text: true };
  try { Object.assign(types, JSON.parse(localStorage.getItem('medixa.studio.lasso.v1') || '{}')); } catch {}
  const kind = s => s.tool === 'text' || s.tool === 'sticky' ? 'text' : C.SHAPES.includes(s.tool) ? 'shape' : 'ink';
  const sel = { page: 0, ids: [] };
  let lasso = null;             /* {mode,poly,start,orig:Map,box,handle,page} */
  const selItems = () => sel.ids.map(id => S.items.find(s => s && s.id === id)).filter(Boolean);
  function clearSel() { const p = sel.page; sel.ids = []; sel.page = 0; if (p) M.paint(M.page(p)); updateBar(); }
  function boxOf(items) {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const s of items) { const b = C.bounds(s); x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
    return [x0, y0, x1, y1];
  }
  const HANDLE = 16;                                            /* CSS px */
  function handleAt(pg, box, p) {
    const pts = { nw: [box[0], box[1]], ne: [box[2], box[1]], sw: [box[0], box[3]], se: [box[2], box[3]] };
    for (const [h, q] of Object.entries(pts)) if (Math.hypot((p[0] - q[0]) * pg.cssW, (p[1] - q[1]) * pg.cssH) <= HANDLE) return h;
    return null;
  }
  const inside = (box, p) => p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3];
  function pick(s) { const o = { points: s.points, rev: s.rev || 1 }; if (s.w != null) o.w = s.w; if (s.h != null) o.h = s.h; return o; }
  function applyLive(pg, m) {
    for (const [id, orig] of lasso.orig) { const i = S.items.findIndex(x => x && x.id === id); if (i >= 0) S.items[i] = Object.assign({}, orig, C.transformStroke(orig, m)); }
    pg.dirty = true; M.paint(pg);
  }
  function finishTransform(pg, cancelled) {
    const ops = [];
    for (const [id, orig] of lasso.orig) {
      if (cancelled) { const i = S.items.findIndex(x => x && x.id === id); if (i >= 0) S.items[i] = orig; continue; }
      const cur = S.items.find(x => x && x.id === id); if (!cur || cur.points === orig.points) continue;
      ops.push({ k: 'edit', id, before: pick(orig), after: pick(cur) });
    }
    M.rebuildIndexPage(pg.n); pg.dirty = true; M.paint(pg);
    if (ops.length) M.commit(ops);
  }
  function pickAt(pg, p) {
    const cand = M.idx(pg.n).query(p[0], p[1], 0.05).filter(s => s.page === pg.n && types[kind(s)]);
    let best = null, bd = 12;
    for (const s of cand) { const d = C.distToStroke(s, p[0], p[1], pg.cssW, pg.cssH); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  M.registerTool('lasso', {
    down(pg, e, p) {
      lasso = { page: pg.n, poly: null, start: p, orig: null, mode: 'draw' };
      if (sel.ids.length && sel.page === pg.n) {
        const box = boxOf(selItems()), h = handleAt(pg, box, p);
        if (h || inside(box, p)) {
          lasso.mode = h ? 'resize' : 'move'; lasso.handle = h; lasso.box = box;
          lasso.orig = new Map(selItems().map(s => [s.id, s]));
          return;
        }
      }
      if (sel.ids.length) clearSel();
      lasso.poly = [p];
    },
    move(pg, e, p) {
      if (!lasso) return;
      if (lasso.mode === 'draw') { lasso.poly.push(p); M.paint(pg); return; }
      if (lasso.mode === 'move') { applyLive(pg, { dx: p[0] - lasso.start[0], dy: p[1] - lasso.start[1] }); return; }
      const b = lasso.box, h = lasso.handle, ax = h.includes('w') ? b[2] : b[0], ay = h.includes('n') ? b[3] : b[1];
      const ow = Math.max(0.01, Math.abs(lasso.start[0] - ax)), oh = Math.max(0.01, Math.abs(lasso.start[1] - ay));
      let sx = Math.max(0.05, Math.abs(p[0] - ax) / ow), sy = Math.max(0.05, Math.abs(p[1] - ay) / oh);
      const free = selItems().length === 1 && selItems()[0].tool !== 'pen' && selItems()[0].tool !== 'highlight';
      if (!free) sx = sy = Math.max(sx, sy);
      applyLive(pg, { sx, sy, cx: ax, cy: ay });
    },
    up(pg, e, cancelled, p) {
      const L = lasso; lasso = null; if (!L) return;
      if (L.mode === 'draw') {
        const poly = L.poly || []; let hit = [];
        const tiny = poly.length < 4 || Math.hypot((p[0] - L.start[0]) * pg.cssW, (p[1] - L.start[1]) * pg.cssH) < 6 && poly.length < 8;
        if (!cancelled) {
          if (tiny) { const s = pickAt(pg, L.start); if (s) hit = [s]; }
          else {
            const bb = poly.reduce((a, q) => [Math.min(a[0], q[0]), Math.min(a[1], q[1]), Math.max(a[2], q[0]), Math.max(a[3], q[1])], [1, 1, 0, 0]);
            const seen = new Set();
            for (let x = bb[0]; x <= bb[2] + 0.05; x += 0.05) for (let y = bb[1]; y <= bb[3] + 0.05; y += 0.05) for (const s of M.idx(pg.n).query(Math.min(1, x), Math.min(1, y), 0.03)) seen.add(s);
            hit = [...seen].filter(s => s.page === pg.n && types[kind(s)] && C.lassoHit(s, poly));
          }
        }
        sel.page = hit.length ? pg.n : 0; sel.ids = hit.map(s => s.id); M.paint(pg); updateBar(); return;
      }
      lasso = L; finishTransform(pg, cancelled); lasso = null; updateBar();
    }
  });
  M.on('overlay', ({ pg, ctx }) => {
    const k = pg.ink.width / pg.cssW;
    if (lasso && lasso.poly && lasso.page === pg.n && lasso.mode === 'draw') {
      ctx.save(); ctx.setLineDash([6 * k, 4 * k]); ctx.strokeStyle = TEAL; ctx.fillStyle = 'rgba(22,140,140,.08)'; ctx.lineWidth = 1.6 * k;
      ctx.beginPath(); lasso.poly.forEach((q, i) => i ? ctx.lineTo(q[0] * pg.ink.width, q[1] * pg.ink.height) : ctx.moveTo(q[0] * pg.ink.width, q[1] * pg.ink.height)); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (sel.page === pg.n && sel.ids.length) {
      const items = selItems(); if (!items.length) return; const b = boxOf(items), W = pg.ink.width, H = pg.ink.height, pad = 6 * k;
      ctx.save(); ctx.strokeStyle = TEAL; ctx.lineWidth = 1.6 * k; ctx.setLineDash([5 * k, 4 * k]);
      ctx.strokeRect(b[0] * W - pad, b[1] * H - pad, (b[2] - b[0]) * W + 2 * pad, (b[3] - b[1]) * H + 2 * pad); ctx.setLineDash([]); ctx.fillStyle = '#fff';
      for (const [x, y] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) { ctx.beginPath(); ctx.arc(x * W + (x === b[0] ? -pad : pad), y * H + (y === b[1] ? -pad : pad), 6 * k, 0, 7); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    if (zw.open && zw.page === pg.n) {
      const R = zw.R(pg), W = pg.ink.width, H = pg.ink.height;
      ctx.save(); ctx.fillStyle = 'rgba(22,140,140,.10)'; ctx.strokeStyle = TEAL; ctx.lineWidth = 2 * k; ctx.fillRect(R.u0 * W, R.v0 * H, R.wU * W, R.hV * H); ctx.strokeRect(R.u0 * W, R.v0 * H, R.wU * W, R.hV * H); ctx.restore();
    }
  });
  M.on('select-refresh', () => { sel.ids = sel.ids.filter(id => S.items.some(s => s && s.id === id)); if (!sel.ids.length) sel.page = 0; updateBar(); const pg = M.page(sel.page || 1); if (pg) M.paint(pg); });

  /* ----- selection action bar ----- */
  let bar = null;
  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div'); bar.id = 'studio-selbar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'إجراءات التحديد');
    const mk = (id, label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.id = id; b.textContent = label; b.onclick = fn; bar.append(b); return b; };
    mk('sel-dup', 'تكرار', duplicate); mk('sel-del', 'حذف', del); mk('sel-clear', 'إلغاء التحديد', clearSel);
    const t = document.createElement('div'); t.className = 'st-types'; t.setAttribute('role', 'group'); t.setAttribute('aria-label', 'أنواع قابلة للتحديد');
    for (const [k, label] of [['ink', 'رسم'], ['shape', 'أشكال'], ['text', 'نصوص']]) {
      const l = document.createElement('label'), c = document.createElement('input'); c.type = 'checkbox'; c.checked = types[k]; c.dataset.type = k;
      c.onchange = () => { types[k] = c.checked; try { localStorage.setItem('medixa.studio.lasso.v1', JSON.stringify(types)); } catch {} };
      l.append(c, ' ' + label); t.append(l);
    }
    bar.append(t); document.body.append(bar); return bar;
  }
  function updateBar() { const b = ensureBar(); b.classList.toggle('open', S.tool === 'lasso' || sel.ids.length > 0); b.classList.toggle('has-sel', sel.ids.length > 0); }
  function del() { const ids = sel.ids.slice(); const ops = M.removeItems(ids); clearSel(); M.commit(ops); }
  function duplicate() {
    const ops = [], ids = [];
    for (const s of selItems()) { const c = Object.assign({}, s, { id: C.newId(), rev: 1, points: s.points.map(p => [C.clamp01(p[0] + 0.02), C.clamp01(p[1] + 0.02)]) }); ops.push(M.addItem(c)); ids.push(c.id); }
    sel.ids = ids; M.commit(ops); M.paint(M.page(sel.page)); updateBar();
  }
  function nudge(dx, dy) {
    const pg = M.page(sel.page); if (!pg || !sel.ids.length) return;
    const ops = [];
    for (const s of selItems()) { const t = C.transformStroke(s, { dx: dx / pg.cssW, dy: dy / pg.cssH }); ops.push({ k: 'edit', id: s.id, before: pick(s), after: t }); }
    for (const o of ops) M.patchItem(o.id, o.after);
    M.commit(ops);
  }
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (S.tool !== 'lasso' && !sel.ids.length) return;
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'Escape') { clearSel(); closeEditor(true); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (sel.ids.length) { e.preventDefault(); del(); } }
    else if (sel.ids.length && e.key === 'ArrowLeft') { e.preventDefault(); nudge(-step, 0); }
    else if (sel.ids.length && e.key === 'ArrowRight') { e.preventDefault(); nudge(step, 0); }
    else if (sel.ids.length && e.key === 'ArrowUp') { e.preventDefault(); nudge(0, -step); }
    else if (sel.ids.length && e.key === 'ArrowDown') { e.preventDefault(); nudge(0, step); }
  });
  M.on('tool', t => { if (t !== 'lasso' && sel.ids.length) clearSel(); updateBar(); if (t !== 'text' && t !== 'sticky') closeEditor(false); });

  /* =============================== text + sticky notes =============================== */
  let editor = null;
  const FILLS = ['#fff3a3', '#cdeff0', '#ffd9de', '#dcf3c6'];
  function textAt(pg, p) {
    const list = S.items.filter(s => s && s.page === pg.n && (s.tool === 'text' || s.tool === 'sticky') && C.validStroke(s));
    for (let i = list.length - 1; i >= 0; i--) { const b = C.bounds(list[i]); if (inside(b, p)) return list[i]; }
    return null;
  }
  function closeEditor(cancel) {
    if (!editor) return;
    const ed = editor; editor = null;
    if (!cancel && ed.commit) ed.commit();
    ed.el.remove();
  }
  function openEditor(pg, p, tool, existing) {
    closeEditor(false);
    const el = document.createElement('div'); el.className = 'st-editor'; el.dataset.kind = tool;
    const ta = document.createElement('textarea'); ta.maxLength = C.LIMITS.text; ta.dir = 'auto'; ta.rows = 3; ta.setAttribute('aria-label', tool === 'sticky' ? 'نص الملاحظة اللاصقة' : 'نص التعليق'); ta.value = existing ? existing.text : '';
    const w = existing ? existing.w : 0.28, size = existing ? existing.size || 18 : 18;
    const x0 = existing ? C.bounds(existing)[0] : Math.min(p[0], 1 - w), y0 = existing ? C.bounds(existing)[1] : Math.min(p[1], 0.9);
    el.style.left = (x0 * 100) + '%'; el.style.top = (y0 * 100) + '%'; el.style.width = (w * 100) + '%';
    ta.style.fontSize = (size * pg.cssW / 800) + 'px';
    const row = document.createElement('div'); row.className = 'st-editor-row';
    let fill = existing && existing.fill || FILLS[0];
    if (tool === 'sticky') for (const f of FILLS) { const b = document.createElement('button'); b.type = 'button'; b.className = 'st-fill'; b.dataset.fill = f; b.setAttribute('aria-label', 'لون الملاحظة'); b.style.background = f; b.onclick = () => { fill = f; ta.style.background = f; }; row.append(b); }
    if (tool === 'sticky') ta.style.background = fill;
    const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'st-ok'; ok.textContent = 'حفظ'; ok.onclick = () => closeEditor(false);
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'إلغاء'; cancel.onclick = () => closeEditor(true);
    row.append(ok, cancel);
    if (existing) { const d = document.createElement('button'); d.type = 'button'; d.className = 'st-del'; d.textContent = 'حذف'; d.onclick = () => { editor = null; el.remove(); M.commit(M.removeItems([existing.id])); }; row.append(d); }
    el.append(ta, row); pg.wrap.append(el);
    ta.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); closeEditor(true); } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); closeEditor(false); } });
    editor = { el, ta, pg, commit() {
      const text = ta.value.replace(/\s+$/g, '');
      if (existing) {
        if (!text) { M.commit(M.removeItems([existing.id])); return; }
        if (text === existing.text && fill === existing.fill) return;
        const props = { text, rev: (existing.rev || 1) + 1 }; if (tool === 'sticky') props.fill = fill;
        props.h = M.fitTextHeight(Object.assign({}, existing, props), pg);
        const op = M.patchItem(existing.id, props); if (op) M.commit([op]); return;
      }
      if (!text) return;
      const s = { id: C.newId(), v: 2, rev: 1, page: pg.n, tool, color: '#18334b', width: 3, text, size, w, h: 0.1, points: [[x0, y0]] };
      if (tool === 'sticky') s.fill = fill;
      s.h = M.fitTextHeight(s, pg); if (y0 + s.h > 1) s.points = [[x0, Math.max(0, 1 - s.h)]];
      M.commit([M.addItem(s)]);
    } };
    setTimeout(() => ta.focus({ preventScroll: true }), 0);
  }
  for (const t of ['text', 'sticky']) M.registerTool(t, {
    down(pg, e, p) {
      if (editor && editor.pg === pg && editor.el.contains(e.target)) return false;
      const hit = textAt(pg, p); openEditor(pg, p, hit ? hit.tool : t, hit);
      return false;
    }, move() {}, up() {}
  });
  /* double tap / double click on text with any tool reopens it for editing */
  addEventListener('dblclick', ev => {
    const c = ev.target.closest && ev.target.closest('canvas.ink'); if (!c) return;
    const pg = [...S.pages.values()].find(x => x.ink === c); if (!pg) return;
    const r = c.getBoundingClientRect(), p = [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height], hit = textAt(pg, p);
    if (hit) openEditor(pg, p, hit.tool, hit);
  });

  /* =============================== Zoom Writing =============================== */
  const zw = { open: false, page: 1, mag: 3, dir: 1, cu: 0.1, cv: 0.2, prev: 'pen', live: null, strip: null, ctx: null, raf: 0 };
  zw.R = pg => {
    const sw = zw.strip ? zw.strip.getBoundingClientRect().width : 600, sh = zw.strip ? zw.strip.getBoundingClientRect().height : 150;
    const wU = Math.min(1, (sw / zw.mag) / pg.cssW), hV = Math.min(1, (sh / zw.mag) / pg.cssH);
    return { u0: C.clamp(zw.cu, 0, 1 - wU), v0: C.clamp(zw.cv, 0, 1 - hV), wU, hV };
  };
  function zwBuild() {
    const el = document.createElement('section'); el.id = 'zw'; el.setAttribute('aria-label', 'الكتابة المكبرة'); el.hidden = true;
    el.innerHTML = '<div class="zw-head"><strong>الكتابة المكبرة</strong>' +
      '<label>التكبير <select id="zw-mag"><option value="2">×2</option><option value="3" selected>×3</option><option value="4">×4</option><option value="6">×6</option></select></label>' +
      '<label>الاتجاه <select id="zw-dir"><option value="1">من اليسار</option><option value="-1">من اليمين</option></select></label>' +
      '<button type="button" id="zw-left" aria-label="حرّك المنطقة لليسار">◀</button><button type="button" id="zw-right" aria-label="حرّك المنطقة لليمين">▶</button><button type="button" id="zw-up" aria-label="حرّك المنطقة للأعلى">▲</button><button type="button" id="zw-down" aria-label="حرّك المنطقة للأسفل">▼</button>' +
      '<button type="button" id="zw-newline">سطر جديد</button><button type="button" id="zw-close" aria-label="إغلاق الكتابة المكبرة">إغلاق</button></div><canvas id="zw-canvas" aria-label="مساحة الكتابة المكبرة"></canvas>';
    document.body.append(el);
    zw.el = el; zw.strip = el.querySelector('#zw-canvas'); zw.ctx = zw.strip.getContext('2d');
    el.querySelector('#zw-mag').onchange = e => { const R = zw.R(M.page(zw.page)), cu = R.u0 + R.wU / 2, cv = R.v0 + R.hV / 2; zw.mag = +e.target.value; zwRecentre(cu, cv); };
    el.querySelector('#zw-dir').onchange = e => { zw.dir = +e.target.value; };
    const mv = (du, dv) => () => { const R = zw.R(M.page(zw.page)); zw.cu = R.u0 + du * R.wU * 0.5; zw.cv = R.v0 + dv * R.hV * 0.5; zwSync(true); };
    el.querySelector('#zw-left').onclick = mv(-1, 0); el.querySelector('#zw-right').onclick = mv(1, 0); el.querySelector('#zw-up').onclick = mv(0, -1); el.querySelector('#zw-down').onclick = mv(0, 1);
    el.querySelector('#zw-newline').onclick = newLine; el.querySelector('#zw-close').onclick = zwClose;
    const c = zw.strip; c.style.touchAction = 'none';
    let drawing = null;
    const map = e => { const r = c.getBoundingClientRect(), R = zw.R(M.page(zw.page)); const su = C.clamp01((e.clientX - r.left) / r.width), sv = C.clamp01((e.clientY - r.top) / r.height); return [C.clamp01(R.u0 + su * R.wU), C.clamp01(R.v0 + sv * R.hV), su]; };
    c.addEventListener('pointerdown', e => {
      if (drawing) return; if (S.penOnly && e.pointerType !== 'pen') return;
      e.preventDefault(); try { c.setPointerCapture(e.pointerId); } catch {}
      const m = map(e), tool = zw.prev === 'highlight' ? 'highlight' : 'pen';
      drawing = { id: e.pointerId, s: { id: C.newId(), v: 2, rev: 1, page: zw.page, tool, color: S.color, width: Math.max(0.5, S.width / zw.mag), points: [[m[0], m[1]]] }, lastSu: m[2] };
      if (e.pointerType === 'pen' && tool === 'pen') drawing.s.pr = [C.clamp01(e.pressure)];
      zw.live = drawing.s; zwDraw();
    });
    c.addEventListener('pointermove', e => {
      if (!drawing || drawing.id !== e.pointerId) return;
      for (const ev of ((e.getCoalescedEvents && e.getCoalescedEvents()) || [e])) { const m = map(ev), L = drawing.s, last = L.points[L.points.length - 1]; if (Math.hypot(m[0] - last[0], m[1] - last[1]) < 0.0004) continue; L.points.push([m[0], m[1]]); if (L.pr) L.pr.push(C.clamp01(ev.pressure)); drawing.lastSu = m[2]; }
      zwDraw();
    });
    const end = (e, cancel) => {
      if (!drawing || drawing.id !== e.pointerId) return; const d = drawing; drawing = null; zw.live = null;
      if (!cancel && d.s.points.length >= 1) { M.commit([M.addItem(d.s)]); autoAdvance(d.lastSu); }
      zwDraw();
    };
    c.addEventListener('pointerup', e => end(e, false)); c.addEventListener('pointercancel', e => end(e, true));
    new ResizeObserver(() => zwSync()).observe(c);
  }
  function zwRecentre(cu, cv) { const R = zw.R(M.page(zw.page)); zw.cu = cu - R.wU / 2; zw.cv = cv - R.hV / 2; zwSync(); }
  function zwSync(reveal) {
    if (!zw.open) return; const c = zw.strip, r = c.getBoundingClientRect(), d = DPR();
    if (c.width !== Math.round(r.width * d) || c.height !== Math.round(r.height * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
    const R = zw.R(M.page(zw.page)); zw.cu = R.u0; zw.cv = R.v0;
    zwDraw(); const pg = M.page(zw.page); M.paint(pg); if (reveal) zwReveal(pg, R);
  }
  /* Keep the target region visible above the strip. */
  function zwReveal(pg, R) {
    const r = pg.ink.getBoundingClientRect(), top = r.top + R.v0 * r.height, bottom = r.top + (R.v0 + R.hV) * r.height, limit = innerHeight - (zw.el.getBoundingClientRect().height + 24);
    if (bottom > limit || top < 70) scrollBy(0, (bottom > limit ? bottom - limit : top - 90) + 0);
  }
  function zwDraw() {
    if (!zw.open || zw.raf) return;
    zw.raf = requestAnimationFrame(() => {
      zw.raf = 0; const pg = M.page(zw.page); if (!pg) return; const R = zw.R(pg), c = zw.strip, x = zw.ctx, W = c.width, H = c.height;
      x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
      const pdf = pg.wrap.querySelector('canvas.pdf'); if (pdf) x.drawImage(pdf, R.u0 * pdf.width, R.v0 * pdf.height, R.wU * pdf.width, R.hV * pdf.height, 0, 0, W, H);
      x.drawImage(pg.base, R.u0 * pg.base.width, R.v0 * pg.base.height, R.wU * pg.base.width, R.hV * pg.base.height, 0, 0, W, H);
      if (zw.live) {
        const sw = c.getBoundingClientRect().width, tmp = Object.assign({}, zw.live, { points: zw.live.points.map(q => [(q[0] - R.u0) / R.wU, (q[1] - R.v0) / R.hV]), width: zw.live.width * zw.mag * pg.cssW / sw });
        M.drawStroke(x, tmp, W, H);
      }
    });
  }
  function autoAdvance(su) {
    const pg = M.page(zw.page), R = zw.R(pg), edge = zw.dir === 1 ? su > 0.8 : su < 0.2;
    if (!edge) return;
    const nu = R.u0 + zw.dir * R.wU * 0.7;
    if (nu < 0 || nu > 1 - R.wU) newLine(); else { zw.cu = nu; zwSync(true); }
  }
  function newLine() {
    const pg = M.page(zw.page), R = zw.R(pg);
    zw.cu = zw.dir === 1 ? 0 : 1 - R.wU; zw.cv = Math.min(1 - R.hV, R.v0 + R.hV * 0.85); zwSync(true);
  }
  function zwOpen() {
    if (!zw.el) zwBuild();
    if (!zw.open) zw.prev = S.lastDrawTool === 'highlight' ? 'highlight' : 'pen';
    const pages = [...S.pages.values()], vis = pages.find(p => p.ink.getBoundingClientRect().bottom > 160) || pages[0];
    zw.page = zw.page && M.page(zw.page) && zw.open ? zw.page : vis.n; zw.open = true; zw.el.hidden = false; document.body.classList.add('zw-open');
    const pg = M.page(zw.page), r = pg.ink.getBoundingClientRect();
    if (!zw.seeded) { zw.cu = 0.05; zw.cv = Math.max(0, Math.min(0.9, (160 - r.top) / r.height + 0.05)); zw.seeded = true; }
    zwSync(true);
  }
  function zwClose() { zw.open = false; if (zw.el) zw.el.hidden = true; document.body.classList.remove('zw-open'); const pg = M.page(zw.page); if (pg) M.paint(pg); if (S.tool === 'zoom') M.setTool(zw.prev); }
  M.registerTool('zoom', {
    down(pg, e, p) { if (!zw.open) zwOpen(); zw.page = pg.n; const R = zw.R(pg); zw.cu = p[0] - R.wU / 2; zw.cv = p[1] - R.hV / 2; zwSync(); },
    move(pg, e, p) { if (!zw.open) return; const R = zw.R(pg); zw.cu = p[0] - R.wU / 2; zw.cv = p[1] - R.hV / 2; zwSync(); }, up() {}
  });
  M.on('tool', t => { if (t === 'zoom') zwOpen(); else if (zw.open && t !== 'zoom') { zwClose(); } });
  M.on('change', () => { if (zw.open) zwDraw(); });
  addEventListener('resize', () => zwSync());
  M.zoomWriting = { zw, open: zwOpen, close: zwClose, newLine };
  M.selection = { sel, clear: clearSel, duplicate, del, nudge, types };
})();
