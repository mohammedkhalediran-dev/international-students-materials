/* js/medical-banner.js — حركة بانر الرئيسية الطبي (css/medical-banner.css).
   دورة 18 ثانية من أربع مراحل: استكشف ← افهم ← طبّق ← اربط ← عودة سلسة للبداية.
   كل عنصر له خط زمني من إطارات مفتاحية (الوضع + الشفافية) يُستكمل بمنحنى تسارع لكل مقطع،
   فلا قفزات ولا اختفاء جماعي عند إعادة الدورة (أول إطار = آخر إطار).
   حلقة رسم واحدة فقط، تتوقف خارج الشاشة أو عند إخفاء الصفحة، وتحترم prefers-reduced-motion.
   MedixaBanner.destroy() يزيل كل المستمعين والمراقبين. */
(function () {
  "use strict";
  var root = document.querySelector(".mm-banner");
  if (!root || root.getAttribute("data-mm-ready")) return;
  root.setAttribute("data-mm-ready", "1");

  function q(s) { return root.querySelector(s); }
  var hero = q(".mm-hero"), visual = q(".mm-visual"), world = q(".mm-world");
  var els = {
    brain: q(".mm-brain"), floor: q(".mm-floor"), orbit: q(".mm-orbit"), back: q(".mm-plane-back"), front: q(".mm-plane-front"),
    tag: q(".mm-tag"), note: q(".mm-note"), clinical: q(".mm-clinical"), physio: q(".mm-physio"), link: q(".mm-link-line")
  };
  var glint = q(".mm-brain-light > i"), wave = q(".mm-wave-lit"), pick = q(".mm-row-last");
  var stages = [].slice.call(root.querySelectorAll(".mm-stage > span"));
  var toggle = q(".mm-toggle");
  if (!world || !els.brain) return;

  var DURATION = 18;            // ثانية
  var KEY = "ms.bannerMotion";  // تفضيل الإيقاف لهذا الجهاز فقط
  var reduce = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  var finePointer = window.matchMedia ? matchMedia("(hover: hover) and (pointer: fine)").matches : false;

  // ---- منحنيات التسارع ----
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  var EASE = {
    io: function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },          // دخول وخروج ناعمان
    out: function (x) { return 1 - Math.pow(1 - x, 4); },                                             // دخول يتباطأ عند الوصول
    in: function (x) { return x * x * x; },                                                            // مغادرة تتسارع بهدوء
    sine: function (x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
  };

  // الوضع: [x, y, z, rotateX, rotateY, rotateZ, scale]. الإطار: [t (0..1), وضع, شفافية, منحنى المقطع الداخل إليه]
  var HOME = [0, 0, 0, 2, -10, -5, 1];
  var T = {
    brain: [
      [0, HOME, 1], [.17, HOME, 1],
      [.30, [-56, -30, 15, 5, 8, -4, .78], 1, "io"], [.40, [-58, -31, 14, 5, 6, -4, .78], 1, "sine"],
      [.53, [-113, -44, -70, 7, -12, -8, .55], .8, "io"], [.62, [-110, -42, -66, 7, -10, -8, .56], .8, "sine"],
      [.75, [-11, -38, 15, 3, 7, -2, .72], 1, "io"], [.84, [-9, -37, 16, 3, 5, -2, .72], 1, "sine"],
      [1, HOME, 1, "io"]
    ],
    tag: [
      [0, [0, 0, 0, 0, 0, 0, 1], 1], [.15, [0, 0, 0, 0, 0, 0, 1], 1],
      [.24, [-6, 18, -10, 0, 0, 0, .92], 0, "in"], [.92, [6, 14, 0, 0, 0, 0, .94], 0],
      [1, [0, 0, 0, 0, 0, 0, 1], 1, "out"]
    ],
    back: [
      [0, [0, 0, -10, 3, -22, -9, .88], 0], [.18, [0, 0, -10, 3, -22, -9, .88], 0],
      [.30, [-23, -15, -30, 8, -26, -7, .88], 1, "out"], [.42, [-25, -16, -32, 8, -26, -7, .88], 1, "sine"],
      [.53, [-35, -22, -60, 8, -30, -8, .7], .3, "io"], [.68, [-36, -22, -62, 8, -30, -8, .7], .3],
      [.80, [-40, -18, -80, 8, -30, -8, .66], 0, "in"], [1, [0, 0, -10, 3, -22, -9, .88], 0]
    ],
    front: [
      [0, [0, 30, 10, 70, -10, -8, .85], 0], [.20, [0, 30, 10, 70, -10, -8, .85], 0],
      [.32, [0, 72, -10, 76, -11, -8, .86], .3, "out"], [.42, [0, 72, -10, 76, -11, -8, .86], .3],
      [.52, [0, 80, -20, 78, -11, -8, .84], 0, "in"], [1, [0, 30, 10, 70, -10, -8, .85], 0]
    ],
    physio: [
      [0, [-20, 25, -25, 10, -15, -4, .8], 0], [.20, [-20, 25, -25, 10, -15, -4, .8], 0],
      [.32, [-4, -4, 10, 4, 9, -3, .88], 1, "out"], [.43, [-5, -5, 10, 4, 8, -3, .88], 1, "sine"],
      [.51, [-14, 8, -20, 6, 0, -3, .84], .12, "io"], [.64, [-14, 8, -20, 6, 0, -3, .84], .12],
      [.75, [-4, -4, 10, 4, 9, -3, .88], .92, "io"], [.85, [-4, -5, 10, 4, 8, -3, .88], .92, "sine"],
      [.93, [-22, 22, -30, 10, -15, -4, .8], 0, "in"], [1, [-20, 25, -25, 10, -15, -4, .8], 0]
    ],
    note: [
      [0, [28, 55, -70, 15, -30, 10, .66], 0], [.21, [28, 55, -70, 15, -30, 10, .66], 0],
      [.34, [0, 0, 10, 5, -10, 4, .93], 1, "out"], [.42, [-1, -1, 10, 5, -9, 4, .93], 1, "sine"],
      [.53, [67, 11, -45, 4, -24, 8, .72], 1, "io"], [.63, [68, 11, -46, 4, -24, 8, .72], 1, "sine"],
      [.76, [15, 9, 10, 3, -10, 4, .77], 1, "io"], [.87, [15, 8, 10, 3, -9, 4, .77], 1, "sine"],
      [.97, [40, 30, -60, 10, -24, 8, .7], 0, "in"], [1, [28, 55, -70, 15, -30, 10, .66], 0]
    ],
    clinical: [
      [0, [0, 55, -120, 20, 20, -5, .68], 0], [.41, [0, 55, -120, 20, 20, -5, .68], 0],
      [.54, [0, 0, 55, 0, -7, -3, 1], 1, "out"], [.63, [0, -1, 55, 0, -6, -3, 1], 1, "sine"],
      [.75, [-66, 58, 25, 5, 12, -5, .6], 1, "io"], [.86, [-66, 57, 25, 5, 11, -5, .6], 1, "sine"],
      [.96, [-82, 90, -60, 12, 16, -5, .55], 0, "in"], [1, [0, 55, -120, 20, 20, -5, .68], 0]
    ]
  };
  // متى تنشط كل مرحلة (لعنوان المرحلة الصغير أعلى المشهد)
  var STAGE_AT = [[0, .24], [.24, .48], [.48, .71], [.71, .9]];

  function sample(track, t) {
    var a = track[0], b = track[track.length - 1];
    for (var i = 1; i < track.length; i++) { if (t <= track[i][0]) { a = track[i - 1]; b = track[i]; break; } }
    var span = b[0] - a[0], k = span > 0 ? (EASE[b[3] || "io"])(clamp((t - a[0]) / span)) : 1, p = [];
    for (var j = 0; j < 7; j++) p[j] = a[1][j] + (b[1][j] - a[1][j]) * k;
    return { p: p, o: a[2] + (b[2] - a[2]) * k };
  }
  function pose(el, p) {
    el.style.transform = "translate3d(" + p[0].toFixed(2) + "px," + p[1].toFixed(2) + "px," + p[2].toFixed(2) + "px) rotateX(" + p[3].toFixed(2) + "deg) rotateY(" + p[4].toFixed(2) + "deg) rotateZ(" + p[5].toFixed(2) + "deg) scale(" + p[6].toFixed(4) + ")";
  }
  function fade(el, o) { el.style.opacity = o < .002 ? "0" : o.toFixed(3); el.style.visibility = o < .002 ? "hidden" : ""; }
  function win(t, a, b) { return EASE.io(clamp((t - a) / (b - a))); }

  // ---- مقاس العالم + ميل خفيف يتبع المؤشر على الكمبيوتر ----
  var scale = 1, tiltX = 0, tiltY = 0, aimX = 0, aimY = 0;
  function resize() {
    var w = visual.clientWidth, h = visual.clientHeight;
    scale = Math.min(w / 460, h / 360) || 1;
  }

  var stageOn = 0;
  function draw(t, secs) {
    // تنفّس دائم للدماغ مستقل عن الدورة (زمن حقيقي، فلا انقطاع عند إعادتها). ميلان محدود: لا دوران كامل.
    var b = sample(T.brain, t), bp = b.p.slice();
    bp[1] += Math.sin(secs * 2 * Math.PI / 6.5) * 4;
    bp[3] += Math.sin(secs * 2 * Math.PI / 6.5 + 1) * 1.4;
    bp[4] += Math.sin(secs * 2 * Math.PI / 9.5) * 3.2;
    pose(els.brain, bp); fade(els.brain, b.o);

    // ظل الأرض يتبع الدماغ ويثبت في مكانه (لا يتحرك عمودياً)
    els.floor.style.transform = "translate3d(" + (bp[0] * .55).toFixed(2) + "px,0,0) scale(" + (.55 + bp[6] * .45).toFixed(3) + "," + (.7 + bp[6] * .3).toFixed(3) + ")";
    els.floor.style.opacity = (.85 * b.o * (.5 + .5 * bp[6])).toFixed(3);

    ["tag", "back", "front", "physio", "note", "clinical"].forEach(function (k) {
      var s = sample(T[k], t); pose(els[k], s.p); fade(els[k], s.o);
    });

    var c = win(t, .64, .76) * (1 - win(t, .86, .93));
    els.orbit.style.transform = "rotateX(68deg) rotateZ(" + (-10 + c * 4).toFixed(2) + "deg) scale(" + (.92 + .08 * c).toFixed(3) + ")";
    els.orbit.style.opacity = (c * .18).toFixed(3);
    els.link.style.transform = "scaleX(" + win(t, .64, .78).toFixed(3) + ")";
    els.link.style.opacity = (c * .3).toFixed(3);

    // لمعة ضوء على الدماغ: في الاستكشاف ثم لمعة أخف في الربط
    var g1 = win(t, .03, .21), g2 = win(t, .76, .9);
    var gx = t < .5 ? -60 + 120 * g1 : -60 + 120 * g2;
    glint.style.transform = "translateX(" + gx.toFixed(2) + "%)";
    glint.style.opacity = (t < .5 ? .9 * (1 - win(t, .19, .26)) : .5 * win(t, .74, .78) * (1 - win(t, .88, .93))).toFixed(3);

    wave.style.strokeDashoffset = (-(secs * 48) % 380).toFixed(1);
    pick.style.setProperty("--mm-pick", (win(t, .58, .63) * (1 - win(t, .9, .96))).toFixed(3));

    var on = 0;
    for (var i = 0; i < STAGE_AT.length; i++) if (t >= STAGE_AT[i][0] && t < STAGE_AT[i][1]) on = i;
    if (t >= .9) on = 0;
    if (on !== stageOn) { stages[stageOn].classList.remove("is-on"); stages[on].classList.add("is-on"); stageOn = on; }

    tiltX += (aimX - tiltX) * .06; tiltY += (aimY - tiltY) * .06;
    world.style.transform = "translate(-50%,-50%) scale(" + scale.toFixed(4) + ") rotateX(" + tiltX.toFixed(2) + "deg) rotateY(" + tiltY.toFixed(2) + "deg)";
  }

  // ---- التشغيل: حلقة واحدة فقط ----
  var stored = null; try { stored = localStorage.getItem(KEY); } catch (e) { /* لا شيء */ }
  var paused = stored === "off" || !!(reduce && reduce.matches);
  var visible = true, raf = 0, last = 0, elapsed = 0, clock = 0;
  var STILL = .8; // تكوين ثابت جميل: مرحلة «اربط» كل العناصر في أماكنها

  function running() { return !paused && visible && !document.hidden && root.isConnected; }
  function tick(now) {
    raf = 0;
    if (!root.isConnected) { destroy(); return; }
    if (!running()) return;
    var dt = last ? Math.min((now - last) / 1000, .08) : 0; last = now;
    elapsed = (elapsed + dt) % DURATION; clock += dt;
    draw(elapsed / DURATION, clock);
    raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf && running()) { last = 0; raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  function label() {
    var txt = paused ? "تشغيل الحركة" : "إيقاف الحركة";
    if (window.I18N && I18N.t) txt = I18N.t(txt);
    toggle.setAttribute("aria-pressed", paused ? "true" : "false");
    toggle.setAttribute("aria-label", txt); toggle.setAttribute("title", txt);
  }
  function onToggle() {
    paused = !paused;
    try { localStorage.setItem(KEY, paused ? "off" : "on"); } catch (e) { /* لا شيء */ }
    label();
    if (paused) stop(); else start();
  }
  function onVisibility() { if (document.hidden) stop(); else start(); }
  function onMove(e) {
    var r = hero.getBoundingClientRect();
    aimY = ((e.clientX - r.left) / r.width - .5) * 6;
    aimX = -((e.clientY - r.top) / r.height - .5) * 4;
    if (paused && !raf) draw(elapsed / DURATION, clock);
  }
  function onLeave() { aimX = 0; aimY = 0; }
  function onReduce() { if (reduce.matches) { paused = true; stop(); label(); elapsed = STILL * DURATION; draw(STILL, clock); } }

  var ro = window.ResizeObserver ? new ResizeObserver(function () { resize(); if (!raf) draw(elapsed / DURATION, clock); }) : null;
  var io = window.IntersectionObserver ? new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (!root.isConnected) destroy(); else if (visible) start(); else stop();
  }) : null;

  function destroy() {
    stop();
    if (ro) ro.disconnect();
    if (io) io.disconnect();
    toggle.removeEventListener("click", onToggle);
    document.removeEventListener("visibilitychange", onVisibility);
    hero.removeEventListener("pointermove", onMove);
    hero.removeEventListener("pointerleave", onLeave);
    if (reduce && reduce.removeEventListener) reduce.removeEventListener("change", onReduce);
    window.removeEventListener("resize", resize);
    if (window.MedixaBanner && window.MedixaBanner.root === root) delete window.MedixaBanner;
  }

  toggle.addEventListener("click", onToggle);
  document.addEventListener("visibilitychange", onVisibility);
  if (finePointer) { hero.addEventListener("pointermove", onMove); hero.addEventListener("pointerleave", onLeave); }
  if (reduce && reduce.addEventListener) reduce.addEventListener("change", onReduce);
  if (ro) ro.observe(visual); else window.addEventListener("resize", resize);
  if (io) io.observe(root);

  resize();
  if (paused) elapsed = STILL * DURATION;
  draw(elapsed / DURATION, clock);
  label();
  start();
  // seek(t): يعرض لحظة محددة من الدورة (0..1) — للفحص والمعاينة
  function seek(t) { elapsed = clamp(t) * DURATION; draw(elapsed / DURATION, clock); }
  window.MedixaBanner = { root: root, destroy: destroy, seek: seek };
})();
