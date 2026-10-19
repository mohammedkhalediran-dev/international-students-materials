/* js/admin.js — إدارة الحسابات للمشرف (بالعربية فقط، مثل صفحة الرفع) */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function msg(text, ok) { var n = $("msg"); n.textContent = text || ""; n.hidden = !text; n.className = "up-msg" + (ok ? " is-ok" : ""); }

  var ROLE_NAME = { student: "طالب", uploader: "رافع ملفات", rep: "ممثل الدفعة", admin: "مشرف" };

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
      main.appendChild(el("div", "up-item-name", u.name + (u.role !== "student" ? " (" + (ROLE_NAME[u.role] || u.role) + ")" : "") + (u.active ? "" : " (موقوف)")));
      main.appendChild(el("div", "up-item-sub up-ltr", u.email));
      row.appendChild(main);

      var acts = el("div", "up-actions");
      if (u.role !== "admin") {
        var pick = el("select", "field");
        pick.setAttribute("aria-label", "دور " + u.name);
        ["student", "uploader", "rep"].forEach(function (r) {
          var o = el("option", "", ROLE_NAME[r]); o.value = r; if (u.role === r) o.selected = true; pick.appendChild(o);
        });
        pick.addEventListener("change", function () {
          MSAuth.api("POST", "auth/user", { id: u.id, role: pick.value }).then(function (r) {
            if (r.status === 200) { msg("تم تغيير الدور.", true); load(); } else { msg("تعذّر تغيير الدور."); load(); }
          });
        });
        acts.appendChild(pick);
      }
      var toggle = el("button", "btn btn-secondary btn-sm", u.active ? "إيقاف" : "تفعيل");
      toggle.type = "button";
      toggle.addEventListener("click", function () {
        MSAuth.api("POST", "auth/user", { id: u.id, active: !u.active }).then(function (r) {
          if (r.status === 200) { msg("تم التحديث.", true); load(); } else msg("تعذّر التحديث.");
        });
      });
      acts.appendChild(toggle);

      row.appendChild(acts);
      box.appendChild(row);
    });
  }
  load();
})();

/* Step 49: مفاتيح الإشعارات (VAPID) تُولَّد في المتصفح فقط؛ يضعها المشرف بنفسه في Cloudflare */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("pushAdmin")) return;
  function b64u(buf) { var s = "", a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  fetch("api/push/key", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
    $("pushState").textContent = d.ready ? "الإشعارات مفعّلة على الخادم. لا تولّد مفاتيح جديدة إلا إذا تسرّب المفتاح السرّي." : "الإشعارات غير مفعّلة بعد على الخادم: ولّد المفاتيح وضعها في Cloudflare.";
    $("pushGen").hidden = false;
  }).catch(function () { $("pushState").textContent = "تعذّر التحقق من حالة الإشعارات."; $("pushGen").hidden = false; });
  $("pushMake").addEventListener("click", function () {
    if (!window.crypto || !crypto.subtle) { $("pushState").textContent = "هذا المتصفح لا يدعم توليد المفاتيح."; return; }
    crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]).then(function (kp) {
      return Promise.all([crypto.subtle.exportKey("raw", kp.publicKey), crypto.subtle.exportKey("jwk", kp.privateKey)]);
    }).then(function (k) {
      $("pushPub").value = b64u(k[0]);
      $("pushPriv").value = k[1].d;
      $("pushOut").hidden = false;
    });
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-copy]");
    if (!b) return;
    var v = $(b.getAttribute("data-copy")).value;
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { b.textContent = "نُسخ ✓"; }, function () { $(b.getAttribute("data-copy")).select(); });
  });
})();
