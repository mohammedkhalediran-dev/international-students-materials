/* js/reader.js — قارئ PDF مع الكتابة والتظليل والرسم والممحاة والتراجع والتكبير وتنزيل نسخة بتعليقات الطالب.
   العرض: PDF.js (vendor/). الرسم: طبقة canvas فوق كل صفحة، والنصوص عناصر HTML (ليظهر العربي صحيحاً).
   التخزين والمزامنة: js/notes-store.js. التصدير: pdf-lib (يُحمَّل عند الضغط على التنزيل فقط). */
(function () {
  "use strict";
  if (!window.MS || (MS.dataError && MS.dataError())) return;
  var $ = MS.$, el = MS.el;
  var T = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  MS.initShared();
  MS.initHeader();

  /* ---------- المعاملات والتحقق ---------- */
  var q = new URLSearchParams(location.search);
  var rawUrl = q.get("u") || "", courseId = q.get("c") || "";
  var msg = $("readerMsg"), pagesEl = $("pages");
  function fail(text) { msg.hidden = false; msg.classList.add("is-error"); msg.textContent = text; }

  var fileUrl;
  try {
    var parsed = new URL(rawUrl, location.href);
    if (!rawUrl || parsed.origin !== location.origin || !/^https?:$/.test(parsed.protocol)) throw new Error("bad");
    fileUrl = parsed.pathname + parsed.search;
  } catch (e) { fileUrl = null; }
  var course = courseId ? MS.course(courseId) : null;
  $("backLink").href = course ? "course.html?id=" + encodeURIComponent(course.id) : "index.html";
  if (!fileUrl) { fail(T("الرابط غير صحيح. افتح الملف من صفحة المادة.")); return; }
  var title = q.get("t") || decodeURIComponent(fileUrl.split("/").pop() || "").replace(/\.pdf$/i, "");
  $("readerTitle").textContent = title;
  document.title = title + " | Medixa";
  var key = MS.notes.fileKey(fileUrl);

  /* ---------- الأدوات والألوان (القيم من متغيرات CSS) ---------- */
  var cs = getComputedStyle(document.documentElement);
  function token(name) { return cs.getPropertyValue(name).trim(); }
  var PEN_COLORS = [1, 2, 3, 4, 5, 6].map(function (i) { return token("--ink-" + i); });
  var HL_COLORS = [1, 2, 3, 4, 5].map(function (i) { return token("--hl-" + i); });
  var SIZES = { p: [2, 4, 8], h: [10, 16, 26], t: [18, 26, 38] };   // بجزء من ألف من عرض الصفحة
  var COLOR_NAMES = { p: ["كحلي", "أحمر", "أزرق", "أخضر", "برتقالي", "بنفسجي"], h: ["أصفر", "أخضر", "وردي", "أزرق", "برتقالي"] };
  var st = { tool: "pen", size: 1, pc: 1, hc: 0, tc: 0, finger: false, zoom: 1 };
  try { var saved = JSON.parse(localStorage.getItem("ms.reader") || "{}"); if (saved.pc != null) st.pc = saved.pc; if (saved.hc != null) st.hc = saved.hc; if (saved.size != null) st.size = saved.size; if (saved.finger) st.finger = true; } catch (e) {}
  function persist() { try { localStorage.setItem("ms.reader", JSON.stringify({ pc: st.pc, hc: st.hc, size: st.size, finger: st.finger })); } catch (e) {} }

  function kindOf() { return st.tool === "hl" ? "h" : st.tool === "text" ? "t" : "p"; }
  function curColor() {
    if (st.tool === "hl") return HL_COLORS[st.hc];
    return PEN_COLORS[st.pc];
  }

  var swatchesEl = $("swatches");
  function buildSwatches() {
    swatchesEl.textContent = "";
    var hl = st.tool === "hl", list = hl ? HL_COLORS : PEN_COLORS, names = COLOR_NAMES[hl ? "h" : "p"], cur = hl ? st.hc : st.pc;
    list.forEach(function (c, i) {
      var b = el("button", "swatch");
      b.type = "button"; b.setAttribute("aria-label", T(names[i])); b.setAttribute("aria-pressed", String(i === cur));
      b.style.setProperty("--sw", c);
      b.addEventListener("click", function () { if (hl) st.hc = i; else st.pc = i; persist(); buildSwatches(); });
      swatchesEl.appendChild(b);
    });
    swatchesEl.hidden = st.tool === "view" || st.tool === "eraser";
  }
  function syncToolbar() {
    [].forEach.call(document.querySelectorAll("[data-tool]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === st.tool)); });
    [].forEach.call(document.querySelectorAll("[data-size]"), function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-size") === st.size)); });
    $("fingerBtn").setAttribute("aria-pressed", String(st.finger));
    document.body.setAttribute("data-tool", st.tool);
    document.body.classList.toggle("finger-draws", st.finger);
    [].forEach.call(document.querySelectorAll(".sizes-hide"), function () {});
    buildSwatches();
  }
  [].forEach.call(document.querySelectorAll("[data-tool]"), function (b) {
    b.addEventListener("click", function () { commitEditor(); st.tool = b.getAttribute("data-tool"); syncToolbar(); });
  });
  [].forEach.call(document.querySelectorAll("[data-size]"), function (b) {
    b.addEventListener("click", function () { st.size = +b.getAttribute("data-size"); persist(); syncToolbar(); });
  });
  $("fingerBtn").addEventListener("click", function () {
    st.finger = !st.finger; persist(); syncToolbar();
    MS.toast(T(st.finger ? "الإصبع يرسم الآن. أوقفه للتمرير بالإصبع والرسم بالقلم." : "الرسم بالقلم أو الماوس فقط، والإصبع للتمرير."));
  });

  /* ---------- الحالة والمزامنة ---------- */
  var pill = $("syncPill");
  var STATUS_TEXT = {
    local: function () { return MS.cloud.enabled ? "محفوظ على هذا الجهاز. سجّل الدخول لحفظه على كل أجهزتك" : "محفوظ على هذا الجهاز"; },
    saving: function () { return "جارٍ الحفظ…"; },
    synced: function () { return "محفوظ على حسابك"; },
    offline: function () { return "بلا اتصال: محفوظ على الجهاز وسيُرسل لاحقاً"; },
    full: function () { return "هذه الصفحة امتلأت بالتعليقات. احذف بعضها"; },
    login: function () { return "انتهت الجلسة. سجّل الدخول من جديد"; }
  };
  function showStatus(s) {
    var f = STATUS_TEXT[s] || STATUS_TEXT.local;
    pill.setAttribute("data-state", s);
    $("syncText").textContent = f();
    $("syncIco").textContent = "";
    $("syncIco").appendChild(MS.icon(s === "synced" ? "check" : "cloud", 16));
  }
  pill.href = "account.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search);
  MS.notes.onStatus(showStatus);

  /* ---------- الرسم ---------- */
  var doc = null, pdf = null, N = 0, zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  var wraps = [], aspects = [], visible = {}, stamp = 0, live = null, ghost = {}, ptsCache = {};

  function dprFor(w, h) { var d = Math.min(window.devicePixelRatio || 1, 2); while (d > 1 && w * h * d * d > 14e6) d -= 0.25; return Math.max(d, 1); }
  function decoded(it) { var k = it.id + ":" + it.t; return ptsCache[k] || (ptsCache[k] = MS.notes.util.dec(it.p)); }

  function paintStroke(ctx, it, pts, W, H) {
    if (!pts.length) return;
    ctx.save();
    var hl = it.k === "h";
    ctx.globalAlpha = hl ? 0.32 : 1;
    ctx.strokeStyle = it.c;
    ctx.lineWidth = Math.max(1, it.w * W / 1000);
    ctx.lineCap = hl ? "butt" : "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    var p = pts[0];
    ctx.moveTo(p[0] * W, p[1] * H);
    if (pts.length === 1) { ctx.lineTo(p[0] * W + 0.01, p[1] * H + 0.01); }
    for (var i = 1; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      ctx.quadraticCurveTo(a[0] * W, a[1] * H, (a[0] + b[0]) / 2 * W, (a[1] + b[1]) / 2 * H);
    }
    if (pts.length > 1) { var l = pts[pts.length - 1]; ctx.lineTo(l[0] * W, l[1] * H); }
    ctx.stroke();
    ctx.restore();
  }
  function drawInk(n) {
    var w = wraps[n - 1]; if (!w || !w._ink || !w._rendered) return;
    var c = w._ink, ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    doc.items(n).forEach(function (it) {
      if (it.k === "t" || ghost[it.id]) return;
      paintStroke(ctx, it, decoded(it), c.width, c.height);
    });
    if (live && live.page === n) paintStroke(ctx, live.item, live.pts, c.width, c.height);
  }
  function renderTexts(n) {
    var w = wraps[n - 1]; if (!w) return;
    var box = w._texts; box.textContent = "";
    doc.items(n).forEach(function (it) {
      if (it.k !== "t") return;
      var d = el("div", "rtext", it.v);
      d.setAttribute("dir", "auto");
      d.setAttribute("data-id", it.id);
      d.style.setProperty("--x", (it.x * 100) + "%");
      d.style.setProperty("--y", (it.y * 100) + "%");
      d.style.setProperty("--fs", String(it.s / 10));
      d.style.setProperty("--tc", it.c);
      if (ghost[it.id]) d.classList.add("is-ghost");
      box.appendChild(d);
    });
  }
  function redraw(n) { drawInk(n); renderTexts(n); }

  function cssWidth() {
    var stage = $("readerStage"), avail = Math.max(240, stage.clientWidth - 32);
    return Math.round(Math.min(avail, 1000) * st.zoom);
  }
  function sizeWrap(i) {
    var w = wraps[i], cw = cssWidth(), ch = Math.round(cw * (aspects[i] || aspects[0] || 1.414));
    w.style.setProperty("--pw", cw + "px"); w.style.setProperty("--ph", ch + "px");
    return [cw, ch];
  }

  var tasks = {};
  function renderPage(i) {
    var w = wraps[i]; if (!w) return;
    var my = stamp; w._stamp = my;
    pdf.getPage(i + 1).then(function (page) {
      if (w._stamp !== my) return;
      var v1 = page.getViewport({ scale: 1 });
      aspects[i] = v1.height / v1.width;
      var s = sizeWrap(i), cw = s[0], ch = s[1], d = dprFor(cw, ch);
      var vp = page.getViewport({ scale: cw * d / v1.width });
      var pc = w._pdf, ic = w._ink;
      pc.width = Math.round(vp.width); pc.height = Math.round(vp.height);
      ic.width = pc.width; ic.height = pc.height;
      if (tasks[i]) { try { tasks[i].cancel(); } catch (e) {} }
      var task = page.render({ canvasContext: pc.getContext("2d"), viewport: vp });
      tasks[i] = task;
      return task.promise.then(function () {
        if (w._stamp !== my) return;
        w._rendered = true; w.classList.add("is-ready");
        redraw(i + 1);
      });
    }).catch(function () {});
  }
  function release(i) {
    var w = wraps[i]; if (!w || !w._rendered) return;
    w._rendered = false; w._stamp = -1; w.classList.remove("is-ready");
    w._pdf.width = 1; w._pdf.height = 1; w._ink.width = 1; w._ink.height = 1;
  }

  var io = null;
  function buildPages() {
    pagesEl.textContent = "";
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = +en.target.getAttribute("data-i");
        if (en.isIntersecting) { visible[i] = true; if (!wraps[i]._rendered) renderPage(i); }
        else { delete visible[i]; release(i); }
      });
    }, { rootMargin: "700px 0px" });
    for (var i = 0; i < N; i++) {
      var w = el("section", "rpage");
      w.setAttribute("data-i", String(i)); w.setAttribute("data-page", String(i + 1));
      w.setAttribute("aria-label", T("صفحة") + " " + (i + 1));
      var pc = el("canvas", "pdf"), ic = el("canvas", "ink"), tx = el("div", "rtexts");
      w.appendChild(pc); w.appendChild(ic); w.appendChild(tx);
      w.appendChild(el("span", "page-no", (i + 1) + " / " + N));
      w._pdf = pc; w._ink = ic; w._texts = tx;
      wraps.push(w); pagesEl.appendChild(w);
      sizeWrap(i);
      io.observe(w);
    }
  }
  function applyZoom(z, keepCenter) {
    var idx = zoomLevels.indexOf(st.zoom);
    st.zoom = z;
    $("zoomFit").textContent = Math.round(z * 100) + "%";
    commitEditor();
    var root = document.documentElement, ratio = (root.scrollTop + window.innerHeight / 2) / Math.max(1, root.scrollHeight);
    stamp++;
    wraps.forEach(function (w, i) { sizeWrap(i); });
    Object.keys(visible).forEach(function (i) { renderPage(+i); });
    if (keepCenter) root.scrollTop = ratio * root.scrollHeight - window.innerHeight / 2;
  }
  function stepZoom(dir) {
    var i = zoomLevels.indexOf(st.zoom); if (i < 0) i = 2;
    var n = Math.min(zoomLevels.length - 1, Math.max(0, i + dir));
    if (n !== i) applyZoom(zoomLevels[n], true);
  }
  $("zoomIn").addEventListener("click", function () { stepZoom(1); });
  $("zoomOut").addEventListener("click", function () { stepZoom(-1); });
  $("zoomFit").addEventListener("click", function () { applyZoom(1, true); });
  var resizeT;
  window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(function () { applyZoom(st.zoom, false); }, 200); });

  /* ---------- الإدخال: قلم/تظليل/ممحاة ---------- */
  function pagePos(canvas, e) {
    var r = canvas.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)), r.width, r.height];
  }
  function allowed(e) { return e.pointerType === "pen" || e.pointerType === "mouse" || (e.pointerType === "touch" && st.finger); }
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function eraseAt(n, canvas, e, g) {
    var p = pagePos(canvas, e), W = p[2], H = p[3], x = p[0] * W, y = p[1] * H, R = 14, hit = false;
    doc.items(n).forEach(function (it) {
      if (ghost[it.id]) return;
      var h = false;
      if (it.k === "t") {
        var node = wraps[n - 1]._texts.querySelector('[data-id="' + it.id + '"]');
        if (node) { var r = node.getBoundingClientRect(); h = e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6; }
      } else {
        var pts = decoded(it), rr = R + (it.k === "h" ? it.w * W / 2000 : it.w * W / 2000);
        for (var i = 0; i < pts.length && !h; i++) {
          var a = pts[i], b = pts[i + 1] || a;
          h = segDist(x, y, a[0] * W, a[1] * H, b[0] * W, b[1] * H) <= rr;
        }
      }
      if (h) { ghost[it.id] = 1; g.ids.push(it.id); hit = true; }
    });
    if (hit) redraw(n);
  }

  var gesture = null;
  pagesEl.addEventListener("pointerdown", function (e) {
    var c = e.target.closest && e.target.closest("canvas.ink"); if (!c) return;
    if (st.tool === "view" || st.tool === "text") return;
    if (!allowed(e)) return;
    e.preventDefault();
    var n = +c.parentNode.getAttribute("data-page");
    try { c.setPointerCapture(e.pointerId); } catch (x) {}
    if (st.tool === "eraser") {
      gesture = { type: "erase", page: n, canvas: c, ids: [], pid: e.pointerId };
      eraseAt(n, c, e, gesture);
      return;
    }
    var k = kindOf(), p = pagePos(c, e);
    var item = { id: MS.notes.util.uid(), k: k, c: curColor(), w: SIZES[k][st.size], p: "" };
    gesture = { type: "draw", page: n, canvas: c, pid: e.pointerId };
    live = { page: n, item: item, pts: [[p[0], p[1]]] };
    drawInk(n);
  });
  pagesEl.addEventListener("pointermove", function (e) {
    if (!gesture || e.pointerId !== gesture.pid) return;
    e.preventDefault();
    if (gesture.type === "erase") { eraseAt(gesture.page, gesture.canvas, e, gesture); return; }
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    (evs && evs.length ? evs : [e]).forEach(function (ev) {
      var p = pagePos(gesture.canvas, ev), last = live.pts[live.pts.length - 1];
      if (Math.hypot((p[0] - last[0]) * p[2], (p[1] - last[1]) * p[3]) >= 1.2) live.pts.push([p[0], p[1]]);
    });
    drawInk(gesture.page);
  });
  function endGesture(e) {
    if (!gesture || (e && e.pointerId !== gesture.pid)) return;
    var g = gesture; gesture = null;
    if (g.type === "erase") {
      var ids = g.ids; ghost = {};
      if (ids.length) doc.remove(g.page, ids); else redraw(g.page);
      return;
    }
    var l = live; live = null;
    if (l && l.pts.length) {
      var pts = MS.notes.util.thin(l.pts, 0.0008);
      l.item.p = MS.notes.util.enc(pts);
      doc.add(l.page, l.item);
    }
    drawInk(g.page);
  }
  pagesEl.addEventListener("pointerup", endGesture);
  pagesEl.addEventListener("pointercancel", function (e) {
    if (gesture && gesture.type === "draw") { var n = gesture.page; gesture = null; live = null; drawInk(n); }
    else if (gesture) { var n2 = gesture.page; gesture = null; ghost = {}; redraw(n2); }
  });

  /* ---------- النص ---------- */
  var editor = null;
  function commitEditor(cancel) {
    if (!editor) return;
    var ed = editor; editor = null;
    var v = ed.ta.value.replace(/\s+$/g, "");
    ed.ta.remove();
    if (!cancel && v.trim()) {
      var it = ed.item ? Object.assign({}, ed.item, { v: v }) : { id: MS.notes.util.uid(), k: "t", c: ed.color, s: ed.size, x: ed.x, y: ed.y, v: v };
      if (ed.item) { if (ed.item.v !== v) doc.edit(ed.page, it); else redraw(ed.page); } else doc.add(ed.page, it);
    } else if (!cancel && ed.item) {
      doc.remove(ed.page, ed.item.id);
    } else redraw(ed.page);
  }
  function openEditor(n, x, y, existing) {
    commitEditor();
    var w = wraps[n - 1], ta = el("textarea", "rtext-edit");
    ta.setAttribute("dir", "auto"); ta.setAttribute("rows", "1"); ta.setAttribute("aria-label", T("اكتب ملاحظتك"));
    ta.setAttribute("placeholder", T("اكتب هنا"));
    var color = existing ? existing.c : PEN_COLORS[st.pc], size = existing ? existing.s : SIZES.t[st.size];
    var ex = existing ? existing.x : x, ey = existing ? existing.y : y;
    ta.style.setProperty("--x", (ex * 100) + "%"); ta.style.setProperty("--y", (ey * 100) + "%");
    ta.style.setProperty("--fs", String(size / 10)); ta.style.setProperty("--tc", color);
    ta.value = existing ? existing.v : "";
    function fit() {
      var lines = ta.value.split("\n"), longest = lines.reduce(function (m, l) { return Math.max(m, l.length); }, 4);
      ta.rows = lines.length; ta.style.setProperty("--cols", String(longest + 1));
    }
    ta.addEventListener("input", fit);
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); commitEditor(true); }
      else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commitEditor(); }
    });
    ta.addEventListener("blur", function () { setTimeout(function () { if (editor && editor.ta === ta) commitEditor(); }, 0); });
    editor = { ta: ta, page: n, item: existing || null, x: ex, y: ey, color: color, size: size };
    if (existing) { var node = w._texts.querySelector('[data-id="' + existing.id + '"]'); if (node) node.classList.add("is-ghost"); }
    w._texts.appendChild(ta); fit(); ta.focus();
  }
  pagesEl.addEventListener("click", function (e) {
    if (st.tool !== "text") return;
    var wrap = e.target.closest && e.target.closest(".rpage"); if (!wrap) return;
    if (e.target.classList && e.target.classList.contains("rtext-edit")) return;
    var n = +wrap.getAttribute("data-page");
    var tnode = e.target.closest(".rtext");
    if (tnode) { var it = doc.get(n, tnode.getAttribute("data-id")); if (it) { openEditor(n, 0, 0, it); return; } }
    var c = wrap._ink, p = pagePos(c, e);
    openEditor(n, Math.min(p[0], 0.92), p[1]);
  });

  /* ---------- تراجع/إعادة ---------- */
  function syncHistory() { $("undoBtn").disabled = !doc.canUndo(); $("redoBtn").disabled = !doc.canRedo(); }
  $("undoBtn").addEventListener("click", function () { commitEditor(); doc.undo(); });
  $("redoBtn").addEventListener("click", function () { commitEditor(); doc.redo(); });
  document.addEventListener("keydown", function (e) {
    if (e.target && /^(TEXTAREA|INPUT|SELECT)$/.test(e.target.tagName)) return;
    var mod = e.ctrlKey || e.metaKey; if (!mod) return;
    var k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); doc.undo(); }
    else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); doc.redo(); }
    else if (k === "=" || k === "+") { e.preventDefault(); stepZoom(1); }
    else if (k === "-") { e.preventDefault(); stepZoom(-1); }
  });

  /* ---------- تنزيل PDF بالتعليقات ---------- */
  function hasArabic(s) { return /[֐-ࣿ]/.test(s); }
  function paintOverlay(ctx, items, W, H) {
    items.forEach(function (it) {
      if (it.k !== "t") { paintStroke(ctx, it, MS.notes.util.dec(it.p), W, H); return; }
      var fs = it.s * W / 1000, lines = String(it.v).split("\n");
      ctx.save();
      ctx.font = "500 " + fs + "px 'IBM Plex Sans Arabic','Inter',system-ui,sans-serif";
      ctx.fillStyle = it.c; ctx.textBaseline = "top"; ctx.textAlign = "left";
      var rtl = hasArabic(it.v), widths = lines.map(function (l) { ctx.direction = hasArabic(l) ? "rtl" : "ltr"; return ctx.measureText(l).width; });
      var boxW = Math.max.apply(null, widths.concat([1])), lh = fs * 1.35;
      lines.forEach(function (l, i) {
        ctx.direction = hasArabic(l) ? "rtl" : "ltr";
        var lx = it.x * W + (rtl ? boxW - widths[i] : 0);
        ctx.fillText(l, lx, it.y * H + i * lh);
      });
      ctx.restore();
    });
  }
  function loadScript(src) {
    return new Promise(function (ok, bad) {
      if (window.PDFLib) { ok(); return; }
      var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error("lib")); }; document.head.appendChild(s);
    });
  }
  function exportPdf() {
    var btn = $("exportBtn"), old = btn.textContent;
    btn.disabled = true; btn.textContent = T("جارٍ إنشاء الملف…");
    commitEditor();
    var buf;
    return Promise.all([loadScript("vendor/pdf-lib.min.js?v=1.17.1"), fetch(fileUrl).then(function (r) { if (!r.ok) throw new Error("http"); return r.arrayBuffer(); })]).then(function (a) {
      buf = a[1];
      return PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
    }).then(function (out) {
      var chain = Promise.resolve(), count = out.getPageCount(), annotated = 0;
      var fontReady = (document.fonts && document.fonts.ready) || Promise.resolve();
      return fontReady.then(function () {
        for (var i = 0; i < count; i++) (function (i) {
          chain = chain.then(function () {
            var items = doc.items(i + 1); if (!items.length) return;
            var page = out.getPage(i), size = page.getSize(), rot = ((page.getRotation().angle % 360) + 360) % 360;
            var dw = rot % 180 ? size.height : size.width, dh = rot % 180 ? size.width : size.height;
            var W = Math.min(2400, Math.round(dw * 3)), H = Math.round(W * dh / dw);
            var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
            paintOverlay(cv.getContext("2d"), items, W, H);
            return new Promise(function (ok) { cv.toBlob(ok, "image/png"); }).then(function (b) { return b.arrayBuffer(); })
              .then(function (ab) { return out.embedPng(ab); }).then(function (img) {
                var o = { width: dw, height: dh, x: 0, y: 0 };
                if (rot === 90) { o = { width: dh, height: dw, x: 0, y: size.height, rotate: PDFLib.degrees(-90) }; o.width = dw; o.height = dh; }
                else if (rot === 180) { o = { width: dw, height: dh, x: size.width, y: size.height, rotate: PDFLib.degrees(-180) }; }
                else if (rot === 270) { o = { width: dw, height: dh, x: size.width, y: 0, rotate: PDFLib.degrees(-270) }; }
                page.drawImage(img, o); annotated++;
              });
          });
        })(i);
        return chain.then(function () { return out.save(); });
      }).then(function (bytes) {
        var base = title.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80) || "Medixa";
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        a.download = base + " - تعليقاتي.pdf";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
        MS.toast(T(annotated ? "تم إنشاء الملف مع تعليقاتك" : "لا توجد تعليقات بعد، نُزّل الملف الأصلي"));
      });
    }).catch(function () { MS.toast(T("تعذّر إنشاء الملف. حاول مجدداً.")); })
      .then(function () { btn.disabled = false; btn.textContent = old; });
  }
  $("exportBtn").addEventListener("click", exportPdf);

  /* ---------- الإقلاع ---------- */
  function start() {
    return MS.cloud.ready().then(function () {
      return MS.notes.open({ key: key, title: title, course: courseId, url: fileUrl });
    }).then(function (d) {
      doc = d; window.__medixaDoc = d;
      d.on("change", function (n) { if (wraps[n - 1]) redraw(n); });
      d.on("history", syncHistory);
      return pdfjsLib.getDocument({ url: fileUrl }).promise;
    }).then(function (p) {
      pdf = p; N = p.numPages; doc.setPages(N);
      return p.getPage(1);
    }).then(function (p1) {
      var v = p1.getViewport({ scale: 1 }); aspects[0] = v.height / v.width;
      msg.hidden = true;
      buildPages();
      showStatus(MS.notes.status());
      doc.start();
      var jump = parseInt(q.get("p"), 10);
      if (jump >= 1 && jump <= N) wraps[jump - 1].scrollIntoView();
      document.body.setAttribute("data-ready", "1");
    }).catch(function (e) {
      fail(T("تعذّر فتح الملف. تأكد أنه موجود ثم أعد المحاولة."));
    });
  }
  if (!window.pdfjsLib) { fail(T("تعذّر تحميل مكتبة عرض PDF.")); return; }
  pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js?v=3.11.174";
  syncToolbar();
  $("zoomFit").textContent = "100%";
  showStatus("local");
  start();
})();
