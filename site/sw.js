/* يحفظ صفحات الموقع والملفات التي تفتحها لتعمل بلا إنترنت */
var V = "medixa-step47";
var SHELL = ["index.html", "course.html", "semester.html", "study.html", "workspace.html", "assets/medical-thorax.webp", "css/style.css?v=step47", "css/semester.css?v=step47", "css/workspace.css?v=step47", "js/app.js?v=step47", "js/nav.js?v=step47", "js/home.js?v=step47", "js/workspace.js?v=step47", "js/planner.js?v=step47", "js/questions.js?v=step47", "js/i18n.js?v=step47", "data/courses.js?v=step47", "data/study/medical-immunology-1.js?v=step47"];
var CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // Step 45: مكتبات قارئ PDF الثابتة (إصدارات محددة) تُحفظ بعد أول زيارة ليعمل القارئ بلا إنترنت
  if (CDN.indexOf(url.origin + url.pathname) !== -1) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && (res.type === "opaque" || res.status === 200)) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(req, copy); }); }
        return res;
      });
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  if (/^\/api\/(auth\/|sync|announcements)/.test(url.pathname)) return; // الحساب والمزامنة: دائماً من الشبكة
  if (/\/api\//.test(url.pathname)) return;
  var isPdf = /\.pdf$/i.test(url.pathname);
  e.respondWith(
    (isPdf ? caches.match(req).then(function (hit) { return hit || fetchAndStore(req); })
           : fetchAndStore(req).catch(function () { return caches.match(req, { ignoreSearch: true }); }))
  );
});
function fetchAndStore(req) {
  return fetch(req, { cache: "no-cache" }).then(function (res) {
    if (res && res.status === 200 && !res.redirected) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(req, copy); }); }
    return res;
  });
}
