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
    layout: { v: 1, margins: {}, blanks: [], order: null }, nSources: 0,
    tool: 'pen', color: '#e43d56', width: 3, snap: false,
    penOnly: false, items: [], hist: null, pages: new Map(), deleted: new Set(),
    guard: null, key: '', src: '', docHash: '', raf: 0, saveTimer: 0, state: 'idle', listeners: {}
  };
  try { S.penOnly = localStorage.getItem('medixa.penOnly') === 'true'; } catch {}

  const TOOLS = {};   /* name -> {down,move,up}; used by lasso / text / sticky / zoom writing */
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
  /* Keys of every document that currently has an unsaved draft (used by the tab strip's dirty marker). */
  async function draftKeys() { try { const d = await idb(); return await new Promise(r => { const q = d.transaction('drafts').objectStore('drafts').getAllKeys(); q.onsuccess = () => r(new Set(q.result)); q.onerror = () => r(new Set()); }); } catch { return new Set(); } }
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
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, bw, bh); ctx.clip();
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
    ctx.restore();
  }
  /* Height (normalized) a text needs at the box width, so notes grow with their content. */
  function fitTextHeight(s, pg) {
    const cv = fitTextHeight.cv || (fitTextHeight.cv = document.createElement('canvas')), ctx = cv.getContext('2d'), W = 800, H = 800 * pg.cssH / pg.cssW;
    const size = s.size || 18, pad = size * 0.4, bw = (s.w || 0.28) * W; ctx.font = `${size}px system-ui, "Noto Naskh Arabic", sans-serif`;
    let lines = 0;
    for (const para of String(s.text).split('\n')) { let line = ''; lines++; for (const word of para.split(/\s+/)) { const t = line ? line + ' ' + word : word; if (ctx.measureText(t).width > bw - pad * 2 && line) { lines++; line = word; } else line = t; } }
    return Math.max(0.04, (pad * 2 + lines * size * 1.35) / H);
  }
  function sizePage(pg) {
    if (!pg.on) { if (pg.ink.width !== 1) { pg.ink.width = 1; pg.ink.height = 1; pg.base.width = 1; pg.base.height = 1; } pg.dirty = true; return; }   /* off-screen pages hold no pixels */
    const r = pg.ink.getBoundingClientRect(), d = DPR(), e = pg.ext, kx = 1 + e.l + e.r, ky = 1 + e.t + e.b;
    pg.totW = Math.max(1, r.width); pg.totH = Math.max(1, r.height);
    pg.cssW = pg.totW / kx; pg.cssH = pg.totH / ky;                /* cssW/cssH = the PAGE area, margins excluded */
    const W = Math.round(pg.totW * d), H = Math.round(pg.totH * d);
    if (pg.ink.width !== W || pg.ink.height !== H) { pg.ink.width = W; pg.ink.height = H; pg.base.width = W; pg.base.height = H; pg.dirty = true; }
    pg.pw = W / kx; pg.ph = H / ky;                                /* page area in canvas px */
  }
  function renderBase(pg) {
    const ctx = pg.base.getContext('2d'); ctx.clearRect(0, 0, pg.base.width, pg.base.height);
    ctx.save(); ctx.translate(pg.pw * pg.ext.l, pg.ph * pg.ext.t);
    for (const s of S.items) if (s && s.page === pg.n && C.validStroke(s)) drawStroke(ctx, s, pg.pw, pg.ph);
    ctx.restore();
    pg.dirty = false;
  }
  function frame() {
    S.raf = 0;
    for (const pg of S.pages.values()) {
      if (!pg.on) continue;
      if (pg.dirty) renderBase(pg);
      if (!pg.needsPaint) continue;
      pg.needsPaint = false;
      const ctx = pg.ink.getContext('2d'); ctx.clearRect(0, 0, pg.ink.width, pg.ink.height); ctx.drawImage(pg.base, 0, 0);
      if (pg.live) { ctx.save(); ctx.translate(pg.pw * pg.ext.l, pg.ph * pg.ext.t); drawStroke(ctx, pg.live, pg.pw, pg.ph); ctx.restore(); }
      emit('overlay', { pg, ctx });
    }
  }
  function paint(pg) { pg.needsPaint = true; if (!S.raf) S.raf = requestAnimationFrame(frame); }
  function setPageActive(n, on) { const pg = S.pages.get(n); if (!pg || pg.on === !!on) return; if (!on && pg.active) return; pg.on = !!on; sizePage(pg); if (on) { pg.dirty = true; paint(pg); } }
  function invalidate(n) { const pg = S.pages.get(n); if (pg) { pg.dirty = true; paint(pg); } }
  function rebuildAll() { S.pages.forEach(pg => { pg.dirty = true; paint(pg); }); rebuildIndex(); }
  function rebuildIndex() { S.index = new Map(); for (const s of S.items) { if (s && s.id && C.validStroke(s)) { let ix = S.index.get(s.page); if (!ix) S.index.set(s.page, ix = new C.SpatialIndex()); ix.insert(s); } } }
  const idx = n => { let ix = S.index.get(n); if (!ix) S.index.set(n, ix = new C.SpatialIndex()); return ix; };

  /* ---------- pointer pipeline ---------- */
  const SNAP = Math.PI / 12;
  const bx = (pg, u) => C.clamp(u, -pg.ext.l, 1 + pg.ext.r), by = (pg, v) => C.clamp(v, -pg.ext.t, 1 + pg.ext.b);
  function posOf(pg, e) {
    const r = pg.ink.getBoundingClientRect(), x = pg.ext, kx = 1 + x.l + x.r, ky = 1 + x.t + x.b;
    return [C.clamp(((e.clientX - r.left) / r.width) * kx - x.l, -x.l, 1 + x.r), C.clamp(((e.clientY - r.top) / r.height) * ky - x.t, -x.t, 1 + x.b)];
  }
  function snapEnd(a, b, tool, pg) {
    if (!S.snap) return b;
    const dx = (b[0] - a[0]) * pg.cssW, dy = (b[1] - a[1]) * pg.cssH;
    if (tool === 'line') { const ang = Math.round(Math.atan2(dy, dx) / SNAP) * SNAP, len = Math.hypot(dx, dy); return [bx(pg, a[0] + Math.cos(ang) * len / pg.cssW), by(pg, a[1] + Math.sin(ang) * len / pg.cssH)]; }
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    return [bx(pg, a[0] + Math.sign(dx || 1) * m / pg.cssW), by(pg, a[1] + Math.sign(dy || 1) * m / pg.cssH)];
  }
  function attachPage(o) {
    const pg = { n: o.pageNumber, wrap: o.wrap, ink: o.ink, pdf: o.pdf || null, base: document.createElement('canvas'), dirty: true, needsPaint: true, live: null, active: null, cssW: 1, cssH: 1, totW: 1, totH: 1, pw: 1, ph: 1, ext: Object.assign({ l: 0, t: 0, r: 0, b: 0 }, S.layout.margins[o.pageNumber] || {}), on: !o.lazy && !o.pdf };
    pg.px = (u, v) => [(u + pg.ext.l) * pg.pw, (v + pg.ext.t) * pg.ph];
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
    if (TOOLS[tool]) { pg.active.custom = TOOLS[tool]; setState('editing'); if (TOOLS[tool].down(pg, e, p) === false) pg.active = null; return; }
    if (tool === 'eraser') { setState('editing'); erase(pg, p); return; }
    if (['pen', 'highlight', 'line', 'rectangle', 'ellipse'].includes(tool)) {
      setState('editing');
      const real = e.pointerType === 'pen';
      pg.live = { id: C.newId(), v: 2, rev: 1, page: pg.n, tool, color: S.color, width: S.width, points: [p] };
      if (real && tool === 'pen') pg.live.pr = [C.clamp01(e.pressure)];
      paint(pg); return;
    }
  }
  function move(pg, e) {
    const a = pg.active; if (!a || a.id !== e.pointerId) return;
    if (a.pan) { window.scrollBy(0, a.y - e.clientY); a.y = e.clientY; return; }
    const evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
    for (const ev of (evs.length ? evs : [e])) {
      const p = posOf(pg, ev);
      if (a.custom) { a.custom.move(pg, ev, p); a.last = p; continue; }
      if (a.tool === 'eraser') { erase(pg, p); a.last = p; continue; }
      const L = pg.live;
      if (!L) continue;
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
    if (a.custom) { a.custom.up(pg, e, cancelled, posOf(pg, e)); const ok = S.state === 'editing'; if (ok) setState(S.dirty ? 'pending' : 'saved'); return; }
    if (a.tool === 'eraser') { if (a.ops.length) { S.hist.push(a.ops); markDirty(); } else if (S.state === 'editing') setState(S.dirty ? 'pending' : 'saved'); invalidate(pg.n); return; }
    const L = pg.live; pg.live = null;
    if (!L) return;
    if (cancelled) { paint(pg); setState(S.dirty ? 'pending' : 'saved'); return; }      /* a cancelled pointer discards its stroke */
    if (C.SHAPES.includes(L.tool) && L.points.length < 2) { paint(pg); return; }
    if (C.SHAPES.includes(L.tool)) {
      const [a0, b0] = L.points; if (Math.hypot((b0[0] - a0[0]) * pg.cssW, (b0[1] - a0[1]) * pg.cssH) < 3) { paint(pg); setState(S.dirty ? 'pending' : 'saved'); return; }
    }
    S.items.push(L); idx(pg.n).insert(L);
    S.hist.push([{ k: 'add', s: L }]);
    const ctx = pg.base.getContext('2d'); ctx.save(); ctx.translate(pg.pw * pg.ext.l, pg.ph * pg.ext.t); drawStroke(ctx, L, pg.pw, pg.ph); ctx.restore();
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
  /* Expanded output: the page boxes grow to hold the margins; original content stays exactly where it was. */
  function growBoxes(page, box, rot, e) {
    const c = [C.viewToPdf(-e.l, -e.t, box, rot), C.viewToPdf(1 + e.r, 1 + e.b, box, rot)], x0 = Math.min(c[0][0], c[1][0]), x1 = Math.max(c[0][0], c[1][0]), y0 = Math.min(c[0][1], c[1][1]), y1 = Math.max(c[0][1], c[1][1]);
    page.setMediaBox(x0, y0, x1 - x0, y1 - y0); page.setCropBox(x0, y0, x1 - x0, y1 - y0);
  }
  /* What a clipped (original-page) export would leave out. */
  function marginReport() {
    const pages = new Set(); let strokes = 0;
    for (const s of S.items) { if (!s || !C.validStroke(s)) continue; const b = C.bounds(s); if (b[0] < 0 || b[1] < 0 || b[2] > 1 || b[3] > 1) { strokes++; pages.add(s.page); } }
    return { strokes, pages: [...pages].sort((a, b) => a - b), hasMargins: Object.keys(S.layout.margins).length > 0 };
  }
  /* Output page list: every source page (in place) plus the virtual blank pages in display order. */
  async function exportPdf(bytes, opts) {
    opts = opts || {};
    const { PDFDocument, rgb, LineCapStyle, LineJoinStyle } = window.PDFLib;
    const hasSrc = !!bytes && S.nSources > 0;                         /* a notebook has no source pages (pdf-lib would add one to an empty file) */
    const out = hasSrc ? await PDFDocument.load(bytes) : await PDFDocument.create(), nSrc = hasSrc ? out.getPageCount() : 0;
    const textPages = [], expand = opts.margins === 'expand';
    const srcPages = Array.from({ length: nSrc }, (_, i) => out.getPage(i)), map = new Map();
    const order = pageOrder(nSrc);
    order.forEach((id, k) => {
      if (id < C.BLANK_ID0) { map.set(id, srcPages[id - 1]); return; }
      const bl = S.layout.blanks.find(x => x.id === id), pg = out.insertPage(k, [bl.w, bl.h]);
      const geo = C.templateGeometry(bl.template, bl.w, bl.h), c = rgb(0.74, 0.82, 0.86);
      for (const [x1, y1, x2, y2] of geo.lines) pg.drawLine({ start: { x: x1, y: bl.h - y1 }, end: { x: x2, y: bl.h - y2 }, thickness: 0.5, color: c });
      for (const [x, y] of geo.dots) pg.drawCircle({ x, y: bl.h - y, size: 0.9, color: c });
      map.set(id, pg);
    });
    for (const [id, page] of map) {
      const strokes = S.items.filter(x => x && x.page === id && C.validStroke(x)); if (!strokes.length) continue;
      const box = page.getCropBox ? page.getCropBox() : page.getMediaBox(), rot = page.getRotation().angle;
      const [dw, dh] = C.displaySize(box, rot);
      if (expand && S.layout.margins[id]) growBoxes(page, box, rot, S.layout.margins[id]);
      const P = p => { const q = C.viewToPdf(p[0], p[1], box, rot); return [q[0], q[1]]; };
      const path = pts => pts.map((p, k) => { const q = P(p); return (k ? 'L' : 'M') + q[0].toFixed(3) + ' ' + (-q[1]).toFixed(3); }).join(' ');
      const wpt = (s, pr) => C.widthAt(s.width || 3, pr, s.tool === 'highlight' ? 'highlight' : s.tool === 'pen' ? 'pen' : 'shape') / 800 * dw;
      for (const s of strokes) {
        if (s.tool === 'text' || s.tool === 'sticky') { textPages.push({ page, box, rot, s }); continue; }
        const [r, g, b] = hex(s.color), color = rgb(r, g, b), op = s.tool === 'highlight' ? 0.3 : 1;
        const draw = (d, width) => page.drawSvgPath(d, { x: 0, y: 0, borderColor: color, borderWidth: width, borderOpacity: op, borderLineCap: LineCapStyle.Round, borderLineJoin: LineJoinStyle.Round });
        const segs = C.shapeSegments(s);
        if (segs) {
          const pts = s.tool === 'line' ? s.points.slice(0, 1).concat(s.points.slice(-1)) : segs.map(x => x[0]).concat([segs[0][0]]);
          draw(path(pts), wpt(s, 1));
        } else if (s.pr && s.pr.length === s.points.length && s.points.length > 1) {
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
    for (const { page, box, rot, s } of list) {
      const [dw, dh] = C.displaySize(box, rot);
      const b = C.bounds(s), W = Math.round((b[2] - b[0]) * 1200), H = Math.round((b[3] - b[1]) * 1200 * dh / dw);
      const cv = document.createElement('canvas'); cv.width = Math.max(4, W); cv.height = Math.max(4, H);
      const cx = cv.getContext('2d'); cx.translate(-b[0] * 1200, -b[1] * 1200 * dh / dw); drawTextBox(cx, s, 1200, 1200 * dh / dw);
      const png = await out.embedPng(await (await fetch(cv.toDataURL('image/png'))).arrayBuffer());
      /* Display-space bottom-left of the note is the image origin; the image x-axis follows display-x, which is the
         PDF axis rotated by the page's /Rotate (verified for 0/90/180/270 with CropBox in tests/studio_phase2_browser.py). */
      const o = C.viewToPdf(b[0], b[3], box, rot), { degrees } = window.PDFLib;
      page.drawImage(png, { x: o[0], y: o[1], width: (b[2] - b[0]) * dw, height: (b[3] - b[1]) * dh, rotate: degrees(rot) });
    }
  }

  /* ---------- tool UI binding (header buttons keep their ids/data attributes) ---------- */
  function setTool(t) { if (t === 'pen' || t === 'highlight') S.lastDrawTool = t; S.tool = t; document.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('active', b.dataset.tool === t); b.setAttribute('aria-pressed', String(b.dataset.tool === t)); }); document.documentElement.dataset.studioTool = t; emit('tool', t); }
  function bindUi() {
    document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
    addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    });
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { flush(); saveHist(); } });
    addEventListener('pagehide', () => { flush(); saveHist(); }); addEventListener('beforeunload', flush);
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

  /* ---------- per-document undo history that survives switching tabs (sessionStorage, validated by a fingerprint) ---------- */
  const fp = () => { let h = 0x811c9dc5; for (const s of S.items) { const t = (s && s.id ? s.id : '?') + ':' + (s && s.rev || 1); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } } return S.items.length + ':' + h.toString(36); };
  const histKey = () => 'medixa.studio.hist.v1:' + S.key;
  function saveHist() {
    try {
      let u = S.hist.undoStack, r = S.hist.redoStack, json = JSON.stringify({ fp: fp(), undo: u, redo: r });
      while (json.length > 1500000 && u.length > 1) { u = u.slice(Math.ceil(u.length / 4)); json = JSON.stringify({ fp: fp(), undo: u, redo: r.length > 20 ? [] : r }); }
      sessionStorage.setItem(histKey(), json);
    } catch {}
  }
  function restoreHist() {
    try {
      const v = JSON.parse(sessionStorage.getItem(histKey()) || 'null'); if (!v || v.fp !== fp() || !Array.isArray(v.undo) || !Array.isArray(v.redo)) return;
      const ok = ops => Array.isArray(ops) && ops.every(o => o && (o.k === 'add' || o.k === 'del' || o.k === 'edit'));
      if (v.undo.every(ok) && v.redo.every(ok)) { S.hist.undoStack = v.undo; S.hist.redoStack = v.redo; }
    } catch {}
  }
  let ht = 0; function histSoon() { clearTimeout(ht); ht = setTimeout(saveHist, 600); }

  /* ---------- init ---------- */
  async function init(o) {
    S.src = o.src; S.key = 'medixa.pdf.annotations.v1:' + new URL(o.src, location.href).href;
    S.guard = openGuard(); loadLayout();
    const loaded = S.guard.value;
    const m = C.migrate(Array.isArray(loaded) ? loaded : []);
    S.items = m.list; S.invalid = m.invalid; S.dirty = false;      /* migration is in-memory; first real edit persists it */
    S.hist = new C.History(S.items); restoreHist(); S.hist.onchange = () => { emit('history'); histSoon(); };
    rebuildIndex(); bindUi(); setTool('pen'); emit('init');
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

  /* ---------- layout (margins; the page area itself never changes) ---------- */
  const zeroExt = { l: 0, t: 0, r: 0, b: 0 };
  function loadLayout() {
    S.layoutKey = 'medixa.studio.layout.v1:' + new URL(S.src, location.href).href;
    S.layoutGuard = MedixaGuard.open(localStorage, S.layoutKey, { fallback: () => ({ v: 1, margins: {} }), valid: v => v && typeof v === 'object' && !Array.isArray(v) && v.margins && typeof v.margins === 'object' });
    const v = S.layoutGuard.value, out = { v: 1, margins: {}, blanks: [], order: null };
    if (Array.isArray(v.blanks)) { const seen = new Set(); for (const b of v.blanks) if (C.validBlank(b) && !seen.has(b.id)) { seen.add(b.id); out.blanks.push({ id: b.id, template: b.template, w: b.w, h: b.h, after: Number.isInteger(b.after) ? b.after : 0 }); } }
    if (Array.isArray(v.order) && v.order.every(Number.isInteger)) out.order = v.order.slice();
    for (const [k, e] of Object.entries(v.margins || {})) if (e && ['l', 't', 'r', 'b'].every(f => typeof e[f] === 'number' && e[f] >= 0 && e[f] <= 1)) out.margins[k] = { l: e.l, t: e.t, r: e.r, b: e.b };
    S.layout = out;
  }
  function saveLayout() { const r = S.layoutGuard.write(S.layout); if (r !== 'saved') { setState(r === 'conflict' ? 'conflict' : 'failed'); emit('savefail', r); } return r; }
  /* Smallest margins that still contain everything already written on the page (so shrinking never hides ink). */
  function needExt(n) {
    const need = { l: 0, t: 0, r: 0, b: 0 };
    for (const s of S.items) { if (!s || s.page !== n || !C.validStroke(s)) continue; const b = C.bounds(s); need.l = Math.max(need.l, -b[0]); need.t = Math.max(need.t, -b[1]); need.r = Math.max(need.r, b[2] - 1); need.b = Math.max(need.b, b[3] - 1); }
    for (const k of Object.keys(need)) need[k] = Math.min(1, Math.ceil(need[k] * 20) / 20);
    return need;
  }
  /* ext = {l,t,r,b} fractions of the page size (0..1). Returns {ext, clamped}. */
  function setMargins(n, ext, opts) {
    const pg = S.pages.get(n); if (!pg) return null;
    const want = {}; for (const k of ['l', 't', 'r', 'b']) want[k] = C.clamp(+ext[k] || 0, 0, 1);
    const need = needExt(n), fin = {}; let clamped = false;
    for (const k of ['l', 't', 'r', 'b']) { fin[k] = Math.max(want[k], need[k]); if (fin[k] > want[k] + 1e-9) clamped = true; }
    Object.assign(pg.ext, fin);
    if (['l', 't', 'r', 'b'].every(k => fin[k] === 0)) delete S.layout.margins[n]; else S.layout.margins[n] = Object.assign({}, fin);
    sizePage(pg); pg.dirty = true; paint(pg); emit('layout', { n, ext: fin });
    if (!opts || !opts.defer) saveLayout();
    return { ext: fin, clamped };
  }
  /* ---- virtual blank pages: ids >= 100001, never renumber source pages ---- */
  const pageOrder = (nSrc) => C.displayOrder(nSrc == null ? S.nSources : nSrc, S.layout.blanks, S.layout.order);
  function addBlank(afterId, template, size) {
    const used = S.layout.blanks.map(b => b.id), id = Math.max(C.BLANK_ID0 - 1, ...used) + 1, order = pageOrder();
    const ref = size || { w: 595, h: 842 }, rec = { id, template: C.TEMPLATES.includes(template) ? template : 'lined', w: ref.w, h: ref.h, after: afterId < C.BLANK_ID0 ? afterId : 0 };
    const at = afterId === 0 ? 0 : order.indexOf(afterId) + 1; order.splice(Math.max(0, at), 0, id); S.layout.order = order;
    rec.after = 0; for (let k = order.indexOf(id) - 1; k >= 0; k--) if (order[k] < C.BLANK_ID0) { rec.after = order[k]; break; }   /* fallback hint if the explicit order is ever lost */
    S.layout.blanks.push(rec);
    saveLayout(); emit('pages', { added: id }); return rec;
  }
  function removeBlank(id) {
    const i = S.layout.blanks.findIndex(b => b.id === id); if (i < 0) return false;
    S.layout.blanks.splice(i, 1); S.layout.order = pageOrder().filter(x => x !== id); delete S.layout.margins[id];
    const gone = S.items.filter(s => s && s.page === id); for (const s of gone) S.deleted.add(s.id);
    for (let k = S.items.length - 1; k >= 0; k--) if (S.items[k] && S.items[k].page === id) S.items.splice(k, 1);
    S.index.delete(id); S.hist.setItems(S.items); S.dirty = true; flush(); saveLayout(); emit('pages', { removed: id }); return true;
  }
  function moveBlank(id, dir) {
    const order = pageOrder(), i = order.indexOf(id), j = i + (dir < 0 ? -1 : 1); if (i < 0 || j < 0 || j >= order.length) return false;
    [order[i], order[j]] = [order[j], order[i]]; S.layout.order = order; saveLayout(); emit('pages', { moved: id }); return true;
  }
  function detachPage(id) { S.pages.delete(id); }
  const marginsOf = n => Object.assign({}, zeroExt, S.layout.margins[n] || {});
  /* Programmatic edits used by tool modules. Every call returns ops for one history command. */
  function addItem(s) { S.items.push(s); idx(s.page).insert(s); invalidate(s.page); return { k: 'add', s }; }
  function removeItems(ids) {
    const ops = [];
    for (const id of ids) { const i = S.items.findIndex(x => x && x.id === id); if (i < 0) continue; const s = S.items[i]; S.items.splice(i, 1); S.deleted.add(id); ops.push({ k: 'del', s, i }); }
    const pages = new Set(ops.map(o => o.s.page)); pages.forEach(n => { rebuildIndexPage(n); invalidate(n); }); return ops;
  }
  function rebuildIndexPage(n) { const ix = new C.SpatialIndex(); S.items.forEach(s => s && s.id && s.page === n && C.validStroke(s) && ix.insert(s)); S.index.set(n, ix); }
  function patchItem(id, props) { const i = S.items.findIndex(x => x && x.id === id); if (i < 0) return null; const before = {}; for (const k of Object.keys(props)) before[k] = S.items[i][k]; S.items[i] = Object.assign({}, S.items[i], props); rebuildIndexPage(S.items[i].page); invalidate(S.items[i].page); return { k: 'edit', id, before, after: props }; }
  function commit(ops) { if (ops && ops.length) { S.hist.push(ops); markDirty(); } }
  const api = {
    S, C, init, draftKeys, setPageActive, pageOrder, addBlank, removeBlank, moveBlank, detachPage, setSources(n) { S.nSources = n; }, marginReport, setMargins, marginsOf, needExt, saveLayout, registerTool(n, t) { TOOLS[n] = t; }, addItem, removeItems, patchItem, commit, fitTextHeight, rebuildIndexPage, setState, banner,
    page: n => S.pages.get(n), ready, attachPage, setTool, undo, redo, flush, mergeAndSave, recoverDraft, exportPdf, on, emit, markDirty, rebuildAll, invalidate, paint, idx, rebuildIndex, drawStroke, drawTextBox,
    setPenOnly(v) { S.penOnly = !!v; try { localStorage.setItem('medixa.penOnly', String(S.penOnly)); } catch {} emit('penonly', S.penOnly); },
    setSnap(v) { S.snap = !!v; },
    getItems: () => S.items, save: () => { S.dirty = true; return flush(); }, redraw: () => rebuildAll(), checkpoint: () => {}
  };
  window.MedixaStudio = api;
})();
