/* يحفظ صفحات الموقع والملفات التي تفتحها لتعمل بلا إنترنت */
var V = "medixa-studio21-nw65f-side66e-tr73";
var SHELL = ["index.html", "course.html", "semester.html", "study.html", "workspace.html", "timetable.html", "assets/medical-thorax.webp", "assets/brain-pearl.webp", "css/medical-banner.css?v=step58", "css/timetable.css?v=step58", "js/medical-banner.js?v=step58", "js/timetable.js?v=step58", "assets/icon-192.png", "assets/notify-badge.png", "css/style.css?v=side66e", "css/motion.css?v=side66c", "js/motion.js?v=step60", "css/semester.css?v=step58", "css/workspace.css?v=step58", "js/app.js?v=side66", "js/nav.js?v=side66", "js/home.js?v=step58", "js/workspace.js?v=step58", "js/planner.js?v=step58", "js/questions.js?v=step58", "js/i18n.js?v=step63", "js/pdf-viewer.js?v=step68", "data/courses.js?v=step67", "data/study/medical-immunology-1.js?v=step58", "data/study/nutrition-principles-1.js?v=step58", "data/study/biochemistry-hormones-1.js?v=step58"];
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

/* Step 49: إشعارات الموقع (Web Push) — الرسالة مشفّرة من الخادم: {title, body, url, tag}
   Step 52 (اختياري في الرسالة): category, course, actions [{action, title, url}], count, ts.
   شكل الإشعار نفسه يحدده نظام الجهاز؛ هنا نختار الأيقونة والشارة والنص والأزرار فقط.
   الأزرار تظهر حيث يدعمها النظام (Android وChrome/Edge على الكمبيوتر)؛ في iPhone/iPad وSafari لا تظهر،
   والضغط على الإشعار نفسه يفتح الوجهة نفسها (البديل العامل). */
function notifyOptions(m) {
  var acts = Array.isArray(m.actions) ? m.actions.filter(function (a) { return a && a.action && a.title && a.url; }).slice(0, 2) : [];
  var max = (self.Notification && self.Notification.maxActions) || 0;
  var o = {
    body: m.body || "",
    tag: m.tag || "medixa",
    icon: "assets/icon-192.png",
    badge: "assets/notify-badge.png", // Android: شارة أحادية اللون في شريط الحالة
    lang: "ar",
    dir: "rtl",
    timestamp: typeof m.ts === "number" ? m.ts : Date.now(),
    renotify: false, // تحديث إشعار المادة نفسها (تجميع) يحلّ محل السابق بلا صوت جديد
    data: { url: m.url || "index.html", actions: {} }
  };
  acts.forEach(function (a) { o.data.actions[a.action] = a.url; });
  if (max > 0 && acts.length) o.actions = acts.slice(0, max).map(function (a) { return { action: a.action, title: a.title }; });
  return o;
}
self.addEventListener("push", function (e) {
  var m = {};
  try { m = e.data ? e.data.json() : {}; } catch (err) { m = { title: "Medixa", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(m.title || "Medixa", notifyOptions(m)));
});
function safeTarget(u) {
  var t;
  try { t = new URL(u || "index.html", self.registration.scope); } catch (err) { t = null; }
  return t && t.origin === self.location.origin ? t : new URL("index.html", self.registration.scope);
}
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var d = e.notification.data || {};
  var target = safeTarget((e.action && d.actions && d.actions[e.action]) || d.url);
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    // نافذة مفتوحة من الموقع: ننقلها إلى الوجهة (المحاضرة نفسها) ونظهرها؛ وإن تعذّر النقل نفتح نافذة جديدة
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if ("focus" in c && "navigate" in c) {
        return c.focus().then(function (fc) { return (fc || c).navigate(target.href); }).catch(function () { return self.clients.openWindow(target.href); });
      }
    }
    return self.clients.openWindow(target.href);
  }));
});
