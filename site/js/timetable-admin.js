/* js/timetable-admin.js — إدارة الجدول الجامعي للمشرف (Step 55).
   كل عملية تُرسل إلى /api/timetable/admin/* والخادم يتحقق من أن الحساب مشرف؛ الواجهة هنا لا تمنح أي صلاحية. */
(function () {
  "use strict";
  var M = window.MTT, P = window.TTParse;
  var t = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  var state = { lectures: [], exceptions: [], ai: false };
  var today = M.iso(new Date());
  var ERR = {
    subject_required: "اكتب اسم المادة.", bad_time: "الوقت غير صحيح.", end_before_start: "وقت النهاية يجب أن يكون بعد البداية.",
    bad_date: "التاريخ غير صحيح.", bad_weekday: "اختر اليوم.", bad_range: "تاريخ النهاية قبل البداية.", not_on_date: "المحاضرة لا تقع في هذا التاريخ.",
    not_found: "لم تعد هذه المحاضرة موجودة.", forbidden: "هذه العملية للمشرف فقط.", unauthorized: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
    not_migrated: "جدول قاعدة البيانات غير موجود بعد (migrations/0006_timetable.sql).", ocr_not_configured: "قراءة الصور غير مفعّلة على الخادم (Workers AI). استعمل PDF نصياً أو الصق النص أو أدخل المحاضرات يدوياً.",
    ocr_failed: "تعذّرت قراءة الملف على الخادم. جرّب صورة أوضح أو أدخل المحاضرات يدوياً.", too_large: "الملف أكبر من 8 ميغابايت.", bad_type: "نوع الملف غير مدعوم.",
    network: "لا اتصال بالإنترنت.", invalid_rows: "بعض الصفوف ناقصة أو غير صحيحة (مظللة بالأحمر).", bad_request: "البيانات غير مكتملة."
  };
  var errText = function (d) { return t(ERR[d && d.error] || "حدث خطأ. حاول مرة أخرى."); };

  function post(path, body) {
    return M.fetchJson("api/timetable/admin/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }
  var toastTimer;
  function toast(msg) { var x = $("ttToast"); x.textContent = t(msg); x.classList.add("is-on"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { x.classList.remove("is-on"); }, 2600); }
  function openDlg(d) { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); }
  function closeDlg(d) { if (d.close) d.close(); else d.removeAttribute("open"); }
  document.querySelectorAll(".tt-dialog [data-close]").forEach(function (b) { b.onclick = function () { closeDlg(b.closest("dialog")); }; });
  var dayName = function (w) { return t(M.DAYS[w]); };
  function whenText(l) { return l.repeat === "once" ? dayName(new Date(l.date + "T12:00:00").getDay()) + " " + M.fmtDate(l.date) : t("كل") + " " + dayName(l.weekday); }

  /* ---------- القائمة ---------- */
  function load() {
    return M.fetchJson("api/timetable/admin/list").then(function (d) {
      if (d.__status !== 200) { $("ttList").replaceChildren(el("div", "tt-err", errText(d))); return; }
      state = { lectures: d.lectures || [], exceptions: d.exceptions || [], ai: !!d.ai };
      render();
    });
  }
  function render() {
    var L = state.lectures, drafts = L.filter(function (l) { return l.status === "draft"; }).length;
    var stats = $("ttStats"); stats.innerHTML = "";
    [["منشورة", L.length - drafts], ["مسودات", drafts], ["تعديلات قادمة", state.exceptions.filter(function (x) { return x.date >= today; }).length]].forEach(function (s) {
      var c = el("span", "tt-stat"); c.appendChild(el("span", "", t(s[0]) + ": ")); c.appendChild(el("b", "", String(s[1]))); stats.appendChild(c);
    });
    var pub = $("ttPublishAll"); pub.disabled = !drafts; pub.textContent = t("نشر كل المسودات") + (drafts ? " (" + drafts + ")" : "");
    var list = $("ttList"); list.innerHTML = "";
    if (!L.length) { list.appendChild(el("div", "tt-empty", t("لا محاضرات بعد. أضف محاضرة أو استورد الجدول من ملف."))); }
    var groups = M.WEEK.map(function (w) { return { title: dayName(w), items: L.filter(function (l) { return l.repeat === "weekly" && l.weekday === w; }) }; });
    groups.push({ title: t("محاضرات لمرة واحدة"), items: L.filter(function (l) { return l.repeat === "once"; }).sort(function (a, b) { return (a.date + a.start).localeCompare(b.date + b.start); }) });
    groups.forEach(function (g) {
      if (!g.items.length) return;
      var box = el("div", "tt-group"); box.appendChild(el("h3", "", g.title));
      g.items.sort(function (a, b) { return a.repeat === "once" ? 0 : a.start.localeCompare(b.start); }).forEach(function (l) { box.appendChild(rowFor(l)); });
      list.appendChild(box);
    });
    renderExceptions();
    if (window.I18N) I18N.apply();
  }
  // سطر معلومات بأجزاء معزولة الاتجاه حتى لا يختلط العربي بالإنجليزي والأوقات
  function bitsLine(bits) {
    var sm = el("small");
    bits.filter(Boolean).forEach(function (b, i) {
      if (i) sm.appendChild(document.createTextNode(" · "));
      var sp = el("bdi", "", b);
      if (/^[\d:\-–\s]+$/.test(b)) sp.setAttribute("dir", "ltr");
      sm.appendChild(sp);
    });
    return sm;
  }
  function rowFor(l) {
    var r = el("article", "tt-row"); r.id = "lec-" + l.id;
    r.appendChild(el("span", "tt-time", l.start + " – " + l.end));
    var m = el("div", "tt-row-main");
    var s = el("strong", "", l.subject); s.setAttribute("dir", "auto");
    var chip = el("span", "tt-chip " + (l.status === "draft" ? "is-draft" : "is-pub"), t(l.status === "draft" ? "مسودة" : "منشورة"));
    s.appendChild(chip); m.appendChild(s);
    var bits = [l.topic, l.lecturer, l.room && (t("القاعة") + " " + l.room), l.repeat === "once" ? whenText(l) : (l.from || l.to ? (l.from ? t("من") + " " + l.from + " " : "") + (l.to ? t("إلى") + " " + l.to : "") : "")].filter(Boolean);
    if (bits.length) m.appendChild(bitsLine(bits));
    r.appendChild(m);
    var a = el("div", "tt-row-acts");
    var btn = function (label, fn, cls) { var b = el("button", "tt-btn" + (cls ? " " + cls : ""), t(label)); b.type = "button"; b.onclick = fn; b.setAttribute("aria-label", t(label) + ": " + l.subject); a.appendChild(b); };
    btn("تعديل", function () { editor(l); });
    btn(l.status === "draft" ? "نشر" : "إخفاء", function () {
      post("publish", { ids: [l.id], unpublish: l.status !== "draft" }).then(function (d) { if (d.ok) { toast(l.status === "draft" ? "نُشرت للطلاب." : "أُخفيت عن الطلاب."); load(); } else toast(errText(d)); });
    });
    btn("تعديل موعد", function () { exception(l); });
    btn("حذف", function () { confirmDelete(l); }, "is-danger");
    r.appendChild(a);
    return r;
  }
  function renderExceptions() {
    var box = $("ttExc"); box.innerHTML = "";
    var list = state.exceptions.filter(function (x) { return x.date >= M.add(today, -7) || (x.new_date && x.new_date >= today); }).sort(function (a, b) { return a.date.localeCompare(b.date); });
    if (!list.length) { box.appendChild(el("div", "tt-empty", t("لا تعديلات على تواريخ محددة."))); return; }
    list.forEach(function (x) {
      var l = state.lectures.find(function (y) { return y.id === x.lecture_id; }); if (!l) return;
      var r = el("article", "tt-row");
      r.appendChild(el("span", "tt-time", x.date));
      var m = el("div", "tt-row-main");
      var s = el("strong", "", l.subject); s.setAttribute("dir", "auto");
      s.appendChild(el("span", "tt-chip " + (x.action === "cancel" ? "is-cancel" : "is-draft"), t(x.action === "cancel" ? "ملغاة" : "منقولة")));
      m.appendChild(s);
      var info = x.action === "move" ? [t("إلى") + " " + (x.new_date || x.date), (x.new_start || l.start) + "–" + (x.new_end || l.end), x.new_room && (t("القاعة") + " " + x.new_room)] : [];
      if (info.length || x.note) m.appendChild(bitsLine(info.concat([x.note])));
      r.appendChild(m);
      var a = el("div", "tt-row-acts"), b = el("button", "tt-btn", t("إرجاع الموعد الأصلي")); b.type = "button";
      b.onclick = function () { post("exception", { lecture_id: l.id, date: x.date, action: "clear" }).then(function (d) { if (d.ok) { toast("أُرجع الموعد الأصلي."); load(); } else toast(errText(d)); }); };
      a.appendChild(b); r.appendChild(a); box.appendChild(r);
    });
  }

  /* ---------- إضافة / تعديل ---------- */
  var editDlg = $("ttEdit"), editForm = editDlg.querySelector("form"), editing = null, force = false;
  M.WEEK.forEach(function (w) { var o = el("option", "", dayName(w)); o.value = w; editForm.weekday.appendChild(o); });
  function syncRepeat(form, sel, attr) {
    var v = form[sel].value;
    form.querySelectorAll("[" + attr + "]").forEach(function (x) { x.hidden = x.getAttribute(attr) !== v; });
  }
  editForm.repeat.onchange = function () { syncRepeat(editForm, "repeat", "data-for"); };
  function conflictBox(list, rowsLabel) {
    var w = el("div", "tt-warn"); w.appendChild(el("strong", "", t("يوجد تعارض في المواعيد:")));
    var ul = el("ul");
    list.slice(0, 8).forEach(function (c) {
      var kind = t(c.kind === "duplicate" ? "مكرّرة" : c.kind === "room" ? "نفس القاعة والوقت" : "تداخل في الوقت");
      var txt = c.existing ? kind + " — " + c.subject + " " + c.start + "–" + c.end + " (" + t(c.status === "draft" ? "مسودة" : "منشورة") + ")" : kind + " — " + rowsLabel(c);
      var li = el("li", "", txt); li.setAttribute("dir", "auto"); ul.appendChild(li);
    });
    w.appendChild(ul); return w;
  }
  function editor(l) {
    editing = l || null; force = false;
    $("ttEditTitle").textContent = t(l ? "تعديل محاضرة" : "إضافة محاضرة");
    $("ttEditMsg").innerHTML = ""; $("ttEditSave").textContent = t("حفظ");
    var f = editForm;
    f.subject.value = l ? l.subject : ""; f.topic.value = l ? l.topic : ""; f.lecturer.value = l ? l.lecturer : ""; f.room.value = l ? l.room : "";
    f.repeat.value = l ? l.repeat : "weekly"; f.weekday.value = l && l.weekday != null ? l.weekday : 0; f.date.value = l && l.date || "";
    f.start.value = l ? l.start : ""; f.end.value = l ? l.end : ""; f.from.value = l && l.from || ""; f.to.value = l && l.to || "";
    f.publish.checked = l ? l.status === "published" : false;
    syncRepeat(f, "repeat", "data-for");
    openDlg(editDlg); f.subject.focus();
  }
  editForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = editForm, body = { subject: f.subject.value, topic: f.topic.value, lecturer: f.lecturer.value, room: f.room.value, repeat: f.repeat.value, weekday: +f.weekday.value, date: f.date.value, start: f.start.value, end: f.end.value, from: f.from.value || null, to: f.to.value || null, publish: f.publish.checked, force: force };
    if (editing) body.id = editing.id;
    var save = $("ttEditSave"); save.disabled = true;
    post("save", body).then(function (d) {
      save.disabled = false;
      var msg = $("ttEditMsg"); msg.innerHTML = "";
      if (d.__status === 409 && d.conflicts) { force = true; msg.appendChild(conflictBox(d.conflicts)); save.textContent = t("حفظ رغم التعارض"); if (window.I18N) I18N.apply(); return; }
      if (!d.ok) { msg.appendChild(el("div", "tt-err", errText(d))); return; }
      closeDlg(editDlg); toast(editing ? "حُفظ التعديل." : "أُضيفت المحاضرة."); load();
    });
  });
  // أي تغيير في النموذج بعد التحذير يعيد الفحص
  editForm.addEventListener("input", function () { if (force) { force = false; $("ttEditSave").textContent = t("حفظ"); } });

  /* ---------- تعديل موعد واحد (إلغاء/نقل) ---------- */
  var excDlg = $("ttExcDlg"), excForm = excDlg.querySelector("form"), excFor = null;
  function nextOccurrence(l) {
    if (l.repeat === "once") return l.date;
    var d = today < (l.from || today) ? l.from : today;
    for (var i = 0; i < 7; i++) { var x = M.add(d, i); if (new Date(x + "T12:00:00").getDay() === l.weekday) return x; }
    return d;
  }
  excForm.action.onchange = function () { excForm.querySelectorAll("[data-for]").forEach(function (x) { x.hidden = excForm.action.value !== "move"; }); };
  function exception(l) {
    excFor = l;
    $("ttExcFor").textContent = l.subject + " · " + whenText(l) + " · " + l.start + "–" + l.end;
    $("ttExcMsg").innerHTML = "";
    excForm.reset(); excForm.date.value = nextOccurrence(l); excForm.action.value = "cancel"; excForm.action.onchange();
    openDlg(excDlg);
  }
  excForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = excForm;
    post("exception", { lecture_id: excFor.id, date: f.date.value, action: f.action.value, new_date: f.new_date.value || null, new_start: f.new_start.value || null, new_end: f.new_end.value || null, new_room: f.new_room.value || null, note: f.note.value }).then(function (d) {
      if (!d.ok) { $("ttExcMsg").replaceChildren(el("div", "tt-err", errText(d))); return; }
      closeDlg(excDlg); toast(f.action.value === "cancel" ? "أُلغيت المحاضرة في هذا اليوم." : "نُقلت المحاضرة."); load();
    });
  });

  /* ---------- حذف ---------- */
  function confirmDelete(l) {
    var d = $("ttConfirm");
    $("ttConfirmMsg").textContent = t("حذف المحاضرة نهائياً مع تعديلاتها؟") + " " + l.subject + " (" + whenText(l) + " " + l.start + ")";
    $("ttConfirmOk").onclick = function () {
      post("delete", { id: l.id }).then(function (r) { closeDlg(d); if (r.ok) { toast("حُذفت المحاضرة."); load(); } else toast(errText(r)); });
    };
    openDlg(d);
  }
  $("ttAdd").onclick = function () { editor(null); };
  $("ttPublishAll").onclick = function () {
    post("publish", {}).then(function (d) { if (d.ok) { toast("نُشرت المسودات للطلاب."); load(); } else toast(errText(d)); });
  };

  /* ---------- الاستيراد ---------- */
  var rows = [], issues = { errors: [], conflicts: [] }, checked = false;
  var imp = $("ttImport"), status = $("ttImpStatus");
  $("ttImportBtn").onclick = function () { imp.hidden = false; imp.scrollIntoView({ behavior: "smooth", block: "start" }); };
  $("ttImpClose").onclick = function () { imp.hidden = true; };
  function setStatus(s) { status.textContent = t(s); }
  function loadScript(src) {
    return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  }
  var PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  function pdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return loadScript(PDFJS).then(function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS.replace("pdf.min.js", "pdf.worker.min.js"); return window.pdfjsLib; });
  }
  function serverExtract(blob, name) {
    var fd = new FormData(); fd.append("file", blob, name);
    return fetch("api/timetable/admin/extract", { method: "POST", body: fd, credentials: "same-origin" }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.__status = r.status; return d; });
    }, function () { return { error: "network" }; });
  }
  function fromServer(d) {
    if (!d.ok) throw d;
    return d.mode === "text" ? P.parseText(d.text) : d.rows;
  }
  function readPdf(file) {
    return pdfjs().then(function (lib) {
      return file.arrayBuffer().then(function (buf) { return lib.getDocument({ data: new Uint8Array(buf) }).promise; }).then(function (doc) {
        var pages = [], chars = 0, n = Math.min(doc.numPages, 10);
        var chain = Promise.resolve();
        for (var i = 1; i <= n; i++) (function (i) {
          chain = chain.then(function () { return doc.getPage(i); }).then(function (pg) {
            return pg.getTextContent().then(function (tc) {
              var items = tc.items.map(function (it) { chars += (it.str || "").trim().length; return { str: it.str, x: it.transform[4], y: it.transform[5], w: it.width }; });
              pages.push({ page: pg, items: items });
            });
          });
        })(i);
        return chain.then(function () {
          if (chars >= 20) { var out = []; pages.forEach(function (p) { out = out.concat(P.parseItems(p.items)); }); return out; }
          // PDF ممسوح بلا نص: نرسم الصفحات صوراً ونقرأها على الخادم
          setStatus("الملف صورة ممسوحة. نقرؤه على الخادم…");
          var all = [], c2 = Promise.resolve();
          pages.slice(0, 3).forEach(function (p, k) {
            c2 = c2.then(function () {
              var v = p.page.getViewport({ scale: 2 }), cv = document.createElement("canvas"); cv.width = v.width; cv.height = v.height;
              return p.page.render({ canvasContext: cv.getContext("2d"), viewport: v }).promise.then(function () {
                return new Promise(function (ok) { cv.toBlob(ok, "image/png"); });
              }).then(function (blob) { return serverExtract(blob, "page-" + (k + 1) + ".png"); }).then(function (d) { all = all.concat(fromServer(d)); });
            });
          });
          return c2.then(function () { return all; });
        });
      });
    }, function () {
      // مكتبة PDF محجوبة: نحوّل الملف إلى نص على الخادم
      return serverExtract(file, file.name).then(fromServer);
    });
  }
  function handleFile(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setStatus(ERR.too_large); return; }
    setStatus("جارٍ قراءة الملف…");
    var job = file.type === "application/pdf" ? readPdf(file) : /^image\//.test(file.type) ? serverExtract(file, file.name).then(fromServer) : Promise.reject({ error: "bad_type" });
    job.then(function (r) { showRows(r, true); }, function (d) { setStatus(errText(d)); });
  }
  $("ttFile").onchange = function () { handleFile(this.files[0]); this.value = ""; };
  var drop = $("ttDrop");
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-over"); }); });
  drop.addEventListener("drop", function (e) { handleFile(e.dataTransfer.files[0]); });
  $("ttPasteGo").onclick = function () { showRows(P.parseText($("ttPaste").value), true); };

  function showRows(r, fresh) {
    rows = (r || []).map(function (x) { return { weekday: x.weekday, start: x.start || "", end: x.end || "", subject: x.subject || "", topic: x.topic || "", lecturer: x.lecturer || "", room: x.room || "" }; });
    rows.sort(function (a, b) { return (M.WEEK.indexOf(a.weekday) - M.WEEK.indexOf(b.weekday)) || a.start.localeCompare(b.start); });
    issues = { errors: [], conflicts: [] }; checked = false;
    $("ttPreview").hidden = false;
    if (fresh) setStatus(rows.length ? t("وجدنا") + " " + rows.length + " " + t("محاضرة. راجعها وصحّح ما يلزم، ثم افحص التعارض واعتمد.") : "لم نتعرّف على محاضرات في الملف. أضف الصفوف يدوياً أو الصق النص.");
    if (fresh && !rows.length) rows.push(blank());
    drawRows();
  }
  function blank() { return { weekday: 0, start: "", end: "", subject: "", topic: "", lecturer: "", room: "" }; }
  function drawRows() {
    var tb = $("ttRows"); tb.innerHTML = "";
    var bad = {}, conf = {};
    issues.errors.forEach(function (e) { bad[e.row] = true; });
    issues.conflicts.forEach(function (c) { conf[c.a] = true; if (c.b !== undefined) conf[c.b] = true; });
    rows.forEach(function (r, i) {
      var tr = el("tr", bad[i] ? "is-invalid" : conf[i] ? "is-conflict" : "");
      var td = function (cls, node) { var c = el("td", cls); c.appendChild(node); tr.appendChild(c); };
      var sel = el("select"); sel.setAttribute("aria-label", t("اليوم"));
      var none = el("option", "", "—"); none.value = ""; sel.appendChild(none);
      M.WEEK.forEach(function (w) { var o = el("option", "", dayName(w)); o.value = w; sel.appendChild(o); });
      sel.value = r.weekday == null ? "" : r.weekday;
      sel.onchange = function () { r.weekday = sel.value === "" ? null : +sel.value; checked = false; };
      td("t-day", sel);
      ["start", "end"].forEach(function (k) { var inp = el("input"); inp.type = "time"; inp.value = r[k]; inp.setAttribute("aria-label", t(k === "start" ? "من الساعة" : "إلى الساعة")); inp.oninput = function () { r[k] = inp.value; checked = false; }; td("t-time", inp); });
      ["subject", "topic", "lecturer", "room"].forEach(function (k) { var inp = el("input"); inp.value = r[k]; inp.dir = "auto"; inp.setAttribute("aria-label", t({ subject: "المادة", topic: "العنوان", lecturer: "الأستاذ", room: "القاعة" }[k])); inp.oninput = function () { r[k] = inp.value; checked = false; }; td("", inp); });
      var del = el("button", "tt-btn is-danger", "×"); del.type = "button"; del.setAttribute("aria-label", t("حذف الصف")); del.onclick = function () { rows.splice(i, 1); issues = { errors: [], conflicts: [] }; drawRows(); };
      td("", del);
      tb.appendChild(tr);
    });
    var box = $("ttImpIssues"); box.innerHTML = "";
    if (issues.errors.length) box.appendChild(el("div", "tt-err", t("صفوف ناقصة:") + " " + issues.errors.map(function (e) { return (e.row + 1) + " (" + errText(e) + ")"; }).join("، ")));
    if (issues.conflicts.length) box.appendChild(conflictBox(issues.conflicts, function (c) { return t("الصف") + " " + (c.a + 1) + (c.b !== undefined ? " " + t("مع الصف") + " " + (c.b + 1) : ""); }));
    $("ttForceWrap").hidden = !issues.conflicts.length;
    if (window.I18N) I18N.apply();
  }
  var payload = function () { return rows.map(function (r) { return { repeat: "weekly", weekday: r.weekday, start: r.start, end: r.end, subject: r.subject, topic: r.topic, lecturer: r.lecturer, room: r.room }; }); };
  $("ttRowAdd").onclick = function () { rows.push(blank()); drawRows(); };
  function check() {
    if (!rows.length) return Promise.resolve(null);
    setStatus("جارٍ الفحص…");
    return post("check", { rows: payload() }).then(function (d) {
      if (!d.ok) { setStatus(errText(d)); return null; }
      issues = { errors: d.errors, conflicts: d.conflicts }; checked = true; drawRows();
      setStatus(!d.errors.length && !d.conflicts.length ? "لا أخطاء ولا تعارض. يمكنك الاعتماد." : "راجع الصفوف المظللة.");
      return d;
    });
  }
  $("ttCheck").onclick = check;
  $("ttApprove").onclick = function () {
    (checked ? Promise.resolve(issues) : check()).then(function (d) {
      if (!d || d.errors.length) return;
      if (d.conflicts.length && !$("ttForce").checked) { setStatus("يوجد تعارض. صحّحه أو فعّل «اعتمد رغم التعارض»."); return; }
      var publish = $("ttImpPublish").checked;
      post("import", { rows: payload(), publish: publish, force: $("ttForce").checked }).then(function (r) {
        if (!r.ok) { if (r.errors || r.conflicts) { issues = { errors: r.errors || [], conflicts: r.conflicts || [] }; drawRows(); } setStatus(errText(r)); return; }
        toast(publish ? "اعتُمد الجدول ونُشر للطلاب." : "اعتُمد الجدول كمسودات. انشرها حين تكون جاهزة.");
        rows = []; $("ttPreview").hidden = true; imp.hidden = true; setStatus(""); load();
      });
    });
  };

  /* ---------- البوابة ---------- */
  M.fetchJson("api/timetable/access").then(function (a) {
    if (a.admin) { $("ttApp").hidden = false; load(); return; }
    var g = $("ttGate"); g.hidden = false;
    if (a.signedIn) { $("ttGateMsg").textContent = t("حسابك ليس حساب مشرف."); var l = $("ttGateLink"); l.textContent = t("العودة للرئيسية"); l.href = "index.html"; }
    if (window.I18N) I18N.apply();
  });
})();
