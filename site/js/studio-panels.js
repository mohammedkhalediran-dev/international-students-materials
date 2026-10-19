/* MEDIXA Study Studio — side panels. Pages (lazy thumbnails + the existing bookmarks list) and "ملاحظاتي" (the student's
   own text / sticky notes, read from the single annotation store; nothing is copied or invented). */
(function () {
  'use strict';
  const M = window.MedixaStudio; if (!M) return;
  const $ = id => document.getElementById(id);
  const norm = s => (window.MS && MS.norm) ? MS.norm(s) : String(s || '').toLowerCase();
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const close = (name) => { document.body.classList.remove('st-' + name + '-open'); const p = $('st-' + name); if (p) p.classList.remove('open'); };
  function toggle(name) {
    const p = $('st-' + name), open = !p.classList.contains('open');
    const wide = matchMedia('(min-width:1100px)').matches;
    ['pages', 'notes'].forEach(n => { if (n !== name && open && !wide) close(n); });
    p.classList.toggle('open', open); document.body.classList.toggle('st-' + name + '-open', open);
    if (open && name === 'pages') pagesRefresh(); if (open && name === 'notes') notesRender();
  }

  /* ================= pages ================= */
  let pg = null, thumbIO = null, thumbs = [];
  function buildPages() {
    pg = el('aside', 'st-panel'); pg.id = 'st-pages'; pg.setAttribute('aria-label', 'الصفحات والإشارات المرجعية');
    const head = el('div', 'st-panel-head'); head.append(el('strong', '', 'الصفحات')); const x = el('button', 'st-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'إغلاق لوحة الصفحات'); x.onclick = () => close('pages'); head.append(x);
    const list = el('div', 'st-thumbs'); list.id = 'st-thumbs'; list.setAttribute('role', 'list');
    const bm = el('div', 'st-bm'); bm.append(el('strong', '', 'الإشارات المرجعية'));
    const foot = el('button', 'st-focus-btn', 'وضع التركيز'); foot.type = 'button'; foot.id = 'st-focus-btn'; foot.onclick = () => { const f = $('medixa-focus'); if (f) f.click(); };
    pg.append(head, list, bm, foot); document.body.append(pg);
    const bmList = $('medixa-bookmarks'); if (bmList) bm.append(bmList);          /* relocate: v5 keeps updating it */
    thumbIO = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting && !e.target.dataset.done) { e.target.dataset.done = '1'; M.reader.thumb(+e.target.dataset.page, e.target.querySelector('canvas'), 150).catch(() => { e.target.dataset.done = ''; }); } }, { root: list, rootMargin: '300px' });
  }
  function pagesRefresh() {
    const R = M.reader; if (!R || !R.pages.length || thumbs.length === R.pages.length) return markCurrent();
    const list = $('st-thumbs'); list.replaceChildren(); thumbs = [];
    for (const p of R.pages) {
      const b = el('button', 'st-th'); b.type = 'button'; b.dataset.page = p.n; b.setAttribute('role', 'listitem'); b.setAttribute('aria-label', 'الصفحة ' + p.n);
      const c = document.createElement('canvas'); c.width = 150; c.height = Math.round(150 * p.h / p.w); c.className = 'st-th-c'; b.append(c, el('span', 'st-th-n', String(p.n)));
      b.onclick = () => { R.goto(p.n); if (matchMedia('(max-width:1099px)').matches) close('pages'); };
      list.append(b); thumbs.push(b); thumbIO.observe(b);
    }
    markCurrent();
  }
  function markCurrent() { const n = M.reader && M.reader.current(); thumbs.forEach(b => b.classList.toggle('current', +b.dataset.page === n)); const cur = thumbs[n - 1]; if (cur && pg.classList.contains('open') && !cur.dataset.seen) { cur.dataset.seen = ''; } }
  let tick = 0; addEventListener('scroll', () => { if (tick) return; tick = requestAnimationFrame(() => { tick = 0; if (pg && pg.classList.contains('open')) markCurrent(); }); }, { passive: true });

  /* ================= notes ================= */
  let np = null, filter = 'all', q = '';
  function buildNotes() {
    np = el('aside', 'st-panel st-notes'); np.id = 'st-notes'; np.setAttribute('aria-label', 'ملاحظاتي');
    const head = el('div', 'st-panel-head'); head.append(el('strong', '', 'ملاحظاتي')); const x = el('button', 'st-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'إغلاق ملاحظاتي'); x.onclick = () => close('notes'); head.append(x);
    const search = document.createElement('input'); search.type = 'search'; search.id = 'st-notes-q'; search.placeholder = 'ابحث في الملاحظات…'; search.setAttribute('aria-label', 'البحث في الملاحظات'); search.oninput = () => { q = norm(search.value); notesRender(); };
    const chips = el('div', 'st-chips'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'تصفية الملاحظات');
    for (const [k, label] of [['all', 'الكل'], ['sticky', 'لاصقة'], ['text', 'نصوص']]) { const c = el('button', 'st-chip', label); c.type = 'button'; c.dataset.f = k; c.setAttribute('aria-pressed', String(k === filter)); c.onclick = () => { filter = k; chips.querySelectorAll('.st-chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === k))); notesRender(); }; chips.append(c); }
    const list = el('div', 'st-notes-list'); list.id = 'st-notes-list';
    np.append(head, search, chips, list); document.body.append(np);
  }
  function notesRender() {
    if (!np) return; const list = $('st-notes-list'); list.replaceChildren();
    const notes = M.S.items.filter(s => s && (s.tool === 'text' || s.tool === 'sticky') && typeof s.text === 'string' && (filter === 'all' || s.tool === filter) && (!q || norm(s.text).includes(q)));
    if (!notes.length) { list.append(el('p', 'st-empty', q || filter !== 'all' ? 'لا توجد ملاحظات مطابقة.' : 'لا توجد ملاحظات بعد. اختر أداة «نص» أو «ملاحظة لاصقة» واضغط على الصفحة.')); return; }
    notes.sort((a, b) => a.page - b.page || a.points[0][1] - b.points[0][1]);
    for (const s of notes) {
      const lines = s.text.split('\n'), card = el('button', 'st-note'); card.type = 'button'; card.dataset.id = s.id; if (s.tool === 'sticky') card.style.setProperty('--note-fill', s.fill || '#fff3a3'); card.dataset.kind = s.tool;
      card.append(el('strong', 'st-note-t', lines[0].slice(0, 80) || '—')); if (lines.length > 1) card.append(el('span', 'st-note-b', lines.slice(1).join('\n').slice(0, 240)));
      card.append(el('span', 'st-note-p', 'صفحة ' + s.page)); card.onclick = () => { M.reader.goto(s.page); const pel = M.reader.pageEl(s.page); if (pel) { pel.classList.add('st-pulse'); setTimeout(() => pel.classList.remove('st-pulse'), 1400); } if (matchMedia('(max-width:1099px)').matches) close('notes'); };
      list.append(card);
    }
  }
  let nt = 0; M.on('change', () => { clearTimeout(nt); nt = setTimeout(() => { if (np && np.classList.contains('open')) notesRender(); }, 200); }); M.on('history', () => { clearTimeout(nt); nt = setTimeout(() => { if (np && np.classList.contains('open')) notesRender(); }, 200); });

  /* ================= header buttons ================= */
  function addButtons() {
    const acts = $('studio-hdr-actions'); if (!acts || $('st-notes-toggle')) return false;
    const b = el('button', 'st-hdr-btn', '✎ ملاحظاتي'); b.type = 'button'; b.id = 'st-notes-toggle'; b.setAttribute('aria-controls', 'st-notes'); b.onclick = () => toggle('notes'); acts.prepend(b);
    const t = $('medixa-thumbs-toggle'); if (t) t.addEventListener('click', () => toggle('pages'), true);
    return true;
  }
  buildPages(); buildNotes();
  if (M.reader) M.reader.on('opened', pagesRefresh);
  if (!addButtons()) { const mo = new MutationObserver(() => { if (addButtons()) { mo.disconnect(); } }); mo.observe(document.body, { childList: true, subtree: true }); setTimeout(() => mo.disconnect(), 10000); }
  addEventListener('keydown', e => { if (e.key === 'Escape') { close('pages'); close('notes'); } });
  M.panels = { toggle, close, pagesRefresh, notesRender };
})();
