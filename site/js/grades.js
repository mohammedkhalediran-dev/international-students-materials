/* js/grades.js — صفحة «درجاتي الجامعية» للطالب (Step 57).
   الخادم (/api/grades/*) هو الذي يتحقق من الحساب ويعطي كل طالب درجاته فقط؛ هذه الصفحة تعرض ما يصلها.
   رقم الجواز يُرسل مرة واحدة للربط ثم يُمسح من الحقل، ولا يُحفظ في المتصفح. */
(function () {
  "use strict";
  var t = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  var lang = function () { return (document.documentElement.lang || "ar").slice(0, 2); };
  if (window.MS && MS.initShared) { MS.initShared(); MS.initHeader(); }

  var ERR = {
    bad_passport: "رقم الجواز غير صحيح. اكتبه كما في جوازك (أحرف وأرقام).",
    not_found: "لم نجد هذا الرقم في ملف الدرجات. تأكد منه، أو تواصل مع المشرف إن كانت درجاتك لم تُرفع بعد.",
    claimed: "هذا الرقم مربوط بحساب آخر. تواصل مع المشرف ليتحقق من الأمر.",
    already_linked: "حسابك مربوط مسبقاً.",
    too_many_attempts: "محاولات كثيرة. انتظر ساعة ثم حاول مرة أخرى.",
    unauthorized: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
    network: "لا اتصال بالإنترنت.",
    bad_request: "حدث خطأ. حاول مرة أخرى."
  };
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
    $("grClaim").hidden = true; $("grList").hidden = true;
  }

  function showGrades(d) {
    status(""); $("grGate").hidden = true; $("grClaim").hidden = true;
    var box = $("grList"); box.replaceChildren(); box.hidden = false;
    if (d.name) { var who = el("p", "gr-who"); who.appendChild(document.createTextNode(t("الدرجات المسجلة باسم") + ": ")); var b = el("b", "", d.name); b.dir = "auto"; who.appendChild(b); box.appendChild(who); }
    if (!d.batches || !d.batches.length) { box.appendChild(el("div", "tt-empty", t("لا درجات منشورة لك حالياً."))); return; }
    d.batches.forEach(function (bt) {
      var card = el("article", "gr-batch"), head = el("div", "gr-batch-head"), h = el("h3", "", bt.title);
      h.dir = "auto"; head.appendChild(h); head.appendChild(el("small", "", fmtDate(bt.at))); card.appendChild(head);
      var table = el("table", "gr-table"), thead = el("thead"), hr = el("tr");
      hr.appendChild(el("th", "", t("المادة"))); hr.appendChild(el("th", "", t("الدرجة"))); thead.appendChild(hr); table.appendChild(thead);
      var tb = el("tbody");
      bt.rows.forEach(function (r) {
        var tr = el("tr"), c = el("td", "", r.course), g = el("td", "gr-grade", r.grade);
        c.dir = "auto"; g.dir = "auto"; tr.appendChild(c); tr.appendChild(g); tb.appendChild(tr);
      });
      table.appendChild(tb); card.appendChild(table); box.appendChild(card);
    });
    if (window.I18N) I18N.apply();
  }

  function showClaim() {
    status(""); $("grGate").hidden = true; $("grList").hidden = true; $("grClaim").hidden = false;
  }

  $("grClaim").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = $("grPassport"), msg = $("grClaimMsg"), btn = $("grClaimBtn");
    var value = input.value.trim();
    if (!value) { msg.textContent = t(ERR.bad_passport); msg.hidden = false; input.focus(); return; }
    btn.disabled = true; msg.hidden = true;
    fetchJson("api/grades/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passport: value }) }).then(function (d) {
      btn.disabled = false;
      if (d.__status === 200 && d.linked) { input.value = ""; showGrades(d); return; }
      if (d.error === "already_linked") { load(); return; }
      msg.textContent = t(ERR[d.error] || ERR.bad_request); msg.hidden = false;
    });
  });

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
      if (d.linked) showGrades(d); else showClaim();
    });
  }
  load();
  if (window.I18N) I18N.apply();
})();
