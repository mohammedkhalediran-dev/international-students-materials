/* js/cloud.js — حسابات الطلاب (دخول بالبريد برمز يصل إليه، بلا كلمة مرور) واتصال المزامنة بـ Supabase.
   الإعداد من data/cloud-config.js. إن كان فارغاً فالميزة مغلقة (MS.cloud.enabled = false) ولا يُحمَّل شيء.
   كل التحقق من الهوية يتم في الخادم (Supabase Auth + سياسات الصفوف)، وهذا الملف مجرد عميل. */
(function () {
  "use strict";
  var MS = window.MS = window.MS || {};
  var cfg = window.MEDIXA_CLOUD || {};
  var enabled = !!(cfg.url && cfg.anonKey);
  var client = null, session = null, listeners = [], readyP = null;

  function loadScript(src) {
    return new Promise(function (ok, bad) {
      var s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = function () { bad(new Error("script_failed")); };
      document.head.appendChild(s);
    });
  }
  function emit() { listeners.slice().forEach(function (f) { try { f(session); } catch (e) {} }); }

  /* رسائل خطأ مفهومة للطالب من أخطاء الخادم */
  function friendly(err) {
    var m = String((err && (err.message || err.error_description || err.msg)) || err || "");
    var code = err && (err.code || err.status);
    if (/rate limit|too many|over_email_send_rate_limit|429/i.test(m) || code === 429) return "طلبات كثيرة. انتظر دقيقة ثم حاول مجدداً.";
    if (/invalid.*email|email.*invalid|unable to validate email/i.test(m)) return "اكتب بريداً إلكترونياً صحيحاً.";
    if (/expired|invalid|token/i.test(m)) return "الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزاً جديداً.";
    if (/network|failed to fetch|load failed/i.test(m)) return "لا يوجد اتصال بالإنترنت. حاول مجدداً.";
    return "تعذّر إكمال الطلب. حاول مجدداً بعد قليل.";
  }

  var cloud = {
    enabled: enabled,
    friendly: friendly,
    /* يجهّز العميل ويقرأ الجلسة المحفوظة (تعمل بلا إنترنت أيضاً لأنها مخزنة محلياً) */
    ready: function () {
      if (!enabled) return Promise.resolve(null);
      if (readyP) return readyP;
      readyP = loadScript("vendor/supabase.js?v=2.118.0").then(function () {
        client = window.supabase.createClient(cfg.url, cfg.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "medixa-auth" }
        });
        client.auth.onAuthStateChange(function (ev, s) {
          var changed = (s && s.user && s.user.id) !== (session && session.user && session.user.id);
          session = s || null;
          if (changed || ev === "SIGNED_OUT") emit();
        });
        return client.auth.getSession().then(function (r) { session = (r.data && r.data.session) || null; return session; });
      }).catch(function () { client = null; return null; });
      return readyP;
    },
    session: function () { return session; },
    user: function () { return session && session.user ? { id: session.user.id, email: session.user.email } : null; },
    onChange: function (f) { listeners.push(f); },
    /* الخطوة 1: إرسال رمز من 6 أرقام إلى البريد (ينشئ الحساب تلقائياً عند أول دخول) */
    sendCode: function (email) {
      return cloud.ready().then(function () {
        if (!client) throw new Error("network");
        return client.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } });
      }).then(function (r) { if (r.error) throw r.error; return true; });
    },
    /* الخطوة 2: التحقق من الرمز؛ نجاحه يثبت أن صاحب البريد هو من يدخل */
    verifyCode: function (email, code) {
      return cloud.ready().then(function () {
        if (!client) throw new Error("network");
        return client.auth.verifyOtp({ email: email, token: String(code).replace(/\s+/g, ""), type: "email" });
      }).then(function (r) { if (r.error) throw r.error; session = r.data.session; emit(); return cloud.user(); });
    },
    signOut: function () {
      return cloud.ready().then(function () {
        if (!client) return;
        return client.auth.signOut({ scope: "local" });
      }).then(function () { session = null; emit(); });
    },
    /* استدعاء دالة قاعدة البيانات بهوية الطالب (الخادم يرفض بلا جلسة صالحة) */
    rpc: function (name, args) {
      return cloud.ready().then(function () {
        if (!client || !session) throw Object.assign(new Error("not_authenticated"), { code: "401" });
        return client.rpc(name, args || {});
      }).then(function (r) { if (r.error) throw r.error; return r.data; });
    }
  };
  MS.cloud = cloud;
})();
