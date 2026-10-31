/* js/exams-home.js — بطاقة «الامتحان القادم» في الرئيسية (خلال 30 يوماً). تظهر لمن يحق له (الكورس الثالث أو المشرف) فقط؛
   الخادم هو الذي يقرر (/api/exams). لا شيء يظهر للزائر أو إن لم يوجد امتحان قريب. */
(function () {
  "use strict";
  var anchor = document.getElementById("ttHome");
  if (!anchor) return;
  var t = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  var lang = function () { return (document.documentElement.lang || "ar").slice(0, 2); };
  var KIND = { theory: "نظري", practical: "عملي", quiz: "اختبار قصير", other: "أخرى" };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmt(d, o) { var loc = { ar: "ar-IQ-u-nu-latn", fa: "fa-IR-u-nu-latn", en: "en-GB" }[lang()] || "ar"; try { return d.toLocaleDateString(loc, o); } catch (e) { return iso(d); } }
  function countdown(n) {
    var L = lang();
    if (n === 0) return L === "en" ? "Today" : L === "fa" ? "امروز" : "اليوم";
    if (n === 1) return L === "en" ? "Tomorrow" : L === "fa" ? "فردا" : "غداً";
    return L === "en" ? "In " + n + " days" : L === "fa" ? n + " روز دیگر" : "بعد " + n + " يوم";
  }
  fetch("api/exams", { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.ok) return;
    var today = iso(new Date()), now = parse(today);
    var next = (d.items || []).filter(function (x) { var n = Math.round((parse(x.date) - now) / 864e5); return n >= 0 && n <= 30; })[0];
    if (!next) return;
    var n = Math.round((parse(next.date) - now) / 864e5), when = parse(next.date);
    var sec = el("section", "section ex-home"); sec.setAttribute("aria-label", t("الامتحان القادم"));
    var a = el("a", "ex-home-card k-" + next.kind); a.href = "exams.html";
    var dt = el("div", "ex-date"); dt.appendChild(el("b", "", String(when.getDate()))); dt.appendChild(el("span", "", fmt(when, { month: "short" })));
    var main = el("div", "ex-home-main");
    main.appendChild(el("small", "", t("الامتحان القادم")));
    main.appendChild(el("strong", "", next.subject)).setAttribute("dir", "auto");
    main.appendChild(el("span", "", t(KIND[next.kind] || KIND.other) + " · " + fmt(when, { weekday: "long", day: "numeric", month: "long" }) + (next.start ? " · " + next.start : "")));
    a.appendChild(dt); a.appendChild(main); a.appendChild(el("span", "ex-count" + (n <= 3 ? " is-soon" : ""), countdown(n)));
    sec.appendChild(a); anchor.before(sec);
    if (window.I18N && I18N.apply) I18N.apply();
  }).catch(function () {});
})();
