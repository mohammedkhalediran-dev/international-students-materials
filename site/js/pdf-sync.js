/* js/pdf-sync.js — يحفظ كتابة الطالب وتظليله وبطاقاته على ملف PDF في حسابه، ويُظهرها على أي جهاز (Step 63، بطلب محمد 2026-10-19).
   لا يلمس محرّك الكتابة ولا حراس التخزين: يقرأ ويكتب في localStorage كما يفعل الاستعادة من نسخة احتياطية.
   - عند فتح الصفحة: يجلب نسخة الحساب ويدمجها (دمج ثلاثي بالمعرّف، لا يضيع شيء). إن تغيّر شيء محلياً أُعيد تحميل الصفحة مرة واحدة ليقرأها المحرّك.
   - أثناء الكتابة: كل 6 ثوانٍ (وعند مغادرة الصفحة) يرفع الصفحات التي تغيّرت فقط. إن تغيّر الصف من جهاز آخر لا يدمج في منتصف الكتابة؛ ينبّه الطالب ليحدّث الصفحة فيُدمج عند الفتح.
   - الزائر (بلا حساب): لا شيء يُرفع، وتبقى ملاحظاته على الجهاز. أخطاء الشبكة لا تمسّ ما هو محفوظ محلياً.
   المنطق في pdf-sync-core.js (يفحصه tests/pdf_sync_core_check.cjs). الخادم: functions/_lib/pdfnotes.js. */
(function () {
  'use strict';
  const Core = window.MedixaPdfSyncCore;
  const src = new URLSearchParams(location.search).get('file');
  if (!Core || !src) return;

  let abs, doc;
  try {
    const u = new URL(src, location.href); abs = u.href;
    let path = u.pathname; try { path = decodeURIComponent(path); } catch (e) { /* يبقى كما هو */ }
    doc = Core.docId(path + u.search);        /* لا يتغير بين medixa.pages.dev وmain.medixa.pages.dev */
  } catch (e) { return; }

  const KEYS = { ink: 'medixa.pdf.annotations.v1:' + abs, study: 'medixa.study.v1:' + abs, layout: 'medixa.studio.layout.v1:' + abs };
  const STATE_KEY = 'medixa.sync.pdf.v1:' + doc;
  const TICK_MS = 6000;
  const SHAPE = { ink: Array.isArray, study: v => v && typeof v === 'object' && !Array.isArray(v), layout: v => v && typeof v === 'object' && !Array.isArray(v) };
  const kindOf = k => k.indexOf('ink:') === 0 ? 'ink' : k;

  /* ---------- حالة المزامنة المحلية ---------- */
  function loadState() { try { const s = JSON.parse(localStorage.getItem(STATE_KEY)); if (s && s.rows && typeof s.rows === 'object') return s; } catch (e) { /* جديد */ } return { v: 1, rows: {} }; }
  function saveState() { try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* الامتلاء: نعيد المحاولة لاحقاً */ } }
  let state = loadState();
  const conflicts = new Set(), failed = {};     /* صفوف عليها تعارض أو رفضها الخادم (لا نكرر المحاولة حتى تتغير) */

  /* ---------- الشبكة ---------- */
  function call(method, path, body, keepalive) {
    return fetch(path, { method, credentials: 'same-origin', cache: 'no-store', keepalive: !!keepalive, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
      .then(r => r.json().catch(() => ({})).then(d => { d.__status = r.status; return d; }), () => ({ __status: 0 }));
  }

  /* ---------- شارة الحالة في الرأس ---------- */
  let badge;
  function ui(text, cls, action) {
    if (!badge) {
      const hdr = document.querySelector('header'); if (!hdr) return;
      badge = document.createElement('span'); badge.id = 'acct-sync'; badge.setAttribute('role', 'status'); badge.setAttribute('aria-live', 'polite');
      badge.style.cssText = 'font-size:12px;opacity:.9;display:inline-flex;gap:6px;align-items:center;margin-inline-start:auto';
      hdr.appendChild(badge);
    }
    badge.replaceChildren(); badge.dataset.state = cls || '';
    if (!text) return;
    const t = document.createElement('span'); t.textContent = text; badge.appendChild(t);
    if (action) {
      const b = document.createElement(action.href ? 'a' : 'button'); b.textContent = action.label;
      if (action.href) b.href = action.href; else { b.type = 'button'; b.onclick = action.run; }
      b.style.cssText = 'color:#122c47;background:#fff;border:0;border-radius:6px;padding:3px 8px;font:inherit;font-weight:700;text-decoration:none;cursor:pointer';
      badge.appendChild(b);
    }
  }
  const reload = () => location.reload();
  function note() {   /* الجملة التي تشرح مكان الحفظ داخل لوحة أدوات الدراسة */
    const p = document.querySelector('#study-panel p.muted');
    if (p && /محفوظة محلياً/.test(p.textContent)) p.textContent = 'ملاحظاتك وبطاقاتك محفوظة على هذا الجهاز وفي حسابك. أقنعة الصور تبقى على هذا الجهاز فقط.';
  }

  /* ---------- قراءة وكتابة المحلي (بالطريقة نفسها التي يفعلها المحرّك) ---------- */
  function readLocal() {
    const local = {}, bad = {};
    for (const name of Object.keys(KEYS)) {
      let raw = null;
      try { raw = localStorage.getItem(KEYS[name]); } catch (e) { bad[name] = true; continue; }
      if (raw === null) { local[name] = null; continue; }
      let v; try { v = JSON.parse(raw); } catch (e) { bad[name] = true; continue; }
      if (!SHAPE[name](v)) { bad[name] = true; continue; }       /* تالف أو بصيغة غريبة: لا نقرأه ولا نكتب فوقه أبداً */
      local[name] = v;
    }
    return { local, bad };
  }
  function writeLocal(name, value) {
    const payload = JSON.stringify(value);
    try { localStorage.setItem(KEYS[name], payload); return localStorage.getItem(KEYS[name]) === payload; } catch (e) { return false; }
  }
  function editorBusy() {
    try { const S = window.MedixaStudio && window.MedixaStudio.S; return !!S && (['editing', 'pending', 'failed', 'conflict'].indexOf(S.state) >= 0 || S.dirty === true); } catch (e) { return false; }
  }

  /* ---------- رفع الصفوف ---------- */
  const ERR_TEXT = {
    quota: ['⚠ امتلأت مساحة ملاحظاتك في الحساب (5 ميغابايت). ما زالت محفوظة على هذا الجهاز.', 'warn'],
    too_large: ['⚠ إحدى الصفحات كبيرة جداً لتُحفظ في الحساب. ما زالت محفوظة على هذا الجهاز.', 'warn']
  };
  async function push(rows, keepalive) {   /* rows: [{k, d, base, data}] */
    let anyOk = false, problem = null;
    for (let i = 0; i < rows.length; i += 40) {
      const chunk = rows.slice(i, i + 40);
      const res = await call('PUT', 'api/pdfnotes', { doc, rows: chunk.map(r => ({ k: r.k, d: r.d, base: r.base })) }, keepalive);
      if (res.__status === 401) { ui('سجّل الدخول لحفظ ملاحظاتك في حسابك', 'guest', { label: 'دخول', href: 'login.html?next=' + encodeURIComponent('pdf-notes.html' + location.search) }); return { stop: true }; }
      if (res.__status !== 200 || !Array.isArray(res.results)) return { offline: res.__status === 0 || res.__status >= 500, disabled: res.__status === 503 };
      for (const r of res.results) {
        const row = chunk.find(c => c.k === r.k); if (!row) continue;
        if (r.ok) { state.rows[r.k] = Core.stateAfterPush(r.k, row.data, r.t); delete failed[r.k]; conflicts.delete(r.k); anyOk = true; }
        else if (r.conflict) { conflicts.add(r.k); }
        else if (r.error) { failed[r.k] = Core.hashOf(row.data); problem = r.error; }
      }
    }
    saveState();
    return { anyOk, problem };
  }
  function report(r) {
    if (r.stop) return;
    if (conflicts.size) return ui('⚠ تغيّرت ملاحظاتك من جهاز آخر', 'conflict', { label: 'حدّث للدمج', run: reload });
    if (r.problem && ERR_TEXT[r.problem]) return ui(ERR_TEXT[r.problem][0], ERR_TEXT[r.problem][1]);
    if (r.disabled) return ui('', 'off');
    if (r.offline) return ui('☁ بانتظار الاتصال — ملاحظاتك محفوظة على الجهاز', 'offline');
    ui('☁ محفوظة في حسابك ✓', 'saved');
  }

  /* ---------- أثناء الجلسة ---------- */
  let running = false, enabled = false;
  async function tick(keepalive) {
    if (!enabled || running) return;
    running = true;
    try {
      const { local, bad } = readLocal();
      const dirty = Core.dirtyRows(local, state).filter(r => !bad[kindOf(r.k)] && !conflicts.has(r.k) && failed[r.k] !== Core.hashOf(r.data));
      if (!dirty.length) return;
      ui('☁ جارٍ الحفظ في حسابك…', 'saving');
      report(await push(dirty, keepalive));
    } finally { running = false; }
  }

  /* ---------- عند فتح الصفحة ---------- */
  async function start() {
    ui('☁ جارٍ مزامنة ملاحظاتك…', 'saving');
    const res = await call('GET', 'api/pdfnotes?doc=' + doc);
    if (res.__status === 401) return ui('سجّل الدخول لحفظ ملاحظاتك في حسابك', 'guest', { label: 'دخول', href: 'login.html?next=' + encodeURIComponent('pdf-notes.html' + location.search) });
    if (res.__status === 503 || res.__status === 404) return ui('', 'off');                     /* الميزة غير مفعّلة بعد في الخادم */
    if (res.__status !== 200 || !Array.isArray(res.rows)) { ui('☁ بانتظار الاتصال — ملاحظاتك محفوظة على الجهاز', 'offline'); enabled = true; return; }
    enabled = true;
    note();
    const remote = {}; for (const r of res.rows) remote[r.k] = { d: r.d, t: r.t };
    const { local, bad } = readLocal();
    const plan = Core.plan(local, remote, state);
    for (const k of Object.keys(plan.rows)) if (bad[kindOf(k)]) { delete plan.rows[k]; delete plan.writeLocal[kindOf(k)]; }
    for (const name of Object.keys(plan.writeLocal)) if (bad[name]) delete plan.writeLocal[name];

    /* 1) ما يلزم كتابته محلياً (من الحساب إلى الجهاز) */
    const names = Object.keys(plan.writeLocal);
    if (names.length) {
      if (editorBusy()) return ui('⚠ في حسابك ملاحظات جديدة من جهاز آخر', 'conflict', { label: 'حدّث للدمج', run: reload });
      for (const name of names) if (!writeLocal(name, plan.writeLocal[name])) return ui('⚠ تعذّر تحديث الملاحظات على هذا الجهاز (مساحة التخزين)', 'warn');
    }
    /* 2) حالة الصفوف التي لم تحتج رفعاً، ثم رفع ما يلزم */
    const uploads = [];
    for (const k of Object.keys(plan.rows)) {
      const r = plan.rows[k]; if (r.skip) continue;
      if (r.state) state.rows[k] = r.state;
      if (r.push) uploads.push({ k, d: r.push.d, base: r.push.base, data: r.data });
    }
    saveState();
    let outcome = { anyOk: false };
    if (uploads.length) outcome = await push(uploads, false);
    report(outcome);
    /* 3) إن تغيّر المحلي نعيد تحميل الصفحة مرة واحدة ليقرأها المحرّك (مرة كل 30 ثانية على الأكثر لمنع التكرار) */
    if (names.length) {
      let last = 0; try { last = Number(sessionStorage.getItem('medixa.sync.reload')) || 0; } catch (e) { /* بلا */ }
      if (Date.now() - last > 30000) { try { sessionStorage.setItem('medixa.sync.reload', String(Date.now())); } catch (e) { /* بلا */ } ui('☁ حُدّثت ملاحظاتك من حسابك…', 'saving'); reload(); return; }
      ui('☁ حُدّثت ملاحظاتك من حسابك', 'saved', { label: 'عرضها', run: reload });
    }
  }

  start().then(() => {
    setInterval(() => tick(false), TICK_MS);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') tick(true); });
    window.addEventListener('pagehide', () => tick(true));
    window.addEventListener('online', () => tick(false));
  });
  window.MedixaPdfSync = { tick: () => tick(false), doc, state: () => state };   /* للفحص */
})();
