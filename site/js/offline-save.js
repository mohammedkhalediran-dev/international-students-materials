/* js/offline-save.js — زر «حفظ ملفات المادة للعمل بلا إنترنت» في صفحة المادة.
   يطلب كل ملفات PDF المعروضة في الصفحة؛ sw.js يحفظ كل ملف عند وصوله فيفتح بلا إنترنت (في العارض وفي «اكتب وظلّل»). */
(function () {
  "use strict";
  var btn = document.getElementById("offlineSave");
  if (!btn) return;
  var L = (document.documentElement.lang || "ar").slice(0, 2);
  var T = {
    ar: { none: "لا ملفات PDF لحفظها", wait: "افتح الصفحة مرة أخرى بالإنترنت ثم أعد المحاولة", done: "تم حفظ الملفات", part: "تعذّر حفظ بعضها", base: btn.textContent },
    en: { none: "No PDF files to save", wait: "Open the page once more online, then try again", done: "Files saved", part: "Some files could not be saved", base: btn.textContent },
    fa: { none: "فایل PDF برای ذخیره نیست", wait: "یک بار دیگر صفحه را آنلاین باز کنید و دوباره تلاش کنید", done: "فایل‌ها ذخیره شد", part: "ذخیره برخی فایل‌ها ممکن نشد", base: btn.textContent }
  }[L] || null;
  if (!T) T = { none: "No PDF files to save", wait: "Open the page once more online", done: "Files saved", part: "Some files could not be saved", base: btn.textContent };
  btn.onclick = function () {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) { btn.textContent = T.wait; return; }
    var seen = {}, urls = [].slice.call(document.querySelectorAll("a.file-link")).map(function (a) { return a.href; }).filter(function (h) {
      if (seen[h] || !(/\.pdf($|\?|#)/i.test(h) || /\/api\/file\//.test(h)) || h.indexOf(location.origin) !== 0) return false;
      return (seen[h] = true);
    });
    if (!urls.length) { btn.textContent = T.none; return; }
    btn.disabled = true;
    var i = 0, ok = 0;
    (function next() {
      if (i >= urls.length) { btn.disabled = false; btn.textContent = (ok === urls.length ? T.done : T.part) + " (" + ok + "/" + urls.length + ")"; return; }
      btn.textContent = (i + 1) + "/" + urls.length;
      fetch(urls[i++], { credentials: "same-origin" }).then(function (r) { if (r.ok) ok++; return r.arrayBuffer(); }).catch(function () {}).then(next);
    })();
  };
})();
