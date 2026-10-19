/* js/timetable.js — الجدول الجامعي الرسمي (Step 55).
   - في الرئيسية (#ttHome): محاضرات الغد تحت البانر، يظهر فقط لصاحب حساب الكورس الثالث أو للمشرف.
   - في timetable.html (#ttWeek): العرض الأسبوعي مع التنقل بين الأيام والأسابيع وتفاصيل كل محاضرة.
   الصلاحية تُفحص في الخادم (/api/timetable)؛ هنا فقط نخفي الواجهة لمن لا يحق له. لا بيانات تجريبية: كل ما يظهر من قاعدة البيانات. */
(function () {
  "use strict";
  var DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  var WEEK = [6, 0, 1, 2, 3, 4, 5]; // الأسبوع الجامعي يبدأ السبت
  var t = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  var lang = function () { return (document.documentElement.lang || "ar").slice(0, 2); };

  /* ---------- تواريخ محلية ---------- */
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function add(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function weekStart(s) { var d = parse(s); return add(s, -((d.getDay() + 1) % 7)); }
  function fmtDate(s, opts) {
    var loc = { ar: "ar-IQ-u-nu-latn", fa: "fa-IR-u-nu-latn", en: "en-GB" }[lang()] || "ar";
    try { return parse(s).toLocaleDateString(loc, opts || { day: "numeric", month: "long" }); } catch (e) { return s; }
  }
  function dayName(s) { return t(DAYS[parse(s).getDay()]); }

  /* ---------- أيقونات ---------- */
  var SVG = {
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M14 14h2M8 17.2h2"/>',
    steth: '<path d="M6 3v6a5 5 0 0 0 10 0V3"/><path d="M11 14v1.5a4.5 4.5 0 0 0 9 0V13"/><circle cx="20" cy="11" r="2"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M5.5 12h3l1.5-2.5 2 4.5 1.5-2h4"/>',
    scalpel: '<path d="M14.5 3.5l6 6-9.5 9.5H5v-6z"/><path d="M5 19l-2 2"/><path d="M11.5 7.5l5 5"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.3 21.5h11.4a2 2 0 0 0 1.8-3L14 9V3"/><path d="M7 15h10"/>',
    shield: '<path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 5 2V5a3 3 0 0 0-2-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-5 2V5a3 3 0 0 1 2-1z"/>',
    lungs: '<path d="M12 4v8M12 12l-3 2M12 12l3 2"/><path d="M8.5 7C5 8 3 13 3 17c0 2 1.5 3 3 3 3 0 3.5-2 3.5-4V8.5z"/><path d="M15.5 7C19 8 21 13 21 17c0 2-1.5 3-3 3-3 0-3.5-2-3.5-4V8.5z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20.5c.8-3.8 3.6-5.7 7-5.7s6.2 1.9 7 5.7"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'
  };
  function svg(name) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "1.8"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
    s.innerHTML = SVG[name] || SVG.book;
    return s;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* المادة → أيقونة ولون (ثابت لكل مادة) */
  var KINDS = [
    [/pedia|طفال|اطفال/i, "steth", "blue"], [/internal|medicine|باطن/i, "heart", "green"], [/surg|جراح/i, "scalpel", "wine"],
    [/immun|مناع/i, "shield", "violet"], [/patho|micro|pharm|bioch|chem|histo|embry|أمراض|ادوية|أدوية|احياء|كيمي/i, "flask", "amber"],
    [/neuro|psych|عصب|نفس/i, "brain", "violet"], [/resp|lung|chest|تنفس|صدر/i, "lungs", "blue"], [/physio|cardi|فسلج|فسيو|قلب/i, "heart", "green"]
  ];
  var COLORS = ["blue", "green", "wine", "violet", "amber"];
  function kind(subject) {
    for (var i = 0; i < KINDS.length; i++) if (KINDS[i][0].test(subject)) return { ico: KINDS[i][1], color: KINDS[i][2] };
    var h = 0; for (var j = 0; j < subject.length; j++) h = (h * 31 + subject.charCodeAt(j)) >>> 0;
    return { ico: "book", color: COLORS[h % COLORS.length] };
  }

  function fetchJson(url, opts) {
    return fetch(url, Object.assign({ credentials: "same-origin", cache: "no-store" }, opts || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.__status = r.status; return d; });
    }, function () { return { __status: 0, error: "network" }; });
  }
  function access() { return fetchJson("api/timetable/access"); }
  function range(from, to) { return fetchJson("api/timetable?from=" + from + "&to=" + to); }

  /* ---------- بطاقة محاضرة ---------- */
  function flagText(o) {
    if (o.state === "cancelled") return t("ملغاة");
    if (o.state === "rescheduled") return t("موعد معدّل");
    if (o.state === "moved") return t("نُقلت");
    return "";
  }
  function card(o, i, asLink) {
    var k = kind(o.subject || "");
    var c = el(asLink ? "a" : "button", "tt-card c-" + k.color + (o.state !== "normal" ? " is-" + o.state : ""));
    if (asLink) c.href = "timetable.html?date=" + o.date + "#l" + o.lecture; else c.type = "button";
    c.style.setProperty("--i", i);
    var top = el("div", "tt-card-top");
    var ico = el("span", "tt-ico"); ico.appendChild(svg(k.ico)); top.appendChild(ico);
    top.appendChild(el("span", "tt-time", o.start + " – " + o.end));
    var ch = el("span", "tt-chev"); ch.appendChild(svg("chev")); top.appendChild(ch);
    top.appendChild(el("strong", "tt-subj", o.subject));
    c.appendChild(top);
    if (o.topic) c.appendChild(el("p", "tt-topic", o.topic));
    var f = flagText(o);
    if (f) {
      var extra = o.state === "moved" && o.movedTo ? " ← " + dayName(o.movedTo.date) + " " + o.movedTo.start : o.state === "rescheduled" && o.originalDate ? " (" + t("بدل") + " " + dayName(o.originalDate) + " " + o.originalStart + ")" : "";
      c.appendChild(el("span", "tt-flag", f + extra));
    }
    var meta = el("div", "tt-meta");
    if (o.lecturer) { var u = el("span"); u.appendChild(svg("user")); u.appendChild(el("span", "", o.lecturer)); meta.appendChild(u); }
    if (o.room) { var r = el("span"); r.appendChild(svg("pin")); r.appendChild(el("span", "", (/^[a-z0-9 ]{1,4}$/i.test(o.room) ? t("القاعة") + " " : "") + o.room)); meta.appendChild(r); }
    if (meta.firstChild) c.appendChild(meta);
    var label = o.subject + "، " + dayName(o.date) + " " + o.start + "–" + o.end + (o.room ? "، " + o.room : "") + (f ? "، " + f : "");
    c.setAttribute("aria-label", label);
    return c;
  }

  /* ---------- الرئيسية: محاضرات الغد ---------- */
  /* اليوم حتى تنتهي آخر محاضرة فيه، ثم الغد (أو أقرب يوم فيه محاضرات). يتبدّل تلقائياً والصفحة مفتوحة. */
  function hhmm(d) { return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  var live = function (o) { return o.state !== "cancelled" && o.state !== "moved"; };
  function pickDay(list, now) {
    var today = iso(now), tomorrow = add(today, 1), nowT = hhmm(now);
    var onDay = function (x) { return list.filter(function (o) { return o.date === x; }); };
    var todayLive = onDay(today).filter(live);
    var lastEnd = todayLive.reduce(function (m, o) { return o.end > m ? o.end : m; }, "");
    if (todayLive.length && lastEnd > nowT) return { day: today, items: onDay(today), when: "محاضرات اليوم", until: lastEnd };
    if (onDay(tomorrow).filter(live).length) return { day: tomorrow, items: onDay(tomorrow), when: "محاضرات غداً" };
    var next = list.filter(function (o) { return o.date > tomorrow && live(o); })[0];
    if (next) return { day: next.date, items: onDay(next.date), when: "المحاضرات القادمة", next: true };
    return { day: tomorrow, items: onDay(tomorrow), when: "محاضرات غداً" };
  }
  function initHome(box) {
    var timer = null;
    access().then(function (a) {
      if (!a.allowed) return; // الزائر وطلاب الكورسات الأخرى: لا يظهر القسم إطلاقاً
      box.hidden = false;
      if (a.admin) { var m = box.querySelector("#ttManage"); if (m) m.hidden = false; }
      load(true);
    });
    function load(first) {
      var cards = box.querySelector(".tt-cards"), sub = box.querySelector("#ttSub"), note = box.querySelector("#ttNote");
      var old = box.querySelector(".tt-empty"); if (old) { old.remove(); cards.hidden = false; }
      if (first) { cards.innerHTML = ""; for (var s = 0; s < 3; s++) cards.appendChild(el("div", "tt-skel")); }
      var now = new Date(), today = iso(now);
      range(today, add(today, 8)).then(function (d) {
        cards.innerHTML = "";
        if (d.__status !== 200) {
          cards.hidden = true; cards.after(el("div", "tt-empty", t(d.error === "not_migrated" ? "الجدول غير مفعّل بعد." : "تعذّر تحميل الجدول. حاول لاحقاً.")));
          return;
        }
        var list = d.items || [], pick = pickDay(list, now);
        if (note) {
          note.hidden = !pick.next;
          if (pick.next) note.textContent = t("لا محاضرات غداً. هذه أقرب محاضرات:") + " " + dayName(pick.day) + " " + fmtDate(pick.day);
        }
        if (sub) sub.querySelector("[data-when]").textContent = t(pick.when);
        var more = box.querySelector("#ttWeekLink"); if (more) more.href = "timetable.html?date=" + pick.day;
        if (!pick.items.length) {
          cards.hidden = true; cards.after(el("div", "tt-empty", t(list.length ? "لا محاضرات غداً." : "لا محاضرات منشورة خلال الأسبوع القادم.")));
        } else pick.items.forEach(function (o, i) { cards.appendChild(card(o, i, true)); });
        if (window.I18N) I18N.apply();
        // بعد انتهاء آخر محاضرة اليوم (أو عند منتصف الليل) يتحوّل القسم وحده
        clearTimeout(timer);
        var at = new Date(now); if (pick.until) at.setHours(+pick.until.slice(0, 2), +pick.until.slice(3), 0, 0); else at.setHours(24, 0, 5, 0);
        timer = setTimeout(function () { load(false); }, Math.min(Math.max(at - Date.now(), 1000), 6 * 3600 * 1000));
      });
    }
  }

  /* ---------- العرض الأسبوعي ---------- */
  function initWeek(root) {
    var q = new URLSearchParams(location.search);
    var today = iso(new Date());
    var selected = /^\d{4}-\d{2}-\d{2}$/.test(q.get("date") || "") ? q.get("date") : today;
    var start = weekStart(selected);
    var data = [];
    var gate = document.getElementById("ttGate"), main = document.getElementById("ttMain");
    var daysEl = root.querySelector(".tt-days"), grid = root.querySelector(".tt-grid"), label = root.querySelector(".tt-week-label");
    var dlg = document.getElementById("ttDetail");

    function showGate(kindOf) {
      main.hidden = true; gate.hidden = false;
      var h = gate.querySelector("h2"), p = gate.querySelector("p"), a = gate.querySelector("a");
      if (kindOf === "guest") { h.textContent = t("سجّل الدخول لرؤية الجدول"); p.textContent = t("الجدول الجامعي متاح لطلاب الكورس الثالث بعد تسجيل الدخول."); a.hidden = false; a.href = "login.html?next=" + encodeURIComponent("timetable.html" + location.search); }
      else if (kindOf === "denied") { h.textContent = t("الجدول غير متاح لحسابك"); p.textContent = t("الجدول الجامعي متاح لطلاب الكورس الثالث فقط. إن كان كورسك الثالث فاختره من الإعدادات."); a.hidden = false; a.href = "workspace.html?view=settings"; a.textContent = t("الإعدادات"); }
      else { h.textContent = t("تعذّر تحميل الجدول"); p.textContent = t(kindOf === "not_migrated" ? "الجدول غير مفعّل بعد." : "تحقق من اتصالك ثم أعد المحاولة."); a.hidden = true; }
      if (window.I18N) I18N.apply();
    }
    function load() {
      label.textContent = fmtDate(start) + " – " + fmtDate(add(start, 6), { day: "numeric", month: "long", year: "numeric" });
      grid.setAttribute("aria-busy", "true");
      return range(start, add(start, 6)).then(function (d) {
        grid.removeAttribute("aria-busy");
        if (d.__status === 401) return showGate("guest");
        if (d.__status === 403) return showGate("denied");
        if (d.__status !== 200) return showGate(d.error);
        data = d.items || [];
        render();
      });
    }
    function render() {
      if (selected < start || selected > add(start, 6)) selected = start <= today && today <= add(start, 6) ? today : start;
      daysEl.innerHTML = ""; grid.innerHTML = "";
      WEEK.forEach(function (w, i) {
        var date = add(start, i);
        var items = data.filter(function (o) { return o.date === date; });
        var b = el("button", "tt-day" + (date === today ? " is-today" : ""));
        b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(date === selected));
        b.appendChild(el("span", "", t(DAYS[w])));
        b.appendChild(el("b", "", String(parse(date).getDate())));
        if (items.some(function (o) { return o.state !== "cancelled" && o.state !== "moved"; })) b.appendChild(el("span", "tt-dot"));
        b.onclick = function () { selected = date; render(); history.replaceState(null, "", "?date=" + date); };
        daysEl.appendChild(b);
        var col = el("section", "tt-col" + (date === selected ? " is-selected" : "") + (date === today ? " is-today" : ""));
        col.setAttribute("aria-label", t(DAYS[w]) + " " + fmtDate(date));
        var head = el("div", "tt-col-head", t(DAYS[w]) + " "); head.appendChild(el("small", "", fmtDate(date))); col.appendChild(head);
        if (!items.length) col.appendChild(el("p", "tt-col-empty", t("لا محاضرات")));
        items.forEach(function (o, k) {
          var c = card(o, k, false);
          c.id = "l" + o.lecture + "-" + o.date;
          c.onclick = function () { detail(o); };
          col.appendChild(c);
        });
        grid.appendChild(col);
      });
      if (window.I18N) I18N.apply();
      var hash = location.hash.match(/^#l(\d+)$/);
      if (hash) { var target = document.getElementById("l" + hash[1] + "-" + selected); if (target && target.scrollIntoView) target.scrollIntoView({ block: "center" }); }
    }
    function detail(o) {
      var box = dlg.querySelector(".tt-dlg-body"); box.innerHTML = "";
      dlg.querySelector("h3").textContent = o.subject;
      var dl = el("dl", "tt-dl");
      var row = function (k, v) { if (!v) return; dl.appendChild(el("dt", "", t(k))); var dd = el("dd", "", v); dd.setAttribute("dir", "auto"); dl.appendChild(dd); };
      row("العنوان", o.topic); row("اليوم", dayName(o.date) + " " + fmtDate(o.date)); row("الوقت", o.start + " – " + o.end);
      row("القاعة", o.room); row("الأستاذ", o.lecturer); row("الحالة", flagText(o) || t("في موعدها"));
      if (o.state === "rescheduled" && o.originalDate) row("الموعد الأصلي", dayName(o.originalDate) + " " + fmtDate(o.originalDate) + " " + o.originalStart);
      if (o.state === "moved" && o.movedTo) row("الموعد الجديد", dayName(o.movedTo.date) + " " + fmtDate(o.movedTo.date) + " " + o.movedTo.start + (o.movedTo.room ? " · " + o.movedTo.room : ""));
      row("ملاحظة", o.note);
      box.appendChild(dl);
      if (window.I18N) I18N.apply();
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    }
    dlg.querySelector("[data-close]").onclick = function () { dlg.close ? dlg.close() : dlg.removeAttribute("open"); };
    dlg.addEventListener("click", function (e) { if (e.target === dlg && dlg.close) dlg.close(); });
    root.querySelector("#ttPrev").onclick = function () { start = add(start, -7); selected = start; load(); };
    root.querySelector("#ttNext").onclick = function () { start = add(start, 7); selected = start; load(); };
    root.querySelector("#ttToday").onclick = function () { start = weekStart(today); selected = today; load(); };
    // أسهم لوحة المفاتيح بين الأيام
    daysEl.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var rtl = document.documentElement.dir === "rtl", step = (e.key === "ArrowLeft") === rtl ? 1 : -1;
      var n = add(selected, step);
      if (n < start || n > add(start, 6)) return;
      selected = n; render(); var b = daysEl.querySelector('[aria-selected="true"]'); if (b) b.focus();
    });
    access().then(function (a) {
      if (!a.signedIn) return showGate("guest");
      if (!a.allowed) return showGate("denied");
      if (a.admin) { var m = document.getElementById("ttManage"); if (m) m.hidden = false; }
      load();
    });
  }

  window.MTT = { pickDay: pickDay, svg: svg, kind: kind, card: card, iso: iso, add: add, weekStart: weekStart, fmtDate: fmtDate, DAYS: DAYS, WEEK: WEEK, fetchJson: fetchJson };
  var home = document.getElementById("ttHome"); if (home) initHome(home);
  var week = document.getElementById("ttWeek"); if (week) initWeek(week);
  document.querySelectorAll("[data-tt-ico]").forEach(function (n) { n.appendChild(svg(n.getAttribute("data-tt-ico"))); });
})();
