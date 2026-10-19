/* MEDIXA Study Studio — the single ink engine for pdf-notes.html.
   Owns: tool state, pointer handling, rendering, undo/redo, persistence, export. Pure logic lives in studio-core.js.
   Storage: same key and v1-compatible stroke shape as before ('medixa.pdf.annotations.v1:<abs url>'). */
(function () {
  'use strict';
  const C = window.MedixaStudioCore;
  if (!C) return;
  const DPR = () => Math.min(3, window.devicePixelRatio || 1);
  const $ = id => document.getElementById(id);
  const S = {
    tool: 'pen', color: '#e43d56', width: 3, snap: false,
    penOnly: false, items: [], hist: null, pages: new Map(), deleted: new Set(),
    guard: null, key: '', src: '', docHash: '', raf: 0, saveTimer: 0, state: 'idle', listeners: {}
  };
  try { S.penOnly = localStorage.getItem('medixa.penOnly') === 'true'; } catch {}

  const emit = (n, d) => (S.listeners[n] || []).forEach(f => { try { f(d); } catch (e) { console.warn(e); } });
  const on = (n, f) => (S.listeners[n] = S.listeners[n] || []).push(f);

  /* ---------- status / persistence ---------- */
  const MSG = {
    editing: 'يجري التحرير…', pending: 'بانتظار الحفظ…', saved: 'محفوظ على هذا الجهاز ✓',
    failed: 'تعذر الحفظ — حُفظت مسودة احتياطية ويمكنك تنزيل نسخة', conflict: 'تغيّرت البيانات في تبويب آخر — اضغط «دمج وحفظ»'
  };
  function setState(st, extra) {
    S.state = st;
    const el = $('status');
    if (el) el.textContent = (MSG[st] || (window.MedixaGuard && MedixaGuard.MSG && MedixaGuard.MSG[st]) || st) + (extra || '');
    document.documentElement.dataset.saveState = st;
    emit('state', st);
  }
  function openGuard() { return MedixaGuard.open(localStorage, S.key, { fallback: () => [], valid: Array.isArray }); }
  function scheduleSave() { setState('pending'); clearTimeout(S.saveTimer); S.saveTimer = setTimeout(flush, 250); }
  function flush() {
    clearTimeout(S.saveTimer); S.saveTimer = 0;
    if (!S.dirty) return S.state;
    const r = S.guard.write(S.items);
    if (r === 'saved') { S.dirty = false; setState('saved'); try { clearDraft(); } catch {} return r; }
    saveDraft();
    setState(r === 'conflict' ? 'conflict' : 'failed');
    emit('savefail', r);
    return r;
  }
  /* A finished gesture is one write; continuous edits (drags) pass delay=true to coalesce. */
  function markDirty(delay) { S.dirty = true; emit('change'); if (delay) scheduleSave(); else flush(); }
  /* Failed writes also go to IndexedDB so a quota error or conflict never leaves the only copy in memory. */
  function idb() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no idb'));
      const rq = indexedDB.open('medixa-studio', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('drafts');
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  }
  async function saveDraft() { try { const d = await idb(); d.transaction('drafts', 'readwrite').objectStore('drafts').put({ at: Date.now(), items: S.items }, S.key); } catch {} }
  async function clearDraft() { try { const d = await idb(); d.transaction('drafts', 'readwrite').objectStore('drafts').delete(S.key); } catch {} }
  async function readDraft() { try { const d = await idb(); return await new Promise(r => { const q = d.transaction('drafts').objectStore('drafts').get(S.key); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); } catch { return null; } }
  function mergeAndSave() {
    const fresh = openGuard();
    if (fresh.state === 'corrupt' || fresh.state === 'unreadable') { setState(fresh.state); return fresh.state; }
    const migrated = C.migrate(fresh.value).list;
    const merged = C.mergeById(S.items, migrated, S.deleted);
    S.items.length = 0; S.items.push(...merged);
    S.guard = fresh; S.dirty = true; S.hist.setItems(S.items);
    rebuildAll(); return flush();
  }

  /* ---------- rendering ---------- */
  function drawPath(ctx, pts, w, h) {
    ctx.beginPath();
    const P = i => [pts[i][0] * w, pts[i][1] * h];
    let [x, y] = P(0);
    ctx.moveTo(x, y);
    if (pts.length === 1) { ctx.lineTo(x + 0.01, y + 0.01); return; }
    for (let i = 1; i < pts.length - 1; i++) { const a = P(i), b = P(i + 1); ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    const l = P(pts.length - 1); ctx.lineTo(l[0], l[1]);
  }
  function drawStroke(ctx, s, w, h) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const col = s.color || '#e43d56', base = (s.width || 3) * w / 800;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    if (s.tool === 'text' || s.tool === 'sticky') { drawTextBox(ctx, s, w, h); ctx.restore(); return; }
    const segs = C.shapeSegments(s);
    if (segs) {
      ctx.lineWidth = base; const a = s.points[0], b = s.points[s.points.length - 1];
      ctx.beginPath();
      if (s.tool === 'line') { ctx.moveTo(a[0] * w, a[1] * h); ctx.lineTo(b[0] * w, b[1] * h); }
      else if (s.tool === 'rectangle') ctx.rect(a[0] * w, a[1] * h, (b[0] - a[0]) * w, (b[1] - a[1]) * h);
      else ctx.ellipse((a[0] + b[0]) / 2 * w, (a[1] + b[1]) / 2 * h, Math.max(0.1, Math.abs(b[0] - a[0]) / 2 * w), Math.max(0.1, Math.abs(b[1] - a[1]) / 2 * h), 0, 0, 2 * Math.PI);
      ctx.stroke(); ctx.restore(); return;
    }
    if (s.tool === 'highlight') {
      /* One path, one stroke(): overlapping segments of the same stroke never darken. */
      ctx.globalAlpha = 0.3; ctx.lineWidth = C.widthAt(s.width || 3, 1, 'highlight') * w / 800; drawPath(ctx, s.points, w, h); ctx.stroke();
    } else if (s.pr && s.pr.length === s.points.length && s.points.length > 1) {
      /* Pressure pen: per-segment width, opaque so overlaps are invisible. */
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineWidth = C.widthAt(s.width || 3, (s.pr[i] + s.pr[i - 1]) / 2, 'pen') * w / 800;
        ctx.beginPath(); ctx.moveTo(s.points[i - 1][0] * w, s.points[i - 1][1] * h);
        const m = [(s.points[i - 1][0] + s.points[i][0]) / 2 * w, (s.points[i - 1][1] + s.points[i][1]) / 2 * h];
        ctx.quadraticCurveTo(s.points[i - 1][0] * w, s.points[i - 1][1] * h, m[0], m[1]); ctx.lineTo(s.points[i][0] * w, s.points[i][1] * h); ctx.stroke();
      }
    } else { ctx.lineWidth = base; drawPath(ctx, s.points, w, h); ctx.stroke(); }
    ctx.restore();
  }
  /* Text / sticky: drawn by the browser (so Arabic shaping and RTL are exact). Implemented fully in Phase 2. */
  function drawTextBox(ctx, s, w, h) {
    const b = C.bounds(s), x = b[0] * w, y = b[1] * h, bw = (b[2] - b[0]) * w, bh = (b[3] - b[1]) * h;
    if (s.tool === 'sticky') { ctx.fillStyle = s.fill || '#fff3a3'; ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 6; ctx.fillRect(x, y, bw, bh); ctx.shadowBlur = 0; }
    ctx.fillStyle = s.color || '#18334b';
    const size = (s.size || 18) * w / 800; ctx.font = `${size}px system-ui, "Noto Naskh Arabic", sans-serif`; ctx.textBaseline = 'top';
    const rtl = /[֐-ࣿ]/.test(s.text); ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = rtl ? 'right' : 'left';
    const pad = size * 0.4; let ty = y + pad;
    for (const para of String(s.text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const t = line ? line + ' ' + word : word;
        if (ctx.measureText(t).width > bw - pad * 2 && line) { ctx.fillText(line, rtl ? x + bw - pad : x + pad, ty); ty += size * 1.35; line = word; } else line = t;
      }
      ctx.fillText(line, rtl ? x + bw - pad : x + pad, ty); ty += size * 1.35;
    }
  }
  function sizePage(pg) {
    const r = pg.ink.getBoundingClientRect(), d = DPR();
    pg.cssW = Math.max(1, r.width); pg.cssH = Math.max(1, r.height);
    const W = Math.round(pg.cssW * d), H = Math.round(pg.cssH * d);
    if (pg.ink.width !== W || pg.ink.height !== H) { pg.ink.width = W; pg.ink.height = H; pg.base.width = W; pg.base.height = H; pg.dirty = true; }
  }
  function renderBase(pg) {
    const ctx = pg.base.getContext('2d'); ctx.clearRect(0, 0, pg.base.width, pg.base.height);
    for (const s of S.items) if (s && s.page === pg.n && C.validStroke(s)) drawStroke(ctx, s, pg.base.width, pg.base.height);
    pg.dirty = false;
  }
  function frame() {
    S.raf = 0;
    for (const pg of S.pages.values()) {
      if (pg.dirty) renderBase(pg);
      if (!pg.needsPaint) continue;
      pg.needsPaint = false;
      const ctx = pg.ink.getContext('2d'); ctx.clearRect(0, 0, pg.ink.width, pg.ink.height); ctx.drawImage(pg.base, 0, 0);
      if (pg.live) drawStroke(ctx, pg.live, pg.ink.width, pg.ink.height);
      emit('overlay', { pg, ctx });
    }
  }
  function paint(pg) { pg.needsPaint = true; if (!S.raf) S.raf = requestAnimationFrame(frame); }
  function invalidate(n) { const pg = S.pages.get(n); if (pg) { pg.dirty = true; paint(pg); } }
  function rebuildAll() { S.pages.forEach(pg => { pg.dirty = true; paint(pg); }); rebuildIndex(); }
  function rebuildIndex() { S.index = new Map(); for (const s of S.items) { if (s && s.id && C.validStroke(s)) { let ix = S.index.get(s.page); if (!ix) S.index.set(s.page, ix = new C.SpatialIndex()); ix.insert(s); } } }
  const idx = n => { let ix = S.index.get(n); if (!ix) S.index.set(n, ix = new C.SpatialIndex()); return ix; };

  /* ---------- pointer pipeline ---------- */
  const SNAP = Math.PI / 12;
  function posOf(pg, e) {
    const r = pg.ink.getBoundingClientRect();
    return [C.clamp01((e.clientX - r.left) / r.width), C.clamp01((e.clientY - r.top) / r.height)];
  }
  function snapEnd(a, b, tool, pg) {
    if (!S.snap) return b;
    const dx = (b[0] - a[0]) * pg.cssW, dy = (b[1] - a[1]) * pg.cssH;
    if (tool === 'line') { const ang = Math.round(Math.atan2(dy, dx) / SNAP) * SNAP, len = Math.hypot(dx, dy); return [C.clamp01(a[0] + Math.cos(ang) * len / pg.cssW), C.clamp01(a[1] + Math.sin(ang) * len / pg.cssH)]; }
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    return [C.clamp01(a[0] + Math.sign(dx || 1) * m / pg.cssW), C.clamp01(a[1] + Math.sign(dy || 1) * m / pg.cssH)];
  }
  function attachPage(o) {
    const pg = { n: o.pageNumber, wrap: o.wrap, ink: o.ink, base: document.createElement('canvas'), dirty: true, needsPaint: true, live: null, active: null, cssW: 1, cssH: 1 };
    S.pages.set(pg.n, pg);
    o.ink.style.touchAction = 'none';
    sizePage(pg); paint(pg);
    if (window.ResizeObserver) new ResizeObserver(() => { sizePage(pg); paint(pg); }).observe(o.ink);
    const ink = o.ink;
    ink.addEventListener('pointerdown', e => down(pg, e));
    ink.addEventListener('pointermove', e => move(pg, e));
    ink.addEventListener('pointerup', e => up(pg, e, false));
    ink.addEventListener('pointercancel', e => up(pg, e, true));
    ink.addEventListener('contextmenu', e => e.preventDefault());
    return pg;
  }
  function down(pg, e) {
    if (pg.active) return;                                    /* second finger / pen while one is active */
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (S.penOnly && e.pointerType !== 'pen') {               /* stylus-only: touch still scrolls the page */
      if (e.pointerType === 'touch') { pg.active = { id: e.pointerId, pan: true, y: e.clientY, x: e.clientX }; try { pg.ink.setPointerCapture(e.pointerId); } catch {} }
      return;
    }
    e.preventDefault();
    try { pg.ink.setPointerCapture(e.pointerId); } catch {}
    const p = posOf(pg, e), tool = S.tool;
    pg.active = { id: e.pointerId, type: e.pointerType, tool, ops: [], last: p, px: e.clientX, py: e.clientY };
    emit('beforegesture', { pg, e, tool });
    if (pg.active.cancelled) { pg.active = null; return; }
    if (tool === 'eraser') { setState('editing'); erase(pg, p); return; }
    if (['pen', 'highlight', 'line', 'rectangle', 'ellipse'].includes(tool)) {
      setState('editing');
      const real = e.pointerType === 'pen';
      pg.live = { id: C.newId(), v: 2, rev: 1, page: pg.n, tool, color: S.color, width: S.width, points: [p] };
      if (real && tool === 'pen') pg.live.pr = [C.clamp01(e.pressure)];
      paint(pg); return;
    }
    emit('gesture', { pg, e, tool, phase: 'down', p });
  }
  function move(pg, e) {
    const a = pg.active; if (!a || a.id !== e.pointerId) return;
    if (a.pan) { window.scrollBy(0, a.y - e.clientY); a.y = e.clientY; return; }
    const evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
    for (const ev of (evs.length ? evs : [e])) {
      const p = posOf(pg, ev);
      if (a.tool === 'eraser') { erase(pg, p); a.last = p; continue; }
      const L = pg.live;
      if (!L) { emit('gesture', { pg, e: ev, tool: a.tool, phase: 'move', p }); continue; }
      if (C.SHAPES.includes(L.tool)) { L.points = [L.points[0], snapEnd(L.points[0], p, L.tool, pg)]; continue; }
      const last = L.points[L.points.length - 1];
      if (Math.hypot((p[0] - last[0]) * pg.cssW, (p[1] - last[1]) * pg.cssH) < 0.6) continue;   /* thin redundant samples */
      L.points.push(p); if (L.pr) L.pr.push(C.clamp01(ev.pressure));
    }
    paint(pg);
  }
  function up(pg, e, cancelled) {
    const a = pg.active; if (!a || a.id !== e.pointerId) return;
    try { pg.ink.releasePointerCapture(e.pointerId); } catch {}
    pg.active = null;
    if (a.pan) return;
    if (a.tool === 'eraser') { if (a.ops.length) { S.hist.push(a.ops); markDirty(); } else if (S.state === 'editing') setState(S.dirty ? 'pending' : 'saved'); invalidate(pg.n); return; }
    const L = pg.live; pg.live = null;
    if (!L) { emit('gesture', { pg, e, tool: a.tool, phase: 'up', cancelled }); return; }
    if (cancelled) { paint(pg); setState(S.dirty ? 'pending' : 'saved'); return; }      /* a cancelled pointer discards its stroke */
    if (C.SHAPES.includes(L.tool) && L.points.length < 2) { paint(pg); return; }
    if (C.SHAPES.includes(L.tool)) {
      const [a0, b0] = L.points; if (Math.hypot((b0[0] - a0[0]) * pg.cssW, (b0[1] - a0[1]) * pg.cssH) < 3) { paint(pg); setState(S.dirty ? 'pending' : 'saved'); return; }
    }
    S.items.push(L); idx(pg.n).insert(L);
    S.hist.push([{ k: 'add', s: L }]);
    const ctx = pg.base.getContext('2d'); drawStroke(ctx, L, pg.base.width, pg.base.height);
    paint(pg); markDirty();
  }
  function erase(pg, p) {
    const a = pg.active, r = 9, ru = r / Math.min(pg.cssW, pg.cssH) + 0.03;
    const hits = idx(pg.n).query(p[0], p[1], ru).filter(s => s.page === pg.n && C.distToStroke(s, p[0], p[1], pg.cssW, pg.cssH) <= r + ((s.width || 3) * (s.tool === 'highlight' ? 6 : 1)) / 2 * pg.cssW / 800);
    for (const s of hits) {
      const i = S.items.indexOf(s); if (i < 0) continue;
      S.items.splice(i, 1); idx(pg.n).remove(s); S.deleted.add(s.id); a.ops.push({ k: 'del', s, i });
    }
    if (hits.length) { pg.dirty = true; paint(pg); }
  }

  /* ---------- history ---------- */
  function afterHistory(ops) {
    if (!ops) return;
    const pages = new Set();
    for (const o of ops) { const s = o.s || S.items.find(x => x.id === o.id); if (s) pages.add(s.page); }
    pages.forEach(n => { const ix = new C.SpatialIndex(); S.items.forEach(s => s && s.id && s.page === n && C.validStroke(s) && ix.insert(s)); S.index.set(n, ix); invalidate(n); });
    S.items.forEach(s => s && s.id && S.deleted.delete(s.id));
    markDirty(); emit('select-refresh');
  }
  const undo = () => afterHistory(S.hist.undo());
  const redo = () => afterHistory(S.hist.redo());

  /* ---------- export (vector, rotation/CropBox aware) ---------- */
  const hex = c => { const m = /^#([0-9a-f]{3}|[0-9a-f]{6})/i.exec(c || '#e43d56'); let h = m ? m[1] : 'e43d56'; if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4), 16) / 255]; };
  function quadFlatten(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s = out[out.length - 1];
      for (let k = 1; k <= 6; k++) { const t = k / 6, u = 1 - t; out.push([u * u * s[0] + 2 * u * t * a[0] + t * t * m[0], u * u * s[1] + 2 * u * t * a[1] + t * t * m[1]]); }
    }
    out.push(pts[pts.length - 1]); return out;
  }
  async function exportPdf(bytes, opts) {
    opts = opts || {};
    const { PDFDocument, rgb, LineCapStyle, LineJoinStyle } = window.PDFLib;
    const out = await PDFDocument.load(bytes), pagesN = out.getPageCount();
    const textPages = [];
    for (let i = 0; i < pagesN; i++) {
      const strokes = S.items.filter(x => x && x.page === i + 1 && C.validStroke(x)); if (!strokes.length) continue;
      const page = out.getPage(i), box = page.getCropBox ? page.getCropBox() : page.getMediaBox(), rot = page.getRotation().angle;
      const [dw, dh] = C.displaySize(box, rot);
      const P = p => { const q = C.viewToPdf(p[0], p[1], box, rot); return [q[0], q[1]]; };
      const path = pts => pts.map((p, k) => { const q = P(p); return (k ? 'L' : 'M') + q[0].toFixed(3) + ' ' + (-q[1]).toFixed(3); }).join(' ');
      const wpt = (s, pr) => C.widthAt(s.width || 3, pr, s.tool === 'highlight' ? 'highlight' : s.tool === 'pen' ? 'pen' : 'shape') / 800 * dw;
      for (const s of strokes) {
        if (s.tool === 'text' || s.tool === 'sticky') { textPages.push([i, s]); continue; }
        const [r, g, b] = hex(s.color), color = rgb(r, g, b), op = s.tool === 'highlight' ? 0.3 : 1;
        const draw = (d, width) => page.drawSvgPath(d, { x: 0, y: 0, borderColor: color, borderWidth: width, borderOpacity: op, borderLineCap: LineCapStyle.Round, borderLineJoin: LineJoinStyle.Round });
        const segs = C.shapeSegments(s);
        if (segs) {
          const pts = s.tool === 'line' ? s.points.slice(0, 1).concat(s.points.slice(-1)) : s.tool === 'rectangle' ? segs.map(x => x[0]).concat([segs[0][0]]) : segs.map(x => x[0]).concat([segs[0][0]]);
          draw(path(pts), wpt(s, 1));
        } else if (s.pr && s.pr.length === s.points.length && s.points.length > 1) {
          const pts = quadFlatten(s.points);
          for (let k = 1; k < s.points.length; k++) draw(path([s.points[k - 1], s.points[k]]), wpt(s, (s.pr[k] + s.pr[k - 1]) / 2));
        } else if (s.points.length === 1) draw(path([s.points[0], [s.points[0][0] + 0.0001, s.points[0][1]]]), wpt(s, 0.5));
        else draw(path(quadFlatten(s.points)), wpt(s, 0.5));
      }
    }
    if (textPages.length) await exportText(out, textPages);
    return out.save();
  }
  /* Text and sticky notes: rasterised by the browser at 3x so Arabic shaping and RTL are exact, then placed by box. */
  async function exportText(out, list) {
    for (const [i, s] of list) {
      const page = out.getPage(i), box = page.getCropBox ? page.getCropBox() : page.getMediaBox(), rot = page.getRotation().angle, [dw, dh] = C.displaySize(box, rot);
      const b = C.bounds(s), W = Math.round((b[2] - b[0]) * 1200), H = Math.round((b[3] - b[1]) * 1200 * dh / dw);
      const cv = document.createElement('canvas'); cv.width = Math.max(4, W); cv.height = Math.max(4, H);
      const sb = Object.assign({}, s, { points: [[0, 0]], w: 1, h: 1 }); drawTextBox(cv.getContext('2d'), sb, cv.width, cv.height);
      const png = await out.embedPng(await (await fetch(cv.toDataURL('image/png'))).arrayBuffer());
      const p0 = C.viewToPdf(b[0], b[1], box, rot), p1 = C.viewToPdf(b[2], b[3], box, rot);
      const x = Math.min(p0[0], p1[0]), y = Math.min(p0[1], p1[1]), w = Math.abs(p1[0] - p0[0]), h = Math.abs(p1[1] - p0[1]);
      if (rot === 0) page.drawImage(png, { x, y, width: w, height: h });
      else {
        /* Rotated page: draw upright in display space by rotating the image about its pdf-space origin. */
        const { degrees } = window.PDFLib;
        const o = C.viewToPdf(b[0], b[3], box, rot);
        page.drawImage(png, { x: o[0], y: o[1], width: (b[2] - b[0]) * dw, height: (b[3] - b[1]) * dh, rotate: degrees(rot === 90 ? -90 : rot === 180 ? 180 : 90) });
      }
    }
  }

  /* ---------- tool UI binding (header buttons keep their ids/data attributes) ---------- */
  function setTool(t) { S.tool = t; document.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('active', b.dataset.tool === t); b.setAttribute('aria-pressed', String(b.dataset.tool === t)); }); document.documentElement.dataset.studioTool = t; emit('tool', t); }
  function bindUi() {
    document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
    if ($('color')) $('color').oninput = e => { S.color = e.target.value; emit('style'); };
    if ($('width')) $('width').oninput = e => { S.width = +e.target.value; emit('style'); };
    if ($('undo')) $('undo').onclick = undo;
    if ($('redo')) $('redo').onclick = redo;
    addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    });
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    addEventListener('pagehide', flush); addEventListener('beforeunload', flush);
  }

  /* ---------- recovery banner (conflict / failed write / unsaved draft) ---------- */
  function banner(text, actions) {
    let el = $('studio-banner');
    if (!el) { el = document.createElement('div'); el.id = 'studio-banner'; el.setAttribute('role', 'alert'); document.body.append(el); }
    el.replaceChildren(); const sp = document.createElement('span'); sp.textContent = text; el.append(sp);
    for (const [label, fn] of actions) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = () => { el.classList.remove('open'); fn(); }; el.append(b); }
    el.classList.add('open');
  }
  function downloadJson() {
    const blob = new Blob([JSON.stringify({ format: 'medixa-ink-v1', document: new URL(S.src, location.href).href, strokes: S.items, exportedAt: new Date().toISOString() })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'medixa-ink-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  on('savefail', r => {
    if (r === 'conflict') banner('تغيّرت رسوماتك في تبويب آخر. يمكنك دمج التغييرين دون فقد أي منهما.', [['دمج وحفظ', () => mergeAndSave()], ['تنزيل نسخة', downloadJson]]);
    else banner('تعذر الحفظ على هذا الجهاز. حُفظت مسودة احتياطية، وتنزيل نسخة يحميك من الضياع.', [['تنزيل نسخة', downloadJson]]);
  });
  on('draft', d => banner('وُجدت مسودة رسومات لم تُحفظ (' + d.items.length + ' عنصراً). هل تريد استعادتها ودمجها؟', [['استعادة', () => { const n = recoverDraft(); setState('saved', ' — أُضيف ' + n); }], ['تجاهل', () => { S.draft = null; clearDraft(); }]]));

  /* ---------- init ---------- */
  async function init(o) {
    S.src = o.src; S.key = 'medixa.pdf.annotations.v1:' + new URL(o.src, location.href).href;
    S.guard = openGuard();
    const loaded = S.guard.value;
    const m = C.migrate(Array.isArray(loaded) ? loaded : []);
    S.items = m.list; S.invalid = m.invalid; S.dirty = false;      /* migration is in-memory; first real edit persists it */
    S.hist = new C.History(S.items); S.hist.onchange = () => emit('history');
    rebuildIndex(); bindUi(); setTool('pen');
    S.state = 'idle';
    if (o.bytes && window.crypto && crypto.subtle) { try { const h = await crypto.subtle.digest('SHA-256', o.bytes); S.docHash = [...new Uint8Array(h)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join(''); } catch {} }
    const draft = await readDraft();
    if (draft && Array.isArray(draft.items) && draft.items.length) { S.draft = draft; emit('draft', draft); }
    return api;
  }
  function recoverDraft() {
    if (!S.draft) return 0;
    const before = S.items.length, merged = C.mergeById(S.items, C.migrate(S.draft.items).list, S.deleted);
    S.items.length = 0; S.items.push(...merged); S.hist.setItems(S.items); S.draft = null;
    rebuildAll(); S.dirty = true; flush(); return S.items.length - before;
  }
  function ready() { setState(S.guard.state === 'ok' ? 'saved' : S.guard.state); S.state = S.guard.state === 'ok' ? 'saved' : S.guard.state; const el = $('status'); if (el && S.guard.state === 'ok') el.textContent = 'جاهز • الحفظ محلي'; }

  const api = {
    S, C, init, ready, attachPage, setTool, undo, redo, flush, mergeAndSave, recoverDraft, exportPdf, on, emit, markDirty, rebuildAll, invalidate, paint, idx, rebuildIndex, drawStroke, drawTextBox,
    setPenOnly(v) { S.penOnly = !!v; try { localStorage.setItem('medixa.penOnly', String(S.penOnly)); } catch {} emit('penonly', S.penOnly); },
    setSnap(v) { S.snap = !!v; },
    getItems: () => S.items, save: () => { S.dirty = true; return flush(); }, redraw: () => rebuildAll(), checkpoint: () => {}
  };
  window.MedixaStudio = api;
})();
