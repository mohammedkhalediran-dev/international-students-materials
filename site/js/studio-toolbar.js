/* MEDIXA Study Studio — the one task toolbar. Built from a config (order, visibility, handedness) persisted per device.
   Buttons keep data-tool / #undo / #redo / #color / #width so older tests and modules still find them. */
(function () {
  'use strict';
  const M = window.MedixaStudio; if (!M) return;
  const S = M.S, $ = id => document.getElementById(id);
  const svg = d => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
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
    { id: 'zoom', name: 'كتابة مكبرة', icon: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6M11 8v6"/>' }
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
  const PRIMARY = 3;                                       /* the first tools of the configured order stay on the bar */
  const COLORS = [['#168c8c', 'تركوازي'], ['#e43d56', 'أحمر'], ['#2f6fed', 'أزرق'], ['#f2c230', 'أصفر']];
  const SIZES = [[2, 'خط رفيع'], [3, 'خط متوسط'], [6, 'خط عريض']];

  const root = $('studio-toolbar'); if (!root) return;
  const btn = (cls, label, inner, id) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label); b.title = label; b.innerHTML = inner; if (id) b.id = id; return b; };
  const div = (cls) => { const d = document.createElement('div'); d.className = cls; return d; };
  function toolButton(t) { const b = btn('st-btn', t.name, svg(t.icon) + '<span class="st-lab">' + t.name + '</span>'); b.dataset.tool = t.id; b.setAttribute('aria-pressed', String(S.tool === t.id)); if (S.tool === t.id) b.classList.add('active'); b.onclick = () => M.setTool(t.id); return b; }
  /* one popover pattern for the whole reader: the panel sits right after its button; one outside click closes all */
  function closePops() { document.querySelectorAll('.st-pop').forEach(p => { if (p.hidden) return; p.hidden = true; const b = p.previousElementSibling; if (b) b.setAttribute('aria-expanded', 'false'); }); }
  function popFor(button, cls, label) {
    const p = div('st-pop ' + cls); p.hidden = true; p.setAttribute('role', 'group'); p.setAttribute('aria-label', label);
    button.setAttribute('aria-haspopup', 'true'); button.setAttribute('aria-expanded', 'false');
    button.onclick = () => { const open = p.hidden; closePops(); p.hidden = !open; button.setAttribute('aria-expanded', String(open)); };
    return p;
  }
  function render() {
    root.replaceChildren(); root.dataset.side = cfg.side;
    const shown = cfg.order.filter(id => !cfg.hidden.includes(id)), primary = shown.slice(0, PRIMARY), rest = shown.slice(PRIMARY);
    const tools = div('st-tools'); tools.setAttribute('role', 'toolbar'); tools.setAttribute('aria-label', 'أدوات الرسم');
    primary.forEach(id => tools.append(toolButton(byId[id])));
    if (rest.includes(S.tool)) { const b = toolButton(byId[S.tool]); b.classList.add('st-extra'); tools.append(b); }   /* the active tool is never hidden */
    /* colour and thickness */
    const colors = div('st-colors'); colors.setAttribute('role', 'group'); colors.setAttribute('aria-label', 'اللون');
    for (const [c, n] of COLORS) { const b = btn('st-swatch', n, ''); b.dataset.color = c; b.style.setProperty('--sw', c); b.onclick = () => { S.color = c; const ci = $('color'); if (ci) ci.value = c; M.emit('style'); sync(); }; colors.append(b); }
    const sizes = div('st-sizes'); sizes.setAttribute('role', 'group'); sizes.setAttribute('aria-label', 'السُمك');
    for (const [w, n] of SIZES) { const b = btn('st-size', n, '<span></span>'); b.dataset.w = w; b.style.setProperty('--d', (4 + w * 2) + 'px'); b.onclick = () => { S.width = w; const wi = $('width'); if (wi) wi.value = w; M.emit('style'); sync(); }; sizes.append(b); }
    const custom = div('st-custom');
    const ci = document.createElement('input'); ci.type = 'color'; ci.id = 'color'; ci.value = S.color; ci.setAttribute('aria-label', 'لون مخصص'); ci.oninput = e => { S.color = e.target.value; M.emit('style'); sync(); };
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
    /* «المزيد»: the remaining tools and the settings */
    const opts = div('st-settings');
    const more = btn('st-btn st-more', 'المزيد من الأدوات والإعدادات', svg('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'), 'studio-settings');
    const gp = popFor(more, 'st-morepop', 'المزيد من الأدوات والإعدادات');
    if (rest.length) { const h = document.createElement('p'); h.className = 'st-pop-h'; h.textContent = 'أدوات أخرى'; const grid = div('st-grid'); rest.forEach(id => grid.append(toolButton(byId[id]))); gp.append(h, grid); }
    const h2 = document.createElement('p'); h2.className = 'st-pop-h'; h2.textContent = 'الإعدادات';
    const po = document.createElement('label'); po.className = 'st-check'; po.innerHTML = '<input type="checkbox" id="medixa-pen-only"> قلم إلكتروني فقط'; po.querySelector('input').checked = S.penOnly; po.querySelector('input').onchange = e => M.setPenOnly(e.target.checked);
    const sn = document.createElement('label'); sn.className = 'st-check'; sn.innerHTML = '<input type="checkbox" id="studio-snap"> محاذاة الزاوية'; sn.querySelector('input').checked = !!S.snap; sn.querySelector('input').onchange = e => M.setSnap(e.target.checked);
    const cs = btn('st-row-btn', 'تخصيص الشريط', 'تخصيص الشريط', 'studio-customize'); cs.onclick = () => { closePops(); openCustomize(); };
    const mg = btn('st-row-btn', 'هوامش الكتابة', 'هوامش الكتابة', 'studio-margins-btn'); mg.onclick = () => { closePops(); openMargins(); };
    gp.append(h2, po, sn, mg, cs); opts.append(more, gp);
    root.append(tools, style, hist, opts); sync(); hs();
    root.dispatchEvent(new CustomEvent('st-rendered'));
  }
  /* The toolbar floats over the page (under the header; at the bottom on phones); pages reserve its measured height. */
  function reserve() { const h = Math.ceil(root.getBoundingClientRect().height); document.documentElement.style.setProperty('--st-tb-h', h + 'px'); const hd = document.querySelector('header'); if (hd) document.documentElement.style.setProperty('--st-hdr-h', Math.ceil(hd.getBoundingClientRect().height) + 'px'); }
  if (window.ResizeObserver) { new ResizeObserver(reserve).observe(root); const hd = document.querySelector('header'); if (hd) new ResizeObserver(reserve).observe(hd); }
  addEventListener('click', e => { const t = e.target; if (!t.closest || t.closest('.st-pop')) return; const own = t.closest('[aria-haspopup="true"]'); if (own && own.nextElementSibling && own.nextElementSibling.classList.contains('st-pop')) return; closePops(); });
  function sync() {
    root.querySelectorAll('[data-tool]').forEach(b => { const on = b.dataset.tool === S.tool; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    root.querySelectorAll('.st-swatch').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color === S.color)));
    root.querySelectorAll('.st-size').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.w === S.width)));
    root.style.setProperty('--st-cur', /^#[0-9a-f]{6}$/i.test(S.color) ? S.color : '#168c8c');
    const ci = $('color'); if (ci && ci.value !== S.color && /^#[0-9a-f]{6}$/i.test(S.color)) ci.value = S.color;
    const wi = $('width'); if (wi && +wi.value !== S.width) wi.value = S.width;
  }
  function hs() { if (!S.hist) return; const u = $('undo'), r = $('redo'); if (u) u.disabled = !S.hist.canUndo; if (r) r.disabled = !S.hist.canRedo; }
  M.on('tool', render); M.on('history', hs); M.on('style', sync);
  mqStyle.addEventListener && mqStyle.addEventListener('change', render);
  M.closePops = closePops;

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
  M.toolbar = { render, cfg: () => cfg, TOOLS };
})();
