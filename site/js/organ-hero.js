(function () {
  "use strict";
  var root = document.getElementById("ohOrgans");
  if (!root || typeof COURSES === "undefined" || !window.MS) return;
  var el = MS.el;
  // الأعضاء مرتبطة بمواد موجودة فعلاً في courses.js (لا مواد وهمية).
  var ORGANS = [
    { key: "head", en: "Head & neck", ar: "الرأس والعنق", x: "49%", y: "10%", ids: ["anatomy-head-neck"] },
    { key: "lungs", en: "Lungs", ar: "الرئتان", x: "31%", y: "44%", ids: ["anatomy-respiratory", "physiology-respiratory"] },
    { key: "heart", en: "Heart", ar: "القلب", x: "62%", y: "46%", ids: ["anatomy-cardiovascular", "physiology-heart"] },
    { key: "vessels", en: "Vessels", ar: "الأوعية والدم", x: "54%", y: "24%", ids: ["physiology-circulation", "physiology-blood"] }
  ];
  var fig = document.getElementById("ohFigure"), detail = document.getElementById("ohDetail");
  var btns = [], dots = [];

  function courses(o) { return o.ids.map(function (id) { return MS.course(id); }).filter(Boolean); }

  function show(i) {
    var o = ORGANS[i], list = courses(o);
    btns.forEach(function (b, k) { b.classList.toggle("is-on", k === i); b.setAttribute("aria-pressed", String(k === i)); });
    dots.forEach(function (d, k) { d.classList.toggle("is-on", k === i); });
    detail.textContent = "";
    detail.appendChild(el("h2", "", o.ar));
    var box = el("div", "oh-links");
    list.forEach(function (c) {
      var a = el("a", "oh-link"); a.href = "course.html?id=" + encodeURIComponent(c.id);
      a.appendChild(el("b", "en", c.name)); a.appendChild(el("small", "", c.nameAr || ""));
      box.appendChild(a);
    });
    if (!list.length) box.appendChild(el("p", "", "لم تُضف مواد لهذا العضو بعد."));
    detail.appendChild(box);
    if (window.I18N) I18N.apply();
  }

  ORGANS.forEach(function (o, i) {
    var b = el("button", "oh-organ"); b.type = "button";
    b.appendChild(el("b", "en", o.en)); b.appendChild(el("small", "", o.ar));
    b.addEventListener("click", function () { show(i); });
    b.addEventListener("mouseenter", function () { show(i); });
    root.appendChild(b); btns.push(b);
    var d = el("button", "oh-dot"); d.type = "button"; d.setAttribute("aria-label", o.ar);
    d.style.setProperty("--x", o.x); d.style.setProperty("--y", o.y);
    d.addEventListener("click", function () { show(i); });
    d.addEventListener("mouseenter", function () { show(i); });
    fig.appendChild(d); dots.push(d);
  });
  show(2);
})();
