/* يحفظ صفحات الموقع والملفات التي تفتحها لتعمل بلا إنترنت */
var V = "medixa-off96";
var SHELL = [
  "js/offline-save.js?v=off96",
  "js/offline-auto.js?v=off96",
  "./assets/logo.png",
  "./css/studio-annotations.css?v=ink2",
  "./css/studio-compact.css?v=fg67",
  "./css/studio-extras.css?v=nw65b",
  "./css/studio-objects.css?v=ink2",
  "./css/studio-search.css?v=ink2",
  "./css/studio-settings.css?v=nw65b",
  "./css/studio-textactions.css?v=nw65c",
  "./css/studio.css?v=hl70",
  "./css/study-mode-v5.css",
  "./css/study-suite-v85.css",
  "./js/anki-scheduler.js",
  "./js/pdf-raster-manifest.js",
  "./js/pdf-sync-core.js?v=step63",
  "./js/pdf-sync.js?v=img66",
  "./js/studio-assets.js?v=img66",
  "./js/studio-compact.js?v=nw65b",
  "./js/studio-core.js?v=compact2",
  "./js/studio-ink.js?v=bk81",
  "./js/studio-laser.js?v=nw65b",
  "./js/studio-panels.js?v=compact1",
  "./js/studio-reader.js?v=bk81",
  "./js/studio-search.js?v=ink2",
  "./js/studio-shell.js?v=nw65b",
  "./js/studio-smart.js?v=tr78",
  "./js/studio-split.js?v=studio4",
  "./js/studio-tabs.js?v=ink3",
  "./js/studio-timer.js?v=nw65b",
  "./js/studio-toolbar.js?v=nw65b",
  "./js/studio-tools.js?v=compact2",
  "./js/study-backup-v87.js?v=step40",
  "./js/study-dock-v91.js?v=step58",
  "./js/study-enhancements.js",
  "./js/study-ink-backup-v89.js",
  "./js/study-mode-v5.js",
  "./js/study-mode-v82.js",
  "./js/study-occlusion-v90.js?v=step58",
  "./js/study-planner-v84.js?v=step42",
  "./js/study-recovery-diagnostics.js",
  "./js/study-recovery-v88.js",
  "./js/study-storage-guard.js?v=step42",
  "./js/study-suite-v85.js?v=step58",
  "./js/study-text-cards-v92.js?v=step46",
  "./js/study-timer-v83.js",
  "./js/study-workspace-v86.js?v=step42",
  "assets/apple-touch-icon.png",
  "assets/brain-pearl.webp",
  "assets/icon-192.png",
  "assets/logo.png",
  "assets/medical-thorax.webp",
  "course.html",
  "css/exams.css?v=ex91",
  "css/grades.css?v=step66",
  "css/medical-banner.css?v=step58",
  "css/motion.css?v=side66c",
  "css/semester.css?v=step58",
  "css/style.css?v=off92",
  "css/timetable.css?v=tt87",
  "css/workspace.css?v=step58",
  "data/courses.js?v=step67",
  "data/study/biochemistry-hormones-1.js?v=step58",
  "data/study/medical-immunology-1.js?v=step58",
  "data/study/nutrition-principles-1.js?v=step58",
  "data/study/physiology-kidney-1.js?v=kidney72",
  "exams.html",
  "grades.html",
  "index.html",
  "js/ai-chat.js?v=step58",
  "js/app.js?v=side66",
  "js/auth.js?v=off94",
  "js/exams-home.js?v=ex91",
  "js/exams.js?v=ex91",
  "js/grades.js?v=step66",
  "js/home.js?v=step58",
  "js/i18n.js?v=ex91",
  "js/medical-banner.js?v=step58",
  "js/motion.js?v=mv82",
  "js/my-course.js?v=step58",
  "js/nav.js?v=off92",
  "js/pdf-viewer.js?v=step68",
  "js/planner.js?v=step58",
  "js/profile-form.js?v=step63",
  "js/profile.js?v=step62",
  "js/questions.js?v=step58",
  "js/study-summary.js?v=step58",
  "js/timetable.js?v=tt87",
  "js/workspace.js?v=ex91",
  "login.html",
  "manifest.webmanifest",
  "pdf-notes.html",
  "profile.html",
  "semester.html",
  "study.html",
  "timetable-admin.html",
  "timetable.html",
  "upload.html",
  "workspace.html"
];
var FONTS = [
  "vendor/pdfjs/standard_fonts/FoxitDingbats.pfb",
  "vendor/pdfjs/standard_fonts/FoxitFixed.pfb",
  "vendor/pdfjs/standard_fonts/FoxitFixedBold.pfb",
  "vendor/pdfjs/standard_fonts/FoxitFixedBoldItalic.pfb",
  "vendor/pdfjs/standard_fonts/FoxitFixedItalic.pfb",
  "vendor/pdfjs/standard_fonts/FoxitSerif.pfb",
  "vendor/pdfjs/standard_fonts/FoxitSerifBold.pfb",
  "vendor/pdfjs/standard_fonts/FoxitSerifBoldItalic.pfb",
  "vendor/pdfjs/standard_fonts/FoxitSerifItalic.pfb",
  "vendor/pdfjs/standard_fonts/FoxitSymbol.pfb",
  "vendor/pdfjs/standard_fonts/LICENSE_FOXIT",
  "vendor/pdfjs/standard_fonts/LICENSE_LIBERATION",
  "vendor/pdfjs/standard_fonts/LiberationSans-Bold.ttf",
  "vendor/pdfjs/standard_fonts/LiberationSans-BoldItalic.ttf",
  "vendor/pdfjs/standard_fonts/LiberationSans-Italic.ttf",
  "vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf"
];
var CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"
];
self.addEventListener("install", function (e) {
  // كل ملف يُحفظ على حدة: غياب ملف واحد لا يُفشل التثبيت كله (الصفحات والسكربتات الأساسية متاحة بلا إنترنت من أول مرة)
  e.waitUntil(caches.open(V).then(function (c) {
    // مكتبات القارئ (pdf.js وpdf-lib) وخطوطه تُحفظ مسبقاً ليعمل «اكتب وظلّل» بلا إنترنت من أول مرة
    CDN.forEach(function (u) { fetch(u, { mode: "no-cors" }).then(function (r) { return c.put(u, r); }).catch(function () {}); });
    FONTS.forEach(function (u) { fetch(u).then(function (r) { return r.status === 200 ? c.put(u, r) : null; }).catch(function () {}); });
    return Promise.all(SHELL.map(function (u) {
      return fetch(u, { cache: "reload" }).then(function (res) { return res.status === 200 ? clean(res).then(function (r) { return c.put(u, r); }) : null; }).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
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
  // بيانات للقراءة فقط تُحفظ آخر نسخة منها لتظهر بلا إنترنت (الجدول، الامتحانات، التبليغات، قائمة الملفات المرفوعة)
  // ملفات المحاضرات المرفوعة (api/file/<id>): تُحفظ عند أول فتح وتعمل بلا إنترنت
  if (/^\/api\/file\//.test(url.pathname)) { e.respondWith(pdfFetch(req)); return; }
  if (/^\/api\/(exams|timetable|announcements|uploads\.js)$/.test(url.pathname)) {
    e.respondWith(fetchAndStore(req).catch(function () { return caches.match(req).then(function (hit) { return hit || Response.error(); }); }));
    return;
  }
  if (/^\/api\/(auth\/|sync|announcements)/.test(url.pathname)) return; // الحساب والمزامنة: دائماً من الشبكة
  if (/\/api\//.test(url.pathname)) return;
  var isPdf = /\.pdf$/i.test(url.pathname);
  e.respondWith(
    (isPdf ? pdfFetch(req)
           : fetchAndStore(req).catch(function () { return offlineHit(req); }))
  );
});
/* الرد بعد تحويل (مثل /index.html ← /) لا يصلح كجواب لصفحة بلا إنترنت (المتصفح يرفضه: ERR_FAILED)؛ نحفظ نسخة نظيفة منه */
function clean(res) {
  if (!res.redirected) return Promise.resolve(res);
  return res.clone().blob().then(function (b) { return new Response(b, { status: 200, statusText: "OK", headers: { "content-type": res.headers.get("content-type") || "text/html; charset=utf-8" } }); });
}
/* ملف PDF: من الحفظ أولاً، وإلا يُجلب كاملاً (حتى لو طلب القارئ جزءاً منه) ويُحفظ، فيعمل بعدها بلا إنترنت */
function pdfFetch(req) {
  return caches.match(req.url).then(function (hit) {
    if (hit) return hit;
    return fetch(req.url, { credentials: "same-origin" }).then(function (res) {
      if (res && res.status === 200) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(req.url, copy); }); }
      return res;
    });
  });
}
function fetchAndStore(req) {
  return fetch(req, { cache: "no-cache" }).then(function (res) {
    if (res && res.status === 200) { var copy = res.clone(); clean(copy).then(function (r) { return caches.open(V).then(function (c) { return c.put(req, r); }); }).catch(function () {}); }
    return res;
  });
}
/* نسخة محفوظة لطلب لا اتصال فيه: الرابط نفسه، أو بلا .html، أو مع .html، أو الرئيسية لصفحات التنقل */
function offlineHit(req) {
  var u = new URL(req.url), p = u.pathname, alts = [p];
  if (/\.html$/.test(p)) alts.push(p.replace(/\.html$/, "")); else if (!/\.[a-z0-9]+$/i.test(p)) alts.push(p.replace(/\/$/, "") + ".html");
  if (p === "/" || p === "") alts.push("/index.html");
  var i = 0;
  function next() {
    if (i >= alts.length) return req.mode === "navigate" ? caches.match("/index.html", { ignoreSearch: true }).then(function (h) { return h || Response.error(); }) : Promise.resolve(Response.error());
    return caches.match(new Request(u.origin + alts[i++]), { ignoreSearch: true }).then(function (hit) { return hit || next(); });
  }
  return next();
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
