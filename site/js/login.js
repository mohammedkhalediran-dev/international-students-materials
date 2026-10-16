/* js/login.js — صفحة تسجيل الدخول وإنشاء الحساب */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var T = function (s) { return window.I18N ? I18N.t(s) : s; };
  var ERR = {
    bad_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    locked: "محاولات كثيرة. حاول بعد 15 دقيقة.",
    email_taken: "هذا البريد مسجّل من قبل. جرّب تسجيل الدخول.",
    bad_email: "اكتب بريداً إلكترونياً صحيحاً.",
    bad_name: "اكتب اسمك.",
    weak_password: "كلمة المرور يجب ألا تقل عن 8 أحرف.",
    bad_code: "رمز الدعوة غير صحيح.",
    not_configured: "تسجيل الدخول غير مفعّل بعد.",
    network: "لا يوجد اتصال بالإنترنت. حاول مرة أخرى.",
    server: "حدث خطأ غير متوقع. حاول مرة أخرى."
  };
  var registering = false;

  // الوجهة بعد الدخول: مسار نسبي داخل الموقع فقط (لا روابط خارجية)
  function nextUrl() {
    var n = new URLSearchParams(location.search).get("next") || "";
    return /^[A-Za-z0-9._\-\/?=&%#]+$/.test(n) && n.indexOf("//") === -1 && n.indexOf(":") === -1 ? n.replace(/^\//, "") : "index.html";
  }

  function msg(text) {
    var n = $("msg");
    n.textContent = text ? T(text) : "";
    n.hidden = !text;
  }

  function mode(reg) {
    registering = reg;
    $("tabLogin").setAttribute("aria-pressed", String(!reg));
    $("tabRegister").setAttribute("aria-pressed", String(reg));
    $("tabLogin").className = "btn btn-sm " + (reg ? "btn-secondary" : "btn-primary");
    $("tabRegister").className = "btn btn-sm " + (reg ? "btn-primary" : "btn-secondary");
    $("nameRow").hidden = !reg;
    $("codeRow").hidden = !reg;
    $("pwHint").hidden = !reg;
    $("password").autocomplete = reg ? "new-password" : "current-password";
    $("submit").textContent = T(reg ? "إنشاء حساب" : "دخول");
    msg("");
  }

  function showDone(u) {
    $("formCard").hidden = true;
    $("doneCard").hidden = false;
    $("pageTitle").textContent = T("حسابي");
    $("who").textContent = u.name;
    $("goNext").href = nextUrl();
    $("adminLink").hidden = u.role !== "admin";
  }

  $("tabLogin").addEventListener("click", function () { mode(false); });
  $("tabRegister").addEventListener("click", function () { mode(true); });

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    msg("");
    var btn = $("submit");
    btn.disabled = true;
    var body = { email: $("email").value, password: $("password").value };
    if (registering) { body.name = $("name").value; body.code = $("code").value; }
    MSAuth.api("POST", registering ? "auth/register" : "auth/login", body).then(function (r) {
      btn.disabled = false;
      if (r.status === 200 && r.data.ok) {
        MSAuth.afterLogin(r.data.user);
        try { sessionStorage.removeItem("ms.sync.reloaded"); } catch (x) { /* لا شيء */ }
        location.href = nextUrl();
        return;
      }
      msg(ERR[r.data && r.data.error] || ERR.server);
    });
  });

  $("logout").addEventListener("click", function () {
    MSAuth.logout().then(function () { location.href = "login.html"; });
  });

  mode(false);
  MSAuth.me().then(function (u) { if (u) showDone(u); });
})();
