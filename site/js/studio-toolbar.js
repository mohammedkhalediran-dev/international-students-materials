/* MEDIXA Study Studio — the one task toolbar. Built from a config (order, visibility, handedness) persisted per device.
   Buttons keep data-tool / #undo / #redo / #color / #width so older tests and modules still find them.
   Tool settings: tapping the ACTIVE tool again (or holding any tool) opens #st-toolset with that tool's own style
   (pen type, smoothing, pressure range, marker opacity, eraser mode, arrow heads, text size …). Every control writes
   straight through M.setStyle / M.setInput / M.setSnap, so the engine sanitizes and persists it; nothing is kept here. */
(function () {
  'use strict';
  const M = window.MedixaStudio; if (!M) return;
  const S = M.S, C = M.C || window.MedixaStudioCore || {}, $ = id => document.getElementById(id);
  const svg = (d, n) => '<svg viewBox="0 0 24 24" width="' + (n || 22) + '" height="' + (n || 22) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const TOOLS = [
    { id: 'pen', name: 'قلم', icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>' },
    { id: 'highlight', name: 'تظليل', icon: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>' },
    { id: 'eraser', name: 'ممحاة', icon: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>' },
    { id: 'lasso', name: 'تحديد حر', icon: '<path d="M7 22a5 5 0 0 1-2-4"/><path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1"/><circle cx="5" cy="16" r="2"/>' },
    { id: 'select', name: 'تحديد نص', icon: '<path d="M17 22h-1a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4h1"/><path d="M7 22h1a4 4 0 0 0 4-4v-1"/><path d="M7 2h1a4 4 0 0 1 4 4v1"/>' },
    { id: 'region', name: 'منطقة من الصفحة', icon: '<path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1M9 21h1M14 3h1M14 21h1M3 9v1M21 9v1M3 14v1M21 14v1"/>' },
    { id: 'text', name: 'نص', icon: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>' },
    { id: 'sticky', name: 'ملاحظة لاصقة', icon: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M15 3v6h6"/>' },
    { id: 'line', name: 'خط', icon: '<path d="M5 19 19 5"/>' },
    { id: 'rectangle', name: 'مستطيل', icon: '<rect x="4" y="6" width="16" height="12" rx="1"/>' },
    { id: 'ellipse', name: 'دائرة', icon: '<ellipse cx="12" cy="12" rx="9" ry="6"/>' },
    { id: 'arrow', name: 'سهم', icon: '<path d="M5 19 19 5"/><path d="M9 5h10v10"/>' },
    { id: 'zoom', name: 'كتابة مكبرة', icon: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6M11 8v6"/>' },
    { id: 'hand', name: 'تحريك الصفحة', icon: '<path d="M18 11V6a2 2 0 0 0-4 0"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>' }
  ];
  const KEY = 'medixa.studio.toolbar.v1', DEFAULT = { order: TOOLS.map(t => t.id), hidden: [], side: 'start' };
  const byId = Object.fromEntries(TOOLS.map(t => [t.id, t]));
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!v || typeof v !== 'object') return structuredClone(DEFAULT);
      const order = Array.isArray(v.order) ? v.order.filter(id => byId[id]) : []; for (const t of TOOLS) if (!order.includes(t.id)) order.push(t.id);
      return { order, hidden: Array.isArray(v.hidden) ? v.hidden.filter(id => byId[id]) : [], side: v.side === 'end' ? 'end' : 'start' };
    } catch { return structuredClone(DEFAULT); }
  }
  let cfg = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {} };
  const mqStyle = window.matchMedia ? matchMedia('(max-width: 899px)') : { matches: false, addEventListener() {} };
  const mqPhone = window.matchMedia ? matchMedia('(max-width: 720px)') : { matches: false };
  const PRIMARY = 3;                                       /* the first tools of the configured order stay on the bar */
  const COLORS = [['#168c8c', 'تركوازي'], ['#e43d56', 'أحمر'], ['#2f6fed', 'أزرق'], ['#f2c230', 'أصفر']];
  const MARKERS = [['#f2c230', 'أصفر'], ['#7bd88f', 'أخضر'], ['#6fb1ff', 'أزرق'], ['#ff8fa3', 'وردي'], ['#ffb347', 'برتقالي'], ['#c39bff', 'بنفسجي']];
  const INKS = [['#18334b', 'كحلي'], ['#e43d56', 'أحمر'], ['#2f6fed', 'أزرق'], ['#168c8c', 'تركوازي']];
  const SIZES = [[2, 'خط رفيع'], [3, 'خط متوسط'], [6, 'خط عريض']];
  const PENS = [['ballpoint', 'حبر جاف'], ['fountain', 'قلم حبر'], ['pencil', 'رصاص'], ['technical', 'تقني']];
  /* tools that have a settings sheet, and the engine style group behind each (shapes share one, text and sticky share one) */
  const SETG = { pen: 'pen', highlight: 'highlight', eraser: 'eraser', line: 'shape', rectangle: 'shape', ellipse: 'shape', arrow: 'shape', text: 'text', sticky: 'text' };
  const TITLES = { pen: 'إعدادات القلم', highlight: 'إعدادات التظليل', eraser: 'إعدادات الممحاة', line: 'إعدادات الخط', rectangle: 'إعدادات المستطيل', ellipse: 'إعدادات الدائرة', arrow: 'إعدادات السهم', text: 'إعدادات النص', sticky: 'إعدادات الملاحظة اللاصقة' };
  const HOLD = 500, HEX6 = /^#[0-9a-f]{6}$/i;
  let lpAt = 0, ts = null, upd = [];                       /* lpAt: a long press just fired, so its trailing click is not a tap */

  const root = $('studio-toolbar'); if (!root) return;
  const btn = (cls, label, inner, id) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label); b.title = label; b.innerHTML = inner; if (id) b.id = id; return b; };
  const div = (cls) => { const d = document.createElement('div'); d.className = cls; return d; };
  const txt = (tag, cls, t) => { const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = t; return e; };
  function toolButton(t) {
    const on = S.tool === t.id, b = btn('st-btn', t.name, svg(t.icon) + '<span class="st-lab">' + t.name + '</span>'); b.dataset.tool = t.id; b.setAttribute('aria-pressed', String(on)); if (on) b.classList.add('active');
    if (SETG[t.id]) { b.classList.add('st-has-set'); if (on) { b.title = t.name + ' — اضغط مرة أخرى للإعدادات'; b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false'); } }
    b.onclick = e => {
      if (Date.now() - lpAt < 700) return;
      if (S.tool === t.id && SETG[t.id]) return toggleSet(e && e.detail === 0);   /* second tap on the active tool = its settings */
      closePops(); M.setTool(t.id);
    };
    holdable(b, t.id); return b;
  }
  /* hold a tool button (500 ms) = choose it and open its settings, the usual tablet gesture */
  function holdable(b, id) {
    let tm = 0, x0 = 0, y0 = 0; const stop = () => { clearTimeout(tm); tm = 0; };
    b.addEventListener('pointerdown', e => {
      if (e.button > 0) return; x0 = e.clientX; y0 = e.clientY; stop();
      tm = setTimeout(() => { tm = 0; lpAt = Date.now(); try { navigator.vibrate && navigator.vibrate(8); } catch {} if (S.tool !== id) { closePops(); M.setTool(id); } if (SETG[id]) openSet(); }, HOLD);
    });
    b.addEventListener('pointermove', e => { if (tm && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) stop(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, stop);
    b.addEventListener('contextmenu', e => e.preventDefault());             /* Android shows a menu on long press */
  }
  /* one popover pattern for the whole reader: the panel sits right after its button; one outside click closes all */
  function closePops() { document.querySelectorAll('.st-pop').forEach(p => { if (p.hidden) return; p.hidden = true; const b = p._anchor || p.previousElementSibling; if (b) b.setAttribute('aria-expanded', 'false'); }); }
  function popFor(button, cls, label) {
    const p = div('st-pop ' + cls); p.hidden = true; p.setAttribute('role', 'group'); p.setAttribute('aria-label', label);
    button.setAttribute('aria-haspopup', 'true'); button.setAttribute('aria-expanded', 'false');
    button.onclick = () => { const open = p.hidden; closePops(); p.hidden = !open; button.setAttribute('aria-expanded', String(open)); };
    return p;
  }
  /* lasso with a selection: the quick colours / sizes restyle the selection instead of the next stroke */
  function selStyle(props) {
    const sel = M.selection;
    if (S.tool !== 'lasso' || !sel || typeof sel.count !== 'function' || typeof sel.applyStyle !== 'function' || !(sel.count() > 0)) return false;
    sel.applyStyle(props); return true;
  }
  const check = (id, label, on, fn) => { const l = document.createElement('label'); l.className = 'st-check'; const i = document.createElement('input'); i.type = 'checkbox'; i.id = id; i.checked = !!on; i.onchange = () => fn(i.checked); l.append(i, ' ' + label); return l; };
  function render() {
    root.replaceChildren(); root.dataset.side = cfg.side;
    const shown = cfg.order.filter(id => !cfg.hidden.includes(id)), primary = shown.slice(0, PRIMARY), rest = shown.slice(PRIMARY);
    const tools = div('st-tools'); tools.setAttribute('role', 'toolbar'); tools.setAttribute('aria-label', 'أدوات الرسم');
    primary.forEach(id => tools.append(toolButton(byId[id])));
    if (rest.includes(S.tool)) { const b = toolButton(byId[S.tool]); b.classList.add('st-extra'); tools.append(b); }   /* the active tool is never hidden */
    /* colour and thickness: the highlighter offers marker colours, everything else the ink colours */
    const colors = div('st-colors'); colors.setAttribute('role', 'group'); colors.setAttribute('aria-label', 'اللون');
    for (const [c, n] of (S.tool === 'highlight' ? MARKERS.slice(0, 4) : COLORS)) { const b = btn('st-swatch', n, ''); b.dataset.color = c; b.style.setProperty('--sw', c); b.onclick = () => { if (selStyle({ color: c })) return; S.color = c; const ci = $('color'); if (ci) ci.value = c; M.emit('style'); sync(); }; colors.append(b); }
    const sizes = div('st-sizes'); sizes.setAttribute('role', 'group'); sizes.setAttribute('aria-label', 'السُمك');
    for (const [w, n] of SIZES) { const b = btn('st-size', n, '<span></span>'); b.dataset.w = w; b.style.setProperty('--d', (4 + w * 2) + 'px'); b.onclick = () => { if (selStyle({ width: w })) return; S.width = w; const wi = $('width'); if (wi) wi.value = w; M.emit('style'); sync(); }; sizes.append(b); }
    const custom = div('st-custom');
    const ci = document.createElement('input'); ci.type = 'color'; ci.id = 'color'; ci.value = HEX6.test(S.color) ? S.color : '#168c8c'; ci.setAttribute('aria-label', 'لون مخصص'); ci.oninput = e => { S.color = e.target.value; M.emit('style'); sync(); };
    const wl = document.createElement('label'); wl.className = 'st-width'; wl.append('السُمك '); const wi = document.createElement('input'); wi.type = 'range'; wi.id = 'width'; wi.min = 1; wi.max = 20; wi.value = S.width; wi.oninput = e => { S.width = +e.target.value; M.emit('style'); sync(); }; wl.append(wi);
    const cl = document.createElement('label'); cl.className = 'st-colorlab'; cl.append(ci, 'لون آخر'); custom.append(cl, wl);
    const style = div('st-style'), wrap = div('st-stylewrap');
    if (mqStyle.matches) {                                  /* tablets in portrait and phones: one colour dot opens everything */
      const sb = btn('st-btn st-stylebtn', 'اللون والسُمك', '<span class="st-dot"></span>'), p = popFor(sb, 'st-stylepop', 'اللون والسُمك');
      p.append(colors, sizes, custom); wrap.append(sb, p); style.append(wrap);
    } else {
      const sb = btn('st-btn st-stylebtn st-custombtn', 'لون وسُمك مخصصان', '<span class="st-dot st-dot-any"></span>'), p = popFor(sb, 'st-stylepop', 'لون وسُمك مخصصان');
      p.append(custom); wrap.append(sb, p); style.append(colors, sizes, wrap);
    }
    const hist = div('st-hist');
    const un = btn('st-btn', 'تراجع', svg('<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>'), 'undo'), re = btn('st-btn', 'إعادة', svg('<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>'), 'redo');
    un.onclick = () => M.undo(); re.onclick = () => M.redo(); hist.append(un, re);
    /* «المزيد»: the remaining tools, inserting a picture, touch & stylus input, and the reader settings */
    const opts = div('st-settings');
    const more = btn('st-btn st-more', 'المزيد من الأدوات والإعدادات', svg('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'), 'studio-settings');
    const gp = popFor(more, 'st-morepop', 'المزيد من الأدوات والإعدادات');
    if (rest.length) { const grid = div('st-grid'); rest.forEach(id => grid.append(toolButton(byId[id]))); gp.append(txt('p', 'st-pop-h', 'أدوات أخرى'), grid); }
    const img = btn('st-row-btn st-row-ic', 'إدراج صورة', svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>', 20) + '<span>إدراج صورة</span>', 'studio-insert-image');
    img.onclick = () => { closePops(); if (M.images && typeof M.images.pick === 'function') M.images.pick(); else if (M.banner) M.banner('إدراج الصور غير متاح الآن.', [['حسناً', () => {}]]); };
    gp.append(img, inputSection());
    const sn = check('studio-snap', 'محاذاة الزاوية', S.snap, v => { M.setSnap(v); refreshSet(); });
    const cs = btn('st-row-btn', 'تخصيص الشريط', 'تخصيص الشريط', 'studio-customize'); cs.onclick = () => { closePops(); openCustomize(); };
    const mg = btn('st-row-btn', 'هوامش الكتابة', 'هوامش الكتابة', 'studio-margins-btn'); mg.onclick = () => { closePops(); openMargins(); };
    gp.append(txt('p', 'st-pop-h', 'الإعدادات'), sn, mg, cs); opts.append(more, gp);
    ts = div('st-pop st-toolset'); ts.id = 'st-toolset'; ts.hidden = true; ts.setAttribute('role', 'dialog');
    root.append(tools, style, hist, opts, ts); sync(); hs(); syncInput();
    root.dispatchEvent(new CustomEvent('st-rendered'));
  }
  /* «الكتابة باللمس والقلم»: what a finger does, palm rejection, two-finger navigation, stylus auto-detection */
  function inputSection() {
    const sec = div('st-inputset'), I = M.input ? M.input() : {}, set = p => M.setInput ? M.setInput(p) : (p.stylusOnly != null && M.setPenOnly(p.stylusOnly));
    sec.append(txt('p', 'st-pop-h', 'الكتابة باللمس والقلم'));
    sec.append(check('studio-finger', 'الكتابة بالإصبع', I.fingerDraw, v => set({ fingerDraw: v })));
    sec.append(check('medixa-pen-only', 'القلم الإلكتروني فقط', S.penOnly, v => set({ stylusOnly: v })));
    sec.append(check('studio-palm', 'تجاهل راحة اليد', I.palm, v => set({ palm: v })));
    const palm = div('st-subrow'), pl = txt('label', '', 'حساسية الرصد'), ps = document.createElement('select'); ps.id = 'studio-palm-sens'; pl.htmlFor = ps.id; ps.setAttribute('aria-label', 'حساسية تجاهل راحة اليد');
    for (const [v, n] of [['low', 'منخفضة'], ['medium', 'متوسطة'], ['high', 'عالية']]) { const o = document.createElement('option'); o.value = v; o.textContent = n; ps.append(o); }
    ps.value = I.palmSens || 'medium'; ps.onchange = () => set({ palmSens: ps.value });
    palm.append(pl, ps); sec.append(palm);
    sec.append(check('studio-twofinger', 'التنقل بإصبعين', I.twoFinger, v => set({ twoFinger: v })));
    sec.append(check('studio-autostylus', 'التبديل تلقائياً عند استعمال القلم', I.autoStylus, v => set({ autoStylus: v })));
    const st = div('st-penstat'), line = txt('span', '', ''); line.id = 'studio-pen-status'; line.setAttribute('role', 'status');
    const fg = btn('st-row-btn st-forget', 'نسيان القلم', 'نسيان القلم', 'studio-forget-pen'); fg.onclick = () => { if (M.gesture && M.gesture.forgetPen) M.gesture.forgetPen(); syncInput(); };
    st.append(line, fg); sec.append(st, txt('p', 'st-note-line st-input-note', 'تجاهل راحة اليد في المتصفح تقديري ويعتمد على ما يرسله الجهاز.'));
    return sec;
  }
  function syncInput() {
    const I = M.input ? M.input() : {}, put = (id, v) => { const e = $(id); if (e && e.checked !== !!v) e.checked = !!v; };
    put('studio-finger', I.fingerDraw); put('medixa-pen-only', I.stylusOnly); put('studio-palm', I.palm); put('studio-twofinger', I.twoFinger); put('studio-autostylus', I.autoStylus); put('studio-snap', S.snap);
    const f = $('studio-finger'); if (f) f.disabled = !!I.stylusOnly;                 /* «القلم فقط» already decides what a finger does */
    const ps = $('studio-palm-sens'); if (ps) { if (ps.value !== I.palmSens) ps.value = I.palmSens || 'medium'; ps.disabled = !I.palm; }
    const seen = !!(M.gesture && M.gesture.penSeen > 0), line = $('studio-pen-status'), fg = $('studio-forget-pen');
    if (line) { line.textContent = seen ? 'اكتُشف قلم على هذا الجهاز' : 'لم يُكتشف قلم بعد'; line.parentNode.dataset.seen = String(seen); }
    if (fg) fg.disabled = !seen;
  }
  /* The toolbar floats over the page (under the header; at the bottom on phones); pages reserve its measured height. */
  function reserve() { const h = Math.ceil(root.getBoundingClientRect().height); document.documentElement.style.setProperty('--st-tb-h', h + 'px'); const hd = document.querySelector('header'); if (hd) document.documentElement.style.setProperty('--st-hdr-h', Math.ceil(hd.getBoundingClientRect().height) + 'px'); }
  if (window.ResizeObserver) { new ResizeObserver(reserve).observe(root); const hd = document.querySelector('header'); if (hd) new ResizeObserver(reserve).observe(hd); }
  addEventListener('click', e => {
    const t = e.target; if (!t.closest || t.closest('.st-pop')) return;
    if (Date.now() - lpAt < 700 || t.closest('#studio-toolbar [data-tool]')) return;   /* tool buttons open / close their own sheet */
    const own = t.closest('[aria-haspopup="true"]'); if (own && own.nextElementSibling && own.nextElementSibling.classList.contains('st-pop')) return; closePops();
  });
  /* Escape closes the open popover and gives focus back to the button that opened it */
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = [...document.querySelectorAll('.st-pop')].filter(p => !p.hidden); if (!open.length) return;
    const p = open.find(x => x.contains(document.activeElement)), a = p && (p._anchor || p.previousElementSibling);
    closePops(); e.stopPropagation(); if (a && a.isConnected && a.focus) a.focus();
  }, true);
  addEventListener('resize', () => { if (ts && !ts.hidden) place(); });
  function sync() {
    root.querySelectorAll('[data-tool]').forEach(b => { const on = b.dataset.tool === S.tool; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    root.querySelectorAll('.st-swatch').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color === S.color)));
    root.querySelectorAll('.st-size').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.w === S.width)));
    root.style.setProperty('--st-cur', HEX6.test(S.color) ? S.color : '#168c8c');
    const ci = $('color'); if (ci && ci.value !== S.color && HEX6.test(S.color)) ci.value = S.color;
    const wi = $('width'); if (wi && +wi.value !== S.width) wi.value = S.width;
  }
  function hs() { if (!S.hist) return; const u = $('undo'), r = $('redo'); if (u) u.disabled = !S.hist.canUndo; if (r) r.disabled = !S.hist.canRedo; }
  M.on('tool', render); M.on('history', hs); M.on('style', () => { sync(); refreshSet(); }); M.on('input', () => { syncInput(); refreshSet(); });
  mqStyle.addEventListener && mqStyle.addEventListener('change', render);
  M.closePops = closePops;

  /* =============================== tool settings sheet (#st-toolset) =============================== */
  const sty = () => (M.style && M.style(S.tool)) || {};
  const put = props => { if (M.setStyle) M.setStyle(S.tool, props); };      /* emits 'style' -> refreshSet() */
  const anchor = () => root.querySelector('.st-tools [data-tool="' + S.tool + '"]');
  function toggleSet(kbd) { const open = ts && !ts.hidden; closePops(); if (!open) openSet(kbd); }
  function openSet(kbd) {
    if (!ts || !SETG[S.tool]) return;
    closePops(); build(SETG[S.tool]); ts.hidden = false;
    const a = anchor(); ts._anchor = a || null; if (a) a.setAttribute('aria-expanded', 'true');
    place(); refreshSet();
    if (kbd) { const f = ts.querySelector('button:not(.ts-x),input,select'); if (f) f.focus(); }
  }
  /* desktop / tablet: under the toolbar, centred on the tool and kept on screen; phones: a bottom sheet (CSS) */
  function place() {
    ts.style.left = ''; ts.style.right = '';
    if (mqPhone.matches) return;
    const a = anchor(), r = root.getBoundingClientRect(), w = ts.offsetWidth; if (!a || !w) return;
    const ar = a.getBoundingClientRect(); let x = ar.left + ar.width / 2 - w / 2;
    x = Math.max(8, Math.min(innerWidth - 8 - w, x));
    ts.style.left = Math.round(x - r.left) + 'px'; ts.style.right = 'auto';
  }
  function refreshSet() { if (!ts || ts.hidden) return; for (const f of upd) f(); paintPreview(); }
  /* ---- small builders; each control registers how to re-read its value from the engine ---- */
  function sec(title, cls) { const s = div('ts-sec' + (cls ? ' ' + cls : '')); if (title) s.append(txt('p', 'ts-h', title)); ts.append(s); return s; }
  function range(id, label, min, max, step, get, set, fmt) {
    const row = document.createElement('div'); row.className = 'ts-row';
    const l = txt('label', '', label); l.htmlFor = id;
    const r = document.createElement('input'); r.type = 'range'; r.id = id; r.min = min; r.max = max; r.step = step; r.value = get();
    const o = document.createElement('output'); o.htmlFor = id; o.textContent = fmt(get());
    r.oninput = () => { set(+r.value); o.textContent = fmt(get()); };
    upd.push(() => { const v = get(); if (Math.abs(+r.value - v) > 1e-9) r.value = v; o.textContent = fmt(v); });
    row.append(l, r, o); return row;
  }
  function toggle(id, label, get, set) {
    const l = check(id, label, get(), v => set(v)); l.classList.add('ts-switch');
    upd.push(() => { const i = l.querySelector('input'); if (i.checked !== !!get()) i.checked = !!get(); });
    return l;
  }
  function colors(list) {
    const wrap = div('ts-colors'); wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', 'اللون');
    for (const [c, n] of list) { const b = btn('ts-sw', n, ''); b.dataset.color = c; b.style.setProperty('--sw', c); b.onclick = () => put({ color: c }); wrap.append(b); }
    const lab = document.createElement('label'); lab.className = 'ts-custom'; lab.title = 'لون آخر';
    const ci = document.createElement('input'); ci.type = 'color'; ci.id = 'ts-color'; ci.setAttribute('aria-label', 'لون آخر'); ci.oninput = () => put({ color: ci.value }); lab.append(ci); wrap.append(lab);
    upd.push(() => { const c = String(sty().color || '').toLowerCase(); wrap.querySelectorAll('.ts-sw').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color === c))); if (HEX6.test(c) && ci.value !== c) ci.value = c; });
    return wrap;
  }
  function seg(label, attr, list, get, set) {
    const s = div('ts-seg'); s.setAttribute('role', 'group'); s.setAttribute('aria-label', label);
    for (const [v, t, hint] of list) { const b = document.createElement('button'); b.type = 'button'; b.dataset[attr] = v; b.append(txt('span', '', t)); if (hint) b.append(txt('small', '', hint)); b.onclick = () => set(v); s.append(b); }
    upd.push(() => s.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(get())))));
    return s;
  }
  function build(g) {
    ts.replaceChildren(); upd = []; const t = byId[S.tool];
    ts.setAttribute('aria-label', TITLES[t.id]); ts.dataset.group = g;
    const head = div('ts-head'); head.innerHTML = svg(t.icon, 20); head.append(txt('p', 'ts-title', TITLES[t.id]));
    const x = btn('ts-x', 'إغلاق', svg('<path d="M18 6 6 18M6 6l12 12"/>', 20), 'ts-close'); x.onclick = () => { const a = ts._anchor; closePops(); if (a && a.isConnected) a.focus(); };
    head.append(x); ts.append(head);
    if (g !== 'eraser') { const cv = document.createElement('canvas'); cv.id = 'ts-preview'; cv.className = 'ts-preview'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'معاينة'); ts.append(cv); }
    if (g === 'pen') {
      const pr = div('ts-presets'); pr.setAttribute('role', 'group'); pr.setAttribute('aria-label', 'نوع القلم');
      for (const [id, name] of PENS) { const b = btn('ts-preset', name, '<canvas class="ts-chip" aria-hidden="true"></canvas><span>' + name + '</span>'); b.dataset.pen = id; b.onclick = () => put({ pen: id }); pr.append(b); }
      upd.push(() => pr.querySelectorAll('.ts-preset').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pen === sty().pen))));
      sec('نوع القلم').append(pr);
      sec('اللون').append(colors(COLORS));
      sec('', 'ts-tight').append(range('ts-width', 'السُمك', 1, 20, 1, () => sty().width, v => put({ width: v }), v => String(+(+v).toFixed(1))),
        range('ts-smooth', 'تنعيم الخط', 0, 100, 5, () => Math.round((sty().smooth || 0) * 100), v => put({ smooth: v / 100 }), v => v + '%'));
      const wr = () => sty().wr || [0.25, 2.2];
      sec('مدى السُمك مع الضغط', 'ts-tight').append(
        range('ts-wrmin', 'الأدنى', 0.1, 1, 0.05, () => wr()[0], v => put({ wr: [v, Math.max(v, wr()[1])] }), v => '×' + (+v).toFixed(2)),
        range('ts-wrmax', 'الأقصى', 1, 4, 0.1, () => wr()[1], v => put({ wr: [Math.min(v, wr()[0]), v] }), v => '×' + (+v).toFixed(1)),
        txt('p', 'ts-hint', 'كلما اتّسع المدى تغيّر الخط أكثر مع ضغط القلم.'));
      sec('').append(toggle('ts-shapesnap', 'تحويل الرسم إلى شكل عند التوقف', () => (M.input ? M.input() : {}).shapeSnap, v => M.setInput && M.setInput({ shapeSnap: v })));
    } else if (g === 'highlight') {
      sec('اللون').append(colors(MARKERS));
      sec('', 'ts-tight').append(range('ts-width', 'السُمك', 1, 10, 1, () => sty().width, v => put({ width: v }), v => String(+(+v).toFixed(1))),
        range('ts-op', 'الشفافية', 10, 80, 5, () => Math.round((sty().op || 0.3) * 100), v => put({ op: v / 100 }), v => v + '%'));
      const hs2 = toggle('ts-hsnap', 'محاذاة أفقية', () => sty().hsnap, v => put({ hsnap: v }));
      upd.push(() => { hs2.querySelector('input').disabled = !sty().straight; hs2.classList.toggle('ts-off', !sty().straight); });
      sec('').append(toggle('ts-straight', 'خط مستقيم عند التوقف', () => sty().straight, v => put({ straight: v })), hs2);
    } else if (g === 'eraser') {
      sec('نوع الممحاة').append(seg('نوع الممحاة', 'mode', [['stroke', 'ممحاة كاملة', 'تمسح الخط كله بلمسة'], ['precise', 'ممحاة دقيقة', 'تمسح ما تمرّ عليه فقط']], () => sty().mode, v => put({ mode: v })));
      const pv = div('ts-eprev'), dot = document.createElement('span'); dot.id = 'ts-edot'; pv.setAttribute('aria-hidden', 'true'); pv.append(dot);
      upd.push(() => { const d = Math.round((sty().size || 12) * 2); dot.style.width = dot.style.height = d + 'px'; });
      sec('', 'ts-tight').append(range('ts-esize', 'الحجم', 4, 60, 1, () => sty().size || 12, v => put({ size: v }), v => String(Math.round(v))), pv);
    } else if (g === 'shape') {
      ts.append(txt('p', 'ts-hint ts-shared', 'تنطبق على الخط والمستطيل والدائرة والسهم.'));
      sec('اللون').append(colors(COLORS));
      sec('', 'ts-tight').append(range('ts-width', 'السُمك', 1, 20, 1, () => sty().width, v => put({ width: v }), v => String(+(+v).toFixed(1))),
        toggle('ts-snap', 'محاذاة الزاوية', () => S.snap, v => { M.setSnap(v); const s2 = $('studio-snap'); if (s2) s2.checked = !!v; refreshSet(); }));
      if (S.tool === 'arrow') sec('رأس السهم').append(seg('رأس السهم', 'head', [['end', 'طرف واحد'], ['both', 'طرفان']], () => sty().head || 'end', v => put({ head: v })));
    } else if (g === 'text') {
      ts.append(txt('p', 'ts-hint ts-shared', 'تنطبق على النص والملاحظة اللاصقة.'));
      const row = div('ts-line'), lab = txt('label', '', 'الحجم'), sel = document.createElement('select'); sel.id = 'ts-size'; lab.htmlFor = 'ts-size';
      const SZ = [12, 14, 16, 18, 20, 24, 28, 32, 40];
      const fill = cur => { sel.replaceChildren(); for (const v of SZ.includes(cur) ? SZ : SZ.concat(cur).sort((a, b) => a - b)) { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.append(o); } sel.value = String(cur); };
      sel.onchange = () => put({ size: +sel.value });
      const B = btn('ts-tog', 'عريض', '<b>B</b>', 'ts-bold'), It = btn('ts-tog', 'مائل', '<i>I</i>', 'ts-italic');
      B.onclick = () => put({ bold: !sty().bold }); It.onclick = () => put({ italic: !sty().italic });
      upd.push(() => { const s = sty(), cur = Math.round(s.size || 18); if (sel.value !== String(cur)) fill(cur); B.setAttribute('aria-pressed', String(!!s.bold)); It.setAttribute('aria-pressed', String(!!s.italic)); });
      fill(Math.round(sty().size || 18)); row.append(lab, sel, B, It); sec('النص').append(row);
      sec('اللون').append(colors(INKS));
    }
  }
  /* ---- live preview: the engine's own renderer draws a sample, so what you see is exactly what you will write ---- */
  function surface(cv, fw, fh) {
    const r = cv.getBoundingClientRect(), d = Math.min(3, window.devicePixelRatio || 1), cw = r.width || fw, ch = r.height || fh;
    const W = Math.max(1, Math.round(cw * d)), H = Math.max(1, Math.round(ch * d)); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    return { ctx, cw, ch, d, PW: 800 * d, H };                /* a virtual 800 px page: stroke widths show at true size */
  }
  /* sample points in CSS px -> page fractions of that virtual page (u = x / 800, v = y / height) */
  const uv = (x, y, ch) => [x / 800, y / ch];
  function penItem(cw, ch, s, jit) {
    const n = 44, raw = [], pr = []; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), x = 12 + (cw - 24) * t, y = ch / 2 - ch * 0.27 * Math.sin(t * 2 * Math.PI);
      raw.push([x + rnd() * jit, y + rnd() * jit]); pr.push(t < 0.55 ? 0.12 + 0.88 * t / 0.55 : 1 - 0.65 * (t - 0.55) / 0.45);   /* a pressure ramp: light, firm, lifting */
    }
    const f = s.smooth > 0 && C.InkFilter ? new C.InkFilter(s.smooth, ch / 800) : null;   /* the same input filter the engine uses */
    const points = raw.map((p, i) => { const q = uv(p[0], p[1], ch); return f ? f.push(q, i * 8) : q; });
    return { id: 'ts-sample', page: 1, tool: 'pen', color: s.color || '#e43d56', width: s.width || 3, pen: s.pen || 'ballpoint', wr: (s.wr || [0.25, 2.2]).slice(), pr, points };
  }
  function paintPreview() {
    if (!ts || ts.hidden || !M.drawStroke) return;
    const g = SETG[S.tool], s = sty(), cv = $('ts-preview');
    try {
      if (cv) {
        const { ctx, cw, ch, d, PW, H } = surface(cv, 260, 70); let item = null;
        if (g === 'pen') item = penItem(cw, ch, s, 2.4);
        else if (g === 'highlight') {
          ctx.fillStyle = '#d3dee4';                                   /* two lines of "text" under the marker */
          for (const [y, w] of [[0.36, 0.86], [0.7, 0.58]]) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(14 * d, (ch * y - 3) * d, (cw - 28) * w * d, 6 * d, 3 * d) : ctx.rect(14 * d, (ch * y - 3) * d, (cw - 28) * w * d, 6 * d); ctx.fill(); }
          const y = ch * 0.36, pts = s.straight ? [[16, y], [cw - 16, y]] : Array.from({ length: 24 }, (_, i) => [16 + (cw - 32) * i / 23, y + Math.sin(i / 3) * 2.2]);
          item = { id: 'ts-sample', page: 1, tool: 'highlight', color: s.color, width: s.width, op: s.op, points: pts.map(p => uv(p[0], p[1], ch)) };
        } else if (g === 'shape') {
          const T = S.tool, a = T === 'line' || T === 'arrow' ? [cw * 0.22, ch * 0.74] : [cw * 0.3, ch * 0.2], b = T === 'line' || T === 'arrow' ? [cw * 0.78, ch * 0.26] : [cw * 0.7, ch * 0.8];
          item = { id: 'ts-sample', page: 1, tool: T, color: s.color, width: s.width, points: [uv(a[0], a[1], ch), uv(b[0], b[1], ch)], k: ch / 800 };
          if (T === 'arrow' && s.head === 'both') item.head = 'both';
        } else if (g === 'text') item = { id: 'ts-sample', page: 1, tool: S.tool, text: 'ملاحظتي Aa', color: s.color, size: s.size, bold: s.bold, italic: s.italic, points: [uv(10, 6, ch)], w: (cw - 20) / 800, h: (ch - 12) / ch };
        if (item) M.drawStroke(ctx, item, PW, H);
      }
      if (g === 'pen') ts.querySelectorAll('.ts-preset').forEach(b => { const c = b.querySelector('canvas'), o = surface(c, 56, 24); M.drawStroke(o.ctx, penItem(o.cw, o.ch, Object.assign({}, s, { pen: b.dataset.pen, width: Math.min(s.width || 3, 4), smooth: 0.5 }), 0), o.PW, o.H); });
    } catch (e) { console.warn(e); }
  }
  M.toolbar = { render, cfg: () => cfg, TOOLS, openSettings: () => openSet(), closeSettings: closePops };

  /* ---- customize dialog: order, visibility, handedness, reset ---- */
  function openCustomize() {
    let d = $('studio-cust'); if (d) d.remove();
    d = document.createElement('dialog'); d.id = 'studio-cust'; d.setAttribute('aria-labelledby', 'studio-cust-t');
    const draw = () => {
      d.replaceChildren(); const h = document.createElement('h2'); h.id = 'studio-cust-t'; h.textContent = 'تخصيص شريط الأدوات'; d.append(h);
      const ul = document.createElement('ul'); ul.className = 'st-cust-list';
      cfg.order.forEach((id, i) => {
        const li = document.createElement('li'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !cfg.hidden.includes(id); cb.id = 'cust-' + id; cb.onchange = () => { cfg.hidden = cb.checked ? cfg.hidden.filter(x => x !== id) : cfg.hidden.concat(id); if (cfg.order.length - cfg.hidden.length < 1) { cfg.hidden = cfg.hidden.filter(x => x !== id); cb.checked = true; } save(); render(); };
        const lab = document.createElement('label'); lab.htmlFor = cb.id; lab.textContent = byId[id].name;
        const up = btn('st-mini', 'تقديم ' + byId[id].name, '▲'), dn = btn('st-mini', 'تأخير ' + byId[id].name, '▼'); up.disabled = i === 0; dn.disabled = i === cfg.order.length - 1;
        up.onclick = () => { [cfg.order[i - 1], cfg.order[i]] = [cfg.order[i], cfg.order[i - 1]]; save(); render(); draw(); }; dn.onclick = () => { [cfg.order[i + 1], cfg.order[i]] = [cfg.order[i], cfg.order[i + 1]]; save(); render(); draw(); };
        li.append(cb, lab, up, dn); ul.append(li);
      });
      d.append(ul);
      const side = document.createElement('label'); side.className = 'st-check'; side.innerHTML = '<input type="checkbox" id="cust-side"> وضع اليد اليسرى (نقل الشريط للطرف الآخر)'; side.querySelector('input').checked = cfg.side === 'end'; side.querySelector('input').onchange = e => { cfg.side = e.target.checked ? 'end' : 'start'; save(); render(); }; d.append(side);
      const row = document.createElement('div'); row.className = 'st-cust-row';
      const rs = btn('st-btn', 'إعادة الضبط', 'إعادة الضبط'); rs.onclick = () => { cfg = structuredClone(DEFAULT); save(); render(); draw(); };
      const cl = btn('st-btn', 'إغلاق', 'إغلاق'); cl.onclick = () => d.close(); row.append(rs, cl); d.append(row);
    };
    draw(); document.body.append(d); d.addEventListener('close', () => d.remove()); d.showModal();
  }
  /* ---- margins dialog: virtual writing room around the page; export chooser ---- */
  function openMargins() {
    let d = $('studio-margins'); if (d) d.remove();
    d = document.createElement('dialog'); d.id = 'studio-margins'; d.setAttribute('aria-labelledby', 'studio-margins-t');
    const cur = M.reader ? M.reader.current() : 1, e0 = M.marginsOf(cur);
    const h = document.createElement('h2'); h.id = 'studio-margins-t'; h.textContent = 'هوامش الكتابة (الصفحة ' + cur + ')'; d.append(h);
    const note = document.createElement('p'); note.className = 'st-note-line'; note.textContent = 'الهامش مساحة كتابة إضافية حول الصفحة. لا يغيّر ملف PDF الأصلي ولا يمدّد رسوماتك.'; d.append(note);
    const sel = {};
    for (const [k, label] of [['l', 'اليسار'], ['r', 'اليمين'], ['t', 'الأعلى'], ['b', 'الأسفل']]) {
      const row = document.createElement('label'); row.className = 'st-margin-row'; row.append(label + ' ');
      const s = document.createElement('select'); s.id = 'margin-' + k; for (const v of [0, 0.25, 0.5, 1]) { const o = document.createElement('option'); o.value = v; o.textContent = v === 0 ? 'بلا' : Math.round(v * 100) + '% من الصفحة'; if (Math.abs(e0[k] - v) < 0.001) o.selected = true; s.append(o); }
      sel[k] = s; row.append(s); d.append(row);
    }
    const all = document.createElement('label'); all.className = 'st-check'; all.innerHTML = '<input type="checkbox" id="margin-all"> تطبيق على كل الصفحات'; d.append(all);
    const msg = document.createElement('p'); msg.id = 'margin-msg'; msg.setAttribute('role', 'status'); d.append(msg);
    const row = document.createElement('div'); row.className = 'st-cust-row';
    const ok = btn('st-btn', 'تطبيق', 'تطبيق'); ok.id = 'margin-apply'; ok.onclick = () => {
      const ext = {}; for (const k of Object.keys(sel)) ext[k] = +sel[k].value; let clamped = 0;
      const targets = all.querySelector('input').checked ? M.reader.pages.map(p => p.n) : [cur];
      for (const n of targets) { const r = M.setMargins(n, ext, { defer: true }); if (r && r.clamped) clamped++; }
      M.saveLayout(); msg.textContent = clamped ? 'بعض الهوامش لم تصغر لأن فيها كتابة؛ احذف الكتابة أولاً.' : 'تم تطبيق الهوامش.'; if (!clamped) setTimeout(() => d.close(), 400);
    };
    const cl = btn('st-btn', 'إغلاق', 'إغلاق'); cl.onclick = () => d.close(); row.append(ok, cl); d.append(row);
    document.body.append(d); d.addEventListener('close', () => d.remove()); d.showModal();
  }
  M.chooseMargins = function () {
    const r = M.marginReport(); if (!r.hasMargins) return Promise.resolve('clip');
    return new Promise(res => {
      const d = document.createElement('dialog'); d.id = 'studio-export-dlg'; d.setAttribute('aria-labelledby', 'studio-export-t');
      d.innerHTML = '<h2 id="studio-export-t">تنزيل PDF بالتعليقات</h2><p></p><label class="st-check"><input type="radio" name="expmode" value="clip" checked> الصفحة الأصلية فقط</label><label class="st-check"><input type="radio" name="expmode" value="expand"> مع الهوامش (صفحات أكبر)</label><div class="st-cust-row"><button type="button" class="st-btn" id="exp-go">تنزيل</button><button type="button" class="st-btn" id="exp-cancel">إلغاء</button></div>';
      d.querySelector('p').textContent = r.strokes ? 'يوجد ' + r.strokes + ' عنصراً مكتوباً في الهوامش (صفحات: ' + r.pages.join('، ') + '). اختيار «الصفحة الأصلية فقط» سيقصّها من الملف.' : 'لا توجد كتابة في الهوامش.';
      let out = null; d.querySelector('#exp-go').onclick = () => { out = d.querySelector('input[name=expmode]:checked').value; d.close(); }; d.querySelector('#exp-cancel').onclick = () => d.close();
      d.addEventListener('close', () => { d.remove(); res(out); }); document.body.append(d); d.showModal();
    });
  };
  if (S.hist) render(); else M.on('init', render);
})();
