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
  /* ---------- الصورة والاسم الظاهر (للدردشة والقائمة) ---------- */
  function post(body) {
    return fetch("api/profile/public", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d.__status = r.status; return d; }); }, function () { return { __status: 0 }; });
  }
  /* تصغير الصورة إلى 256×256 (قص من الوسط) JPEG، وخفض الجودة حتى يصغر حجمها */
  function shrink(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var S = 256, c = document.createElement("canvas"); c.width = c.height = S;
        var side = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
        var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, S, S); x.drawImage(img, sx, sy, side, side, 0, 0, S, S);
        URL.revokeObjectURL(url);
        var q = 0.86, out = c.toDataURL("image/jpeg", q);
        while (out.length > 80000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
        out.length > 80000 ? rej(new Error("big")) : res(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("bad")); };
      img.src = url;
    });
  }
  function cacheSidebar(pub) { try { localStorage.setItem("ms.pub", JSON.stringify({ n: pub.display_name || "", a: pub.has_avatar ? pub.updated_at : 0, id: pub.id, at: Date.now() })); } catch (e) {} }
  function renderPublic(user, pub) {
    var box = $("pfPublic"); box.replaceChildren(); box.hidden = false;
    box.appendChild(el("h2", "pf-pub-title", t("صورتك واسمك في الدردشة")));
    box.appendChild(el("p", "tt-sub", t("يراهما زملاؤك في الدردشة. لا يغيّران اسمك الحقيقي ولا درجاتك.")));
    var row = el("div", "pf-pub-row");
    var av = el("span", "pf-avatar"); row.appendChild(av);
    var name = pub.display_name || user.name || "";
    function paintAv() {
      av.replaceChildren();
      if (pub.has_avatar) { var im = el("img"); im.alt = ""; im.src = "api/avatar/" + user.id + "?v=" + pub.updated_at; av.appendChild(im); }
      else av.textContent = String(name).trim().charAt(0).toUpperCase() || "?";
    }
    paintAv();
    var side = el("div", "pf-pub-side");
    var status = el("p", "pf-pub-status"); status.setAttribute("role", "status");
    function say(msg) { status.textContent = t(msg); }
    var file = el("input"); file.type = "file"; file.accept = "image/*"; file.hidden = true;
    var pickBtn = el("button", "tt-btn", t("اختيار صورة")); pickBtn.type = "button";
    pickBtn.addEventListener("click", function () { file.click(); });
    var delBtn = el("button", "tt-btn", t("حذف الصورة")); delBtn.type = "button"; delBtn.hidden = !pub.has_avatar;
    file.addEventListener("change", function () {
      var f = file.files && file.files[0]; if (!f) return;
      say("جارٍ رفع الصورة…");
      shrink(f).then(function (data) { return post({ image: data }); }).then(function (d) {
        if (d.__status === 200) { pub.has_avatar = true; pub.updated_at = d.updated_at; paintAv(); delBtn.hidden = false; cacheSidebar(Object.assign({ id: user.id }, pub)); say("تم حفظ الصورة."); }
        else say(d.__status === 429 ? "تمهّل قليلاً ثم حاول مرة أخرى." : "تعذّر حفظ الصورة. جرّب صورة أخرى.");
      }, function () { say("تعذّر قراءة الصورة. جرّب صورة أخرى."); });
      file.value = "";
    });
    delBtn.addEventListener("click", function () {
      post({ remove: true }).then(function (d) {
        if (d.__status === 200) { pub.has_avatar = false; pub.updated_at = d.updated_at; paintAv(); delBtn.hidden = true; cacheSidebar(Object.assign({ id: user.id }, pub)); say("حُذفت الصورة."); }
        else say("حدث خطأ. حاول مرة أخرى.");
      });
    });
    var btns = el("div", "pf-pub-btns"); btns.appendChild(pickBtn); btns.appendChild(delBtn); btns.appendChild(file);
    side.appendChild(btns);
    var lab = el("label", "pf-pub-label", t("الاسم الظاهر")); lab.htmlFor = "pfDisplay";
    var inp = el("input", "field"); inp.id = "pfDisplay"; inp.maxLength = 30; inp.value = pub.display_name || ""; inp.placeholder = user.name || "";
    inp.setAttribute("data-i18n-skip", "");
    var save = el("button", "tt-btn is-primary", t("حفظ الاسم")); save.type = "button";
    save.addEventListener("click", function () {
      post({ name: inp.value }).then(function (d) {
        if (d.__status === 200) { pub.display_name = d.display_name; name = d.display_name || user.name || ""; paintAv(); cacheSidebar(Object.assign({ id: user.id }, pub)); say(d.display_name ? "تم حفظ الاسم." : "عاد اسمك إلى اسم حساب Google."); }
        else say(d.__status === 429 ? "تمهّل قليلاً ثم حاول مرة أخرى." : "اكتب اسماً من حرفين على الأقل.");
      });
    });
    side.appendChild(lab); side.appendChild(inp); side.appendChild(save); side.appendChild(status);
    row.appendChild(side); box.appendChild(row);
    if (window.I18N) I18N.apply(box);
  }
  function render(user, d) {
    $("grStatus").textContent = "";
    var p = d.profile || {};
    get("api/profile/public").then(function (pub) { if (pub.__status === 200) renderPublic(user, pub); });
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
