/* MEDIXA Study Studio — pure logic (no DOM). One document model, one history, one coordinate convention.
   Canonical page coordinates: u,v in [0,1] of the UPRIGHT page as pdf.js shows it (after the page's /Rotate and
   CropBox), origin top-left, y down. Device pixel ratio only changes raster resolution. The stored stroke stays
   compatible with the v1 format ({page,tool,color,width,points:[[u,v],...]}); v2 adds id, rev, pr (pressure). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MedixaStudioCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const LIMITS = { strokes: 100000, points: 200000, text: 4000, shapes: 100000 };
  const TOOLS = ['pen', 'highlight', 'line', 'rectangle', 'ellipse', 'text', 'sticky'];
  const SHAPES = ['line', 'rectangle', 'ellipse'];
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const clamp01 = n => clamp(n, 0, 1);
  const isNum = n => typeof n === 'number' && Number.isFinite(n);
  const COLOR = /^#[0-9a-fA-F]{3,8}$/;

  /* ---------- validation / migration ---------- */
  function validStroke(s) {
    if (!s || typeof s !== 'object') return false;
    if (!Number.isInteger(s.page) || s.page < 1) return false;
    if (typeof s.tool !== 'string' || !TOOLS.includes(s.tool)) return false;
    if (!Array.isArray(s.points) || s.points.length === 0 || s.points.length > LIMITS.points) return false;
    if (!s.points.every(p => Array.isArray(p) && p.length === 2 && isNum(p[0]) && isNum(p[1]))) return false;
    if (s.color != null && (typeof s.color !== 'string' || !COLOR.test(s.color))) return false;
    if (s.width != null && (!isNum(s.width) || s.width <= 0 || s.width > 200)) return false;
    if (s.pr != null && (!Array.isArray(s.pr) || s.pr.length !== s.points.length || !s.pr.every(isNum))) return false;
    if (s.tool === 'text' || s.tool === 'sticky') {
      if (typeof s.text !== 'string' || s.text.length > LIMITS.text) return false;
    }
    return true;
  }
  let seq = 0;
  const newId = () => 's' + Date.now().toString(36) + (seq++ % 1296).toString(36) + Math.random().toString(36).slice(2, 6);
  /* Legacy strokes get a deterministic id (FNV-1a of their JSON) so two tabs migrating the same data agree. */
  function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
  /* Returns the same array object semantics-wise: valid legacy strokes gain id/rev/v; invalid entries are kept
     verbatim (never dropped) so recovery stays possible. */
  function migrate(list) {
    const out = [], invalid = [], used = new Set();
    let changed = false;
    for (const s of list) { if (s && s.id) used.add(s.id); }
    for (const s of list) {
      if (!validStroke(s)) { out.push(s); invalid.push(s); continue; }
      if (s.id && s.v === 2) { out.push(s); continue; }
      changed = true;
      let id = s.id, base = 'L' + fnv(JSON.stringify(s)), k = 0;
      if (!id) { id = base; while (used.has(id)) id = base + '_' + (++k); used.add(id); }
      out.push(Object.assign({}, s, { id, v: 2, rev: s.rev || 1 }));
    }
    return { list: out, invalid, changed };
  }
  function validList(list) {
    return Array.isArray(list) && list.length <= LIMITS.strokes;
  }

  /* ---------- geometry ---------- */
  function bounds(s) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of s.points) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    if (s.tool === 'text' || s.tool === 'sticky') {
      const w = s.w || 0.28, h = s.h || 0.1;
      x1 = Math.max(x1, x0 + w); y1 = Math.max(y1, y0 + h);
    }
    return [x0, y0, x1, y1];
  }
  /* distance (CSS px) from point to a segment. pw/ph = page CSS size so that u/v are scaled isotropically. */
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function shapeSegments(s) {
    const a = s.points[0], b = s.points[s.points.length - 1];
    if (s.tool === 'line') return [[a, b]];
    if (s.tool === 'rectangle') {
      const c = [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]];
      return [[c[0], c[1]], [c[1], c[2]], [c[2], c[3]], [c[3], c[0]]];
    }
    if (s.tool === 'ellipse') {
      const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, rx = Math.abs(b[0] - a[0]) / 2, ry = Math.abs(b[1] - a[1]) / 2, n = 40, segs = [];
      let prev = [cx + rx, cy];
      for (let i = 1; i <= n; i++) { const t = (i / n) * 2 * Math.PI, p = [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; segs.push([prev, p]); prev = p; }
      return segs;
    }
    return null;
  }
  /* Smallest distance in CSS px between a point (u,v) and the stroke. */
  function distToStroke(s, u, v, pw, ph) {
    if (s.tool === 'text' || s.tool === 'sticky') {
      const [x0, y0, x1, y1] = bounds(s);
      const dx = Math.max(x0 - u, 0, u - x1) * pw, dy = Math.max(y0 - v, 0, v - y1) * ph;
      return Math.hypot(dx, dy);
    }
    const segs = shapeSegments(s);
    let best = Infinity;
    if (segs) {
      for (const [a, b] of segs) best = Math.min(best, segDist(u * pw, v * ph, a[0] * pw, a[1] * ph, b[0] * pw, b[1] * ph));
      return best;
    }
    const pts = s.points;
    if (pts.length === 1) return Math.hypot(u * pw - pts[0][0] * pw, v * ph - pts[0][1] * ph);
    for (let i = 1; i < pts.length; i++) best = Math.min(best, segDist(u * pw, v * ph, pts[i - 1][0] * pw, pts[i - 1][1] * ph, pts[i][0] * pw, pts[i][1] * ph));
    return best;
  }
  /* Uniform grid over normalized page space so erasing does not scan every stroke. */
  class SpatialIndex {
    constructor(cell = 0.05) { this.cell = cell; this.map = new Map(); this.boxes = new Map(); }
    _cells(b, pad) {
      const c = this.cell, out = [];
      const x0 = Math.floor(clamp01(b[0] - pad) / c), x1 = Math.floor(clamp01(b[2] + pad) / c), y0 = Math.floor(clamp01(b[1] - pad) / c), y1 = Math.floor(clamp01(b[3] + pad) / c);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push(x * 1000 + y);
      return out;
    }
    insert(s) { const b = bounds(s); this.boxes.set(s.id, b); for (const k of this._cells(b, 0)) { let a = this.map.get(k); if (!a) this.map.set(k, a = new Set()); a.add(s); } }
    remove(s) { const b = this.boxes.get(s.id); if (!b) return; for (const k of this._cells(b, 0)) this.map.get(k)?.delete(s); this.boxes.delete(s.id); }
    query(u, v, pad) { const seen = new Set(); for (const k of this._cells([u, v, u, v], pad)) for (const s of this.map.get(k) || []) seen.add(s); return [...seen]; }
    rebuild(list) { this.map.clear(); this.boxes.clear(); for (const s of list) if (s.id && validStroke(s)) this.insert(s); }
  }

  /* ---------- smoothing / pressure ---------- */
  /* Incremental, bounded: raw samples are never modified; the renderer draws quadratic curves through midpoints.
     minDist (CSS px) thins samples that add no information. */
  function thin(points, pr, minDistU, last) {
    if (!last) return true;
    return Math.hypot(points[0] - last[0], points[1] - last[1]) >= minDistU;
  }
  function widthAt(base, pressure, tool) {
    if (tool === 'highlight') return base * 6;
    if (tool !== 'pen') return base;
    const p = isNum(pressure) ? clamp01(pressure) : 0.5;   /* pressure 0 is valid and gives the thinnest line */
    return base * (0.35 + 1.3 * p);
  }
  /* Mouse / touch without real pressure get a documented constant 0.5. */
  const MOUSE_PRESSURE = 0.5;

  /* ---------- history ---------- */
  /* One command = one gesture. ops: {k:'add',s}|{k:'del',s,i}|{k:'edit',id,before,after}. Applying/undoing works on
     ids against the live array, so history is valid across page changes. Bounded only by dropping the OLDEST undo
     steps; the document itself is never discarded. */
  class History {
    constructor(items, limit = 300) { this.items = items; this.undoStack = []; this.redoStack = []; this.limit = limit; this.onchange = null; }
    setItems(items) { this.items = items; this.undoStack = []; this.redoStack = []; }
    _find(id) { return this.items.findIndex(s => s && s.id === id); }
    _apply(ops, reverse) {
      const list = reverse ? ops.slice().reverse() : ops;
      for (const o of list) {
        if (o.k === 'add') { if (reverse) { const i = this._find(o.s.id); if (i >= 0) this.items.splice(i, 1); } else if (this._find(o.s.id) < 0) this.items.push(o.s); }
        else if (o.k === 'del') { if (reverse) { if (this._find(o.s.id) < 0) this.items.splice(Math.min(o.i, this.items.length), 0, o.s); } else { const i = this._find(o.s.id); if (i >= 0) this.items.splice(i, 1); } }
        else if (o.k === 'edit') { const i = this._find(o.id); if (i >= 0) this.items[i] = Object.assign({}, this.items[i], reverse ? o.before : o.after); }
      }
    }
    /* Record an already-applied gesture. */
    push(ops) { if (!ops.length) return; this.undoStack.push(ops); if (this.undoStack.length > this.limit) this.undoStack.shift(); this.redoStack = []; this.onchange && this.onchange(); }
    undo() { const ops = this.undoStack.pop(); if (!ops) return null; this._apply(ops, true); this.redoStack.push(ops); this.onchange && this.onchange(); return ops; }
    redo() { const ops = this.redoStack.pop(); if (!ops) return null; this._apply(ops, false); this.undoStack.push(ops); this.onchange && this.onchange(); return ops; }
    get canUndo() { return this.undoStack.length > 0; }
    get canRedo() { return this.redoStack.length > 0; }
  }

  /* ---------- transforms (lasso / shapes) ---------- */
  function transformStroke(s, m) {
    /* m = {dx,dy,sx,sy,cx,cy}: scale about (cx,cy) then translate. Result clamped to the page. */
    const sx = m.sx == null ? 1 : m.sx, sy = m.sy == null ? 1 : m.sy, cx = m.cx || 0, cy = m.cy || 0, dx = m.dx || 0, dy = m.dy || 0;
    const bx = m.bx || [0, 1], by = m.by || [0, 1];      /* page extent incl. margins: [-l, 1+r] x [-t, 1+b] */
    const points = s.points.map(p => [clamp(cx + (p[0] - cx) * sx + dx, bx[0], bx[1]), clamp(cy + (p[1] - cy) * sy + dy, by[0], by[1])]);
    const out = { points, rev: (s.rev || 1) + 1 };
    if (s.w != null) out.w = Math.max(0.02, s.w * Math.abs(sx));
    if (s.h != null) out.h = Math.max(0.02, s.h * Math.abs(sy));
    return out;
  }
  function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  /* A stroke is lassoed when at least half of its sample points (or its box centre for text) are inside. */
  function lassoHit(s, poly) {
    if (poly.length < 3) return false;
    if (s.tool === 'text' || s.tool === 'sticky') { const b = bounds(s); return pointInPolygon((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, poly); }
    let inn = 0; for (const p of s.points) if (pointInPolygon(p[0], p[1], poly)) inn++;
    return inn >= Math.ceil(s.points.length / 2);
  }

  /* ---------- PDF coordinate mapping ---------- */
  /* Canonical (u,v) of the displayed page → PDF user-space point. box = {x,y,width,height} of the CropBox (unrotated),
     rotation = page /Rotate in degrees. Mirrors pdf.js's viewport transform; verified in tests/studio_pdf_export. */
  function viewToPdf(u, v, box, rotation) {
    const W = box.width, H = box.height, r = ((rotation % 360) + 360) % 360;
    let x, y;
    if (r === 0) { x = u * W; y = (1 - v) * H; }
    else if (r === 90) { x = v * W; y = u * H; }
    else if (r === 180) { x = (1 - u) * W; y = v * H; }
    else { x = (1 - v) * W; y = (1 - u) * H; }
    return [box.x + x, box.y + y];
  }
  /* Size of the displayed page in PDF units. */
  function displaySize(box, rotation) {
    const r = ((rotation % 360) + 360) % 360;
    return r === 90 || r === 270 ? [box.height, box.width] : [box.width, box.height];
  }
  /* Legacy v1 points were normalized to the displayed canvas, so they are already canonical. */

  /* ---------- page templates (blank pages / notebooks) ---------- */
  const TEMPLATES = ['blank', 'lined', 'grid', 'dots'];
  const BLANK_ID0 = 100001;                                       /* virtual page ids start here; source pages keep their own numbers */
  /* Geometry in PDF points, origin top-left, y down: {lines:[[x1,y1,x2,y2]], dots:[[x,y]]}. One source for canvas and export. */
  function templateGeometry(kind, w, h) {
    const lines = [], dots = [], step = 24, top = 56, side = 36;
    if (kind === 'lined') for (let y = top; y < h - 24; y += step) lines.push([side, y, w - side, y]);
    else if (kind === 'grid') { for (let y = top; y < h - 24; y += step) lines.push([side, y, w - side, y]); for (let x = side; x <= w - side + 0.1; x += step) lines.push([x, top, x, Math.floor((h - 24 - top) / step) * step + top]); }
    else if (kind === 'dots') for (let y = top; y < h - 24; y += step) for (let x = side; x <= w - side + 0.1; x += step) dots.push([x, y]);
    return { lines, dots };
  }
  function validBlank(b) { return b && typeof b === 'object' && Number.isInteger(b.id) && b.id >= BLANK_ID0 && TEMPLATES.includes(b.template) && isNum(b.w) && isNum(b.h) && b.w >= 100 && b.w <= 3000 && b.h >= 100 && b.h <= 3000; }
  /* Display order of page ids. `order` (explicit) wins only if it is an exact permutation of sources + blanks and keeps
     the source pages in ascending order; otherwise blanks follow the page named by their `after` hint. */
  function displayOrder(nSources, blanks, order) {
    const ids = new Set(blanks.map(b => b.id)), src = Array.from({ length: nSources }, (_, i) => i + 1);
    if (Array.isArray(order) && order.length === nSources + blanks.length && new Set(order).size === order.length && order.every(x => ids.has(x) || (Number.isInteger(x) && x >= 1 && x <= nSources))) {
      const s2 = order.filter(x => x <= nSources); if (s2.every((x, i) => x === i + 1)) return order.slice();
    }
    const out = []; const at = a => blanks.filter(b => (b.after || 0) === a).map(b => b.id);
    out.push(...at(0)); for (const n of src) { out.push(n); out.push(...at(n)); }
    return out;
  }

  /* ---------- merge (multi-tab conflict path) ---------- */
  /* Union by id. For ids present on both sides the higher rev wins. ids in `deleted` (removed in this tab) stay
     removed. Entries without id (legacy invalid) are kept once by JSON fingerprint. */
  function mergeById(local, remote, deleted) {
    const del = deleted || new Set(), byId = new Map(), noId = new Map(), order = [];
    const add = s => {
      if (s && s.id) {
        if (del.has(s.id)) return;
        const cur = byId.get(s.id);
        if (!cur) { byId.set(s.id, s); order.push(s.id); } else if ((s.rev || 1) > (cur.rev || 1)) byId.set(s.id, s);
      } else { const k = JSON.stringify(s); if (!noId.has(k)) { noId.set(k, s); order.push(k); } }
    };
    for (const s of remote) add(s);
    for (const s of local) add(s);
    return order.map(k => byId.get(k) || noId.get(k));
  }

  return { LIMITS, TOOLS, SHAPES, MOUSE_PRESSURE, clamp, clamp01, validStroke, validList, migrate, newId, bounds, distToStroke, segDist, shapeSegments, SpatialIndex, thin, widthAt, History, transformStroke, TEMPLATES, BLANK_ID0, templateGeometry, validBlank, displayOrder, pointInPolygon, lassoHit, viewToPdf, displaySize, mergeById };
});
