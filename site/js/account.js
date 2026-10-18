/* js/account.js — صفحة «حسابي»: دخول بالبريد (رمز من 6 أرقام) + «ملفاتي المعلّق عليها». */
(function () {
  "use strict";
  if (!window.MS || (MS.dataError && MS.dataError())) return;
  var $ = MS.$, el = MS.el, T = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  MS.initShared(); MS.initHeader();
  var next = new URLSearchParams(location.search).get("next") || "";
  function safeNext() { return /^[a-z0-9_-]+\.html(\?[^#]*)?$/i.test(next) ? next : ""; }
  function show(id, on) { $(id).hidden = !on; }
  function err(t) { var e = $("accErr"); e.hidden = !t; e.textContent = t ? T(t) : ""; }
  var pendingEmail = "";

  function when(ts) { try { return new Date(ts).toLocaleDateString(document.documentElement.lang === "ar" ? "ar" : document.documentElement.lang); } catch (e) { return ""; } }

  var seq = 0;
  function renderFiles() {
    var ul = $("filesList"), mine = ++seq;
    var p = MS.cloud.user() ? MS.notes.refreshList().catch(function () {}) : Promise.resolve();
    return p.then(function () { return MS.notes.list(); }).then(function (list) {
      if (mine !== seq) return;          // وصل طلب أحدث: لا نكرر الصفوف
      ul.textContent = "";
      show("filesEmpty", !list.length);
      list.forEach(function (f) {
        var li = el("li", "acc-file");
        var info = el("div", "acc-file-info");
        info.appendChild(el("strong", "en", f.title || f.key));
        var course = f.course && MS.course(f.course);
        var meta = (course ? course.name + " · " : "") + (f.count || f.serverCount || 0) + " " + T("تعليق") + (f.updated ? " · " + when(f.updated) : "");
        info.appendChild(el("span", "acc-meta", meta));
        var open = el("a", "btn btn-primary btn-sm", T("فتح"));
        open.href = "reader.html?u=" + encodeURIComponent(f.url || f.key) + "&t=" + encodeURIComponent(f.title || "") + (f.course ? "&c=" + encodeURIComponent(f.course) : "");
        var del = el("button", "btn btn-secondary btn-sm acc-danger", T("حذف تعليقاتي"));
        del.type = "button";
        del.addEventListener("click", function () {
          if (!window.confirm(T("حذف كل تعليقاتك على هذا الملف؟ لا يمكن التراجع."))) return;
          MS.notes.removeFile(f.key).then(function () { MS.toast(T("تم الحذف")); renderFiles(); }).catch(function () { MS.toast(T("تعذّر الحذف. تحقق من الاتصال.")); });
        });
        li.appendChild(info); li.appendChild(open); li.appendChild(del); ul.appendChild(li);
      });
    });
  }

  function render() {
    var u = MS.cloud.user(), on = MS.cloud.enabled;
    show("accOff", !on);
    show("loginCard", on && !u);
    show("userCard", !!u);
    if (u) {
      $("userEmail").textContent = u.email || "";
      $("userSync").textContent = T("تعليقاتك خاصة بك، وتظهر على كل أجهزتك عند تسجيل الدخول بهذا البريد.");
    }
    return Promise.resolve(u ? MS.notes.guestSummary() : []).then(function (g) {
      show("guestCard", !!(u && g.length));
      if (g.length) $("guestHint").textContent = T("وجدنا تعليقات على") + " " + g.length + " " + T("ملف كتبتها قبل تسجيل الدخول. هل تنقلها إلى حسابك؟");
    }).then(renderFiles);
  }

  $("emailForm").addEventListener("submit", function (e) {
    e.preventDefault(); err("");
    var v = $("emailIn").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { err("اكتب بريداً إلكترونياً صحيحاً."); return; }
    var b = $("sendBtn"); b.disabled = true;
    MS.cloud.sendCode(v).then(function () {
      pendingEmail = v; show("emailForm", false); show("codeForm", true);
      $("codeHint").textContent = T("أرسلنا رمزاً إلى") + " " + v + ". " + T("افتح بريدك واكتب الرمز هنا.");
      $("codeIn").focus();
    }).catch(function (x) { err(MS.cloud.friendly(x)); }).then(function () { b.disabled = false; });
  });
  $("codeForm").addEventListener("submit", function (e) {
    e.preventDefault(); err("");
    var c = $("codeIn").value.replace(/\s+/g, "");
    if (!/^\d{6,10}$/.test(c)) { err("الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزاً جديداً."); return; }
    var b = $("verifyBtn"); b.disabled = true;
    MS.cloud.verifyCode(pendingEmail, c).then(function () {
      var n = safeNext();
      return MS.notes.pushAll().catch(function () {}).then(function () { if (n) { return MS.notes.guestSummary().then(function (g) { if (!g.length) location.href = n; else return render(); }); } return render(); });
    }).catch(function (x) { err(MS.cloud.friendly(x)); }).then(function () { b.disabled = false; });
  });
  $("againBtn").addEventListener("click", function () { err(""); $("codeIn").value = ""; show("codeForm", false); show("emailForm", true); $("emailIn").focus(); });
  $("outBtn").addEventListener("click", function () {
    var sc = MS.notes.scope();
    MS.notes.pushAll().catch(function () {}).then(function () { return MS.cloud.signOut(); }).then(function () { return MS.notes.wipeScope(sc); }).then(function () { MS.toast(T("تم تسجيل الخروج")); render(); });
  });
  $("delAllBtn").addEventListener("click", function () {
    if (!window.confirm(T("حذف كل تعليقاتك من حسابك ومن هذا الجهاز؟ لا يمكن التراجع."))) return;
    MS.notes.removeAll().then(function () { MS.toast(T("تم حذف كل تعليقاتك")); render(); }).catch(function () { MS.toast(T("تعذّر الحذف. تحقق من الاتصال.")); });
  });
  $("mergeBtn").addEventListener("click", function () {
    MS.notes.migrateGuest().then(function () { return MS.notes.pushAll(); }).then(function () { MS.toast(T("تم نقل التعليقات إلى حسابك")); render(); }).catch(function () { MS.toast(T("تعذّر النقل. حاول مجدداً.")); });
  });
  MS.cloud.onChange(function () { render(); });
  MS.cloud.ready().then(render);
})();
