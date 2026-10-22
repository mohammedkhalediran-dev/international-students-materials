/* js/motion.js — Step 59b + Step 60 (انتقال الصفحات، موجة اللمس، ميلان البطاقات، امتلاء أشرطة التقدم): يجعل اللمسات الحركية مرئية على الـiPad.
   1) سفاري iOS لا يطبّق :active (تصغير الضغط) إلا إذا وُجد مستمع touchstart.
   2) ظهور العناصر عند الوصول إليها بالتمرير (وليس عند فتح الصفحة فقط)، متتابعاً بفارق صغير.
   لا شيء يُخفى إن لم يعمل هذا الملف، ويتوقف كلياً مع «تقليل الحركة». */
(function () {
  document.addEventListener("touchstart", function () {}, { passive: true });
  var root = document.documentElement;
  function still() { return matchMedia("(prefers-reduced-motion: reduce)").matches || root.classList.contains("reduced-motion"); }
  // إعداد «تقليل الحركة» في الموقع يلغي انتقال الصفحات أيضاً
  // عند فتح الموقع (أول ثانيتين) ومن صفحة الدخول لا ينزلق شيء: كان المشهد السابق يظهر متداخلاً مع الرئيسية في أول الفتح
  function quiet() { return still() || performance.now() < 2000 || /login/.test(location.pathname); }
  window.addEventListener("pageswap", function (e) { if (e.viewTransition && quiet()) e.viewTransition.skipTransition(); });
  window.addEventListener("pagereveal", function (e) { if (e.viewTransition && quiet()) e.viewTransition.skipTransition(); });
  if (still()) return;

  /* ---- Step 60: صورة المادة تنتقل من بطاقتها إلى رأس صفحة المادة ---- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".course-card a[href*='course.html']");
    if (!a) return;
    var img = a.closest(".course-card").querySelector(".cc-img");
    if (img) img.style.viewTransitionName = "course-art";
    setTimeout(function () { if (img) img.style.viewTransitionName = ""; }, 1500);
  }, true);

  /* ---- Step 60: موجة اللمس ---- */
  var RIPPLE = ".btn, .tt-btn, .mm-cta, .course-card, .semester-tile, .tool-tile, .latest-item, .quick-item, .resume-card, .file-link, .study-opt, .nav-link";
  document.addEventListener("pointerdown", function (e) {
    var host = e.target.closest && e.target.closest(RIPPLE);
    if (!host || host.disabled || e.button > 0) return;
    if (getComputedStyle(host).position === "static") host.classList.add("rp-rel");
    var r = host.getBoundingClientRect(), box = host.querySelector(":scope > .rp");
    if (!box) { box = document.createElement("span"); box.className = "rp"; box.setAttribute("aria-hidden", "true"); host.appendChild(box); }
    var dot = document.createElement("i");
    dot.style.left = (e.clientX - r.left) + "px"; dot.style.top = (e.clientY - r.top) + "px";
    dot.style.setProperty("--rp-s", Math.ceil(Math.hypot(r.width, r.height) / 10));
    box.appendChild(dot);
    setTimeout(function () { dot.remove(); }, 700);
  }, { passive: true });

  /* ---- Step 60: ميلان البطاقات (يتبع المؤشر؛ وباللمس يميل نحو الإصبع ما دام مضغوطاً) ---- */
  var TILT = ".course-card, .semester-tile, .tool-tile, .resume-card", MAX = 7;
  function tiltAt(el, x, y, lift) {
    var r = el.getBoundingClientRect(), px = (x - r.left) / r.width, py = (y - r.top) / r.height;
    if (!el.classList.contains("tilt")) { el.classList.add("tilt"); var g = document.createElement("span"); g.className = "tilt-glare"; g.setAttribute("aria-hidden", "true"); el.appendChild(g); }
    el.classList.add("is-tilting");
    el.style.setProperty("--gx", px * 100 + "%"); el.style.setProperty("--gy", py * 100 + "%");
    el.style.transform = "perspective(900px) rotateX(" + ((0.5 - py) * MAX).toFixed(2) + "deg) rotateY(" + ((px - 0.5) * MAX).toFixed(2) + "deg) translateY(" + lift + "px)";
  }
  function untilt(el) { if (!el) return; el.classList.remove("is-tilting"); el.style.transform = ""; }
  var held = null;
  document.addEventListener("pointermove", function (e) {
    if (e.pointerType === "mouse") {
      var el = e.target.closest && e.target.closest(TILT);
      if (held && held !== el) untilt(held);
      held = el; if (el) tiltAt(el, e.clientX, e.clientY, -4);
    } else if (held) tiltAt(held, e.clientX, e.clientY, 0);
  }, { passive: true });
  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    var el = e.target.closest && e.target.closest(TILT);
    if (el) { held = el; tiltAt(el, e.clientX, e.clientY, 0); }
  }, { passive: true });
  ["pointerup", "pointercancel"].forEach(function (t) { document.addEventListener(t, function (e) { if (e.pointerType !== "mouse") { untilt(held); held = null; } }, { passive: true }); });
  document.addEventListener("pointerout", function (e) { if (e.pointerType === "mouse" && held && !held.contains(e.relatedTarget)) { untilt(held); held = null; } }, { passive: true });
  if (!("IntersectionObserver" in window)) return;
  var SEL = ".section-head, .card, .course-card, .semester-tile, .latest-item, .tool-tile, .quick-item, .resume-card, .lecture, .tt-panel, .gr-item, .gr-batch, .ann-list > *";
  var main = document.querySelector("main") || document.body;
  var io = new IntersectionObserver(function (entries) {
    var k = 0;
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; io.unobserve(el);
      el.style.setProperty("--mr-delay", Math.min(k++, 6) * 70 + "ms");
      el.classList.add("mr-in");
      // أشرطة التقدم داخل العنصر تبدأ من الصفر ثم تمتلئ
      var bars = el.querySelectorAll(".bar i");
      for (var b = 0; b < bars.length; b++) (function (bar) { var w = bar.style.getPropertyValue("--p"); if (!w) return; bar.style.setProperty("--p", "0%"); requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.setProperty("--p", w); }); }); })(bars[b]);
      // بعد انتهاء الظهور تُزال الأصناف حتى يعمل الرفع والضغط بانتقالاتهما العادية
      setTimeout(function () { el.classList.remove("mr", "mr-in"); el.style.removeProperty("--mr-delay"); }, 1100);
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
  function scan(scope) {
    var list = scope.querySelectorAll ? scope.querySelectorAll(SEL) : [];
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.dataset.mr || el.closest(".mm-banner, .sidebar, dialog, [hidden]")) continue;
      el.dataset.mr = "1";
      if (el.parentElement && el.parentElement.closest(".mr")) continue; // داخل عنصر يظهر أصلاً
      el.classList.add("mr"); io.observe(el);
    }
  }
  scan(main);
  // القوائم التي تُرسم لاحقاً (المواد، أحدث المحاضرات، الدرجات…)
  new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches && n.matches(SEL)) scan(n.parentNode); else scan(n); } }); }); })
    .observe(main, { childList: true, subtree: true });
})();
