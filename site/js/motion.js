/* js/motion.js — Step 59b: يجعل اللمسات الحركية مرئية على الـiPad.
   1) سفاري iOS لا يطبّق :active (تصغير الضغط) إلا إذا وُجد مستمع touchstart.
   2) ظهور العناصر عند الوصول إليها بالتمرير (وليس عند فتح الصفحة فقط)، متتابعاً بفارق صغير.
   لا شيء يُخفى إن لم يعمل هذا الملف، ويتوقف كلياً مع «تقليل الحركة». */
(function () {
  document.addEventListener("touchstart", function () {}, { passive: true });
  var root = document.documentElement;
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches || root.classList.contains("reduced-motion")) return;
  var SEL = ".section-head, .card, .course-card, .semester-tile, .latest-item, .tool-tile, .quick-item, .resume-card, .lecture, .tt-panel, .gr-item, .gr-batch, .ann-list > *";
  var main = document.querySelector("main") || document.body;
  var io = new IntersectionObserver(function (entries) {
    var k = 0;
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; io.unobserve(el);
      el.style.setProperty("--mr-delay", Math.min(k++, 6) * 70 + "ms");
      el.classList.add("mr-in");
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
