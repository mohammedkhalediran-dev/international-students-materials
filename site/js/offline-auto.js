/* js/offline-auto.js — تحميل تلقائي لملفات PDF لمواد كورس الطالب ليعمل الموقع بلا إنترنت (بطلب محمد 2026-10-31).
   يعمل بصمت في الخلفية بعد فتح الصفحة: ملفاً ملفاً، الأحدث أولاً، ويتجاوز ما حُفظ. sw.js يخزّن كل ملف يصل.
   لا يعمل على بيانات الجوال أو مع «توفير البيانات»، ويتوقف إن امتلأ التخزين (80٪) أو انقطع الإنترنت.
   الإيقاف: localStorage ms.autoOffline = "0". الحالة في ms.offlineStat. */
(function () {
  "use strict";
  if (!window.caches || !navigator.serviceWorker || typeof COURSES === "undefined") return;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  if (get("ms.autoOffline") === "0") return;

  function cheap() {
    var c = navigator.connection;
    return !(c && (c.saveData || c.type === "cellular"));
  }
  function files() {
    var base = (window.SITE && SITE.filesBase) || "files/", seen = {}, out = [];
    function add(f, courseOk) {
      if (!f || f.external || f.draft || !courseOk) return;
      var u = f.url || (f.path ? base + f.path.split("/").map(encodeURIComponent).join("/") : "");
      if (!u || (!/\.pdf($|\?)/i.test(u) && u.indexOf("api/file/") !== 0)) return;
      var abs = new URL(u, document.baseURI).href;
      if (seen[abs]) return; seen[abs] = true; out.push({ url: abs, added: f.added || "" });
    }
    COURSES.forEach(function (c) {
      (c.lectures || []).forEach(function (l) { if (!l.draft) (l.files || []).forEach(function (f) { add(f, true); }); });
      (c.extras || []).forEach(function (f) { add(f, true); });
    });
    out.sort(function (a, b) { return b.added.localeCompare(a.added); });
    return out;
  }
  function room() {
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(true);
    return navigator.storage.estimate().then(function (e) { return !e.quota || e.usage / e.quota < 0.8; }, function () { return true; });
  }

  function run() {
    if (!navigator.serviceWorker.controller || navigator.onLine === false || !cheap()) return;
    var list = files(), total = list.length, done = 0, i = 0;
    if (!total) return;
    // آخر تشغيل كامل: لا نكرره أكثر من مرة كل 6 ساعات ما دام لا جديد
    var last = +get("ms.offlineAt") || 0, sig = String(total);
    if (get("ms.offlineSig") === sig && Date.now() - last < 6 * 3600 * 1000) return;
    (function next() {
      if (i >= list.length || navigator.onLine === false) { finish(); return; }
      var f = list[i++];
      caches.match(f.url).then(function (hit) {
        if (hit) { done++; return null; }
        return room().then(function (ok) {
          if (!ok) { i = list.length; return null; }
          return fetch(f.url, { credentials: "same-origin" }).then(function (r) { if (r.ok) { done++; return r.arrayBuffer(); } }).catch(function () {});
        });
      }).then(function () { set("ms.offlineStat", JSON.stringify({ done: done, total: total })); setTimeout(next, 150); });
    })();
    function finish() { set("ms.offlineStat", JSON.stringify({ done: done, total: total })); if (done === total) { set("ms.offlineAt", String(Date.now())); set("ms.offlineSig", String(total)); } }
  }

  function start() { setTimeout(function () { try { run(); } catch (e) {} }, 4000); }
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);
  window.MedixaOfflineAuto = { run: run, files: files };
})();
