/* js/grades-admin.js — إدارة الدرجات للمشرف (Step 57).
   الملف يُقرأ في المتصفح (نسخ من Excel/Numbers أو CSV)، ثم تُرسل الصفوف إلى /api/grades/admin/upload
   والخادم يحوّل أرقام الجوازات إلى بصمات ولا يحفظها. الخادم يتحقق أن الحساب مشرف؛ الواجهة هنا لا تمنح أي صلاحية. */
(function () {
  "use strict";

  /* ---------- قراءة الجدول (تُختبر في tests/grades_parse_check.cjs) ---------- */
  var GRParse = {
    // يقسم النص إلى صفوف وخلايا: يكتشف الفاصل (Tab من Excel، أو فاصلة/فاصلة منقوطة من CSV) ويحترم علامات الاقتباس
    table: function (text) {
      text = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
      var first = text.split("\n").find(function (l) { return l.trim(); }) || "";
      var count = function (c) { return first.split(c).length - 1; };
      var delim = count("\t") ? "\t" : count(";") > count(",") ? ";" : ",";
      var rows = [], row = [], cell = "", q = false;
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (q) {
          if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
          else cell += ch;
        } else if (ch === '"' && !cell) q = true;
        else if (ch === delim) { row.push(cell.trim()); cell = ""; }
        else if (ch === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
        else cell += ch;
      }
      if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
      return rows.filter(function (r) { return r.some(function (c) { return c !== ""; }); });
    },
    // يخمّن الأعمدة من صف العناوين (عربي/فارسي/إنجليزي)
    guess: function (header) {
      var tests = {
        passport: /pass|جواز|گذرنامه|پاسپورت|گذر نامه|code|رمز|کد/i, // Step 61: «Student code» من قائمة الملفات الشخصية
        name: /name|اسم|نام|الطالب|student/i,
        course: /course|subject|module|مادة|المادة|مقرر|درس|الدرس/i,
        grade: /grade|mark|score|result|درجة|الدرجة|الدرجه|نمره|نمرة|النتيجة|علامة/i
      };
      var out = { name: -1, passport: -1, course: -1, grade: -1 };
      ["passport", "course", "grade", "name"].forEach(function (k) {
        for (var i = 0; i < header.length; i++) {
          var used = Object.keys(out).some(function (o) { return out[o] === i; });
          if (!used && tests[k].test(header[i] || "")) { out[k] = i; break; }
        }
      });
      return out;
    },
    // يبني صفوف الرفع من الخرائط، ويعيد المشاكل لكل صف
    rows: function (table, map, hasHeader) {
      var body = hasHeader ? table.slice(1) : table, out = [], issues = [];
      body.forEach(function (r, i) {
        var o = { name: map.name >= 0 ? r[map.name] || "" : "", passport: r[map.passport] || "", course: r[map.course] || "", grade: r[map.grade] || "" };
        // رمز الطالب (M123) من قائمة الملفات الشخصية يُرسل بدل الجواز
        if (/^\s*M\d+\s*$/i.test(o.passport)) { o.code = o.passport.trim().toUpperCase(); o.passport = ""; }
        // صف من قائمة الطلاب لم تُكتب له مادة ولا درجة: يُتجاهل بدل أن يمنع الرفع
        if (o.code && !String(o.course).trim() && !String(o.grade).trim()) return;
        var miss = ["passport", "course", "grade"].filter(function (k) { return !String(k === "passport" ? o.passport || o.code || "" : o[k]).trim(); });
        if (miss.length) issues.push({ row: i + (hasHeader ? 2 : 1), missing: miss });
        out.push(o);
      });
      return { rows: out, issues: issues };
    },
    mask: function (p) { p = String(p || "").replace(/\s/g, ""); return p.length > 3 ? "•••" + p.slice(-3) : "•••"; },
    // Step 61: قائمة الطلاب بصيغة CSV يفتحها Excel/Numbers (BOM للعربية)، ويُملأ فيها عمودا Subject وGrade ثم تُلصق للرفع
    rosterCsv: function (students) {
      var q = function (v) { v = String(v == null ? "" : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var lines = [["Student code", "Full name", "Email", "Semester", "Subject", "Grade"].join(",")];
      students.forEach(function (s) { lines.push([s.code, s.fullName, s.email, s.semester || "", "", ""].map(q).join(",")); });
      return "\ufeff" + lines.join("\r\n") + "\r\n";
    }
  };
  window.GRParse = GRParse;
  if (typeof document === "undefined" || !document.getElementById("grApp")) return;

  /* ---------- الصفحة ---------- */
  var t = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  var lang = function () { return (document.documentElement.lang || "ar").slice(0, 2); };
  if (window.MS && MS.initShared) { MS.initShared(); MS.initHeader(); }

  var ERR = {
    forbidden: "هذه العملية للمشرف فقط.", unauthorized: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
    not_configured: "المفتاح السري GRADES_SECRET غير مضبوط في Cloudflare بعد.", not_migrated: "جداول الدرجات أو الملف الشخصي غير موجودة في قاعدة البيانات بعد (migrations/0007_grades.sql و0008_profile.sql).",
    title_required: "اكتب اسماً للدفعة.", empty: "الملف فارغ.", too_many_rows: "الملف كبير جداً (أكثر من 3000 صف). قسّمه إلى ملفين.",
    invalid_rows: "بعض الصفوف ناقصة أو رقم الجواز فيها غير صحيح.", name_mismatch: "رقم جواز واحد ظهر باسمين مختلفين. راجع الأعمدة.",
    network: "لا اتصال بالإنترنت.", bad_request: "البيانات غير مكتملة.", not_found: "لم يعد هذا العنصر موجوداً.",
    unknown_code: "رمز طالب غير معروف (من قائمة الطلاب). نزّل القائمة من جديد."
  };
  var errText = function (d) { return t(ERR[d && d.error] || "حدث خطأ. حاول مرة أخرى."); };
  function fetchJson(url, opts) {
    return fetch(url, Object.assign({ credentials: "same-origin", cache: "no-store" }, opts || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.__status = r.status; return d; });
    }, function () { return { __status: 0, error: "network" }; });
  }
  function post(path, body) { return fetchJson("api/grades/admin/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
  var toastTimer;
  function toast(msg) { var x = $("grToast"); x.textContent = t(msg); x.classList.add("is-on"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { x.classList.remove("is-on"); }, 2800); }
  function fmtDate(ms) {
    var loc = { ar: "ar-IQ-u-nu-latn", fa: "fa-IR-u-nu-latn", en: "en-GB" }[lang()] || "ar";
    try { return new Date(ms).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; }
  }
  function stat(box, label, value) { var c = el("span", "tt-stat"); c.appendChild(el("span", "", t(label) + ": ")); c.appendChild(el("b", "", String(value))); box.appendChild(c); }

  /* ---------- الملخص ---------- */
  var state = { batches: [], people: [] };
  function load() {
    return fetchJson("api/grades/admin/summary").then(function (d) {
      if (d.__status === 401 || d.__status === 403) { $("grGate").hidden = false; $("grApp").hidden = true; if (d.__status === 403) $("grGateMsg").textContent = t("حسابك ليس حساب مشرف."); return; }
      $("grGate").hidden = true; $("grApp").hidden = false;
      if (d.__status !== 200) { $("grBatches").replaceChildren(el("div", "tt-err", errText(d))); $("grPeople").replaceChildren(); return; }
      state = { batches: d.batches || [], people: d.people || [] };
      render();
    });
  }
  function render() {
    var s = $("grStats"); s.replaceChildren();
    var linked = state.people.filter(function (p) { return p.linked; }).length;
    stat(s, "عدد الدفعات", state.batches.length); stat(s, "عدد الطلاب", state.people.length); stat(s, "ربطوا حساباتهم", linked);
    var bl = $("grBatches"); bl.replaceChildren();
    if (!state.batches.length) bl.appendChild(el("div", "tt-empty", t("لم تُرفع درجات بعد.")));
    var list = el("div", "gr-list");
    state.batches.forEach(function (b) {
      var row = el("div", "gr-item"), main = el("div", "gr-item-main"), title = el("strong", "", b.title);
      title.dir = "auto"; main.appendChild(title);
      main.appendChild(el("small", "", fmtDate(b.at) + " · " + t("عدد الطلاب") + ": " + b.students + " · " + t("عدد الدرجات") + ": " + b.rows + " · " + t("ربطوا حساباتهم") + ": " + b.linked));
      var del = el("button", "tt-btn is-danger", t("حذف الدفعة")); del.type = "button";
      del.onclick = function () {
        if (!window.confirm(t("حذف هذه الدفعة؟ ستختفي درجاتها من حسابات الطلاب.") + "\n" + b.title)) return;
        post("delete-batch", { id: b.id }).then(function (d) { if (d.__status === 200) { toast("حُذفت الدفعة."); load(); } else toast(errText(d)); });
      };
      row.appendChild(main); row.appendChild(del); list.appendChild(row);
    });
    bl.appendChild(list);
    renderPeople();
    if (window.I18N) I18N.apply();
  }
  function renderPeople() {
    var q = ($("grSearch").value || "").trim().toLowerCase();
    var box = $("grPeople"); box.replaceChildren();
    var items = state.people.filter(function (p) { return !q || (p.name || "").toLowerCase().indexOf(q) >= 0 || (p.user && ((p.user.email || "").toLowerCase().indexOf(q) >= 0 || (p.user.name || "").toLowerCase().indexOf(q) >= 0)); });
    if (!state.people.length) { box.appendChild(el("div", "tt-empty", t("لا طلاب بعد."))); return; }
    var list = el("div", "gr-list");
    items.slice(0, 300).forEach(function (p) {
      var pname = p.user && p.user.profileName || "";
      var row = el("div", "gr-item"), main = el("div", "gr-item-main"), name = el("strong", "", p.name || pname || t("بلا اسم"));
      name.dir = "auto"; main.appendChild(name);
      // Step 61: الاسم الذي كتبه الطالب في ملفه الشخصي، ومعه تنبيه إن اختلف عن اسم ملف الدرجات
      if (pname && p.name && simple(pname) !== simple(p.name)) {
        var diff = el("small", "gr-mismatch"); diff.appendChild(document.createTextNode(t("الاسم في الملف الشخصي مختلف") + ": "));
        var pn = el("bdi", "", pname); diff.appendChild(pn); main.appendChild(diff);
      }
      if (!p.rows) main.appendChild(el("small", "", t("أكمل ملفه الشخصي؛ تلحقه درجاته عند رفعها.")));
      var info = el("small");
      var badge = el("span", "gr-badge" + (p.linked ? " is-on" : ""), t(p.linked ? "الحساب مربوط" : "لم يربط بعد"));
      info.appendChild(badge);
      if (p.user) { var acc = el("span", "", " " + p.user.email); acc.dir = "ltr"; info.appendChild(acc); }
      main.appendChild(info);
      row.appendChild(main);
      if (p.linked) {
        var un = el("button", "tt-btn", t("فك الربط")); un.type = "button";
        un.onclick = function () {
          if (!window.confirm(t("فك ربط هذا الطالب بحسابه؟ سيحتاج صاحب الجواز أن يكتب رقمه مرة أخرى.") + "\n" + (p.name || ""))) return;
          post("unlink", { person_id: p.id }).then(function (d) { if (d.__status === 200) { toast("فُك الربط."); load(); } else toast(errText(d)); });
        };
        row.appendChild(un);
      }
      list.appendChild(row);
    });
    box.appendChild(list);
    if (items.length > 300) box.appendChild(el("p", "tt-sub", t("تظهر أول 300 نتيجة. استعمل البحث.")));
    if (window.I18N) I18N.apply();
  }
  $("grSearch").addEventListener("input", renderPeople);
  function simple(n) { return String(n || "").toLowerCase().normalize("NFKD").replace(/[^a-z\u0600-\u06ff]+/g, " ").trim().split(" ").sort().join(" "); }

  /* ---------- Step 61: قائمة الطلاب من ملفاتهم الشخصية ---------- */
  $("grRoster").addEventListener("click", function () {
    var btn = $("grRoster"); btn.disabled = true; $("grRosterStatus").textContent = t("جارٍ التحميل…");
    fetchJson("api/grades/admin/roster").then(function (d) {
      btn.disabled = false;
      if (d.__status !== 200) { $("grRosterStatus").textContent = errText(d); return; }
      var list = d.students || [];
      $("grRosterStatus").textContent = t("عدد الطلاب") + ": " + list.length;
      if (!list.length) return;
      var url = URL.createObjectURL(new Blob([GRParse.rosterCsv(list)], { type: "text/csv;charset=utf-8" }));
      var a = document.createElement("a"); a.href = url; a.download = "medixa-students.csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    });
  });

  /* ---------- الرفع ---------- */
  var parsed = null; // { table, hasHeader } — يبقى في الذاكرة فقط ويُمسح بعد الرفع
  var selects = [].slice.call(document.querySelectorAll("#grMap select[data-col]"));
  function setText(text) {
    var table = GRParse.table(text);
    if (!table.length) { clearUpload(); return; }
    var g = GRParse.guess(table[0]);
    var hasHeader = g.passport >= 0 || g.course >= 0 || g.grade >= 0;
    parsed = { table: table, hasHeader: hasHeader };
    var width = table.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    selects.forEach(function (sel) {
      var k = sel.getAttribute("data-col");
      sel.replaceChildren();
      var none = el("option", "", k === "name" ? t("— بلا اسم —") : t("— اختر —")); none.value = "-1"; sel.appendChild(none);
      for (var i = 0; i < width; i++) {
        var label = hasHeader ? (table[0][i] || t("العمود رقم") + " " + (i + 1)) : t("العمود رقم") + " " + (i + 1);
        var o = el("option", "", label); o.value = String(i); sel.appendChild(o);
      }
      sel.value = String(hasHeader ? g[k] : -1);
    });
    $("grMap").hidden = false;
    preview();
  }
  function currentMap() { var m = {}; selects.forEach(function (s) { m[s.getAttribute("data-col")] = +s.value; }); return m; }
  function preview() {
    if (!parsed) return;
    var map = currentMap(), body = $("grPrevBody"), issuesBox = $("grIssues"), st = $("grPrevStats");
    body.replaceChildren(); issuesBox.replaceChildren(); st.replaceChildren();
    var missingCols = ["passport", "course", "grade"].filter(function (k) { return map[k] < 0; });
    if (missingCols.length) { issuesBox.appendChild(el("div", "tt-err", t("اختر أعمدة رقم الجواز والمادة والدرجة."))); $("grUpload").disabled = true; return; }
    var res = GRParse.rows(parsed.table, map, parsed.hasHeader);
    var students = {}; res.rows.forEach(function (r) { var k = String(r.passport || r.code || "").replace(/\s/g, "").toUpperCase(); if (k) students[k] = 1; });
    stat(st, "عدد الصفوف", res.rows.length); stat(st, "عدد الطلاب", Object.keys(students).length); stat(st, "صفوف ناقصة", res.issues.length);
    res.rows.slice(0, 15).forEach(function (r, i) {
      var tr = el("tr"), bad = res.issues.some(function (x) { return x.row === i + (parsed.hasHeader ? 2 : 1); });
      if (bad) tr.className = "is-invalid";
      [r.name, r.code || GRParse.mask(r.passport), r.course, r.grade].forEach(function (v, j) { var td = el("td", "", v); td.dir = j === 1 ? "ltr" : "auto"; tr.appendChild(td); });
      body.appendChild(tr);
    });
    if (res.issues.length) issuesBox.appendChild(el("div", "tt-err", t("صفوف ناقصة (رقم الصف في الملف)") + ": " + res.issues.slice(0, 20).map(function (x) { return x.row; }).join("، ")));
    $("grUpload").disabled = !!res.issues.length || !res.rows.length;
    if (window.I18N) I18N.apply();
  }
  selects.forEach(function (s) { s.addEventListener("change", preview); });
  $("grPaste").addEventListener("input", function () { setText($("grPaste").value); });
  $("grFile").addEventListener("change", function () {
    var f = $("grFile").files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { $("grUpStatus").textContent = t("الملف أكبر من 2 ميغابايت."); return; }
    var r = new FileReader();
    r.onload = function () { $("grPaste").value = ""; setText(String(r.result || "")); $("grUpStatus").textContent = t("قُرئ الملف") + ": " + f.name; };
    r.readAsText(f, "utf-8");
  });
  function clearUpload() {
    parsed = null; $("grPaste").value = ""; $("grFile").value = ""; $("grMap").hidden = true;
    $("grPrevBody").replaceChildren(); $("grIssues").replaceChildren(); $("grPrevStats").replaceChildren();
  }
  $("grClear").addEventListener("click", function () { clearUpload(); $("grUpStatus").textContent = ""; });
  $("grUpload").addEventListener("click", function () {
    if (!parsed) return;
    var title = $("grTitleIn").value.trim();
    if (!title) { $("grUpStatus").textContent = t(ERR.title_required); $("grTitleIn").focus(); return; }
    var res = GRParse.rows(parsed.table, currentMap(), parsed.hasHeader);
    if (!window.confirm(t("رفع الدرجات؟") + "\n" + title + "\n" + t("عدد الصفوف") + ": " + res.rows.length)) return;
    var btn = $("grUpload"); btn.disabled = true; $("grUpStatus").textContent = t("جارٍ الرفع…");
    post("upload", { title: title, rows: res.rows }).then(function (d) {
      btn.disabled = false;
      if (d.__status === 200) {
        clearUpload(); $("grTitleIn").value = "";
        $("grUpStatus").textContent = t("رُفعت الدرجات") + ". " + t("عدد الطلاب") + ": " + d.students + " · " + t("عدد الدرجات") + ": " + d.rows;
        load();
      } else {
        var extra = d.rows && d.rows.length ? " (" + t("صفوف ناقصة (رقم الصف في الملف)") + ": " + d.rows.slice(0, 15).map(function (i) { return i + (parsed && parsed.hasHeader ? 2 : 1); }).join("، ") + ")" : "";
        $("grUpStatus").textContent = errText(d) + extra;
      }
    });
  });

  load();
  if (window.I18N) I18N.apply();
})();
