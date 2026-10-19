/* js/my-course.js — Step 49 (بقرار محمد 2026-10-19):
   1) «كورسي»: الطالب يختار كورسه (ms.sem) في أول زيارة للرئيسية ثم تُفتح صفحة كورسه. بعدها لا تظهر له الكورسات
      الأخرى في الواجهة (الحذف في js/app.js). يغيّره من الإعدادات فقط (workspace.html?view=settings). ms.sem يُزامن مع الحساب.
   2) إشعارات الموقع (Web Push): زر في القائمة الجانبية. إشعار المحاضرة يصل لطلاب كورسها فقط، والتبليغ للجميع.
      على iPhone/iPad لا تعمل إلا بعد «إضافة إلى الشاشة الرئيسية» وفتح الموقع من هناك (iOS 16.4+). */
(function () {
  "use strict";
  if (!window.MS || typeof SEMESTERS === "undefined") return;
  var ALL = MS.ALL_SEMESTERS || SEMESTERS;
  var KEY = "ms.sem";
  function T(s) { return window.I18N && I18N.t ? I18N.t(s) : s; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function mySem() { var v = MS.load(KEY, null); return ALL.some(function (s) { return s.id === v; }) ? v : null; }
  function apply() { if (window.I18N && I18N.apply) I18N.apply(); }

  /* ---------- اختيار الكورس ---------- */
  var dlg = null;
  function picker(opts) {
    opts = opts || {};
    if (!dlg) {
      dlg = el("dialog", "mc-dialog"); dlg.id = "myCourseDialog"; dlg.setAttribute("aria-labelledby", "mcTitle");
      var h = el("h2", "mc-title", "في أي كورس أنت؟"); h.id = "mcTitle"; dlg.appendChild(h);
      dlg.appendChild(el("p", "mc-sub", "تظهر لك موادّ كورسك فقط، وتصلك إشعارات محاضراته. يمكنك تغييره لاحقاً من الإعدادات."));
      var list = el("div", "mc-options");
      ALL.slice().sort(function (a, b) { return b.id - a.id; }).forEach(function (s) {
        var b = el("button", "mc-option"); b.type = "button"; b.setAttribute("data-sem", String(s.id));
        b.appendChild(el("span", "mc-no", String(s.id).padStart(2, "0")));
        b.appendChild(el("span", "mc-name", s.name));
        b.addEventListener("click", function () { choose(s.id); });
        list.appendChild(b);
      });
      dlg.appendChild(list);
      var later = el("button", "btn btn-secondary btn-sm mc-later", "لاحقاً"); later.type = "button";
      later.addEventListener("click", function () { dlg.close(); });
      dlg.appendChild(later);
      document.body.appendChild(dlg);
      apply();
    }
    dlg._go = !!opts.go;
    [].forEach.call(dlg.querySelectorAll(".mc-option"), function (b) { b.setAttribute("aria-pressed", String(Number(b.getAttribute("data-sem")) === mySem())); });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  function choose(id) {
    var go = dlg && dlg._go;
    if (dlg) dlg.close();
    setCourse(id, go ? "semester.html?id=" + id : null);
  }
  /* حفظ الكورس، ونقل اشتراك الإشعارات إليه، ثم إعادة بناء الصفحة (لتختفي الكورسات الأخرى) */
  function setCourse(id, next) {
    MS.save(KEY, id);
    var done = function () { if (next) location.href = next; else location.reload(); };
    currentSub().then(function (s) {
      if (!s) return;
      var j = s.toJSON(); j.semester = id;
      return api("POST", "subscribe", j);
    }).then(done, done);
  }
  MS.chooseCourse = picker;
  MS.setCourse = setCourse;


  /* ---------- الإشعارات ---------- */
  var serverKey = null, pushRow = null;
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  var supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  function api(method, path, body) {
    return fetch("api/push/" + path, { method: method, credentials: "same-origin", headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, data: d }; }); }, function () { return { status: 0, data: {} }; });
  }
  function keyBytes(b64) {
    var s = b64.replace(/-/g, "+").replace(/_/g, "/"); s += "===".slice((s.length + 3) % 4);
    var bin = atob(s), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
  }
  function registration() { return navigator.serviceWorker.register("sw.js").then(function () { return navigator.serviceWorker.ready; }); }
  function currentSub() { return supported ? registration().then(function (r) { return r.pushManager.getSubscription(); }).catch(function () { return null; }) : Promise.resolve(null); }

  function setRow(state) {
    if (!pushRow) return;
    pushRow.hidden = state === "hidden";
    var b = pushRow.querySelector(".push-btn"), note = pushRow.querySelector(".push-note");
    pushRow.setAttribute("data-state", state);
    var L = {
      off: ["تفعيل الإشعارات", "يصلك إشعار عند تبليغ جديد أو محاضرة جديدة في كورسك."],
      on: ["إيقاف الإشعارات", "الإشعارات مفعّلة على هذا الجهاز."],
      ios: ["تفعيل الإشعارات", "على iPhone وiPad: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»، وافتح Medixa من أيقونتها، ثم فعّل الإشعارات من هنا."],
      denied: ["الإشعارات محظورة", "سمحت سابقاً بالرفض. فعّلها من إعدادات المتصفح لهذا الموقع."],
      busy: ["جارٍ التفعيل…", ""],
      error: ["تفعيل الإشعارات", "تعذّر التفعيل. حاول مرة أخرى."]
    }[state] || ["", ""];
    if (b) { b.textContent = T(L[0]); b.disabled = state === "denied" || state === "busy"; }
    if (note) { note.textContent = T(L[1]); note.hidden = !L[1]; }
  }
  function refresh() {
    if (!serverKey) return setRow("hidden");
    if (!supported) return setRow(isIOS && !standalone ? "ios" : "hidden");
    if (Notification.permission === "denied") return setRow("denied");
    currentSub().then(function (s) { setRow(s ? "on" : "off"); autoEnable(s); });
  }
  /* تفعيل تلقائي لمن سجّل الدخول (بطلب محمد 2026-10-19): بلا ضغط زر الإشعارات.
     المتصفحات (وiOS خصوصاً) تشترط لمسة من المستخدم لإظهار نافذة الإذن، فنطلبها عند أول لمسة بعد الدخول، مرة واحدة لكل جهاز.
     إن كان الإذن ممنوحاً سابقاً يُفعَّل بصمت، ويُربط الاشتراك الحالي بالحساب. من رفض الإذن لا نعيد إزعاجه. */
  var armed = false;
  function autoEnable(sub) {
    var off = false; try { off = localStorage.getItem("ms.push.off") === "1"; } catch (e) { /* لا شيء */ }
    if (off || armed || !window.MSAuth || !mySem() || Notification.permission === "denied") return;
    MSAuth.me().then(function (u) {
      if (!u || armed) return;
      if (sub || Notification.permission === "granted") { armed = true; return silentSubscribe(sub); }
      var asked = false; try { asked = localStorage.getItem("ms.push.asked") === "1"; } catch (e) { /* لا شيء */ }
      if (asked) return;
      armed = true;
      var once = function () {
        document.removeEventListener("pointerup", once, true);
        try { localStorage.setItem("ms.push.asked", "1"); } catch (e) { /* لا شيء */ }
        enable();
      };
      document.addEventListener("pointerup", once, true);
    }).catch(function () { /* لا شيء */ });
  }
  function silentSubscribe(sub) {
    return registration().then(function (r) {
      return sub || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(serverKey) });
    }).then(function (s) {
      var j = s.toJSON(); j.semester = mySem();
      return api("POST", "subscribe", j).then(function (res) { setRow(res.status === 200 ? "on" : "error"); });
    }).catch(function () { /* لا شيء */ });
  }
  function enable() {
    if (!mySem()) { picker(); return; }
    if (!supported) { setRow(isIOS && !standalone ? "ios" : "hidden"); return; }
    try { localStorage.removeItem("ms.push.off"); } catch (e) { /* لا شيء */ }
    setRow("busy");
    Notification.requestPermission().then(function (p) {
      if (p !== "granted") return setRow(p === "denied" ? "denied" : "off");
      return registration().then(function (r) {
        return r.pushManager.getSubscription().then(function (old) { return old || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(serverKey) }); });
      }).then(function (sub) {
        var j = sub.toJSON(); j.semester = mySem();
        return api("POST", "subscribe", j).then(function (res) { setRow(res.status === 200 ? "on" : "error"); });
      });
    }).catch(function () { setRow("error"); });
  }
  function disable() {
    try { localStorage.setItem("ms.push.off", "1"); } catch (e) { /* لا شيء */ } // اختيار المستخدم: لا نعيد التفعيل تلقائياً
    setRow("busy");
    currentSub().then(function (s) {
      if (!s) return setRow("off");
      return api("POST", "unsubscribe", { endpoint: s.endpoint }).then(function () { return s.unsubscribe(); }).then(function () { setRow("off"); });
    }).catch(function () { refresh(); });
  }
  function paintPush() {
    var box = document.querySelector(".sb-user");
    if (!box || pushRow) return;
    pushRow = el("div", "sb-push"); pushRow.hidden = true;
    var b = el("button", "push-btn"); b.type = "button";
    if (MS.icon) { var ic = MS.icon("bell", 18); ic.setAttribute("aria-hidden", "true"); pushRow.appendChild(ic); }
    pushRow.appendChild(b);
    var note = el("p", "push-note"); pushRow.appendChild(note);
    b.addEventListener("click", function () {
      var st = pushRow.getAttribute("data-state");
      if (st === "on") disable(); else if (st === "ios") { note.hidden = false; } else enable();
    });
    box.parentNode.insertBefore(pushRow, box.nextSibling);
    api("GET", "key").then(function (r) { serverKey = r.status === 200 && r.data.ready ? r.data.publicKey : null; refresh(); });
  }
  paintPush();
  // أول زيارة للرئيسية بلا كورس: نسأل مرة في الجلسة، ثم نفتح صفحة الكورس المختار
  var home = /(^|\/)(index\.html)?$/.test(location.pathname) && !location.hash;
  var asked = false; try { asked = sessionStorage.getItem("ms.sem.asked") === "1"; } catch (e) { /* لا شيء */ }
  if (home && !mySem() && !asked) {
    try { sessionStorage.setItem("ms.sem.asked", "1"); } catch (e) { /* لا شيء */ }
    picker({ go: true });
  }
})();
