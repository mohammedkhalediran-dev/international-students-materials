/* عارض PDF داخل نافذة المادة (إصلاح 2026-10-19 بطلب محمد).
   سفاري على iPhone وiPad لا يصغّر ملف PDF داخل iframe: يعرض الصفحة الأولى بحجمها الأصلي مقصوصة ولا يتمرر.
   هنا نرسم كل صفحة بعرض النافذة تماماً، والصفحات تحت بعضها وتتمرر بالإصبع.
   الترتيب: مكتبة pdf.js (نفس إصدار pdf-notes، ويحفظها sw.js) ← صور الصفحات المحفوظة (pdf-raster) ← iframe كآخر حل.
   الصفحات تُرسم عند الاقتراب منها فقط، وتُفرَّغ عند الابتعاد، حتى لا تمتلئ ذاكرة الهاتف في الملفات الطويلة. */
(function () {
  var PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  var WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  // خطوط PDF القياسية وخرائط الأحرف: بدونها تظهر حروف بعض الملفات متداخلة أو بمسافات خاطئة
  // مستضافة من الموقع نفسه (رابط مطلق لأن عامل pdf.js يُحمَّل من cdnjs): الخط الاحتياطي لا يصل أحياناً من cdnjs فتظهر صفحات بلا نص
  var FONTS = new URL("vendor/pdfjs/standard_fonts/", location.href).href;
  var CMAPS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/";
  var MANIFEST = "js/pdf-raster-manifest.js";
  var MAX_PIXELS = 4000000; // أكبر مساحة للوحة الرسم الواحدة (حماية ذاكرة iOS)

  var scripts = {};
  function loadScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = function () { delete scripts[src]; reject(new Error("script " + src)); };
        document.head.appendChild(s);
      });
    }
    return scripts[src];
  }

  function rasterPages(url) {
    try {
      var key = decodeURIComponent(new URL(url, location.href).pathname).replace(/^\//, "");
      var m = window.medixaRasterManifest;
      return m && m[key] && m[key].length ? m[key] : null;
    } catch (e) { return null; }
  }

  var gen = 0, doc = null, observer = null, resizeTimer = 0, onResize = null;

  function reset(box) {
    gen++;
    if (observer) { observer.disconnect(); observer = null; }
    if (onResize) { window.removeEventListener("resize", onResize); onResize = null; }
    if (doc) { try { doc.destroy(); } catch (e) {} doc = null; }
    if (box) { box.textContent = ""; box.scrollTop = 0; }
  }

  function pageBox(i, total, w, h) {
    var wrap = document.createElement("div");
    wrap.className = "viewer-page";
    wrap.style.aspectRatio = w + " / " + h;
    wrap.dataset.page = String(i);
    var label = document.createElement("span");
    label.className = "viewer-page-num";
    label.textContent = i + " / " + total;
    wrap.appendChild(label);
    return wrap;
  }

  /* يراقب الصفحات: القريبة تُرسم والبعيدة تُفرَّغ */
  function watch(box, draw, clear) {
    if (!("IntersectionObserver" in window)) {
      box.querySelectorAll(".viewer-page").forEach(draw);
      return;
    }
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { (e.isIntersecting ? draw : clear)(e.target); });
    }, { root: box, rootMargin: "120% 0px" });
    box.querySelectorAll(".viewer-page").forEach(function (p) { observer.observe(p); });
  }

  function viaPdfjs(box, url, my, done) {
    return loadScript(PDFJS).then(function () {
      if (my !== gen) return;
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.arrayBuffer();
      }).then(function (buf) {
        if (my !== gen) return;
        return window.pdfjsLib.getDocument({ data: new Uint8Array(buf), standardFontDataUrl: FONTS, cMapUrl: CMAPS, cMapPacked: true, disableFontFace: true }).promise;
      }).then(function (d) {
        if (!d) return;
        if (my !== gen) { d.destroy(); return; }
        doc = d;
        var pages = [];
        var chain = Promise.resolve();
        for (var i = 1; i <= d.numPages; i++) {
          (function (n) {
            chain = chain.then(function () {
              if (my !== gen) return;
              return d.getPage(n).then(function (p) {
                if (my !== gen) return;
                var v = p.getViewport({ scale: 1 });
                var wrap = pageBox(n, d.numPages, v.width, v.height);
                box.appendChild(wrap);
                pages[n] = p;
              });
            });
          })(i);
        }
        return chain.then(function () {
          if (my !== gen) return;
          function draw(wrap) {
            if (wrap.dataset.drawn === "1") return;
            wrap.dataset.drawn = "1";
            var p = pages[+wrap.dataset.page];
            var base = p.getViewport({ scale: 1 });
            var cssW = wrap.clientWidth || box.clientWidth;
            var ratio = Math.min(window.devicePixelRatio || 1, 2);
            var scale = cssW * ratio / base.width;
            if (base.width * base.height * scale * scale > MAX_PIXELS) scale = Math.sqrt(MAX_PIXELS / (base.width * base.height));
            var v = p.getViewport({ scale: scale });
            var c = document.createElement("canvas");
            c.width = Math.floor(v.width);
            c.height = Math.floor(v.height);
            wrap.insertBefore(c, wrap.firstChild);
            var task = p.render({ canvasContext: c.getContext("2d"), viewport: v });
            wrap._task = task;
            task.promise.then(function () {
              wrap._task = null;
              if (my === gen && done) { done(); done = null; }
            }, function () {
              wrap._task = null;
              if (my === gen && done) { done(); done = null; }
            });
          }
          function clear(wrap) {
            if (wrap.dataset.drawn !== "1") return;
            wrap.dataset.drawn = "";
            if (wrap._task) { try { wrap._task.cancel(); } catch (e) {} wrap._task = null; }
            var c = wrap.querySelector("canvas");
            if (c) { c.width = 0; c.height = 0; c.remove(); }
          }
          watch(box, draw, clear);
          // عند تدوير الجهاز أو تغيير حجم النافذة: أعد رسم الصفحات بالعرض الجديد
          var lastW = box.clientWidth;
          onResize = function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
              if (my !== gen || Math.abs(box.clientWidth - lastW) < 40) return;
              lastW = box.clientWidth;
              box.querySelectorAll(".viewer-page").forEach(function (w) {
                if (w.dataset.drawn === "1") { clear(w); draw(w); }
              });
            }, 250);
          };
          window.addEventListener("resize", onResize);
        });
      });
    });
  }

  function viaRaster(box, url, my, done) {
    return (window.medixaRasterManifest ? Promise.resolve() : loadScript(MANIFEST).catch(function () {})).then(function () {
      var list = rasterPages(url);
      if (!list) throw new Error("no raster");
      if (my !== gen) return;
      box.textContent = "";
      list.forEach(function (src, i) {
        var wrap = pageBox(i + 1, list.length, 3, 4);
        var img = document.createElement("img");
        img.alt = "";
        img.loading = i < 2 ? "eager" : "lazy";
        img.decoding = "async";
        img.onload = function () {
          wrap.style.aspectRatio = img.naturalWidth + " / " + img.naturalHeight;
          if (i === 0 && my === gen && done) { done(); done = null; }
        };
        img.src = src;
        wrap.insertBefore(img, wrap.firstChild);
        box.appendChild(wrap);
      });
    });
  }

  /* open(box, url, {onReady, onFail}): onReady عند ظهور أول صفحة، onFail إن تعذّر كل شيء */
  function open(box, url, opts) {
    opts = opts || {};
    reset(box);
    var my = gen;
    var ready = function () { if (opts.onReady) opts.onReady(); };
    viaPdfjs(box, url, my, ready).catch(function (err) {
      if (my !== gen) return;
      if (window.console) console.warn("MEDIXA viewer: pdf.js failed", err);
      reset(box);
      my = gen;
      return viaRaster(box, url, my, ready);
    }).catch(function () {
      if (my !== gen) return;
      reset(box);
      if (opts.onFail) opts.onFail();
    });
  }

  window.MedixaViewer = { open: open, close: function (box) { reset(box); } };
})();
