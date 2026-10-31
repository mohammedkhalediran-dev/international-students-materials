/* js/exams.js — التقويم والامتحانات (بطلب محمد 2026-10-31).
   الصلاحية تُفحص في الخادم (/api/exams)؛ هنا فقط نعرض أو نخفي. لا بيانات تجريبية: كل ما يظهر من قاعدة البيانات. */
(function () {
  "use strict";
  var t = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  var lang = function () { return (document.documentElement.lang || "ar").slice(0, 2); };
  var DOW = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]; // الأسبوع الجامعي يبدأ السبت
  var KIND = { theory: "نظري", practical: "عملي", quiz: "اختبار قصير", other: "أخرى" };
  var items = [], admin = false, view = null;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function locale() { return { ar: "ar-IQ-u-nu-latn", fa: "fa-IR-u-nu-latn", en: "en-GB" }[lang()] || "ar"; }
  function fmt(d, o) { try { return d.toLocaleDateString(locale(), o); } catch (e) { return iso(d); } }
  function daysFrom(s, today) { return Math.round((parse(s) - parse(today)) / 864e5); }
  function countdown(n) {
    var L = lang();
    if (n === 0) return L === "en" ? "Today" : L === "fa" ? "امروز" : "اليوم";
    if (n === 1) return L === "en" ? "Tomorrow" : L === "fa" ? "فردا" : "غداً";
    return L === "en" ? "In " + n + " days" : L === "fa" ? n + " روز دیگر" : "بعد " + n + " يوم";
  }

  function fetchJson(url, opts) {
    return fetch(url, Object.assign({ credentials: "same-origin", cache: "no-store" }, opts || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.__status = r.status; return d; });
    }, function () { return { __status: 0, error: "network" }; });
  }
  function post(path, body) {
    return fetchJson("api/exams/admin/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  /* ---------- بطاقة امتحان ---------- */
  function card(x, today, past) {
    var c = el("article", "ex-card k-" + x.kind);
    var d = parse(x.date), dt = el("div", "ex-date");
    dt.appendChild(el("b", "", String(d.getDate())));
    dt.appendChild(el("span", "", fmt(d, { month: "short" })));
    c.appendChild(dt);
    var info = el("div", "ex-info");
    info.appendChild(el("strong", "", x.subject)).setAttribute("dir", "auto");
    var meta = el("div", "ex-meta");
    meta.appendChild(el("span", "ex-kind", t(KIND[x.kind] || KIND.other)));
    meta.appendChild(el("span", "", fmt(d, { weekday: "long", day: "numeric", month: "long" })));
    if (x.start) meta.appendChild(el("span", "", x.start));
    if (x.room) meta.appendChild(el("span", "", x.room));
    info.appendChild(meta);
    if (x.note) info.appendChild(el("p", "ex-note", x.note));
    c.appendChild(info);
    var side = el("div", "ex-side");
    if (!past) { var n = daysFrom(x.date, today); side.appendChild(el("span", "ex-count" + (n <= 3 ? " is-soon" : ""), countdown(n))); }
    if (admin) {
      var a = el("div", "ex-admin");
      var e = el("button", "ex-btn is-sm", t("تعديل")); e.type = "button"; e.onclick = function () { openForm(x); };
      var r = el("button", "ex-btn is-sm is-danger", t("حذف")); r.type = "button"; r.onclick = function () { remove(x); };
      a.appendChild(e); a.appendChild(r); side.appendChild(a);
    }
    c.appendChild(side);
    return c;
  }

  function renderLists() {
    var today = iso(new Date()), up = $("exList"), past = $("exPast");
    up.textContent = ""; past.textContent = "";
    var coming = items.filter(function (x) { return x.date >= today; });
    var gone = items.filter(function (x) { return x.date < today; }).reverse();
    if (!coming.length) up.appendChild(el("p", "ex-empty", t("لا امتحانات قادمة.")));
    coming.forEach(function (x) { up.appendChild(card(x, today, false)); });
    gone.forEach(function (x) { past.appendChild(card(x, today, true)); });
    $("exPastBox").hidden = !gone.length;
  }

  /* ---------- التقويم الشهري (الأسبوع يبدأ السبت) ---------- */
  function renderCal() {
    var cal = $("exCal"), today = iso(new Date());
    cal.textContent = "";
    var first = new Date(view.y, view.m, 1);
    $("exMonthLabel").textContent = fmt(first, { month: "long", year: "numeric" });
    DOW.forEach(function (d) { cal.appendChild(el("div", "ex-dow", t(d))); });
    var lead = (first.getDay() + 1) % 7, total = Math.ceil((lead + new Date(view.y, view.m + 1, 0).getDate()) / 7) * 7;
    var by = {};
    items.forEach(function (x) { (by[x.date] = by[x.date] || []).push(x); });
    for (var i = 0; i < total; i++) {
      var d = new Date(view.y, view.m, 1 - lead + i), key = iso(d);
      var cell = el("div", "ex-day" + (d.getMonth() !== view.m ? " is-out" : "") + (key === today ? " is-today" : ""));
      cell.appendChild(el("span", "ex-num", String(d.getDate())));
      (by[key] || []).forEach(function (x) {
        var chip = el("button", "ex-chip k-" + x.kind, x.subject);
        chip.type = "button"; chip.title = x.subject + " — " + t(KIND[x.kind] || KIND.other);
        chip.onclick = function () { if (admin) openForm(x); else document.getElementById("exList").scrollIntoView({ behavior: "smooth" }); };
        cell.appendChild(chip);
      });
      cal.appendChild(cell);
    }
  }

  /* ---------- الإضافة والتعديل والحذف (المشرف) ---------- */
  function openForm(x) {
    var f = $("exForm"); f.reset(); $("exErr").hidden = true;
    f.dataset.id = x ? x.id : "";
    $("exDlgTitle").textContent = t(x ? "تعديل امتحان" : "إضافة امتحان");
    if (x) { f.subject.value = x.subject; f.kind.value = x.kind; f.date.value = x.date; f.start.value = x.start || ""; f.room.value = x.room || ""; f.note.value = x.note || ""; }
    else f.date.value = iso(new Date());
    $("exDlg").showModal();
  }
  function save(ev) {
    ev.preventDefault();
    var f = $("exForm"), id = f.dataset.id ? +f.dataset.id : null;
    var body = { subject: f.subject.value, kind: f.kind.value, date: f.date.value, start: f.start.value, room: f.room.value, note: f.note.value };
    if (id) body.id = id;
    post("save", body).then(function (d) {
      if (d.__status === 200 && d.ok) { $("exDlg").close(); load(); return; }
      var e = $("exErr"); e.hidden = false;
      e.textContent = t(d.error === "not_migrated" ? "الامتحانات غير مفعّلة بعد." : d.error === "bad_date" ? "التاريخ غير صحيح." : d.error === "subject_required" ? "اكتب اسم المادة." : "تعذّر الحفظ. حاول لاحقاً.");
    });
  }
  function remove(x) {
    if (!window.confirm(t("حذف هذا الامتحان؟") + "\n" + x.subject)) return;
    post("delete", { id: x.id }).then(function (d) { if (d.__status === 200 && d.ok) load(); else window.alert(t("تعذّر الحذف. حاول لاحقاً.")); });
  }

  function gate(kind) {
    $("exBody").hidden = true; $("exAdd").hidden = true;
    var g = $("exGate"); g.hidden = false;
    var h = g.querySelector("h2"), p = g.querySelector("p"), a = g.querySelector("a");
    if (kind === "guest") { h.textContent = t("سجّل الدخول لرؤية الامتحانات"); p.textContent = t("التقويم والامتحانات متاحان لطلاب الكورس الثالث بحساب مسجّل."); }
    else if (kind === "denied") { h.textContent = t("الامتحانات غير متاحة لحسابك"); p.textContent = t("التقويم والامتحانات متاحان لطلاب الكورس الثالث. غيّر كورسك من الإعدادات إن كان ذلك خطأ."); a.hidden = true; }
    else { h.textContent = t("تعذّر تحميل الامتحانات"); p.textContent = t(kind === "not_migrated" ? "الامتحانات غير مفعّلة بعد." : "تحقق من اتصالك ثم أعد المحاولة."); a.hidden = true; }
    if (window.I18N && I18N.apply) I18N.apply();
  }

  function load() {
    fetchJson("api/exams").then(function (d) {
      if (d.__status === 401) return gate("guest");
      if (d.__status === 403) return gate("denied");
      if (d.__status !== 200 || !d.ok) return gate(d.error === "not_migrated" ? "not_migrated" : "error");
      items = d.items || [];
      $("exBody").hidden = false; $("exGate").hidden = true;
      renderLists(); renderCal();
      if (window.I18N && I18N.apply) I18N.apply();
    });
  }

  function init() {
    var now = new Date(); view = { y: now.getFullYear(), m: now.getMonth() };
    $("exPrev").onclick = function () { view.m--; if (view.m < 0) { view.m = 11; view.y--; } renderCal(); };
    $("exNext").onclick = function () { view.m++; if (view.m > 11) { view.m = 0; view.y++; } renderCal(); };
    $("exForm").addEventListener("submit", save);
    $("exDlg").addEventListener("click", function (e) { if (e.target.hasAttribute("data-close") || e.target === $("exDlg")) $("exDlg").close(); });
    $("exAdd").onclick = function () { openForm(null); };
    fetchJson("api/exams/access").then(function (a) {
      if (a.__status !== 200) return gate("error");
      if (!a.signedIn) return gate("guest");
      if (!a.allowed) return gate("denied");
      admin = !!a.admin; $("exAdd").hidden = !admin;
      load();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
