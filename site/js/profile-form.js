/* js/profile-form.js — نموذج الملف الشخصي (Step 61، بطلب محمد 2026-10-19).
   يُستعمل في profile.html وفي «درجاتي» عندما يكون الملف ناقصاً: الاسم الكامل كما في الجامعة + رقم الجواز مرة واحدة.
   الخادم (/api/grades/profile) يتحقق ويربط؛ رقم الجواز يُرسل مرة واحدة ثم يُمسح من الحقل، ولا يُحفظ في المتصفح. */
(function () {
  "use strict";
  var t = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  var ERR = {
    bad_name: "اكتب اسمك الكامل كما في سجلات الجامعة (اسمان على الأقل، بلا أرقام).",
    bad_passport: "رقم الجواز غير صحيح. اكتبه كما في جوازك (أحرف وأرقام).",
    claimed: "هذا الرقم مربوط بحساب آخر. تواصل مع المشرف ليتحقق من الأمر.",
    too_many_attempts: "محاولات كثيرة. انتظر ساعة ثم حاول مرة أخرى.",
    unauthorized: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
    not_configured: "هذه الميزة لم تُفعَّل بعد",
    not_migrated: "هذه الميزة لم تُفعَّل بعد",
    network: "لا اتصال بالإنترنت.",
    bad_request: "حدث خطأ. حاول مرة أخرى."
  };

  function field(label, input) { var l = el("label", "tt-field"); l.appendChild(document.createTextNode(t(label))); l.appendChild(input); return l; }

  // يرسم النموذج داخل box. profile: من /api/grades/me. onSaved(d) بعد الحفظ بالرد الكامل.
  function mount(box, profile, onSaved) {
    profile = profile || {};
    box.replaceChildren();
    var form = el("form", "gr-claim gr-profile"); form.noValidate = true; form.id = "grClaim";
    form.appendChild(el("h2", "tt-h2", t(profile.passportLinked ? "اسمك كما في الجامعة" : "أكمل ملفك الشخصي")));
    form.appendChild(el("p", "tt-sub", t(profile.passportLinked
      ? "اكتب اسمك الكامل كما يظهر في سجلات الجامعة، ليطابقه المشرف عند رفع الدرجات."
      : "مرة واحدة فقط: اسمك كما في الجامعة ورقم جوازك. بعدها تظهر درجاتك تلقائياً كلما رُفعت.")));

    var name = el("input"); name.id = "grFullName"; name.name = "full_name"; name.type = "text"; name.maxLength = 100;
    name.autocomplete = "name"; name.dir = "auto"; name.required = true; name.value = profile.fullName || "";
    name.setAttribute("autocapitalize", "words"); name.placeholder = "أحمد علي حسن";
    form.appendChild(field("الاسم الكامل كما في الجامعة", name));

    var pass = null;
    if (!profile.passportLinked) {
      pass = el("input"); pass.id = "grPassport"; pass.name = "passport"; pass.type = "text"; pass.maxLength = 24;
      pass.autocomplete = "off"; pass.spellcheck = false; pass.dir = "ltr"; pass.required = true;
      pass.setAttribute("inputmode", "text"); pass.setAttribute("autocapitalize", "characters");
      form.appendChild(field("رقم الجواز", pass));
      var notes = el("ul", "gr-notes");
      notes.appendChild(el("li", "", t("رقم جوازك لا يُحفظ في الموقع؛ يُحوَّل إلى بصمة مشفّرة للمطابقة فقط.")));
      notes.appendChild(el("li", "", t("يُربط رقم الجواز بحساب واحد فقط. إن ظهر أنه مربوط بحساب آخر فتواصل مع المشرف.")));
      form.appendChild(notes);
    } else {
      form.appendChild(el("p", "gr-done", t("رقم الجواز مربوط بحسابك ✓")));
    }
    var msg = el("div", "tt-err"); msg.id = "grClaimMsg"; msg.setAttribute("role", "alert"); msg.hidden = true; form.appendChild(msg);
    var bar = el("div", "tt-toolbar"), btn = el("button", "tt-btn is-primary", t("حفظ الملف الشخصي")); btn.type = "submit"; btn.id = "grClaimBtn";
    bar.appendChild(btn); form.appendChild(bar);

    function show(text, input) { msg.textContent = t(text); msg.hidden = false; if (input) input.focus(); }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var n = name.value.trim();
      if (n.split(/\s+/).length < 2) return show(ERR.bad_name, name);
      if (pass && !pass.value.trim()) return show(ERR.bad_passport, pass);
      btn.disabled = true; msg.hidden = true;
      var body = { full_name: n }; if (pass) body.passport = pass.value.trim();
      fetch("api/grades/profile", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d.__status = r.status; return d; }); }, function () { return { __status: 0, error: "network" }; })
        .then(function (d) {
          btn.disabled = false;
          if (pass) pass.value = "";
          if (d.__status === 200) { onSaved(d); return; }
          show(ERR[d.error] || ERR.bad_request, d.error === "bad_name" ? name : pass);
        });
    });
    box.appendChild(form);
    if (window.I18N) I18N.apply();
    return form;
  }
  window.MedixaProfile = { mount: mount };
})();
