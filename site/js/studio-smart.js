/* MEDIXA Study Studio — smart study layer. Turns real selections of the lecture into: text-anchored highlights,
   source-linked flashcards, source-linked multiple-choice questions and study masks, and gives selected text (or a saved
   highlight) the actions ترجمة | بحث | شرح | نسخ. Everything is saved through the existing stores (cards/quiz in
   medixa.study.v1 + its scheduler, masks in medixa.occlusion.v1); nothing is invented: a card's citation is the real page,
   the real text rectangles and the quote the student selected, and a translation or explanation is only ever the
   server's own answer (shown as plain text) or an honest message. Question drafting stays manual.
   What leaves the browser, and only after the student presses a button:
   - «ترجمة» asks GET api/ai/status (no text; once per page load), then sends POST api/ai/translate {text, to} with the
     selected text only (at most 2000 characters; a longer selection is translated only after a second press, cut to 2000).
   - «اشرح» in the explain panel does the same with POST api/ai/explain {text, mode}.
   Both go to MEDIXA's own server (same origin, signed-in students only, Workers AI), which neither stores nor logs the text.
   - «افتح في Google Translate» and «بحث في الإنترنت» open Google in a new tab with the selected text in its address.
   «بحث في الملف» and «نسخ» stay on the device. */
(function () {
  'use strict';
  const M = window.MedixaStudio; if (!M) return;
  const C = M.C, S = M.S, $ = id => document.getElementById(id);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const src = new URLSearchParams(location.search).get('file'); if (!src) return;
  const docId = new URL(src, location.href).href;
  const HL = [['#f2c230', 'أصفر'], ['#7bd88f', 'أخضر'], ['#6fb1ff', 'أزرق'], ['#ff8fa3', 'وردي']];
  const MAX = 2000;                                   /* the server's limit per request (functions/_lib/ai.js MAX_CHARS) */
  const PHONE = matchMedia('(max-width: 720px)');     /* phones: panels are bottom sheets (studio-textactions.css) */
  const ICON = {
    tr: '<path d="M4 5h8M8 3v2M5.5 5c.8 3 3 5.5 6 7M10.5 5c-.8 3.5-3 6.5-6.5 8"/><path d="m13 21 4-9 4 9M14.5 18h5"/>',
    find: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    ex: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1V16h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10M7 14h6"/>',
    mcq: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .9-1 1.6v.4M12 17h.01"/>',
    mask: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h6M7 14h10"/>',
    del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><circle cx="11.5" cy="14" r="2.5"/><path d="m13.4 15.9 1.8 1.8"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>'
  };
  const svg = d => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';

  /* ---------- tools ---------- */
  M.registerTool('select', { down() { return false; }, move() {}, up() {} });
  let region = null;
  M.registerTool('region', {
    down(pg, e, p) { region = { pg, a: p, b: p }; },
    move(pg, e, p) { if (region) { region.b = p; M.paint(pg); } },
    up(pg, e, cancelled, p) {
      const r = region; region = null; M.paint(pg); if (!r || cancelled) return;
      const x0 = C.clamp01(Math.min(r.a[0], p[0])), y0 = C.clamp01(Math.min(r.a[1], p[1])), x1 = C.clamp01(Math.max(r.a[0], p[0])), y1 = C.clamp01(Math.max(r.a[1], p[1]));
      if ((x1 - x0) * pg.cssW < 12 || (y1 - y0) * pg.cssH < 12) return;
      show({ pageId: pg.n, rects: [[x0, y0, x1, y1]], quote: '', kind: 'region' });
    }
  });
  M.on('overlay', ({ pg, ctx }) => {
    if (!region || region.pg !== pg) return; const k = pg.ink.width / pg.totW, a = pg.px(Math.min(region.a[0], region.b[0]), Math.min(region.a[1], region.b[1])), b = pg.px(Math.max(region.a[0], region.b[0]), Math.max(region.a[1], region.b[1]));
    ctx.save(); ctx.setLineDash([6 * k, 4 * k]); ctx.strokeStyle = '#168c8c'; ctx.lineWidth = 2 * k; ctx.fillStyle = 'rgba(22,140,140,.12)'; ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.restore();
  });
  M.on('tool', t => {
    document.body.classList.toggle('st-selecting', t === 'select');
    if (t !== 'select' && t !== 'hand') hlClose(true);
    if (t !== 'select' && t !== 'region') hide(); else if (t === 'select') { selectHint(); checkNoText(); }
  });
  function selectHint() { try { if (localStorage.getItem('medixa.studio.selhint')) return; localStorage.setItem('medixa.studio.selhint', '1'); } catch { return; } M.banner('اضغط على سطر لتحديده، أو اضغط مطولاً واسحب لتحديد جزء. ثم اختر ترجمة أو بحث أو شرح أو تظليل أو بطاقة.', [['حسناً', () => {}]]); }
  function checkNoText() {
    const R = M.reader; if (!R) return; const vis = R.pages.filter(p => p.kind === 'src' && p.near);
    if (R.raster && !window.pdfjsLib) { M.banner('النص غير متاح الآن لأن مكتبة عرض PDF لم تُحمَّل. استعمل أداة «منطقة من الصفحة» لإنشاء بطاقة أو قناع.', [['حسناً', () => {}]]); return; }
    if (vis.length && vis.every(p => p.rendered && p.hasText === false)) M.banner('هذه الصفحات بلا نص قابل للتحديد (ملف ممسوح ضوئياً). لا نخمّن النص: استعمل أداة «منطقة من الصفحة» لإنشاء بطاقة أو قناع من الصورة.', [['حسناً', () => {}]]);
  }

  /* ---------- reading a selection into a source anchor ---------- */
  function lineMerge(rects) {
    const out = []; rects.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    for (const r of rects) {
      const last = out[out.length - 1], mid = (r[1] + r[3]) / 2;
      if (last && mid > last[1] && mid < last[3] && r[0] <= last[2] + 0.02) { last[0] = Math.min(last[0], r[0]); last[2] = Math.max(last[2], r[2]); last[1] = Math.min(last[1], r[1]); last[3] = Math.max(last[3], r[3]); }
      else out.push(r.slice());
    }
    return out;
  }
  /* quote: what a highlight / card stores (600 chars); text: the whole selection, for translate / explain / copy */
  function selectionAnchor() {
    const sel = getSelection(); if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0), node = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    const layer = node && node.closest && node.closest('.st-text'); if (!layer) return null;
    const p = layer.parentElement.__p; if (!p || !p.pdf) return null;
    const area = p.pdf.getBoundingClientRect(); if (area.width < 2) return null;
    let rects = [...range.getClientRects()].filter(q => q.width > 1 && q.height > 2 && q.right > area.left && q.left < area.right && q.bottom > area.top && q.top < area.bottom)
      .map(q => [C.clamp01((q.left - area.left) / area.width), C.clamp01((q.top - area.top) / area.height), C.clamp01((q.right - area.left) / area.width), C.clamp01((q.bottom - area.top) / area.height)]).filter(r => r[2] - r[0] > 0.002 && r[3] - r[1] > 0.002);
    if (!rects.length) return null;
    rects = lineMerge(rects).slice(0, 60);
    const text = sel.toString().replace(/\s+/g, ' ').trim();
    return { pageId: p.id, rects, quote: text.slice(0, 600), text: text.slice(0, 20000), kind: 'text', bbox: sel.getRangeAt(0).getBoundingClientRect() };
  }
  const sourceOf = a => ({ documentId: docId, documentVersion: M.S.docHash || '', pageId: a.pageId, rects: a.rects.map(r => r.map(n => +n.toFixed(5))), quote: a.quote || '' });
  const textOf = a => (a.text || a.quote || '').trim();

  /* ---------- floating action bar: ترجمة | بحث | شرح | نسخ | تظليل, then the study actions ---------- */
  let bar = null, cur = null;
  function ensureBar() { if (bar) return bar; bar = el('div', 'st-seltools'); bar.id = 'st-seltools'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'إجراءات النص المحدد'); bar.dir = 'rtl'; bar.hidden = true; bar.addEventListener('keydown', barKeys); document.body.append(bar); return bar; }
  /* buttons keep the text selection (no focus steal on mouse down); fn gets the button, for focus return */
  function actBtn(host, cls, label, text, fn, icon) {
    const x = el('button', 'st-sel-btn ' + cls); x.type = 'button'; x.setAttribute('aria-label', label); x.title = label;
    if (icon) x.innerHTML = svg(ICON[icon]); if (text) x.append(el('span', 'st-sel-lb', text));
    x.onmousedown = e => e.preventDefault(); x.onclick = () => fn(x); host.append(x); return x;
  }
  function show(a) {
    cur = a; menuClose(true); const b = ensureBar(); b.replaceChildren();
    const mk = (cls, label, text, fn, icon) => actBtn(b, cls, label, text, fn, icon);
    if (a.kind === 'text' && a.quote) {
      mk('st-sel-tr', 'ترجمة النص المحدد', 'ترجمة', x => openTranslate(a, x), 'tr');
      const f = mk('st-sel-find', 'بحث عن النص المحدد', 'بحث', x => menuToggle(a, x), 'find'); f.setAttribute('aria-haspopup', 'menu'); f.setAttribute('aria-expanded', 'false');
      if (explainShown()) mk('st-sel-ex', 'شرح النص المحدد', 'شرح', x => openExplain(a, x), 'ex');
      mk('st-sel-copy', 'نسخ النص المحدد', 'نسخ', () => { copyText(textOf(a)); hide(); }, 'copy');
    }
    if (a.kind === 'text') {
      const g = el('span', 'st-sel-grp'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', 'تظليل النص المحدد');
      const cap = el('span', 'st-sel-cap', 'تظليل'); cap.setAttribute('aria-hidden', 'true'); g.append(cap); b.append(g);
      for (const [c, n] of HL) { const x = actBtn(g, 'st-sel-hl', 'تظليل ' + n, '', () => highlight(a, c)); x.style.setProperty('--c', c); x.dataset.color = c; }
      b.append(sep());
    }
    mk('st-sel-card', 'بطاقة مراجعة', 'بطاقة', () => draft('card', a), 'card');
    mk('st-sel-mcq', 'سؤال اختيار من متعدد', 'سؤال', () => draft('mcq', a), 'mcq');
    if (a.pageId < C.BLANK_ID0) mk('st-sel-mask', 'قناع دراسة على هذا الجزء', 'قناع', () => mask(a), 'mask');
    mk('st-sel-x', 'إلغاء', '', () => { hide(); getSelection().removeAllRanges(); }, 'x');
    b.hidden = false; b.scrollLeft = 0;
    const r = a.kind === 'text' && a.bbox ? a.bbox : areaRect(a.pageId, a.rects);
    const w = b.offsetWidth || 260, h = b.offsetHeight || 52, lim = limits();
    let x = Math.max(8, Math.min(innerWidth - w - 8, (r.left + r.right) / 2 - w / 2)), y = r.top - h - 10;
    if (y < lim.top) y = r.bottom + 10;
    if (y + h > innerHeight - lim.bottom) y = Math.max(lim.top, innerHeight - lim.bottom - h);
    b.style.left = x + 'px'; b.style.top = y + 'px';
  }
  const sep = () => { const s = el('span', 'st-sel-sep'); s.setAttribute('aria-hidden', 'true'); return s; };
  function hide() { if (bar) bar.hidden = true; cur = null; menuClose(true); }
  /* arrow keys move along the toolbar (one Tab stop is enough for a row this long) */
  function barKeys(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    const list = [...bar.querySelectorAll('button')], i = list.indexOf(document.activeElement); if (i < 0) return;
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowLeft' ? 1 : -1) + list.length) % list.length;   /* RTL: left = next */
    e.preventDefault(); list[j].focus();
  }
  /* screen rectangle of page-area rects (a highlight / region) */
  function areaRect(pageId, rects) {
    const p = M.reader && M.reader.byId.get(pageId); if (!p || !p.pdf) return { left: innerWidth / 2, right: innerWidth / 2, top: innerHeight / 2, bottom: innerHeight / 2 };
    const q = p.pdf.getBoundingClientRect(), xs = rects.flatMap(r => [r[0], r[2]]), ys = rects.flatMap(r => [r[1], r[3]]);
    return { left: q.left + Math.min(...xs) * q.width, right: q.left + Math.max(...xs) * q.width, top: q.top + Math.min(...ys) * q.height, bottom: q.top + Math.max(...ys) * q.height };
  }
  /* room the floating parts must leave free: the header (+ the toolbar under it on wide screens, the page bar on phones)
     and, on phones, the drawing bar at the bottom */
  function limits() {
    const v = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0;
    const hdr = document.body.classList.contains('medixa-focus') ? 0 : (v('--st-hdr-h') || 56), tb = v('--st-tb-h');
    return PHONE.matches ? { top: hdr + (v('--st-pbar') || 0) + 8, bottom: tb + 8 } : { top: hdr + tb + 8, bottom: 8 };
  }
  let st = 0;
  document.addEventListener('selectionchange', () => { if (S.tool !== 'select') return; clearTimeout(st); st = setTimeout(() => { const a = selectionAnchor(); if (a) show(a); else if (cur && cur.kind === 'text') hide(); }, 180); });
  const OWN = '#st-seltools,.st-ta-panel,.st-ta-menu,.st-ta-pop,#st-ta-toast';
  let down = null;
  document.addEventListener('pointerdown', e => {
    down = { x: e.clientX, y: e.clientY };
    const t = e.target, inside = s => !!(t && t.closest && t.closest(s));
    if (bar && !bar.hidden && !inside(OWN + ',.st-text,canvas.ink')) hide();
    if (menu && !menu.hidden && !inside('.st-ta-menu') && !(menu._from && menu._from.contains(t))) menuClose(true);
    if (hp && !hp.hidden && !inside('#st-hlpop,.st-ta-menu')) hlClose(true);
  }, true);
  /* A tap on a saved text highlight (select / hand tools) opens its popover; in the select tool a tap on a line selects
     the whole line (iPad / Pencil), and long-press + drag still selects any range. */
  document.addEventListener('click', e => {
    if (S.tool !== 'select' && S.tool !== 'hand') return;
    const t = e.target; if (!t || !t.closest || t.closest(OWN + ',button,a,input,textarea,select,label,dialog,[contenteditable]')) return;
    const sel = getSelection(), moved = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8;
    if (!moved && (S.tool === 'hand' || !sel || sel.isCollapsed)) { const h = hlAt(e.clientX, e.clientY); if (h) { if (sel) sel.removeAllRanges(); hide(); hlOpen(h); return; } }
    if (S.tool !== 'select') return; const sp = t.closest('.st-text span'); if (!sp) return;
    if (sel && !sel.isCollapsed && sel.containsNode(sp, true)) return;
    const r = document.createRange(); r.selectNodeContents(sp); sel.removeAllRanges(); sel.addRange(r);
    const a = selectionAnchor(); if (a) show(a);
  });

  /* ---------- text actions: shared helpers ---------- */
  /* external pages open in a new tab through a real link (window.open with noopener returns null, which looks like a
     blocked popup); the reader itself never navigates away */
  function openExternal(u) { const a = el('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; document.body.append(a); a.click(); a.remove(); }
  const gtUrl = (text, to) => 'https://translate.google.com/?sl=auto&tl=' + to + '&op=translate&text=' + encodeURIComponent(text.slice(0, 4500));
  const loginHref = () => 'login.html?next=' + encodeURIComponent((location.pathname.split('/').pop() || 'pdf-notes.html') + location.search);
  /* same rule as the server (functions/_lib/ai.js detectLang): Arabic when more than 30 % of the letters are Arabic */
  function langOf(s) { const l = String(s).match(/\p{L}/gu) || []; return l.length && l.filter(c => /\p{Script=Arabic}/u.test(c)).length / l.length > 0.3 ? 'ar' : 'en'; }
  /* first MAX characters, ending on a word when one ends near the cut */
  function cut(s) { if (s.length <= MAX) return s; const t = s.slice(0, MAX), i = t.lastIndexOf(' '); return i > MAX - 200 ? t.slice(0, i) : t; }

  async function copyText(t, done) {
    let ok = false; const back = document.activeElement;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); ok = true; } } catch {}
    if (!ok) {   /* older Safari / no permission: the classic hidden textarea */
      const ta = el('textarea', 'st-ta-clip'); ta.value = t; ta.setAttribute('readonly', ''); ta.setAttribute('aria-hidden', 'true'); document.body.append(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch {} ta.remove(); if (back && back.focus) try { back.focus({ preventScroll: true }); } catch {}
    }
    toast(ok ? (done || 'نُسخ النص') : 'تعذّر النسخ. حدّد النص وانسخه يدوياً.');
    return ok;
  }
  let toastEl = null, toastT = 0;
  function toast(t, action) {
    if (!toastEl) { toastEl = el('div'); toastEl.id = 'st-ta-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); toastEl.hidden = true; document.body.append(toastEl); }
    toastEl.replaceChildren(el('span', '', t));
    if (action) { const b = el('button', 'st-ta-toast-b', action[0]); b.type = 'button'; b.onclick = () => { toastEl.hidden = true; action[1](); }; toastEl.append(b); }
    toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, action ? 5000 : 2200);
  }

  /* ---------- MEDIXA AI service (functions/_lib/ai.js) ---------- */
  let aiP = null, ai = null;     /* GET api/ai/status: asked once per page load, and only after a press */
  const NONE = () => ({ translate: false, explain: false, signedIn: false });
  function aiStatus() {
    if (aiP) return aiP;
    aiP = fetch('api/ai/status', { credentials: 'same-origin', cache: 'no-store' })
      .then(r => r.status === 404 ? NONE() : r.ok ? r.json().then(j => j && typeof j === 'object' && 'translate' in j ? { translate: j.translate === true, explain: j.explain === true, signedIn: j.signedIn === true } : NONE(), NONE) : Promise.reject(r.status))
      .then(v => (ai = v), () => { aiP = null; return null; });   /* offline / server error: not cached, the next press asks again */
    return aiP;
  }
  /* the شرح button is hidden once the server said it has no AI (status explain:false is never about signing in) */
  const explainShown = () => !(ai && ai.explain === false);
  async function aiPost(P, task, body) {
    if (P.ctl) P.ctl.abort(); const ctl = P.ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 45000);
    try {
      const r = await fetch('api/ai/' + task, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      let j = null; try { j = await r.json(); } catch {}
      return { status: r.status, j: j && typeof j === 'object' ? j : {} };
    } catch { return { status: 0, j: {} }; } finally { clearTimeout(t); if (P.ctl === ctl) P.ctl = null; }
  }
  /* one honest message per failure; again(first2000) repeats the request */
  function failure(P, r, again, first2000, extra) {
    const tx = P.kind === 'tx', s = r.status, e = r.j.error;
    if (s === 401) { if (ai) ai.signedIn = false; return { msg: tx ? 'سجّل الدخول لاستعمال الترجمة داخل MEDIXA.' : 'سجّل الدخول لاستعمال الشرح داخل MEDIXA.', acts: [loginLink(P), ...extra] }; }
    if (s === 503) { if (ai) ai.translate = ai.explain = false; return { msg: tx ? 'الترجمة الآلية غير مفعّلة على الموقع بعد.' : 'الشرح الآلي غير مفعّل على الموقع بعد.', acts: extra }; }
    if (s === 413) return { msg: 'النص المحدد أطول من حدّ الخدمة (2000 حرف في كل مرة).', acts: first2000 ? extra : [btn(P.pre + '-more', tx ? 'ترجم أول 2000 حرف فقط' : 'اشرح أول 2000 حرف فقط', () => again(true), true), ...extra] };
    if (s === 429) return { msg: 'كثرت الطلبات، حاول بعد دقائق.', acts: extra };
    if (s === 400 && e === 'empty') return { msg: 'لا يوجد في التحديد نص يمكن إرساله.', acts: extra };
    if (s === 502 && r.j.reason === 'quota') return { msg: 'انتهت حصة الخدمة لهذا اليوم على الموقع. حاول غداً.', acts: extra };
    return { msg: tx ? 'تعذّرت الترجمة الآن.' : 'تعذّر الشرح الآن.', acts: [btn(P.pre + '-retry', 'إعادة المحاولة', () => again(first2000), true), ...extra] };
  }

  /* ---------- panels (#st-tx, #st-explain): non-modal dialogs inside the viewport; bottom sheets on phones ---------- */
  function btn(id, text, fn, primary) { const b = el('button', 'st-ta-btn' + (primary ? ' st-ta-primary' : ''), text); b.type = 'button'; if (id) b.id = id; b.onmousedown = e => e.preventDefault(); b.onclick = fn; return b; }
  function loginLink(P) { const a = el('a', 'st-ta-btn st-ta-primary', 'تسجيل الدخول'); a.id = P.pre + '-login'; a.href = loginHref(); return a; }
  function seg(label, key, opts, val, onPick) {
    const g = el('div', 'st-ta-seg'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', label);
    for (const [v, t] of opts) {
      const b = el('button', 'st-ta-chip', t); b.type = 'button'; b.dataset[key] = v; b.setAttribute('aria-pressed', String(v === val)); b.onmousedown = e => e.preventDefault();
      b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); onPick(v); }; g.append(b);
    }
    return g;
  }
  function panel(P, title) {
    let d = $(P.id);
    if (!d) {
      d = el('div', 'st-ta-panel'); d.id = P.id; d.dir = 'rtl'; d.hidden = true; d.tabIndex = -1; d.setAttribute('role', 'dialog'); d.setAttribute('aria-labelledby', P.pre + '-t');
      document.body.append(d);
    }
    const head = el('div', 'st-ta-head'), h = el('h2', 'st-ta-title', title); h.id = P.pre + '-t';
    const x = el('button', 'st-ta-x'); x.type = 'button'; x.innerHTML = svg(ICON.x); x.setAttribute('aria-label', 'إغلاق ' + title); x.title = 'إغلاق'; x.onclick = () => closePanel(P);
    head.append(h, x); d.replaceChildren(head); P.el = d; return d;
  }
  function quoteView(text) { const q = el('p', 'st-ta-quote', text.length > 240 ? text.slice(0, 240) + '…' : text); q.dir = 'auto'; return q; }
  function slots(P, d) {
    P.msg = el('p', 'st-ta-msg'); P.msg.id = P.pre + '-msg'; P.msg.setAttribute('role', 'status'); P.msg.setAttribute('aria-live', 'polite');
    P.out = el('div', 'st-ta-out'); P.out.id = P.pre + '-out'; P.out.dir = 'auto'; P.out.hidden = true;
    P.acts = el('div', 'st-ta-acts'); P.acts.id = P.pre + '-acts'; d.append(P.msg, P.out, P.acts);
  }
  function render(P, s) {
    P.msg.textContent = s.msg || ''; P.msg.classList.toggle('st-ta-busy', !!s.busy); P.el.setAttribute('aria-busy', String(!!s.busy));
    P.out.hidden = !s.out; P.out.textContent = s.out || '';
    P.acts.replaceChildren(...(s.acts || []));
    if (P.go) P.go.disabled = !!s.busy;
    placeAgain(P.el);
  }
  const panels = [];
  function openPanel(P, from, a) {
    for (const o of panels) if (o !== P) closePanel(o, true);
    menuClose(true); hlClose(true);
    const d = P.el, was = !d.hidden; d.hidden = false;
    if (!was || (from && from.isConnected)) d._from = from && from.isConnected ? from : (document.activeElement !== document.body ? document.activeElement : null);
    const r = areaRect(a.pageId, a.rects);   /* from the page rects, so a scroll since the selection does not matter */
    d._rect = bar && !bar.hidden ? union(r, bar.getBoundingClientRect()) : r; place(d, d._rect);
    try { d.focus({ preventScroll: true }); } catch { d.focus(); }
  }
  function closePanel(P, quiet) {
    P.tok++; if (P.ctl) { P.ctl.abort(); P.ctl = null; }
    const d = P.el; if (!d || d.hidden) return; d.hidden = true; const f = d._from; d._from = null;
    if (!quiet && f && f.isConnected && f.getClientRects().length && f.closest && !f.closest('[hidden]')) try { f.focus({ preventScroll: true }); } catch {}
  }
  const union = (a, b) => ({ left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) });
  /* beside the anchor (below, else above), clamped to the viewport; phones: CSS bottom sheet, so no inline position */
  function place(d, r) {
    if (PHONE.matches || !r) { d.style.left = d.style.top = ''; return; }
    const w = d.offsetWidth, h = d.offsetHeight, lim = limits();
    const x = Math.max(8, Math.min(innerWidth - w - 8, (r.left + r.right) / 2 - w / 2));
    let y = r.bottom + 10; if (y + h > innerHeight - lim.bottom) y = r.top - h - 10;
    if (y < lim.top) y = Math.max(8, Math.min(lim.top, innerHeight - lim.bottom - h));
    d.style.left = x + 'px'; d.style.top = y + 'px';
  }
  /* content changed (a result came in): stay put while the card still fits, so it does not jump under the student's eyes */
  function placeAgain(d) {
    if (!d || d.hidden) return; const top = parseFloat(d.style.top);
    if (!PHONE.matches && top >= 0 && top + d.offsetHeight <= innerHeight - limits().bottom) return;
    place(d, d._rect);
  }
  const placeAll = () => { for (const P of panels) if (P.el && !P.el.hidden) place(P.el, P.el._rect); };
  addEventListener('resize', () => { placeAll(); if (hp && !hp.hidden) hlPlace(); if (menu && !menu.hidden && menu._from) place(menu, menu._from.getBoundingClientRect()); });
  PHONE.addEventListener && PHONE.addEventListener('change', placeAll);

  /* ----- ترجمة ----- */
  const TX = { id: 'st-tx', pre: 'st-tx', kind: 'tx', tok: 0, ctl: null, a: null, to: 'ar' }; panels.push(TX);
  function openTranslate(a, from) {
    TX.a = a; TX.to = langOf(textOf(a)) === 'ar' ? 'en' : 'ar';
    const d = panel(TX, 'ترجمة');
    d.append(quoteView(textOf(a)), seg('اتجاه الترجمة', 'to', [['ar', 'إلى العربية'], ['en', 'إلى الإنجليزية']], TX.to, v => { TX.to = v; runTranslate(false); }));
    slots(TX, d);
    TX.note = el('p', 'st-ta-note', 'يُرسل النص المحدد فقط إلى خدمة الترجمة في MEDIXA.'); TX.gnote = el('p', 'st-ta-note', 'زر Google يفتح موقع Google في تبويب جديد ويرسل إليه النص المحدد.'); TX.gnote.hidden = true;
    d.append(TX.note, TX.gnote);
    openPanel(TX, from, a); runTranslate(false);
  }
  async function runTranslate(first2000) {
    const P = TX, tok = ++P.tok, text = textOf(P.a);
    if (P.ctl) { P.ctl.abort(); P.ctl = null; }
    const google = () => btn('st-tx-google', 'افتح في Google Translate', () => openExternal(gtUrl(text, P.to)));
    const show_ = s => { if (tok !== P.tok) return; P.gnote.hidden = !(s.acts || []).some(b => b.id === 'st-tx-google'); render(P, s); };
    show_({ busy: true, msg: 'جارٍ التحقق من خدمة الترجمة…' });
    const sv = await aiStatus(); if (tok !== P.tok) return;
    if (!sv) return show_({ msg: 'تعذّر الاتصال بخادم MEDIXA الآن. تحقّق من الإنترنت ثم أعد المحاولة.', acts: [btn('st-tx-retry', 'إعادة المحاولة', () => runTranslate(first2000), true), google()] });
    if (!sv.translate) return show_({ msg: 'الترجمة الآلية غير مفعّلة على الموقع بعد.', acts: [google()] });
    if (!sv.signedIn) return show_({ msg: 'سجّل الدخول لاستعمال الترجمة داخل MEDIXA.', acts: [loginLink(P), google()] });
    if (text.length > MAX && !first2000) return show_({ msg: 'النص المحدد طويل (' + text.length + ' حرفاً)، والخدمة تترجم 2000 حرف في كل مرة.', acts: [btn('st-tx-more', 'ترجم أول 2000 حرف فقط', () => runTranslate(true), true)] });
    show_({ busy: true, msg: 'جارٍ الترجمة…' });
    const r = await aiPost(P, 'translate', { text: cut(text), to: P.to }); if (tok !== P.tok) return;
    const out = r.status === 200 && r.j.ok === true && typeof r.j.text === 'string' ? r.j.text.trim() : '';
    if (out) return show_({ msg: 'ترجمة آلية ' + ((r.j.to || P.to) === 'en' ? 'إلى الإنجليزية' : 'إلى العربية') + (first2000 ? ' لأول 2000 حرف' : '') + '؛ راجعها مع المحاضرة.', out, acts: [btn('st-tx-copy', 'نسخ الترجمة', () => copyText(out, 'نُسخت الترجمة'))] });
    const f = failure(P, r, runTranslate, first2000, []);
    if (r.status === 401 || r.status === 503 || r.status === 0 || r.status >= 500) f.acts.push(google());
    show_(f);
  }

  /* ----- شرح ----- */
  const EX = { id: 'st-explain', pre: 'st-ex', kind: 'ex', tok: 0, ctl: null, a: null, mode: 'short', go: null }; panels.push(EX);
  function openExplain(a, from) {
    EX.a = a; const d = panel(EX, 'شرح');
    const row = el('div', 'st-ta-row');
    EX.go = btn('st-ex-go', 'اشرح', () => runExplain(false), true);
    row.append(seg('طول الشرح', 'mode', [['short', 'مختصر'], ['detailed', 'مفصّل']], EX.mode, v => { EX.mode = v; }), EX.go);
    d.append(quoteView(textOf(a)), row); slots(EX, d);
    d.append(el('p', 'st-ta-note', 'الشرح آلي وقد يخطئ؛ راجع المحاضرة.'), el('p', 'st-ta-note', 'يُرسل النص المحدد فقط.'));
    /* nothing is sent before «اشرح»; a status already known this page load is said straight away */
    render(EX, ai && !ai.explain ? { msg: 'الشرح الآلي غير مفعّل على الموقع بعد.' } : ai && !ai.signedIn ? { msg: 'سجّل الدخول لاستعمال الشرح داخل MEDIXA.', acts: [loginLink(EX)] } : {});
    openPanel(EX, from, a);
  }
  async function runExplain(first2000) {
    const P = EX, tok = ++P.tok, text = textOf(P.a), mode = P.mode;
    if (P.ctl) { P.ctl.abort(); P.ctl = null; }
    const show_ = s => { if (tok === P.tok) render(P, s); };
    show_({ busy: true, msg: 'جارٍ التحقق من خدمة الشرح…' });
    const sv = await aiStatus(); if (tok !== P.tok) return;
    if (!sv) return show_({ msg: 'تعذّر الاتصال بخادم MEDIXA الآن. تحقّق من الإنترنت ثم أعد المحاولة.', acts: [btn('st-ex-retry', 'إعادة المحاولة', () => runExplain(first2000), true)] });
    if (!sv.explain) return show_({ msg: 'الشرح الآلي غير مفعّل على الموقع بعد.' });
    if (!sv.signedIn) return show_({ msg: 'سجّل الدخول لاستعمال الشرح داخل MEDIXA.', acts: [loginLink(P)] });
    if (text.length > MAX && !first2000) return show_({ msg: 'النص المحدد طويل (' + text.length + ' حرفاً)، والخدمة تشرح 2000 حرف في كل مرة.', acts: [btn('st-ex-more', 'اشرح أول 2000 حرف فقط', () => runExplain(true), true)] });
    show_({ busy: true, msg: mode === 'detailed' ? 'جارٍ إعداد شرح مفصّل…' : 'جارٍ إعداد شرح مختصر…' });
    const r = await aiPost(P, 'explain', { text: cut(text), mode }); if (tok !== P.tok) return;
    const out = r.status === 200 && r.j.ok === true && typeof r.j.text === 'string' ? r.j.text.trim() : '';
    if (out) return show_({ msg: ((r.j.mode || mode) === 'detailed' ? 'شرح مفصّل' : 'شرح مختصر') + (first2000 ? ' لأول 2000 حرف' : '') + ':', out, acts: [btn('st-ex-copy', 'نسخ', () => copyText(out, 'نُسخ الشرح'))] });
    show_(failure(P, r, runExplain, first2000, []));
  }

  /* ----- بحث: in this file (the find card) or on the web ----- */
  let menu = null;
  function menuToggle(a, from) {
    if (menu && !menu.hidden && menu._from === from) return menuClose();
    if (!menu) {
      menu = el('div', 'st-ta-menu'); menu.id = 'st-ta-findmenu'; menu.dir = 'rtl'; menu.hidden = true; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'بحث عن النص المحدد');
      menu.addEventListener('keydown', e => {
        const list = [...menu.querySelectorAll('[role=menuitem]')], i = list.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length].focus(); }
        else if (e.key === 'Tab') menuClose(true);
      });
      document.body.append(menu);
    }
    const q = textOf(a), item = (id, icon, text, fn) => { const b = el('button', 'st-ta-mi'); b.type = 'button'; b.id = id; b.setAttribute('role', 'menuitem'); b.innerHTML = svg(ICON[icon]); b.append(el('span', '', text)); b.onmousedown = e => e.preventDefault(); b.onclick = fn; return b; };
    const note = el('p', 'st-ta-note', 'بحث الإنترنت يفتح Google في تبويب جديد بالنص المحدد.'); note.setAttribute('role', 'presentation');
    menu.replaceChildren(
      item('st-ta-find-file', 'doc', 'بحث في الملف', () => { menuClose(true); hide(); hlClose(true); findInFile(q); }),
      item('st-ta-find-web', 'web', 'بحث في الإنترنت', () => { menuClose(); openExternal('https://www.google.com/search?q=' + encodeURIComponent(q.slice(0, 300))); }),
      note);
    if (menu._from && menu._from !== from) menu._from.setAttribute('aria-expanded', 'false');
    menu._from = from; from.setAttribute('aria-expanded', 'true'); menu.hidden = false; place(menu, from.getBoundingClientRect());
    try { menu.querySelector('[role=menuitem]').focus({ preventScroll: true }); } catch {}
  }
  function menuClose(quiet) {
    if (!menu || menu.hidden) return; menu.hidden = true; const f = menu._from; menu._from = null;
    if (f) { f.setAttribute('aria-expanded', 'false'); if (!quiet && f.isConnected && f.getClientRects().length) try { f.focus({ preventScroll: true }); } catch {} }
  }
  /* the find card searches the PDF's own text; a long quote is cut to <= 80 characters, on a word when possible */
  function findInFile(q) {
    const F = M.search || window.MedixaSearch; if (!F || !F.open) { M.banner('البحث في الملف غير متاح الآن.', [['حسناً', () => {}]]); return; }
    let s = q.replace(/\s+/g, ' ').trim(); if (s.length > 80) { const t = s.slice(0, 80), i = t.lastIndexOf(' '); s = i >= 40 ? t.slice(0, i) : t; }
    F.open(s);
  }

  /* ---------- a saved text highlight: tap it (select / hand tools) for colour, strength, delete and its text actions ---------- */
  function pageAt(x, y) {
    const R = M.reader; if (!R) return null;
    for (const p of R.pages) { if (p.kind !== 'src' || !p.pdf) continue; const q = p.pdf.getBoundingClientRect(); if (x >= q.left && x <= q.right && y >= q.top && y <= q.bottom) return { p, q }; }
    return null;
  }
  function hlAt(x, y) {
    const at = pageAt(x, y); if (!at) return null; const { p, q } = at; if (q.width < 2) return null;
    const u = (x - q.left) / q.width, v = (y - q.top) / q.height, pu = 3 / q.width, pv = 3 / q.height;
    for (let i = S.items.length - 1; i >= 0; i--) {   /* the topmost wins */
      const s = S.items[i]; if (!s || s.tool !== 'texthl' || s.page !== p.id || !Array.isArray(s.rects)) continue;
      if (s.rects.some(r => u >= r[0] - pu && u <= r[2] + pu && v >= r[1] - pv && v <= r[3] + pv)) return s;
    }
    return null;
  }
  const itemById = id => S.items.find(x => x && x.id === id);
  /* one undoable step, the same edit op as studio-tools.js (absent fields recorded as null so undo removes them again) */
  function editHl(id, props) {
    const i = S.items.findIndex(x => x && x.id === id); if (i < 0) return false;
    const s = S.items[i], p = {}; for (const k of Object.keys(props)) if (s[k] !== props[k]) p[k] = props[k];
    if (!Object.keys(p).length) return false; p.rev = (s.rev || 1) + 1;
    const before = {}; for (const k of Object.keys(p)) before[k] = s[k] === undefined ? null : s[k];
    const n = Object.assign({}, s, p); if (!C.validStroke(n)) return false;
    S.items[i] = n; M.rebuildIndexPage(s.page); M.invalidate(s.page); M.commit([{ k: 'edit', id, before, after: p }]); return true;
  }
  let hp = null, hpId = null, hpOrig = null;
  const opOf = s => (typeof s.op === 'number' ? s.op : 0.35);
  function hlOpen(s) {
    hlClose(true); menuClose(true);
    if (!hp) {
      hp = el('div', 'st-ta-pop'); hp.id = 'st-hlpop'; hp.dir = 'rtl'; hp.hidden = true; hp.tabIndex = -1; hp.setAttribute('role', 'dialog'); hp.setAttribute('aria-labelledby', 'st-hlpop-t');
      document.body.append(hp);
    }
    hpId = s.id; hpOrig = null; hp.replaceChildren();
    const head = el('div', 'st-ta-head'), h = el('h2', 'st-ta-title', 'تظليل محفوظ'); h.id = 'st-hlpop-t';
    const x = el('button', 'st-ta-x'); x.type = 'button'; x.innerHTML = svg(ICON.x); x.setAttribute('aria-label', 'إغلاق'); x.title = 'إغلاق'; x.onclick = () => hlClose();
    head.append(h, x);
    const sw = el('div', 'st-hp-colors'); sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'لون التظليل');
    for (const [c, n] of HL) { const b = el('button', 'st-hp-sw'); b.type = 'button'; b.dataset.color = c; b.style.setProperty('--c', c); b.setAttribute('aria-label', 'لون ' + n); b.title = n; b.onclick = () => { editHl(hpId, { color: c }); }; sw.append(b); }
    const lab = el('label', 'st-hp-op'), range = el('input'), outv = el('output', 'st-hp-opv');
    lab.append(el('span', '', 'شدة التظليل')); range.type = 'range'; range.id = 'st-hp-op'; range.min = '0.1'; range.max = '0.9'; range.step = '0.05'; outv.id = 'st-hp-opv'; outv.setAttribute('for', 'st-hp-op');
    range.oninput = () => {   /* live preview while dragging; the release is one undo step */
      const i = S.items.findIndex(q => q && q.id === hpId); if (i < 0) return; if (!hpOrig) hpOrig = S.items[i];
      const v = Math.round(+range.value * 100) / 100; S.items[i] = Object.assign({}, hpOrig, { op: v }); M.invalidate(hpOrig.page); outv.textContent = Math.round(v * 100) + '%';
    };
    range.onchange = () => { const v = Math.round(+range.value * 100) / 100; restorePreview(); editHl(hpId, { op: v }); };
    lab.append(range, outv);
    const acts = el('div', 'st-hp-acts'), q = (s.quote || '').trim();
    const anchor = () => { const it = itemById(hpId); return it && { pageId: it.page, rects: it.rects, quote: it.quote || '', text: it.quote || '', kind: 'text', saved: true }; };
    if (q) {
      actBtn(acts, 'st-hp-tr', 'ترجمة نص التظليل', 'ترجمة', () => { const a = anchor(); if (a) openTranslate(a, null); }, 'tr').id = 'st-hp-tr';
      if (explainShown()) actBtn(acts, 'st-hp-ex', 'شرح نص التظليل', 'شرح', () => { const a = anchor(); if (a) openExplain(a, null); }, 'ex').id = 'st-hp-ex';
      const f = actBtn(acts, 'st-hp-find', 'بحث عن نص التظليل', 'بحث', b => { const a = anchor(); if (a) menuToggle(a, b); }, 'find'); f.id = 'st-hp-find'; f.setAttribute('aria-haspopup', 'menu'); f.setAttribute('aria-expanded', 'false');
    }
    actBtn(acts, 'st-hp-del', 'حذف التظليل', 'حذف', () => { const id = hpId; hlClose(true); const ops = M.removeItems([id]); if (ops.length) { M.commit(ops); toast('حُذف التظليل.', ['تراجع', () => M.undo()]); } }, 'del').id = 'st-hp-del';
    hp.append(head, sw, lab, acts);
    hlSync(); hp.hidden = false; hp._from = document.activeElement !== document.body ? document.activeElement : null; hlPlace();
    try { hp.focus({ preventScroll: true }); } catch {}
  }
  function hlSync() {
    if (!hp || !hpId) return; const s = itemById(hpId); if (!s) return hlClose(true);
    hp.querySelectorAll('.st-hp-sw').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color === s.color)));
    const v = opOf(s), r = $('st-hp-op'), o = $('st-hp-opv'); if (r && !hpOrig) r.value = String(v); if (o && !hpOrig) o.textContent = Math.round(v * 100) + '%';
  }
  function hlPlace() {
    const s = itemById(hpId); if (!s || !hp) return; const r = areaRect(s.page, s.rects);
    if (!PHONE.matches && (r.bottom < 0 || r.top > innerHeight)) return hlClose(true);   /* scrolled away */
    hp._rect = r; place(hp, r);
  }
  function restorePreview() { if (!hpOrig) return; const i = S.items.findIndex(q => q && q.id === hpOrig.id); if (i >= 0) S.items[i] = hpOrig; M.invalidate(hpOrig.page); hpOrig = null; }
  function hlClose(quiet) {
    if (!hp || hp.hidden) return; restorePreview(); hp.hidden = true; hpId = null; menuClose(true);
    const f = hp._from; hp._from = null; if (!quiet && f && f.isConnected && f.getClientRects().length) try { f.focus({ preventScroll: true }); } catch {}
  }
  M.on('change', hlSync); M.on('select-refresh', hlSync);
  let scrollRaf = 0;
  addEventListener('scroll', () => { if (!hp || hp.hidden || PHONE.matches || scrollRaf) return; scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; if (hp && !hp.hidden) hlPlace(); }); }, { passive: true, capture: true });

  /* Escape closes the topmost of ours (menu, highlight popover, panel, then the action bar) and gives focus back */
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const t = e.target, mine = t === document.body || t === document.documentElement || !!(t && t.closest && t.closest(OWN));
    if (!mine) return;
    if (menu && !menu.hidden) menuClose();
    else if (hp && !hp.hidden) hlClose();
    else { const P = panels.find(x => x.el && !x.el.hidden && (x.el.contains(t) || !panels.some(y => y.el && !y.el.hidden && y.el.contains(t)))); if (P) closePanel(P); else if (bar && !bar.hidden) { hide(); return; } else return; }
    e.preventDefault(); e.stopPropagation();
  }, true);

  /* ---------- actions ---------- */
  function highlight(a, color) {
    const xs = a.rects.flatMap(r => [r[0], r[2]]), ys = a.rects.flatMap(r => [r[1], r[3]]);
    const s = { id: C.newId(), v: 2, rev: 1, page: a.pageId, tool: 'texthl', color, width: 3, points: [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], rects: a.rects.map(r => r.map(n => +n.toFixed(5))), quote: a.quote };
    M.commit([M.addItem(s)]); getSelection().removeAllRanges(); hide();
  }
  function mask(a) {
    const api = window.medixaOcclusion; if (!api) { M.banner('أداة الأقنعة غير جاهزة بعد. أعد المحاولة بعد لحظات.', [['حسناً', () => {}]]); return; }
    let n = 0, bad = 0; for (const r of a.rects.slice(0, 8)) { const pad = 0.004, x = Math.max(0, r[0] - pad), y = Math.max(0, r[1] - pad), w = Math.min(1 - x, r[2] - r[0] + 2 * pad), h = Math.min(1 - y, r[3] - r[1] + 2 * pad); if (api.add({ page: a.pageId, x, y, w, h })) n++; else bad++; }
    getSelection().removeAllRanges(); hide();
    M.banner(n ? 'أُضيف ' + n + ' قناع دراسة. اضغط على القناع لكشفه، أو Alt + نقر للحذف. (القناع للتدريب فقط وليس حجباً آمناً للمحتوى.)' : 'تعذر حفظ القناع (راجع حالة الحفظ).', [['حسناً', () => {}]]);
  }

  /* ---------- draft dialog (card / question) ---------- */
  const DKEY = 'medixa.studio.draft.v1:' + docId;
  const saveDraftState = d => { try { sessionStorage.setItem(DKEY, JSON.stringify(d)); } catch {} };
  const clearDraftState = () => { try { sessionStorage.removeItem(DKEY); } catch {} };
  function draft(kind, a, restore) {
    hide(); const old = $('st-draft'); if (old) old.remove();
    const d = el('dialog', 'st-dlg st-draft'); d.id = 'st-draft'; d.setAttribute('aria-labelledby', 'st-draft-t');
    const h = el('h2', '', kind === 'card' ? 'بطاقة مراجعة جديدة' : 'سؤال اختيار من متعدد'); h.id = 'st-draft-t'; d.append(h);
    const cite = el('p', 'st-cite'); cite.append(el('strong', '', 'المصدر: '), document.createTextNode(a.pageId >= C.BLANK_ID0 ? 'صفحة فارغة' : 'صفحة ' + a.pageId)); if (a.quote) cite.append(document.createTextNode(' — «' + a.quote.slice(0, 160) + (a.quote.length > 160 ? '…' : '') + '»')); else cite.append(document.createTextNode(' — منطقة من الصورة'));
    d.append(cite);
    const field = (id, label, tag, val, rows) => { const l = el('label', 'st-field'); l.append(label); const i = document.createElement(tag); i.id = id; if (rows) i.rows = rows; i.maxLength = 2000; i.value = val || ''; i.dir = 'auto'; l.append(i); d.append(l); return i; };
    const R = restore || {}; let f;
    if (kind === 'card') {
      f = { q: field('st-d-q', 'الأمام (السؤال)', 'textarea', R.q, 3), a: field('st-d-a', 'الخلف (الإجابة)', 'textarea', R.a !== undefined ? R.a : a.quote, 3) };
      if (a.quote && window.MedixaTextCards) { const cz = el('button', 'st-btn', 'املأ بنمط الحذف (Cloze)'); cz.type = 'button'; cz.id = 'st-d-cloze'; cz.onclick = () => { const c = MedixaTextCards.cloze(a.quote); if (c) { f.q.value = c.question; f.a.value = c.answer; touch(); } else err('لا توجد كلمة طويلة تكفي لنمط الحذف في هذا النص.'); }; d.append(cz); }
    } else {
      f = { q: field('st-d-q', 'نص السؤال', 'textarea', R.q, 3), opts: [], x: null };
      const fs = el('fieldset', 'st-opts-set'); fs.append(el('legend', '', 'الخيارات (اختر الصحيح)'));
      ['A', 'B', 'C', 'D'].forEach((L, i) => { const row = el('div', 'st-opt-row'); const rd = document.createElement('input'); rd.type = 'radio'; rd.name = 'st-correct'; rd.value = i; rd.id = 'st-d-c' + i; rd.setAttribute('aria-label', 'الخيار ' + L + ' هو الصحيح'); if (R.c === i) rd.checked = true; const t = document.createElement('input'); t.type = 'text'; t.id = 'st-d-o' + i; t.maxLength = 500; t.dir = 'auto'; t.placeholder = 'الخيار ' + L; t.value = (R.o && R.o[i]) || ''; t.setAttribute('aria-label', 'نص الخيار ' + L); row.append(rd, t); fs.append(row); f.opts.push({ rd, t }); });
      d.append(fs); f.x = field('st-d-x', 'الشرح (اختياري، يظهر بعد الإجابة)', 'textarea', R.x !== undefined ? R.x : a.quote, 2);
      const ai = el('p', 'st-ai-note', 'توليد الأسئلة بالذكاء الاصطناعي غير متاح حالياً (لا خادم مُعَدّ له)، لذلك تكتب السؤال بنفسك. لا يُرسَل شيء من المحاضرة إلى أي جهة.'); ai.id = 'st-ai-note'; d.append(ai);
    }
    d.append(el('p', 'st-note-line', kind === 'card' ? 'تُحفظ البطاقة في مراجعتك الخاصة وتدخل جدول التكرار المتباعد.' : 'يُحفظ السؤال في اختباراتك الخاصة (للنشر العام يلزم مسار النشر المعتمد للمشرفين).'));
    const msg = el('p', 'st-err'); msg.setAttribute('role', 'alert'); msg.id = 'st-d-err'; d.append(msg);
    const err = t => { msg.textContent = t; };
    const row = el('div', 'st-cust-row'); const ok = el('button', 'st-btn st-ok', 'حفظ'); ok.type = 'button'; ok.id = 'st-d-save'; const no = el('button', 'st-btn', 'إلغاء'); no.type = 'button'; no.id = 'st-d-cancel'; row.append(ok, no); d.append(row);
    const state = () => kind === 'card' ? { kind, a, q: f.q.value, a2: f.a.value } : { kind, a, q: f.q.value, o: f.opts.map(x => x.t.value), c: f.opts.findIndex(x => x.rd.checked), x: f.x.value };
    function touch() { const s = state(); saveDraftState({ kind, anchor: stripBBox(a), fields: kind === 'card' ? { q: s.q, a: s.a2 } : { q: s.q, o: s.o, c: s.c, x: s.x } }); }
    d.addEventListener('input', touch); d.addEventListener('change', touch);
    no.onclick = () => { clearDraftState(); d.close(); };
    ok.onclick = () => {
      err(''); const page = a.pageId, source = sourceOf(a);
      if (kind === 'card') {
        const q = f.q.value.trim(), an = f.a.value.trim(); if (!q || !an) return err('اكتب الأمام والخلف قبل الحفظ.');
        const card = window.MedixaStudyStore && MedixaStudyStore.addCard({ question: q, answer: an, page, source }); if (!card) return err('تعذر حفظ البطاقة (راجع حالة الحفظ في الأعلى).');
        clearDraftState(); d.close(); M.banner('حُفظت البطاقة وأُضيفت إلى المراجعة.', [['فتح البطاقات', () => MedixaStudyStore.open('cards')], ['حسناً', () => {}]]);
      } else {
        const q = f.q.value.trim(), opts = f.opts.map(x => x.t.value.trim()), c = f.opts.findIndex(x => x.rd.checked);
        if (!q || q.length < 3) return err('اكتب نص السؤال.'); if (opts.some(o => !o)) return err('املأ الخيارات الأربعة.');
        if (new Set(opts.map(o => o.toLowerCase())).size !== 4) return err('الخيارات يجب أن تكون مختلفة.'); if (c < 0) return err('اختر خياراً واحداً صحيحاً.');
        const item = window.MedixaStudyStore && MedixaStudyStore.addQuiz({ question: q, options: opts, correct: c, page, explanation: f.x.value.trim(), source }); if (!item) return err('تعذر حفظ السؤال (راجع حالة الحفظ في الأعلى).');
        clearDraftState(); d.close(); M.banner('حُفظ السؤال في اختباراتك.', [['فتح الاختبارات', () => MedixaStudyStore.open('quiz')], ['حسناً', () => {}]]);
      }
    };
    document.body.append(d); d.addEventListener('close', () => d.remove()); d.showModal(); touch(); getSelection().removeAllRanges();
  }
  const stripBBox = a => ({ pageId: a.pageId, rects: a.rects, quote: a.quote, kind: a.kind });
  /* an unfinished draft survives a reload */
  M.on('init', () => { try { const v = JSON.parse(sessionStorage.getItem(DKEY) || 'null'); if (v && v.anchor && Array.isArray(v.anchor.rects)) setTimeout(() => M.banner('لديك مسودة ' + (v.kind === 'card' ? 'بطاقة' : 'سؤال') + ' غير محفوظة.', [['متابعة', () => draft(v.kind, v.anchor, v.fields ? (v.kind === 'card' ? { q: v.fields.q, a: v.fields.a } : v.fields) : null)], ['حذفها', clearDraftState]]), 1500); } catch {} });

  /* ---------- go back to the exact source ---------- */
  function flash(p, rects) {
    p.el.querySelectorAll('.st-src-flash').forEach(x => x.remove());
    rects.forEach(r => { const f = el('div', 'st-src-flash'); f.style.setProperty('--x', r[0]); f.style.setProperty('--y', r[1]); f.style.setProperty('--w', r[2] - r[0]); f.style.setProperty('--h', r[3] - r[1]); p.el.append(f); setTimeout(() => f.remove(), 2600); });
  }
  function openSource(source) {
    const R = M.reader, note = t => M.banner(t, [['حسناً', () => {}]]);
    if (!source || typeof source !== 'object') return note('لا يوجد مصدر محفوظ لهذا العنصر.');
    if (source.documentId && source.documentId !== docId) return note('هذا العنصر يخص ملفاً آخر. افتح ذلك الملف من علامات التبويب.');
    const p = R.byId.get(source.pageId), q = source.quote ? ' المقتطف المحفوظ: «' + source.quote.slice(0, 200) + '»' : '';
    if (!p) return note('الصفحة ' + source.pageId + ' لم تعد موجودة في هذا الملف، فغالباً حُدِّث ملف المحاضرة.' + q);
    R.goto(p.id);
    const rects = Array.isArray(source.rects) ? source.rects.filter(r => Array.isArray(r) && r.length === 4 && r.every(n => typeof n === 'number')) : [];
    setTimeout(() => { if (rects.length) flash(p, rects); }, 600);
    if (source.documentVersion && M.S.docHash && source.documentVersion !== M.S.docHash) note('تغيّر ملف المحاضرة منذ إنشاء هذا العنصر، لذلك قد لا يطابق الموضع تماماً.' + q);
  }
  /* add a "المنطقة" button next to the panel's own "المصدر" button for items that carry an anchor */
  function decorate() {
    const c = $('study-content'); if (!c || !window.MedixaStudyStore) return;
    c.querySelectorAll('.study-item').forEach(item => {
      if (item.querySelector('[data-st-src]')) return; const del = item.querySelector('[data-delete]'); if (!del) return;
      const [kind, idv] = del.dataset.delete.split(':'), it = MedixaStudyStore.find(kind, idv); if (!it || !it.source) return;
      const b = el('button', '', 'المنطقة'); b.type = 'button'; b.dataset.stSrc = kind + ':' + idv; b.title = 'افتح مكان المصدر في الصفحة'; b.onclick = e => { e.stopPropagation(); $('study-panel').classList.remove('open'); openSource(it.source); }; del.before(b);
    });
  }
  const sc = $('study-content'); if (sc) new MutationObserver(decorate).observe(sc, { childList: true });
  M.smart = { openSource, selectionAnchor, highlight, draft, show, hide, translate: openTranslate, explain: openExplain, copy: copyText, find: findInFile, highlightAt: hlAt, openHighlight: hlOpen, closeHighlight: hlClose, aiStatus };
})();
