/* Compact reader presentation. Moves existing controls; never writes document data.
   Load last, after shell/panels/search. Remove body.st-compact to use the old layout. */
(() => {
  'use strict';
  if (!document.body.classList.contains('st-compact') || document.documentElement.classList.contains('st-embed')) return;
  const $ = id => document.getElementById(id);
  function init() {
    const header = document.querySelector('header'), menu = $('st-docmenu'), actions = $('studio-hdr-actions');
    if (!header || !menu || !actions) return;
    const svg = path => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
    const make = (id, label, path, action) => {
      const b = document.createElement('button'); b.id = id; b.type = 'button'; b.className = 'st-hdr-btn';
      b.title = label; b.setAttribute('aria-label', label); b.innerHTML = svg(path); b.onclick = action; return b;
    };
    const nav = document.createElement('nav'); nav.id = 'st-compact-nav'; nav.setAttribute('aria-label', 'تنقل المستند');
    const move = (id, target) => { const n = $(id); if (n) target.append(n); };
    move('st-back', nav); move('medixa-thumbs-toggle', nav); move('st-find-btn', nav);
    const files = make('st-compact-files', 'المستندات وأدوات الدراسة', '<path d="M3 7h6l2-3h9a1 1 0 0 1 1 1v14H3z"/>', e => { e.stopPropagation(); $('st-docmenu-btn').click(); });
    files.setAttribute('aria-controls', 'st-docmenu'); files.setAttribute('aria-expanded', 'false'); nav.append(files);
    header.prepend(nav);
    // Tabs keep their original handlers and storage; only their location changes.
    const docs = document.createElement('section'); docs.id = 'st-compact-documents'; docs.setAttribute('aria-label', 'المستندات المفتوحة');
    const brand = header.querySelector('.st-brand'); if (brand) docs.append(brand);
    move('st-tabs', docs); move('st-home', docs); menu.prepend(docs);
    move('study-launch', menu); move('st-dock-more', menu);
    const status = $('status'); if (status) actions.prepend(status);
    move('st-notes-toggle', actions);
    header.append(actions);
    const dock = $('mx-dock');
    if (dock) {
      const close = make('st-compact-dock-close', 'إغلاق الأدوات الأخرى', '<path d="m6 6 12 12M18 6 6 18"/>', () => {
        dock.classList.remove('st-dock-open'); $('st-dock-more')?.setAttribute('aria-expanded', 'false');
      });
      dock.append(close);
    }
    // Page up / down on the right edge (as in Notewise); they press the dock's own previous / next buttons.
    const edge = document.createElement('div'); edge.id = 'st-edge-nav'; edge.setAttribute('role', 'group'); edge.setAttribute('aria-label', 'تقليب الصفحات');
    const step = sel => () => document.querySelector('#mx-reader-nav ' + sel)?.click();
    edge.append(make('st-edge-prev', 'الصفحة السابقة', '<path d="m6 15 6-6 6 6"/>', step('[data-mx-prev]')), make('st-edge-next', 'الصفحة التالية', '<path d="m6 9 6 6 6-6"/>', step('[data-mx-next]')));
    document.body.append(edge);
    const expanded = () => files.setAttribute('aria-expanded', String(!menu.hidden));
    new MutationObserver(expanded).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
    // Keep the secondary dock dismissible without closing document/ink dialogs.
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      $('mx-dock')?.classList.remove('st-dock-open'); $('st-dock-more')?.setAttribute('aria-expanded', 'false');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
