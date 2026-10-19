/* MEDIXA Study Studio — shell. Layout only: relocates existing reader controls (their handlers stay attached) into
   one slim header, so the floating task toolbar, page panel and bottom dock never cover each other. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const hdr = document.querySelector('header'); if (!hdr) return;
  let acts = $('studio-hdr-actions');
  if (!acts) { acts = document.createElement('div'); acts.id = 'studio-hdr-actions'; acts.className = 'st-hdr-actions'; $('download').before(acts); }
  const MOVE = [['medixa-thumbs-toggle', 'الصفحات'], ['medixa-bookmark', 'حفظ الصفحة'], ['medixa-dark', 'الوضع الليلي'], ['medixa-focus', 'وضع التركيز'], ['medixa-split-toggle', 'تقسيم الشاشة']];
  function adopt() {
    const bar = $('medixa-reader-bar'); if (!bar) return false;
    for (const [id, name] of MOVE) { const b = $(id); if (b && b.parentElement !== acts) { b.classList.add('st-hdr-btn'); b.setAttribute('aria-label', name); acts.append(b); } }
    bar.hidden = true; document.body.classList.add('studio-shell'); return true;
  }
  /* zoom cluster (CSS-only zoom; stored coordinates never change) */
  const M = window.MedixaStudio;
  function zoomUi() {
    if ($('st-zoom') || !M || !M.reader) return;
    const z = document.createElement('div'); z.id = 'st-zoom'; z.setAttribute('role', 'group'); z.setAttribute('aria-label', 'التكبير');
    const mk = (id, label, text, fn) => { const b = document.createElement('button'); b.type = 'button'; b.id = id; b.setAttribute('aria-label', label); b.title = label; b.textContent = text; b.onclick = fn; z.append(b); return b; };
    mk('st-zoom-out', 'تصغير', '−', () => M.reader.zoomBy(1 / 1.15)); const lab = mk('st-zoom-label', 'ملاءمة العرض', '100%', () => M.reader.fit()); mk('st-zoom-in', 'تكبير', '+', () => M.reader.zoomBy(1.15));
    document.body.append(z); M.reader.on('zoom', v => { lab.textContent = Math.round(v * 100) + '%'; });
  }
  zoomUi();
  /* focus mode: keep the save status visible (the header is hidden) */
  (function () {
    const st = document.createElement('div'); st.id = 'st-focus-status'; st.setAttribute('role', 'status'); document.body.append(st);
    const src = $('status'); if (!src) return; const mirror = () => { st.textContent = src.textContent; };
    new MutationObserver(mirror).observe(src, { childList: true, characterData: true, subtree: true }); mirror();
  })();
  if (!adopt()) { const mo = new MutationObserver(() => { if (adopt()) mo.disconnect(); }); mo.observe(document.body, { childList: true }); setTimeout(() => mo.disconnect(), 8000); }
})();
