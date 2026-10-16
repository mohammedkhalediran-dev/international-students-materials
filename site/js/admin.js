/* js/admin.js — إدارة الحسابات للمشرف (بالعربية فقط، مثل صفحة الرفع) */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function msg(text, ok) { var n = $("msg"); n.textContent = text || ""; n.hidden = !text; n.className = "up-msg" + (ok ? " is-ok" : ""); }

  function load() {
    MSAuth.api("GET", "auth/users").then(function (r) {
      if (r.status === 401) { location.href = "login.html?next=admin.html"; return; }
      if (r.status === 403) { msg("هذه الصفحة للمشرفين فقط."); return; }
      if (r.status !== 200) { msg("تعذّر تحميل الحسابات. حاول مرة أخرى."); return; }
      render(r.data.users);
    });
  }

  function render(users) {
    var box = $("list");
    box.textContent = "";
    if (!users.length) { box.appendChild(el("p", "up-hint", "لا توجد حسابات بعد.")); return; }
    users.forEach(function (u) {
      var row = el("div", "up-item");
      var main = el("div", "up-item-main");
      main.appendChild(el("div", "up-item-name", u.name + (u.role === "admin" ? " (مشرف)" : "") + (u.active ? "" : " (موقوف)")));
      main.appendChild(el("div", "up-item-sub up-ltr", u.email));
      row.appendChild(main);

      var acts = el("div", "up-actions");
      var toggle = el("button", "btn btn-secondary btn-sm", u.active ? "إيقاف" : "تفعيل");
      toggle.type = "button";
      toggle.addEventListener("click", function () {
        MSAuth.api("POST", "auth/user", { id: u.id, active: !u.active }).then(function (r) {
          if (r.status === 200) { msg("تم التحديث.", true); load(); } else msg("تعذّر التحديث.");
        });
      });
      acts.appendChild(toggle);

      var reset = el("button", "btn btn-secondary btn-sm", "كلمة مرور جديدة");
      reset.type = "button";
      reset.addEventListener("click", function () {
        var pw = window.prompt("اكتب كلمة المرور الجديدة (8 أحرف على الأقل) وأبلغها للطالب:");
        if (!pw) return;
        MSAuth.api("POST", "auth/user", { id: u.id, password: pw }).then(function (r) {
          msg(r.status === 200 ? "تم تعيين كلمة المرور الجديدة." : "كلمة المرور قصيرة أو حدث خطأ.", r.status === 200);
        });
      });
      acts.appendChild(reset);
      row.appendChild(acts);
      box.appendChild(row);
    });
  }
  load();
})();
