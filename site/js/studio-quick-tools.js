/* Compact v2: lightweight per-tool controls backed by the existing engine styles. */
(() => {
  'use strict';
  const M = window.MedixaStudio, root = document.getElementById('studio-toolbar');
  if (!M || !root || !document.body.classList.contains('st-compact')) return;
  const names = { pen: 'القلم', highlight: 'التظليل', eraser: 'الممحاة' };
  let panel = null, updates = [];
  const elem = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; };
  const style = () => M.style(M.S.tool);
  const put = patch => M.setStyle(M.S.tool, patch);
  function button(label, action, text) {
    const b = elem('button', 'sq-button', text || label); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); b.onclick = action; return b;
  }
  function choices(label, values, key, parent) {
    const group = elem('div', 'sq-group'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', label);
    for (const [value, title] of values) {
      const b = button(title, () => put({ [key]: value }), title);
      b.dataset.choice = key; b.dataset.value = String(value);
      if (key === 'color') { b.textContent = ''; b.classList.add('sq-color'); b.style.setProperty('--sq-color', value); }
      updates.push(() => b.setAttribute('aria-pressed', String(style()[key] === value))); group.append(b);
    }
    parent.append(group);
  }
  function slider(label, key, min, max, step, parent) {
    const wrap = elem('label', 'sq-range', label), i = document.createElement('input'), out = elem('output', '');
    i.type = 'range'; i.min = min; i.max = max; i.step = step; i.setAttribute('aria-label', label);
    i.oninput = () => put({ [key]: Number(i.value) });
    updates.push(() => { i.value = style()[key]; out.textContent = key === 'op' ? Math.round(i.value * 100) + '%' : i.value; });
    wrap.append(i, out); parent.append(wrap);
  }
  function build() {
    panel = null; updates = [];
    if (!names[M.S.tool]) return;
    panel = elem('div', 'st-pop sq-panel'); panel.id = 'st-quick-tools'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'إعدادات ' + names[M.S.tool] + ' السريعة');
    const row = elem('div', 'sq-row');
    if (M.S.tool !== 'eraser') {
      choices('السُمك', M.S.tool === 'pen' ? [[1, 'رفيع'], [3, 'متوسط'], [6, 'عريض']] : [[2, 'رفيع'], [4, 'متوسط'], [7, 'عريض']], 'width', row);
      const inks = M.S.tool === 'pen' ? [['#18334b', 'كحلي'], ['#e43d56', 'أحمر'], ['#168c8c', 'تركوازي'], ['#2f6fed', 'أزرق'], ['#9747ff', 'بنفسجي']] : [['#f2c230', 'أصفر'], ['#7bd88f', 'أخضر'], ['#6fb1ff', 'أزرق'], ['#ff8fa3', 'وردي']];
      choices('ألوان ' + names[M.S.tool], inks, 'color', row);
    } else {
      choices('نوع المسح', [['stroke', 'خط كامل'], ['precise', 'مسح دقيق']], 'mode', row);
      choices('العناصر التي تُمسح', [['all', 'الكل'], ['ink', 'كتابة'], ['highlight', 'تظليل']], 'target', row);
    }
    const detail = button('الإعدادات التفصيلية', () => { M.closePops(); M.toolbar.openSettings(); }, '⚙');
    const close = button('إغلاق', () => { const a = panel._anchor; M.closePops(); a?.focus(); }, '×');
    row.append(detail, close); panel.append(row);
    const sub = elem('div', 'sq-row sq-secondary');
    if (M.S.tool === 'pen') {
      choices('نوع القلم', [['ballpoint', 'حبر جاف'], ['fountain', 'حبر'], ['pencil', 'رصاص'], ['technical', 'تقني']], 'pen', sub);
      slider('السُمك', 'width', 0.5, 20, 0.5, sub);
    } else if (M.S.tool === 'highlight') {
      choices('مسار التظليل', [[false, 'حر / تثبيت'], [true, 'مستقيم']], 'line', sub);
      slider('الشفافية', 'op', 0.1, 0.8, 0.05, sub);
    } else {
      slider('حجم الممحاة', 'size', 4, 60, 1, sub);
      const lab = elem('label', 'sq-check', 'العودة للكتابة'), check = document.createElement('input');
      check.type = 'checkbox'; check.onchange = () => put({ returnToInk: check.checked });
      updates.push(() => { check.checked = style().returnToInk; }); lab.prepend(check); sub.append(lab);
    }
    panel.append(sub); root.append(panel);
    const sb = root.querySelector('.st-stylebtn');
    if (sb) { sb.setAttribute('aria-label', 'إعدادات ' + names[M.S.tool] + ' السريعة'); sb.title = sb.getAttribute('aria-label'); sb.onclick = e => { e.stopPropagation(); toggle(e.detail === 0, sb); }; }
    sync();
  }
  function sync() { if (panel) updates.forEach(f => f()); }
  function toggle(keyboard, source) {
    if (!panel) return;
    const open = panel.hidden; M.closePops(); if (!open) return;
    panel._anchor = source || root.querySelector('.st-tools [data-tool="' + M.S.tool + '"]');
    panel.hidden = false; panel._anchor?.setAttribute('aria-expanded', 'true');
    sync(); if (keyboard) panel.querySelector('button')?.focus();
  }
  root.addEventListener('st-rendered', build); M.on('style', sync);
  M.quickTools = { toggle }; build();
})();
