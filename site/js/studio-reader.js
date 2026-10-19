/* MEDIXA Study Studio — reader. Loads the PDF (pdf.js, or saved page images when pdf.js is unreachable), builds one
   section.page per page up front (exact size, so scroll position is stable), and renders/releases canvases lazily.
   Zoom changes only CSS size + a debounced re-render; stored annotation coordinates never change. */
(function () {
  'use strict';
  const M = window.MedixaStudio; if (!M) return;
  const DPR = () => Math.min(3, window.devicePixelRatio || 1);
  const R = { zoom: 1, pages: [], doc: null, bytes: null, raster: null, MAXKEEP: 12, queue: [], running: 0, io: null, listeners: [] };
  const clampZ = z => Math.min(4, Math.max(0.4, z));
  const fitWidth = () => Math.max(240, Math.min((R.root ? R.root.clientWidth : innerWidth) - 24, 960));
  const emit = (n, d) => R.listeners.filter(l => l[0] === n).forEach(l => { try { l[1](d); } catch (e) { console.warn(e); } });
  R.on = (n, f) => R.listeners.push([n, f]);

  function cssSize(p) { const w = fitWidth() * R.zoom; return [w, w * p.h / p.w]; }
  function layout(p) { const [w, h] = cssSize(p); p.el.style.width = w + 'px'; p.el.style.height = h + 'px'; p.cssW = w; p.cssH = h; }

  /* ---------- rendering ---------- */
  function release(p) {
    if (p.task) { try { p.task.cancel(); } catch {} p.task = null; }
    p.token = (p.token || 0) + 1; p.rendered = false;
    p.pdf.width = 0; p.pdf.height = 0; M.setPageActive(p.n, false);
    if (p.text) { p.text.replaceChildren(); p.textDone = false; }
  }
  async function draw(p) {
    const token = ++p.token, d = DPR(), W = Math.max(1, Math.round(p.cssW * d)), H = Math.max(1, Math.round(p.cssH * d));
    if (p.pdf.width !== W || p.pdf.height !== H) { p.pdf.width = W; p.pdf.height = H; }
    M.setPageActive(p.n, true);
    const ctx = p.pdf.getContext('2d'); let done = false;
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
  }
  const imgCache = new Map();
  function imageFor(n) { if (imgCache.has(n)) return imgCache.get(n); const im = new Image(); im.src = R.raster[n - 1]; const pr = im.decode().then(() => im); imgCache.set(n, pr); return pr; }
  function pump() {
    while (R.running < 2 && R.queue.length) {
      const p = R.queue.shift(); p.queued = false; if (!p.near) continue;
      R.running++; p.drawing = true; draw(p).catch(e => console.warn('render failed', p.n, e)).finally(() => { p.drawing = false; R.running--; clearTimeout(R.st); R.st = setTimeout(settle, 30); pump(); });
    }
  }
  function want(p) { if (p.queued || p.drawing || (p.rendered && p.rw === Math.round(p.cssW * DPR()))) return; p.queued = true; R.queue.push(p); }
  function distance(p) { const r = p.el.getBoundingClientRect(); return Math.abs((r.top + r.bottom) / 2 - innerHeight / 2); }
  function settle() {
    const near = R.pages.filter(p => p.near).sort((a, b) => distance(a) - distance(b));
    near.forEach(want); R.queue.sort((a, b) => distance(a) - distance(b)); pump();
    const rendered = R.pages.filter(p => p.rendered || p.queued === false && p.pdf.width > 0);
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

  /* ---------- open ---------- */
  R.open = async function (o) {
    const { src, root, status, error } = o; R.root = root;
    const failView = message => {
      error.textContent = ''; const p = document.createElement('p'); p.textContent = message; error.append(p);
      let u = null; try { u = new URL(src, location.href); } catch {}
      if (u && u.origin === location.origin && /^https?:$/.test(u.protocol)) { const a = document.createElement('a'); a.href = u.href; a.target = '_blank'; a.rel = 'noopener'; a.className = 'mx-fail-open'; a.textContent = 'افتح الملف مباشرة'; error.append(a, ' '); }
      const r = document.createElement('button'); r.type = 'button'; r.className = 'mx-fail-retry'; r.textContent = 'أعد المحاولة'; r.onclick = () => location.reload(); error.append(r); status.textContent = 'تعذر عرض الملف هنا';
    };
    const rasterKey = (() => { try { return decodeURIComponent(new URL(src, location.href).pathname).replace(/^\//, ''); } catch { return ''; } })();
    const manifest = window.medixaRasterManifest && window.medixaRasterManifest[rasterKey];
    const rasterOnly = !window.pdfjsLib && !!(manifest && manifest.length);
    if (!window.pdfjsLib && !rasterOnly) { failView('تعذر تحميل مكتبة عرض PDF (قد تكون الشبكة تحجبها). افتح الملف مباشرة أو أعد المحاولة لاحقاً.'); return null; }
    if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    try {
      let sizes = [], proxies = [];
      if (rasterOnly) {
        R.raster = manifest.map(u => new URL(u, location.href).href);
        for (let i = 1; i <= R.raster.length; i++) { const im = await imageFor(i); sizes.push({ w: im.naturalWidth, h: im.naturalHeight }); proxies.push(null); }
        const note = document.createElement('p'); note.className = 'mx-raster-note'; note.textContent = 'مكتبة عرض PDF غير متاحة الآن، فنعرض صور الصفحات المحفوظة. الرسم وأدوات الدراسة تعمل؛ البحث في النص وتنزيل PDF بالتعليقات غير متاحين.'; error.append(note);
      } else {
        const res = await fetch(src); if (!res.ok) throw Error('HTTP ' + res.status);
        R.bytes = new Uint8Array(await res.arrayBuffer());
        R.doc = await pdfjsLib.getDocument({ data: R.bytes.slice() }).promise;
        if (manifest && manifest.length) R.raster = manifest.map(u => new URL(u, location.href).href);
        for (let i = 1; i <= R.doc.numPages; i++) { const pr = await R.doc.getPage(i), vp = pr.getViewport({ scale: 1 }); sizes.push({ w: vp.width, h: vp.height }); proxies.push(pr); }
      }
      await M.init({ src, bytes: R.bytes });
      const n = sizes.length;
      R.io = new IntersectionObserver(es => { for (const e of es) { const p = e.target.__p; p.near = e.isIntersecting; } settle(); }, { rootMargin: '1600px 0px' });
      for (let i = 1; i <= n; i++) {
        const el = document.createElement('section'); el.className = 'page'; el.dataset.page = i;
        const pdf = document.createElement('canvas'); pdf.className = 'pdf'; pdf.width = 1; pdf.height = 1;
        const ink = document.createElement('canvas'); ink.className = 'ink'; ink.dataset.page = i;
        const label = document.createElement('span'); label.className = 'page-label'; label.textContent = i + ' / ' + n;
        el.append(pdf, ink, label); root.append(el);
        const p = { n: i, el, pdf, ink, w: sizes[i - 1].w, h: sizes[i - 1].h, proxy: proxies[i - 1], near: false, token: 0 };
        el.__p = p; R.pages.push(p); layout(p);
        M.attachPage({ wrap: el, ink, pageNumber: i, pdf });
        R.io.observe(el);
      }
      if (window.ResizeObserver) { let w0 = root.clientWidth; new ResizeObserver(() => { if (Math.abs(root.clientWidth - w0) > 2) { w0 = root.clientWidth; relayout(); } }).observe(root); }
      M.ready(); emit('opened', R);
      return R;
    } catch (e) { failView('تعذر فتح PDF: ' + e.message); return null; }
  };
  /* Small preview for the page panel (cancellable, never touches the page canvas). */
  R.thumb = async function (n, canvas, cssW) {
    const p = R.pages[n - 1]; if (!p) return; const d = DPR(), W = Math.max(1, Math.round(cssW * d)), H = Math.max(1, Math.round(cssW * p.h / p.w * d));
    if (canvas.__task) { try { canvas.__task.cancel(); } catch {} canvas.__task = null; }
    canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
    if (R.raster && R.raster[n - 1]) { const im = await imageFor(n); ctx.drawImage(im, 0, 0, W, H); return; }
    if (!p.proxy || !p.proxy.render) return;
    const task = p.proxy.render({ canvasContext: ctx, viewport: p.proxy.getViewport({ scale: W / p.w }) }); canvas.__task = task;
    try { await task.promise; } catch (e) { if (!e || e.name !== 'RenderingCancelledException') throw e; } finally { if (canvas.__task === task) canvas.__task = null; }
  };
  R.current = () => { let best = 1, d = Infinity; for (const p of R.pages) { const r = p.el.getBoundingClientRect(), k = Math.abs(r.top - 140); if (k < d) { d = k; best = p.n; } } return best; };
  R.goto = (n, smooth) => { const el = R.pageEl(Math.max(1, Math.min(R.pages.length, n))); if (el) el.scrollIntoView({ block: 'start', behavior: smooth === false ? 'auto' : 'smooth' }); };
  R.pageEl = n => R.pages[n - 1] && R.pages[n - 1].el;
  R.destroy = () => { R.pages.forEach(release); if (R.io) R.io.disconnect(); if (R.doc && R.doc.destroy) R.doc.destroy(); };
  M.reader = R;
})();
