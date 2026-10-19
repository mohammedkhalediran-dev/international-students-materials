/* MEDIXA Study Studio — smart study layer. Turns real selections of the lecture into: text-anchored highlights,
   source-linked flashcards, source-linked multiple-choice questions and study masks. Everything is saved through the
   existing stores (cards/quiz in medixa.study.v1 + its scheduler, masks in medixa.occlusion.v1); nothing is invented:
   a card's citation is the real page, the real text rectangles and the quote the student selected. Question drafting is
   manual (no AI backend is configured); nothing is sent anywhere. */
(function () {
  'use strict';
  const M = window.MedixaStudio; if (!M) return;
  const C = M.C, S = M.S, $ = id => document.getElementById(id);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const src = new URLSearchParams(location.search).get('file'); if (!src) return;
  const docId = new URL(src, location.href).href;
  const HL = [['#f2c230', 'أصفر'], ['#7bd88f', 'أخضر'], ['#6fb1ff', 'أزرق'], ['#ff8fa3', 'وردي']];

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
  M.on('tool', t => { document.body.classList.toggle('st-selecting', t === 'select'); if (t !== 'select' && t !== 'region') hide(); else if (t === 'select') { selectHint(); checkNoText(); } });
  function selectHint() { try { if (localStorage.getItem('medixa.studio.selhint')) return; localStorage.setItem('medixa.studio.selhint', '1'); } catch { return; } M.banner('اضغط على سطر لتحديده، أو اضغط مطولاً واسحب لتحديد جزء. ثم اختر «ترجمة» أو تظليل أو بطاقة.', [['حسناً', () => {}]]); }
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
    const quote = sel.toString().replace(/\s+/g, ' ').trim().slice(0, 600);
    return { pageId: p.id, rects, quote, kind: 'text', bbox: sel.getRangeAt(0).getBoundingClientRect() };
  }
  const sourceOf = a => ({ documentId: docId, documentVersion: M.S.docHash || '', pageId: a.pageId, rects: a.rects.map(r => r.map(n => +n.toFixed(5))), quote: a.quote || '' });

  /* ---------- floating action bar ---------- */
  let bar = null, cur = null;
  function ensureBar() { if (bar) return bar; bar = el('div', 'st-seltools'); bar.id = 'st-seltools'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'إجراءات النص المحدد'); bar.hidden = true; document.body.append(bar); return bar; }
  function show(a) {
    cur = a; const b = ensureBar(); b.replaceChildren();
    const mk = (cls, label, text, fn) => { const x = el('button', 'st-sel-btn ' + cls, text); x.type = 'button'; x.setAttribute('aria-label', label); x.title = label; x.onmousedown = e => e.preventDefault(); x.onclick = fn; b.append(x); return x; };
    if (a.kind === 'text') for (const [c, n] of HL) { const x = mk('st-sel-hl', 'تظليل ' + n, '', () => highlight(a, c)); x.style.background = c; x.dataset.color = c; }
    if (a.kind === 'text' && a.quote) mk('st-sel-tr', 'ترجمة إلى العربية', 'ترجمة', () => translate(a));
    mk('st-sel-card', 'بطاقة مراجعة', 'بطاقة', () => draft('card', a));
    mk('st-sel-mcq', 'سؤال اختيار من متعدد', 'سؤال', () => draft('mcq', a));
    if (a.pageId < C.BLANK_ID0) mk('st-sel-mask', 'قناع دراسة على هذا الجزء', 'قناع', () => mask(a));
    mk('st-sel-x', 'إلغاء', '✕', () => { hide(); getSelection().removeAllRanges(); });
    b.hidden = false;
    const r = a.kind === 'text' && a.bbox ? a.bbox : (() => { const p = M.reader.byId.get(a.pageId), q = p.pdf.getBoundingClientRect(), rr = a.rects[0]; return { left: q.left + rr[0] * q.width, right: q.left + rr[2] * q.width, top: q.top + rr[1] * q.height, bottom: q.top + rr[3] * q.height }; })();
    const w = b.offsetWidth || 260, h = b.offsetHeight || 52;
    let x = Math.max(8, Math.min(innerWidth - w - 8, (r.left + r.right) / 2 - w / 2)), y = r.top - h - 10; if (y < 70) y = Math.min(innerHeight - h - 80, r.bottom + 10);
    b.style.left = x + 'px'; b.style.top = y + 'px';
  }
  function hide() { if (bar) bar.hidden = true; cur = null; }
  let st = 0;
  document.addEventListener('selectionchange', () => { if (S.tool !== 'select') return; clearTimeout(st); st = setTimeout(() => { const a = selectionAnchor(); if (a) show(a); else if (cur && cur.kind === 'text') hide(); }, 180); });
  document.addEventListener('pointerdown', e => { if (bar && !bar.hidden && !e.target.closest('#st-seltools,.st-text,canvas.ink')) hide(); }, true);
  /* iPad/Pencil: a tap on a line selects the whole line (long-press + drag still works for any range) */
  document.addEventListener('click', e => {
    if (S.tool !== 'select') return; const sp = e.target.closest && e.target.closest('.st-text span'); if (!sp) return;
    const sel = getSelection(); if (sel && !sel.isCollapsed && sel.containsNode(sp, true)) return;
    const r = document.createRange(); r.selectNodeContents(sp); sel.removeAllRanges(); sel.addRange(r);
    const a = selectionAnchor(); if (a) show(a);
  });
  /* translation: the selected English text in Google Translate (opens beside the reader; nothing is sent unless tapped) */
  function translate(a) {
    const u = 'https://translate.google.com/?sl=auto&tl=ar&op=translate&text=' + encodeURIComponent(a.quote.slice(0, 4500));
    const w = window.open(u, '_blank', 'noopener'); if (!w) location.href = u;
  }

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
  M.smart = { openSource, selectionAnchor, highlight, draft, show, hide };
})();
