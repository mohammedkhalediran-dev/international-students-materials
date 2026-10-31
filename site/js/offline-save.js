/* js/offline-save.js — حالة الحفظ للعمل بلا إنترنت في صفحة المادة + زر «حفظ الباقي الآن».
   التحميل يجري تلقائياً في الخلفية (js/offline-auto.js)؛ هذا الزر يعرض ما حُفظ ويحفظ الباقي فوراً حتى على بيانات الجوال.
   sw.js يحفظ كل ملف PDF يصل فيفتح بلا إنترنت (في العارض وفي «اكتب وظلّل»). */
(function () {
  "use strict";
  var btn = document.getElementById("offlineSave");
  if (!btn) return;
  var L = (document.documentElement.lang || "ar").slice(0, 2);
  var TX = {
    ar: { none: "لا ملفات PDF لحفظها", wait: "افتح الصفحة مرة أخرى بالإنترنت ثم أعد المحاولة", all: "✓ كل ملفات المادة محفوظة للعمل بلا إنترنت", some: "⬇ المحفوظ للعمل بلا إنترنت: {n} من {m} — اضغط لحفظ الباقي", done: "تم حفظ الملفات", part: "تعذّر حفظ بعضها" },
    en: { none: "No PDF files to save", wait: "Open the page once more online, then try again", all: "✓ All this subject's files are saved for offline use", some: "⬇ Saved offline: {n} of {m} — tap to save the rest", done: "Files saved", part: "Some files could not be saved" },
    fa: { none: "فایل PDF برای ذخیره نیست", wait: "یک بار دیگر صفحه را آنلاین باز کنید و دوباره تلاش کنید", all: "✓ همه فایل‌های این درس برای کار آفلاین ذخیره شده است", some: "⬇ ذخیره‌شده برای آفلاین: {n} از {m} — برای ذخیره بقیه بزنید", done: "فایل‌ها ذخیره شد", part: "ذخیره برخی فایل‌ها ممکن نشد" }
  };
  var T = TX[L] || TX.en;
  function urls() {
    var seen = {};
    return [].slice.call(document.querySelectorAll("a.file-link")).map(function (a) { return a.href; }).filter(function (h) {
      if (seen[h] || !(/\.pdf($|\?|#)/i.test(h) || /\/api\/file\//.test(h)) || h.indexOf(location.origin) !== 0) return false;
      return (seen[h] = true);
    });
  }
  function status() {
    var list = urls();
    if (!list.length) return;
    if (!window.caches) { btn.hidden = true; return; }
    Promise.all(list.map(function (u) { return caches.match(u); })).then(function (hits) {
      var n = hits.filter(Boolean).length;
      btn.textContent = n === list.length ? T.all : T.some.replace("{n}", n).replace("{m}", list.length);
    });
  }
  [1500, 5000, 12000, 25000].forEach(function (ms) { setTimeout(status, ms); });
  btn.onclick = function () {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) { btn.textContent = T.wait; return; }
    var list = urls();
    if (!list.length) { btn.textContent = T.none; return; }
    btn.disabled = true;
    var i = 0, ok = 0;
    (function next() {
      if (i >= list.length) { btn.disabled = false; ok === list.length ? status() : (btn.textContent = T.part + " (" + ok + "/" + list.length + ")"); return; }
      btn.textContent = (i + 1) + "/" + list.length;
      fetch(list[i++], { credentials: "same-origin" }).then(function (r) { if (r.ok) ok++; return r.arrayBuffer(); }).catch(function () {}).then(next);
    })();
  };
})();
