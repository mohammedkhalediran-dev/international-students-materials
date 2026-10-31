/* js/profile.js — صفحة «الملف الشخصي» (Step 61، بطلب محمد 2026-10-19).
   تلقائياً: الاسم والبريد من حساب Google، والكورس من ms.sem، ورمز الطالب من الخادم.
   يكتبه الطالب: اسمه الكامل كما في الجامعة + رقم جوازه مرة واحدة (js/profile-form.js).
   عند اكتمال الملف تُفتح له خانة «درجاتي الجامعية». */
(function () {
  "use strict";
  var t = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  if (window.MS && MS.initShared) { MS.initShared(); MS.initHeader(); }

  function get(url) {
    return fetch(url, { credentials: "same-origin", cache: "no-store" }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.__status = r.status; return d; });
    }, function () { return { __status: 0, error: "network" }; });
  }
  function gate(title, msg, login) {
    $("grStatus").textContent = "";
    $("grGateTitle").textContent = t(title); $("grGateMsg").textContent = t(msg);
    $("grLogin").hidden = !login; $("grGate").hidden = false;
  }
  function semName() {
    var id = null; try { id = JSON.parse(localStorage.getItem("ms.sem")); } catch (e) {}
    var list = (window.MS && MS.ALL_SEMESTERS) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
    return "";
  }
  function row(dl, label, value, ltr) {
    var dt = el("dt", "", t(label)), dd = el("dd");
    var v = el("bdi", "", value || "—"); if (ltr) v.dir = "ltr"; dd.appendChild(v);
    dl.appendChild(dt); dl.appendChild(dd);
  }
  function render(user, d) {
    $("grStatus").textContent = "";
    var p = d.profile || {};
    var dl = $("pfAccount"); dl.replaceChildren(); dl.hidden = false;
    row(dl, "الاسم في حساب Google", user.name);
    row(dl, "البريد الإلكتروني في حسابك", user.email, true);
    row(dl, "كورسك الدراسي", t(semName()) || t("لم تختر كورسك بعد"));
    row(dl, "رمز الطالب في Medixa", p.code, true);
    var st = el("dd"), badge = el("span", "gr-badge" + (p.complete ? " is-on" : ""), t(p.complete ? "الملف مكتمل" : "الملف غير مكتمل"));
    st.appendChild(badge); dl.appendChild(el("dt", "", t("حالة الملف الشخصي"))); dl.appendChild(st);
    MedixaProfile.mount($("grProfileBox"), p, function (res) { render(user, res); });
    $("grProfileBox").hidden = false;
    // خانة «درجاتي»: مفتوحة بعد اكتمال الملف، ومقفلة قبله
    var g = $("pfGrades"); g.replaceChildren(); g.hidden = false;
    if (p.complete) {
      var a = el("a", "tt-btn is-primary", t("افتح درجاتي الجامعية")); a.href = "grades.html"; g.appendChild(a);
    } else {
      g.appendChild(el("p", "tt-sub", t("أكمل ملفك الشخصي لتفتح لك خانة «درجاتي الجامعية».")));
    }
    if (window.I18N) I18N.apply();
  }
  Promise.all([get("api/auth/me"), get("api/grades/me")]).then(function (r) {
    var me = r[0], d = r[1];
    if (me.__status === 401 || d.__status === 401) return gate("سجّل الدخول لملفك الشخصي", "الملف الشخصي مرتبط بحسابك في Google.", true);
    if (me.__status !== 200) return gate("تعذّر التحميل", "حدث خطأ. حاول مرة أخرى.", false);
    if (d.__status === 503) return gate("هذه الميزة لم تُفعَّل بعد", "يعمل المشرف على تجهيز الملف الشخصي. عد لاحقاً.", false);
    if (d.__status !== 200) return gate("تعذّر التحميل", d.error === "network" ? "لا اتصال بالإنترنت." : "حدث خطأ. حاول مرة أخرى.", false);
    render(me.user || {}, d);
  });
  if (window.I18N) I18N.apply();
})();
