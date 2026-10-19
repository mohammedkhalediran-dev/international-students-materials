/* js/my-course.js — Step 49 (بقرار محمد 2026-10-19):
   1) «كورسي»: الطالب يختار كورسه (ms.sem)؛ أول زيارة للرئيسية تسأله ثم تفتح صفحة كورسه، ويغيّره من القائمة الجانبية.
      ms.sem يُزامن مع الحساب (SYNC_KEYS) ويُستعمل في «الحالي» و«أحدث المحاضرات».
   2) إشعارات الموقع (Web Push): زر في القائمة الجانبية. إشعار المحاضرة يصل لطلاب كورسها فقط، والتبليغ للجميع.
      على iPhone/iPad لا تعمل إلا بعد «إضافة إلى الشاشة الرئيسية» وفتح الموقع من هناك (iOS 16.4+). */
(function () {
  "use strict";
  if (!window.MS || typeof SEMESTERS === "undefined") return;
  var KEY = "ms.sem";
  function T(s) { return window.I18N && I18N.t ? I18N.t(s) : s; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function mySem() { var v = MS.load(KEY, null); return SEMESTERS.some(function (s) { return s.id === v; }) ? v : null; }
  function semName(id) { var s = SEMESTERS.filter(function (x) { return x.id === id; })[0]; return s ? (MS.lang === "en" && s.nameEn ? s.nameEn : s.name) : ""; }
  function apply() { if (window.I18N && I18N.apply) I18N.apply(); }

  /* ---------- اختيار الكورس ---------- */
  var dlg = null;
  function picker(opts) {
    opts = opts || {};
    if (!dlg) {
      dlg = el("dialog", "mc-dialog"); dlg.id = "myCourseDialog"; dlg.setAttribute("aria-labelledby", "mcTitle");
      var h = el("h2", "mc-title", "في أي كورس أنت؟"); h.id = "mcTitle"; dlg.appendChild(h);
      dlg.appendChild(el("p", "mc-sub", "نعرض لك موادّ كورسك أولاً، وتصلك إشعارات محاضراته فقط. يمكنك تغييره لاحقاً من القائمة."));
      var list = el("div", "mc-options");
      SEMESTERS.slice().sort(function (a, b) { return b.id - a.id; }).forEach(function (s) {
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
    var changed = mySem() !== id;
    MS.save(KEY, id);
    if (dlg) dlg.close();
    paintSidebar();
    if (changed) document.dispatchEvent(new CustomEvent("ms:sem", { detail: id }));
    if (dlg && dlg._go) { location.href = "semester.html?id=" + id; return; }
    if (changed && /(^|\/)(index\.html)?$/.test(location.pathname)) location.reload(); // الرئيسية تبني «الحالي» و«أحدث المحاضرات» من الكورس
  }
  MS.chooseCourse = picker;

  /* ---------- القائمة الجانبية: «كورسي · تغيير» وزر الإشعارات ---------- */
  function paintSidebar() {
    var box = document.querySelector(".sb-user");
    if (!box) return;
    var text = box.querySelector(".sb-user-text");
    var btn = box.querySelector(".mc-change");
    if (!btn && text) {
      btn = el("button", "mc-change"); btn.type = "button";
      btn.addEventListener("click", function () { picker(); });
      var small = text.querySelector("small");
      if (small) text.replaceChild(btn, small); else text.appendChild(btn);
    }
    if (btn) {
      var s = mySem();
      btn.textContent = s ? semName(s) + " · " + T("تغيير") : T("اختر كورسك");
      btn.setAttribute("data-i18n-skip", "");
    }
    paintPush();
  }

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
    currentSub().then(function (s) { setRow(s ? "on" : "off"); });
  }
  function enable() {
    if (!mySem()) { picker(); return; }
    if (!supported) { setRow(isIOS && !standalone ? "ios" : "hidden"); return; }
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
  // تغيّر الكورس: نحدّث كورس الاشتراك على الخادم حتى تصل إشعارات الكورس الجديد
  document.addEventListener("ms:sem", function (e) {
    currentSub().then(function (s) { if (s) { var j = s.toJSON(); j.semester = e.detail; api("POST", "subscribe", j); } });
  });

  paintSidebar();
  // أول زيارة للرئيسية بلا كورس: نسأل مرة في الجلسة، ثم نفتح صفحة الكورس المختار
  var home = /(^|\/)(index\.html)?$/.test(location.pathname) && !location.hash;
  var asked = false; try { asked = sessionStorage.getItem("ms.sem.asked") === "1"; } catch (e) { /* لا شيء */ }
  if (home && !mySem() && !asked) {
    try { sessionStorage.setItem("ms.sem.asked", "1"); } catch (e) { /* لا شيء */ }
    picker({ go: true });
  }
})();
