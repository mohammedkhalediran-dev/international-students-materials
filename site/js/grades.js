/* js/grades.js — صفحة «درجاتي الجامعية» للطالب (Step 57).
   الخادم (/api/grades/*) هو الذي يتحقق من الحساب ويعطي كل طالب درجاته فقط؛ هذه الصفحة تعرض ما يصلها.
   رقم الجواز يُرسل مرة واحدة للربط ثم يُمسح من الحقل، ولا يُحفظ في المتصفح.
   Step 61: قبل الدرجات يجب إكمال الملف الشخصي (الاسم كما في الجامعة + الجواز مرة واحدة) عبر js/profile-form.js. */
(function () {
  "use strict";
  var t = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  var lang = function () { return (document.documentElement.lang || "ar").slice(0, 2); };
  if (window.MS && MS.initShared) { MS.initShared(); MS.initHeader(); }

  var ERR = { network: "لا اتصال بالإنترنت.", bad_request: "حدث خطأ. حاول مرة أخرى." };
  function fetchJson(url, opts) {
    return fetch(url, Object.assign({ credentials: "same-origin", cache: "no-store" }, opts || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.__status = r.status; return d; });
    }, function () { return { __status: 0, error: "network" }; });
  }
  function fmtDate(ms) {
    var loc = { ar: "ar-IQ-u-nu-latn", fa: "fa-IR-u-nu-latn", en: "en-GB" }[lang()] || "ar";
    try { return new Date(ms).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; }
  }
  function status(msg) { $("grStatus").textContent = msg ? t(msg) : ""; }
  function gate(title, msg, login) {
    status("");
    $("grGateTitle").textContent = t(title); $("grGateMsg").textContent = t(msg);
    $("grLogin").hidden = !login; $("grGate").hidden = false;
    $("grProfileBox").hidden = true; $("grList").hidden = true;
  }

  // معدل الطالب في الكورس (يظهر أسفل الجدول؛ أُلغي عرض الرتبة بطلب محمد 2026-10-20)
  function statsBlock(st) {
    var wrap = el("div", "gr-stats");
    if (!st.complete) { wrap.appendChild(el("p", "gr-stats-note", t("لا يظهر معدلك ولا ترتيبك لأن إحدى موادك بلا درجة أو «غائب»."))); return wrap; }
    var box = el("div", "gr-stat"); box.appendChild(el("span", "gr-stat-label", t("معدلك في الكورس")));
    var v = el("strong", "gr-stat-value"); v.appendChild(el("bdi", "", String(st.average))); box.appendChild(v); wrap.appendChild(box);
    wrap.appendChild(el("p", "gr-stats-note", t("المعدل متوسط درجات المواد التي رُفعت درجاتها حتى الآن، وقد يتغير عند رفع مواد جديدة.")));
    return wrap;
  }
  // أفضل 10 طلاب في الكورس (الرتبة والاسم والمعدل فقط، من الخادم)
  function topBlock(list) {
    // مطوية: تفتح عند الضغط على عنوانها
    var wrap = el("details", "gr-top"), sum = el("summary"); sum.appendChild(el("span", "", t("أفضل 10 طلاب في الكورس"))); wrap.appendChild(sum);
    var ol = el("ol", "gr-top-list");
    list.forEach(function (x) {
      var li = el("li", x.me ? "is-me" : ""), rk = el("span", "gr-top-rank"), nm = el("span", "gr-top-name"), av = el("span", "gr-top-avg");
      rk.appendChild(el("bdi", "", String(x.rank))); nm.appendChild(el("bdi", "", x.name || "—")); av.appendChild(el("bdi", "", String(x.average)));
      li.appendChild(rk); li.appendChild(nm); li.appendChild(av); ol.appendChild(li);
    });
    wrap.appendChild(ol); return wrap;
  }

  function showGrades(d) {
    status(""); $("grGate").hidden = true; $("grProfileBox").hidden = true;
    var box = $("grList"); box.replaceChildren(); box.hidden = false;
    var meta = el("div", "gr-meta");
    if (d.name) { var who = el("p", "gr-who"); who.appendChild(document.createTextNode(t("الدرجات المسجلة باسم") + ": ")); var b = el("b", "", d.name); b.dir = "auto"; who.appendChild(b); meta.appendChild(who); }
    var edit = el("a", "gr-edit", t("تعديل الملف الشخصي")); edit.href = "profile.html"; meta.appendChild(edit); box.appendChild(meta);
    if (!d.batches || !d.batches.length) { box.appendChild(el("div", "tt-empty", t("ملفك مكتمل. ستظهر درجاتك هنا تلقائياً عند رفعها."))); if (window.I18N) I18N.apply(); return; }
    // الدفعات التي لها العنوان نفسه هي كورس واحد (مثل «نتائج الكورس الثاني» المرفوعة على مرحلتين): بطاقة واحدة، ومعدل ورتبة للكورس كله
    var groups = [], byTitle = {};
    d.batches.forEach(function (bt) {
      var g = byTitle[bt.title];
      if (!g) { g = byTitle[bt.title] = { title: bt.title, at: bt.at, first: bt.at, parts: [] }; groups.push(g); }
      g.parts.push(bt); if (bt.at < g.first) g.first = bt.at;
    });
    // الكورس الأقدم أولاً (الكورس الأول قبل الثاني) بطلب محمد 2026-10-20
    groups.sort(function (a, b) { return a.first - b.first; });
    var stats = {};
    (d.terms || []).forEach(function (s) { stats[s.title] = s; });
    groups.forEach(function (g) {
      var card = el("article", "gr-batch"), head = el("div", "gr-batch-head"), h = el("h3", "", g.title);
      h.dir = "auto"; head.appendChild(h); head.appendChild(el("small", "", fmtDate(g.at))); card.appendChild(head);
      var st = stats[g.title];
      var table = el("table", "gr-table"), thead = el("thead"), hr = el("tr");
      hr.appendChild(el("th", "", t("المادة"))); hr.appendChild(el("th", "", t("الدرجة"))); thead.appendChild(hr); table.appendChild(thead);
      var tb = el("tbody");
      g.parts.slice().reverse().forEach(function (bt) { // الأقدم أولاً داخل الكورس
        bt.rows.forEach(function (r) {
          // الخلية ترث اتجاه الصفحة (فتتحاذى مع عنوان العمود)، والنص نفسه معزول بـ<bdi> فيُقرأ بلغته دون أن يقلب المحاذاة
          var tr = el("tr"), c = el("td", "gr-course"), gd = el("td", "gr-grade"), cb = el("bdi", "", r.course), gb = el("bdi", "", r.grade);
          if (!/^[0-9٠-٩۰-۹.,٫]+$/.test(String(r.grade).trim())) gd.className = "gr-grade is-text"; // غير رقمي (مثل «غائب»)
          c.appendChild(cb); gd.appendChild(gb); tr.appendChild(c); tr.appendChild(gd); tb.appendChild(tr);
        });
      });
      table.appendChild(tb); card.appendChild(table);
      if (st) { card.appendChild(statsBlock(st)); if (st.top && st.top.length) card.appendChild(topBlock(st.top)); }
      box.appendChild(card);
    });
    if (window.I18N) I18N.apply();
  }

  function showProfile(d) {
    status(""); $("grGate").hidden = true; $("grList").hidden = true;
    var box = $("grProfileBox"); box.hidden = false;
    MedixaProfile.mount(box, d.profile, function (res) { if (res.profile && res.profile.complete) showGrades(res); else showProfile(res); });
  }

  function load() {
    status("جارٍ التحميل…");
    // هيكل تحميل مكان الجدول (Step 59)؛ يُستبدل عند وصول الدرجات ويُخفى مع البوابة أو نموذج الربط
    var sk = document.createElement("div"); sk.className = "skel"; sk.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 4; i++) sk.appendChild(document.createElement("i"));
    $("grList").replaceChildren(sk); $("grList").hidden = false;
    fetchJson("api/grades/me").then(function (d) {
      if (d.__status === 401) return gate("سجّل الدخول لرؤية درجاتك", "الدرجات تظهر لصاحبها فقط، لذلك تحتاج الدخول بحساب Google.", true);
      if (d.__status === 503) return gate("هذه الميزة لم تُفعَّل بعد", "يعمل المشرف على تجهيز الدرجات. عد لاحقاً.", false);
      if (d.__status !== 200) return gate("تعذّر تحميل الدرجات", d.error === "network" ? ERR.network : ERR.bad_request, false);
      if (d.profile && d.profile.complete) showGrades(d); else showProfile(d);
    });
  }
  load();
  if (window.I18N) I18N.apply();
})();
