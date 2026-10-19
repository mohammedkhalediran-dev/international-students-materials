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
  if (!adopt()) { const mo = new MutationObserver(() => { if (adopt()) mo.disconnect(); }); mo.observe(document.body, { childList: true }); setTimeout(() => mo.disconnect(), 8000); }
})();
