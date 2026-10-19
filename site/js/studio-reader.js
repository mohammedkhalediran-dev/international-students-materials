/* MEDIXA Study Studio — reader. Loads the PDF (pdf.js, or saved page images when pdf.js is unreachable) — or a notebook
   (a document made only of virtual pages) — and builds one section per page up front (exact size, so scroll position is
   stable), rendering/releasing canvases lazily. Zoom changes only CSS size + a debounced re-render; stored annotation
   coordinates never change. Page ids: source pages keep their number; virtual blank pages use ids >= 100001. */
(function () {
  'use strict';
  const M = window.MedixaStudio; if (!M) return;
  const C = M.C;
  const DPR = () => Math.min(3, window.devicePixelRatio || 1);
  const R = { zoom: 1, pages: [], byId: new Map(), doc: null, bytes: null, raster: null, MAXKEEP: 12, queue: [], running: 0, io: null, listeners: [], nSources: 0, notebook: null };
  const clampZ = z => Math.min(4, Math.max(0.4, z));
  const fitWidth = () => Math.max(240, Math.min((R.root ? R.root.clientWidth : innerWidth) - 24, 960));
  const emit = (n, d) => R.listeners.filter(l => l[0] === n).forEach(l => { try { l[1](d); } catch (e) { console.warn(e); } });
  R.on = (n, f) => R.listeners.push([n, f]);

  /* Page area keeps its aspect ratio; margins add room around it, and the whole sheet fits the column at 100% zoom. */
  function layout(p) {
    const pg = M.page(p.id), e = pg ? pg.ext : { l: 0, t: 0, r: 0, b: 0 }, kx = 1 + e.l + e.r, ky = 1 + e.t + e.b;
    const totW = fitWidth() * R.zoom, w = totW / kx, h = w * p.h / p.w;
    p.el.style.width = totW + 'px'; p.el.style.height = h * ky + 'px'; p.cssW = w; p.cssH = h;
    const pa = { left: (e.l / kx * 100) + '%', top: (e.t / ky * 100) + '%', width: (100 / kx) + '%', height: (100 / ky) + '%' };
    Object.assign(p.pdf.style, pa); if (p.text) Object.assign(p.text.style, pa);
    /* the page area, for layers that draw in page coordinates (study masks, source flashes) */
    p.el.style.setProperty('--pa-l', pa.left); p.el.style.setProperty('--pa-t', pa.top); p.el.style.setProperty('--pa-w', pa.width); p.el.style.setProperty('--pa-h', pa.height);
    p.el.classList.toggle('st-has-margin', kx > 1 || ky > 1);
  }

  /* ---------- rendering ---------- */
  function release(p) {
    if (p.task) { try { p.task.cancel(); } catch {} p.task = null; }
    p.token = (p.token || 0) + 1; p.rendered = false;
    p.pdf.width = 0; p.pdf.height = 0; M.setPageActive(p.id, false); if (p.text) p.text.replaceChildren();
  }
  /* Template marks for blank pages (same geometry the export uses). */
  function paintTemplate(ctx, W, H, rec) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const geo = C.templateGeometry(rec.template, rec.w, rec.h), k = W / rec.w;
    ctx.strokeStyle = '#bdd1d9'; ctx.fillStyle = '#bdd1d9'; ctx.lineWidth = Math.max(0.5, 0.5 * k);
    ctx.beginPath(); for (const [x1, y1, x2, y2] of geo.lines) { ctx.moveTo(x1 * k, y1 * k); ctx.lineTo(x2 * k, y2 * k); } ctx.stroke();
    for (const [x, y] of geo.dots) { ctx.beginPath(); ctx.arc(x * k, y * k, Math.max(0.7, 0.9 * k), 0, 7); ctx.fill(); }
  }
  async function draw(p) {
    const token = ++p.token, d = DPR(), W = Math.max(1, Math.round(p.cssW * d)), H = Math.max(1, Math.round(p.cssH * d));
    if (p.pdf.width !== W || p.pdf.height !== H) { p.pdf.width = W; p.pdf.height = H; }
    M.setPageActive(p.id, true);
    const ctx = p.pdf.getContext('2d'); let done = false;
    if (p.kind === 'blank') { paintTemplate(ctx, W, H, p.rec); p.rendered = true; p.rw = W; emit('rendered', p); return; }
    const img = R.raster && R.raster[p.n - 1];
    if (img) { try { const im = await imageFor(p.n); if (token !== p.token) return; if (im && im.naturalWidth > 0) { ctx.clearRect(0, 0, W, H); ctx.drawImage(im, 0, 0, W, H); done = true; } } catch (e) { console.warn('MEDIXA raster unavailable, using PDF renderer', e); } }
    if (!done && p.proxy && p.proxy.render) {
      const vp = p.proxy.getViewport({ scale: W / p.w });
      if (p.task) { try { p.task.cancel(); } catch {} }
      p.task = p.proxy.render({ canvasContext: ctx, viewport: vp });
      try { await p.task.promise; } catch (e) { if (e && e.name === 'RenderingCancelledException') return; throw e; }
      p.task = null;
    }
    if (token !== p.token) return;
    p.rendered = true; p.rw = W; emit('rendered', p);
    textLayer(p, token);
  }
  /* Selectable, invisible text over the page (also what screen readers read). Pointer events stay off until the
     "select text" tool is active, so drawing is never disturbed. Pages without text (scans) are flagged. */
  async function textLayer(p, token) {
    if (p.kind !== 'src' || !p.proxy || !window.pdfjsLib || !pdfjsLib.renderTextLayer || !p.proxy.streamTextContent) return;
    try {
      let box = p.text;
      if (!box) { box = document.createElement('div'); box.className = 'st-text'; box.setAttribute('lang', 'en'); p.el.insertBefore(box, p.label); p.text = box; layout(p); }
      box.replaceChildren(); const vp = p.proxy.getViewport({ scale: p.cssW / p.w }); box.style.setProperty('--scale-factor', String(vp.scale));
      const task = pdfjsLib.renderTextLayer({ textContentSource: p.proxy.streamTextContent(), container: box, viewport: vp, textDivs: [] }); await task.promise;
      if (token !== p.token) { box.replaceChildren(); return; }
      p.hasText = !!box.textContent.trim(); p.el.classList.toggle('st-notext', !p.hasText); emit('text', p);
    } catch (e) { if (!e || e.name !== 'RenderingCancelledException') console.warn('text layer failed', p.id, e); }
  }
  const imgCache = new Map();
  function imageFor(n) { if (imgCache.has(n)) return imgCache.get(n); const im = new Image(); im.src = R.raster[n - 1]; const pr = im.decode().then(() => im); imgCache.set(n, pr); return pr; }
  function pump() {
    while (R.running < 2 && R.queue.length) {
      const p = R.queue.shift(); p.queued = false; if (!p.near) continue;
      R.running++; p.drawing = true; draw(p).catch(e => console.warn('render failed', p.id, e)).finally(() => { p.drawing = false; R.running--; clearTimeout(R.st); R.st = setTimeout(settle, 30); pump(); });
    }
  }
  function want(p) { if (p.queued || p.drawing || (p.rendered && p.rw === Math.round(p.cssW * DPR()))) return; p.queued = true; R.queue.push(p); }
  function distance(p) { const r = p.el.getBoundingClientRect(); return Math.abs((r.top + r.bottom) / 2 - innerHeight / 2); }
  function settle() {
    const near = R.pages.filter(p => p.near).sort((a, b) => distance(a) - distance(b));
    near.forEach(want); R.queue.sort((a, b) => distance(a) - distance(b)); pump();
    const rendered = R.pages.filter(p => p.rendered || p.queued === false && p.pdf.width > 1);
    if (rendered.length > R.MAXKEEP) rendered.filter(p => !p.near).sort((a, b) => distance(b) - distance(a)).slice(0, rendered.length - R.MAXKEEP).forEach(release);
  }

  /* ---------- zoom ---------- */
  function anchor() { const p = R.pages.find(x => x.el.getBoundingClientRect().bottom > 120) || R.pages[0]; if (!p) return null; const r = p.el.getBoundingClientRect(); return { p, frac: (120 - r.top) / Math.max(1, r.height) }; }
  function setZoom(z) {
    z = clampZ(z); if (Math.abs(z - R.zoom) < 0.001) return; const a = anchor(); R.zoom = z;
    R.pages.forEach(layout);
    if (a) { const r = a.p.el.getBoundingClientRect(); scrollBy(0, r.top + a.frac * r.height - 120); }
    clearTimeout(R.zt); R.zt = setTimeout(() => { R.pages.forEach(p => { if (p.near) want(p); }); pump(); settle(); }, 120);
    emit('zoom', R.zoom);
  }
  R.setZoom = setZoom; R.zoomBy = f => setZoom(R.zoom * f); R.fit = () => setZoom(1);
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); R.zoomBy(1.15); } else if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); R.zoomBy(1 / 1.15); } else if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); R.fit(); } });
  addEventListener('wheel', e => { if (e.ctrlKey) { e.preventDefault(); R.zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08); } }, { passive: false });
  let rt = 0; const relayout = () => { clearTimeout(rt); rt = setTimeout(() => { const a = anchor(); R.pages.forEach(layout); if (a) { const r = a.p.el.getBoundingClientRect(); scrollBy(0, r.top + a.frac * r.height - 120); } R.pages.forEach(p => { if (p.near) want(p); }); pump(); }, 150); };
  addEventListener('resize', relayout);

  /* ---------- page list (source pages + virtual blank pages, in display order) ---------- */
  function makePage(id) {
    const blank = id >= C.BLANK_ID0, rec = blank ? M.S.layout.blanks.find(b => b.id === id) : null;
    const size = blank ? { w: rec.w, h: rec.h } : R.sizes[id - 1];
    const el = document.createElement('section'); el.className = blank ? 'st-blank' : 'page';   /* blank sheets are not .page: older modules index .page by position and must keep seeing source pages only */ el.dataset.page = id; if (blank) el.dataset.blank = '1';
    const pdf = document.createElement('canvas'); pdf.className = 'pdf'; pdf.width = 1; pdf.height = 1;
    const ink = document.createElement('canvas'); ink.className = 'ink'; ink.dataset.page = id;
    const label = document.createElement('span'); label.className = 'page-label';
    el.append(pdf, ink, label);
    const p = { id, n: id, kind: blank ? 'blank' : 'src', rec, el, pdf, ink, label, w: size.w, h: size.h, proxy: blank ? null : R.proxies[id - 1], near: false, token: 0 };
    el.__p = p; R.byId.set(id, p);
    M.attachPage({ wrap: el, ink, pageNumber: id, pdf }); layout(p); R.io.observe(el);
    return p;
  }
  function labels() { R.pages.forEach(p => { p.label.textContent = p.kind === 'blank' ? 'صفحة فارغة' : p.id + ' / ' + R.nSources; }); }
  /* Make the DOM match M.pageOrder(): add new pages, drop removed ones, reorder. Never touches source page ids. */
  function applyOrder() {
    const order = M.pageOrder(R.nSources), want_ = new Set(order);
    for (const [id, p] of [...R.byId]) if (!want_.has(id)) { release(p); R.io.unobserve(p.el); p.el.remove(); R.byId.delete(id); M.detachPage(id); }
    R.pages = order.map(id => R.byId.get(id) || makePage(id));
    R.root.append(...R.pages.map(p => p.el)); labels(); R.pages.forEach(layout); emit('pages', R.pages);
    settle();
  }
  M.on('pages', () => { if (R.io) applyOrder(); });

  /* ---------- open ---------- */
  R.open = async function (o) {
    const { src, root, status, error } = o; R.root = root;
    const isNotebook = /^notebook:/.test(src);
    const failView = message => {
      error.textContent = ''; const p = document.createElement('p'); p.textContent = message; error.append(p);
      let u = null; try { u = new URL(src, location.href); } catch {}
      if (u && u.origin === location.origin && /^https?:$/.test(u.protocol)) { const a = document.createElement('a'); a.href = u.href; a.target = '_blank'; a.rel = 'noopener'; a.className = 'mx-fail-open'; a.textContent = 'افتح الملف مباشرة'; error.append(a, ' '); }
      const r = document.createElement('button'); r.type = 'button'; r.className = 'mx-fail-retry'; r.textContent = 'أعد المحاولة'; r.onclick = () => location.reload(); error.append(r); status.textContent = 'تعذر عرض الملف هنا';
    };
    const rasterKey = (() => { try { return decodeURIComponent(new URL(src, location.href).pathname).replace(/^\//, ''); } catch { return ''; } })();
    const manifest = !isNotebook && window.medixaRasterManifest && window.medixaRasterManifest[rasterKey];
    const rasterOnly = !isNotebook && !window.pdfjsLib && !!(manifest && manifest.length);
    if (!isNotebook && !window.pdfjsLib && !rasterOnly) { failView('تعذر تحميل مكتبة عرض PDF (قد تكون الشبكة تحجبها). افتح الملف مباشرة أو أعد المحاولة لاحقاً.'); return null; }
    if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    try {
      R.sizes = []; R.proxies = [];
      if (isNotebook) { R.notebook = { id: src.slice(9) }; }
      else if (rasterOnly) {
        R.raster = manifest.map(u => new URL(u, location.href).href);
        for (let i = 1; i <= R.raster.length; i++) { const im = await imageFor(i); R.sizes.push({ w: im.naturalWidth, h: im.naturalHeight }); R.proxies.push(null); }
        const note = document.createElement('p'); note.className = 'mx-raster-note'; note.textContent = 'مكتبة عرض PDF غير متاحة الآن، فنعرض صور الصفحات المحفوظة. الرسم وأدوات الدراسة تعمل؛ البحث في النص وتنزيل PDF بالتعليقات غير متاحين.'; error.append(note);
      } else {
        const res = await fetch(src); if (!res.ok) throw Error('HTTP ' + res.status);
        R.bytes = new Uint8Array(await res.arrayBuffer());
        R.doc = await pdfjsLib.getDocument({ data: R.bytes.slice() }).promise;
        if (manifest && manifest.length) R.raster = manifest.map(u => new URL(u, location.href).href);
        for (let i = 1; i <= R.doc.numPages; i++) { const pr = await R.doc.getPage(i), vp = pr.getViewport({ scale: 1 }); R.sizes.push({ w: vp.width, h: vp.height }); R.proxies.push(pr); }
      }
      R.nSources = R.sizes.length; M.setSources(R.nSources);
      await M.init({ src, bytes: R.bytes });
      if (isNotebook && !M.S.layout.blanks.length) M.addBlank(0, 'lined');           /* a notebook always has a page to write on */
      R.io = new IntersectionObserver(es => { for (const e of es) { const p = e.target.__p; if (p) p.near = e.isIntersecting; } settle(); }, { rootMargin: '1600px 0px' });
      R.pages = M.pageOrder(R.nSources).map(makePage); root.append(...R.pages.map(p => p.el)); labels();
      if (window.ResizeObserver) { let w0 = root.clientWidth; new ResizeObserver(() => { if (Math.abs(root.clientWidth - w0) > 2) { w0 = root.clientWidth; relayout(); } }).observe(root); }
      M.ready(); emit('opened', R);
      return R;
    } catch (e) { failView('تعذر فتح PDF: ' + e.message); return null; }
  };
  /* The PDF to export over: the original bytes, or an empty document for a notebook. */
  R.getBytes = async function () {
    if (R.bytes) return R.bytes;
    if (R.notebook && window.PDFLib) { const d = await PDFLib.PDFDocument.create(); return new Uint8Array(await d.save()); }
    return null;
  };
  /* Small preview for the page panel (cancellable, never touches the page canvas). */
  R.thumb = async function (id, canvas, cssW) {
    const p = R.byId.get(id); if (!p) return; const d = DPR(), W = Math.max(1, Math.round(cssW * d)), H = Math.max(1, Math.round(cssW * p.h / p.w * d));
    if (canvas.__task) { try { canvas.__task.cancel(); } catch {} canvas.__task = null; }
    canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
    if (p.kind === 'blank') { paintTemplate(ctx, W, H, p.rec); return; }
    if (R.raster && R.raster[id - 1]) { const im = await imageFor(id); ctx.drawImage(im, 0, 0, W, H); return; }
    if (!p.proxy || !p.proxy.render) return;
    const task = p.proxy.render({ canvasContext: ctx, viewport: p.proxy.getViewport({ scale: W / p.w }) }); canvas.__task = task;
    try { await task.promise; } catch (e) { if (!e || e.name !== 'RenderingCancelledException') throw e; } finally { if (canvas.__task === task) canvas.__task = null; }
  };
  /* The page that fills most of the viewport (ties go to the earlier page). */
  R.current = () => { let best = R.pages[0] ? R.pages[0].id : 1, v = -1; for (const p of R.pages) { const r = p.el.getBoundingClientRect(), vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); if (vis > v + 1) { v = vis; best = p.id; } } return best; };
  R.goto = (id, smooth) => { const el = R.pageEl(id); if (el) el.scrollIntoView({ block: 'start', behavior: smooth === false ? 'auto' : 'smooth' }); };
  M.on('layout', ({ n }) => { const p = R.byId.get(n); if (!p) return; layout(p); if (p.near) { p.rendered = false; want(p); pump(); } });
  R.pageEl = id => { const p = R.byId.get(id); return p && p.el; };
  R.destroy = () => { R.pages.forEach(release); if (R.io) R.io.disconnect(); if (R.doc && R.doc.destroy) R.doc.destroy(); };
  M.reader = R;
})();
