/* js/auth.js — حساب الطالب ومزامنة المفضلة والتقدم بين الأجهزة (Cloudflare D1 عبر /api).
   بلا حساب يبقى كل شيء محلياً كما كان. مع الحساب: تُحفظ نسخة على الخادم وتُدمج عند الدخول. */
(function () {
  "use strict";
  var SYNC = ["ms.fav", "ms.read", "ms.last", "ms.exam", "ms.review", "ms.study", "ms.sem", "ms.planner", "ms.tasks", "ms.focus"];
  var TKEY = "ms.sync.t"; // وقت آخر تعديل محلي لكل مفتاح
  var MS = window.MS || null;
  var user = null;
  var timer = null;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* لا شيء */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* لا شيء */ } }
  function tmap() { try { return JSON.parse(lsGet(TKEY)) || {}; } catch (e) { return {}; } }
  function localVal(k) { var s = lsGet(k); if (s === null) return undefined; try { return JSON.parse(s); } catch (e) { return undefined; } }

  function api(method, path, body) {
    var opts = { method: method, credentials: "same-origin", headers: {} };
    if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers["content-type"] = "application/json"; }
    return fetch("api/" + path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; });
    }, function () { return { status: 0, data: { error: "network" } }; });
  }

  /* ---------- مزامنة ---------- */
  function applyLocal(k, v, t) {
    window.__msApplying = true; // حتى لا يُعاد رفع ما نزل للتو
    try { if (MS && MS.save) MS.save(k, v); else lsSet(k, JSON.stringify(v)); } finally { window.__msApplying = false; }
    var m = tmap(); m[k] = t; lsSet(TKEY, JSON.stringify(m));
  }

  function union(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) { return a.concat(b.filter(function (x) { return a.indexOf(x) === -1; })); }
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      var out = {};
      Object.keys(a).forEach(function (k) { out[k] = a[k]; });
      Object.keys(b).forEach(function (k) { out[k] = k in out ? union(out[k], b[k]) : b[k]; });
      return out;
    }
    return b; // قيمة مفردة: نفضّل ما في الحساب
  }

  function push(items) {
    return api("PUT", "sync", { items: items });
  }

  function flush() {
    clearTimeout(timer); timer = null;
    if (!user) return Promise.resolve();
    var m = tmap(), items = {};
    SYNC.forEach(function (k) {
      var v = localVal(k);
      if (v !== undefined && m[k] && m[k] > (m.__pushed && m.__pushed[k] || 0)) items[k] = { v: v, t: m[k] };
    });
    if (!Object.keys(items).length) return Promise.resolve();
    return push(items).then(function (r) {
      if (r.status === 200) {
        var mm = tmap(); mm.__pushed = mm.__pushed || {};
        Object.keys(items).forEach(function (k) { mm.__pushed[k] = items[k].t; });
        lsSet(TKEY, JSON.stringify(mm));
      }
    });
  }

  function onSave(k) {
    if (window.__msApplying || !user || SYNC.indexOf(k) === -1) return;
    var m = tmap(); m[k] = Date.now(); lsSet(TKEY, JSON.stringify(m));
    clearTimeout(timer);
    timer = setTimeout(flush, 1500);
  }
  if (MS) MS.onSave = onSave;

  function pull() {
    return api("GET", "sync").then(function (r) {
      if (r.status !== 200 || !r.data.data) return false;
      var server = r.data.data, m = tmap(), changed = false, up = {};
      SYNC.forEach(function (k) {
        var s = server[k], lv = localVal(k), lt = m[k] || 0;
        if (!s && lv === undefined) return;
        if (!s) { var t0 = lt || Date.now(); up[k] = { v: lv, t: t0 }; return; }
        if (lv === undefined) { applyLocal(k, s.v, s.t); changed = true; return; }
        if (!lt) { // أول مزامنة لهذا الجهاز: ندمج ولا نضيّع شيئاً
          var merged = union(s.v, lv);
          var now = Date.now();
          if (JSON.stringify(merged) !== JSON.stringify(lv)) changed = true;
          applyLocal(k, merged, now);
          up[k] = { v: merged, t: now };
        } else if (s.t > lt) { applyLocal(k, s.v, s.t); changed = true; }
        else if (lt > s.t) { up[k] = { v: lv, t: lt }; }
      });
      var p = Object.keys(up).length ? push(up).then(function (res) {
        if (res.status === 200) {
          var mm = tmap(); mm.__pushed = mm.__pushed || {};
          Object.keys(up).forEach(function (k) { mm.__pushed[k] = up[k].t; if (!mm[k]) mm[k] = up[k].t; });
          lsSet(TKEY, JSON.stringify(mm));
        }
      }) : Promise.resolve();
      return p.then(function () { return changed; });
    });
  }

  /* ---------- الرأس ---------- */
  function paintHeader() {
    var box = document.querySelector(".header-actions");
    if (!box || document.getElementById("accountBtn")) return;
    var a = document.createElement("a");
    a.id = "accountBtn";
    a.className = "btn btn-secondary btn-sm";
    a.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search);
    var label = user ? (user.name.split(" ")[0] || "حسابي") : "تسجيل الدخول";
    // على الهاتف يظهر الزر أيقونة فقط (44px) حتى لا يتجاوز الرأس عرض الشاشة؛ الاسم يبقى للقارئ الصوتي
    if (window.MS && MS.icon) { var ic = MS.icon("user", 20); ic.setAttribute("aria-hidden", "true"); a.appendChild(ic); }
    var t = document.createElement("span"); t.className = "acct-label"; t.textContent = label; a.appendChild(t);
    a.setAttribute("aria-label", label);
    if (user) a.setAttribute("data-i18n-skip", "");
    box.insertBefore(a, box.firstChild);
  }

  /* ---------- القائمة الجانبية (nav.js يرسم «زائر»؛ نحدّثها بعد معرفة الجلسة) ---------- */
  function paintSidebar() {
    var box = document.querySelector(".sb-user");
    if (!box || box.getAttribute("data-auth")) return;
    var text = box.querySelector(".sb-user-text"), strong = text && text.querySelector("strong"), small = text && text.querySelector("small");
    if (!text || !strong) return;
    box.setAttribute("data-auth", user ? "user" : "guest");
    var act;
    if (user) {
      strong.textContent = user.name || user.email;
      strong.setAttribute("data-i18n-skip", "");
      // سطر مستقل (سطر الكورس يملؤه js/my-course.js)
      var note = document.createElement("small"); note.className = "sb-acct-note"; note.textContent = "تقدّمك محفوظ في حسابك";
      text.appendChild(note);
      act = document.createElement("button");
      act.type = "button";
      act.textContent = "تسجيل الخروج";
      act.addEventListener("click", function () {
        act.disabled = true;
        MSAuth.logout().then(function () { location.reload(); });
      });
    } else {
      act = document.createElement("a");
      act.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search);
      act.textContent = "سجّل الدخول لحفظ تقدّمك";
    }
    act.className = "sb-auth-action";
    text.appendChild(act);
    if (window.I18N && I18N.apply) I18N.apply();
  }

  var meStatus = 200;
  window.MSAuth = {
    api: api,
    user: function () { return user; },
    me: function () {
      return api("GET", "auth/me").then(function (r) {
        meStatus = r.status;
        if (r.status === 200) { user = r.data.user; try { localStorage.setItem("ms.userCache", JSON.stringify(user)); } catch (e) {} }
        else if (r.status === 0) { try { user = JSON.parse(localStorage.getItem("ms.userCache") || "null"); } catch (e) { user = null; } } // بلا إنترنت: آخر حساب معروف على هذا الجهاز
        else { user = null; try { localStorage.removeItem("ms.userCache"); } catch (e) {} }
        return user;
      });
    },
    afterLogin: function (u) { user = u; },
    logout: function () {
      return flush().then(function () { return api("POST", "auth/logout"); }).then(function () {
        SYNC.concat([TKEY, "ms.authed", "ms.guest", "ms.userCache"]).forEach(lsDel); // البيانات صارت في الحساب؛ لا نتركها لمن يستعمل الجهاز بعدك
        user = null;
      });
    }
  };

  // صفحة الدخول تدير نفسها (js/login.js)
  if (/\/(login|admin|announce)(\.html)?$/.test(location.pathname)) return; // Cloudflare يختصر login.html إلى /login

  /* نبضة نشاط كل دقيقة والصفحة ظاهرة ومتصلة: يعرف المشرف كم ساعة استعمل الطالب الموقع وكم منها في القراءة والدراسة */
  var pingTimer = null;
  function startPing() {
    if (pingTimer || !user) return;
    var study = /\/(pdf-notes|study)(\.html)?$/.test(location.pathname);
    pingTimer = setInterval(function () {
      if (document.visibilityState === "visible" && navigator.onLine !== false) api("POST", "auth/ping", { mode: study ? "study" : "site" });
    }, 60000);
  }

  MSAuth.me().then(function () {
    // صفحة الدخول أولاً (بطلب محمد 2026-10-19): من لم يسجّل الدخول ولم يختر «المتابعة كزائر» يذهب إليها
    if (user) lsSet("ms.authed", "1");
    else if (meStatus === 0 && lsGet("ms.authed")) { /* بلا إنترنت: لا نحوّله إلى صفحة الدخول ولا نمسح دخوله */ }
    else {
      lsDel("ms.authed");
      if (!lsGet("ms.guest") && !/\/(login|privacy|terms)(\.html)?$/.test(location.pathname)) {
        location.replace("login.html?gate=1&next=" + encodeURIComponent((location.pathname.split("/").pop() || "index.html") + location.search + location.hash));
        return;
      }
    }
    startPing();
    try { document.dispatchEvent(new CustomEvent("ms:user", { detail: user })); } catch (e) { /* متصفح قديم */ } // يقرؤه بانر الرئيسية للترحيب بالاسم
    paintHeader();
    paintSidebar();
    if (!user) return;
    pull().then(function (changed) {
      var guard = "ms.sync.reloaded";
      var did = false; try { did = sessionStorage.getItem(guard) === "1"; } catch (e) { /* لا شيء */ }
      if (changed && !did) { try { sessionStorage.setItem(guard, "1"); } catch (e) { /* لا شيء */ } location.reload(); }
    });
  });
  document.addEventListener("visibilitychange", function () { if (document.hidden) flush(); });
})();
