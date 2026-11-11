/* js/chat.js — الدردشة: غرف حسب الكورس. يستعلم كل 15 ثانية ويتوقف حين تكون الصفحة مخفية. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) { return MS.el(tag, cls, text); };
  var room = null, last = 0, me = null, timer = null, seen = {}, since = 0, pend = null;
  var ERR = { muted: "أنت مكتوم مؤقتاً.", slow_down: "تمهّل قليلاً قبل الرسالة التالية.", unauthorized: "سجّل الدخول للمشاركة في الدردشة.", not_found: "الدردشة غير مفعّلة بعد." };

  MS.initShared(); MS.initHeader();
  $("footBottom").textContent = "© " + new Date().getFullYear() + " " + SITE.title;

  function note(text) { var n = $("chatNote"); n.textContent = text ? (window.I18N && I18N.t ? I18N.t(text) : text) : ""; n.hidden = !text; }
  function api(method, path, body) {
    var o = { method: method, credentials: "same-origin", headers: {} };
    if (body !== undefined) { o.body = JSON.stringify(body); o.headers["content-type"] = "application/json"; }
    return fetch("api/chat/" + path, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); });
  }
  function fail(r) {
    if (r.status === 401) {
      note("سجّل الدخول للمشاركة في الدردشة.");
      return;
    }
    note(ERR[r.j && r.j.error] || "حدث خطأ، حاول مرة أخرى.");
  }

  var prev = null; // آخر رسالة مرسومة: لتجميع رسائل الشخص نفسه كما في تلغرام
  function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
  /* الحذف للجميع: تُزال الفقاعة كأنها لم تكن، بلا أي أثر */
  function drop(id) { var n = seen[id]; if (n) { n.remove(); delete seen[id]; } }
  function draw(m) {
    if (seen[m.id]) return;
    var log = $("log"), stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 60;
    if (!prev || !sameDay(prev.at, m.created_at)) {
      log.appendChild(el("div", "chat-day", new Date(m.created_at).toLocaleDateString(MS.lang === "en" ? "en-GB" : "ar", { day: "numeric", month: "long" })));
      prev = null;
    }
    var cont = !!prev && prev.uid === m.user_id && (new Date(m.created_at) - new Date(prev.at)) < 300000 && !m.deleted_at;
    if (cont && prev.node) prev.node.classList.add("no-av");
    var node = build(m, cont);
    seen[m.id] = node;
    log.appendChild(node);
    prev = { uid: m.user_id, at: m.created_at, node: node };
    if (stick) log.scrollTop = log.scrollHeight;
  }
  function hue(id) { return 1 + (Math.abs(Number(id) || 0) % 6); }
  function build(m, cont) {
    var mine = me && m.user_id === me.id;
    var box = el("div", "chat-msg hue-" + hue(m.user_id) + (mine ? " is-mine" : "") + (cont ? " is-cont" : ""));
    box.dataset.id = m.id;
    var av = el("span", "chat-avatar", (String(m.user_name || "?").trim().charAt(0) || "?").toUpperCase());
    av.setAttribute("aria-hidden", "true");
    box.appendChild(av);
    var bub = el("div", "chat-bubble");
    if (!mine && !cont) bub.appendChild(el("strong", "chat-name", m.user_name));
    box.appendChild(bub);
    var time = el("span", "chat-time", new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    var parsed = parseAtt(m.body);
    if (parsed.re) bub.appendChild(quoteBox(parsed.re));
    if (parsed.att) bub.appendChild(attCard(parsed.att));
    var body = el("p", "chat-body"); body.setAttribute("dir", "auto");
    body.appendChild(document.createTextNode(parsed.text)); body.appendChild(time);
    bub.appendChild(body);
    var acts = el("div", "chat-acts");
    acts.appendChild(button("رد", function () { startReply({ id: m.id, n: m.user_name, t: replyText(parsed) }); bub.classList.remove("show-acts"); }));
    if (!mine) acts.appendChild(button("إبلاغ", function () {
      var why = window.prompt(I18N && I18N.t ? I18N.t("اكتب سبب البلاغ") : "اكتب سبب البلاغ");
      if (why) api("POST", "report", { message_id: m.id, reason: why }).then(function (r) { r.status === 200 ? note("تم إرسال البلاغ.") : fail(r); });
    }));
    if (mine || (me && me.mod)) acts.appendChild(button("حذف", function () {
      api("POST", "delete", { message_id: m.id }).then(function (r) { r.status === 200 ? drop(m.id) : fail(r); });
    }));
    if (me && me.mod && !mine) acts.appendChild(button("كتم 10 دقائق", function () {
      api("POST", "mute", { user_id: m.user_id, minutes: 10 }).then(function (r) { r.status === 200 ? note("تم الكتم.") : fail(r); });
    }));
    bub.appendChild(acts);
    bub.addEventListener("click", function (e) { if (e.target.closest("a, button")) return; bub.classList.toggle("show-acts"); });
    return box;
  }
  /* ---------- المرفقات ---------- */
  var ATT = "[[att]]";
  var RE = "[[re]]";
  var HREF_OK = /^(?!\/\/)[\w\-.\/?=&#%]+$/;
  function parseAtt(body) {
    var t = String(body || ""), out = { text: "" };
    for (;;) {
      var key = t.indexOf(ATT) === 0 ? ATT : t.indexOf(RE) === 0 ? RE : null;
      if (!key) break;
      var nl = t.indexOf("\n"), line = nl < 0 ? t.slice(key.length) : t.slice(key.length, nl);
      try {
        var o = JSON.parse(line);
        if (key === ATT && o && HREF_OK.test(o.href || "")) out.att = o;
        if (key === RE && o && o.id) out.re = o;
      } catch (e) { /* سطر تالف: يُتجاهل */ }
      t = nl < 0 ? "" : t.slice(nl + 1);
    }
    out.text = t;
    return out;
  }
  var ATT_ICO = { lecture: "book", announcement: "bell", tomorrow: "calendar", week: "calendar" };
  var ATT_LBL = { lecture: "ملف محاضرة", announcement: "تبليغ", tomorrow: "محاضرات غداً", week: "الجدول الأسبوعي" };
  function attCard(a) {
    var c = el("a", "chat-att att-" + a.type);
    c.href = a.href;
    var ico = el("span", "chat-att-ico"); ico.appendChild(MS.icon(ATT_ICO[a.type] || "book", 20)); c.appendChild(ico);
    var t = el("span", "chat-att-txt");
    t.appendChild(el("small", "", ATT_LBL[a.type] || ""));
    t.appendChild(el("strong", "", a.title));
    if (a.sub) t.appendChild(el("span", "chat-att-sub", a.sub));
    c.appendChild(t);
    return c;
  }
  var replyTo = null;
  function replyText(p) { return String(p.text || (p.att && p.att.title) || "").replace(/\s+/g, " ").slice(0, 80); }
  function quoteBox(r) {
    var q = el("button", "chat-quote"); q.type = "button";
    q.appendChild(el("strong", "", r.n || ""));
    q.appendChild(el("span", "", r.t || ""));
    q.addEventListener("click", function (e) {
      e.stopPropagation();
      var n = seen[r.id]; if (!n) return;
      n.scrollIntoView({ block: "center", behavior: "smooth" });
      n.classList.add("flash"); setTimeout(function () { n.classList.remove("flash"); }, 1200);
    });
    return q;
  }
  function startReply(r) { replyTo = r; paintPending(); $("msg").focus(); }
  function paintPending() {
    var box = $("pending"); box.textContent = ""; box.hidden = !pend && !replyTo;
    if (replyTo) {
      var rb = el("div", "chat-pending-row chat-replying");
      var q = el("span", "chat-quote is-static"); q.appendChild(el("strong", "", replyTo.n || "")); q.appendChild(el("span", "", replyTo.t || ""));
      rb.appendChild(q);
      var rx = el("button", "chat-pending-x", "✕"); rx.type = "button"; rx.setAttribute("aria-label", "إلغاء الرد");
      rx.addEventListener("click", function () { replyTo = null; paintPending(); });
      rb.appendChild(rx); box.appendChild(rb);
    }
    if (pend) {
      var ab = el("div", "chat-pending-row"); ab.appendChild(attCard(pend));
      var x = el("button", "chat-pending-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "إزالة المرفق");
      x.addEventListener("click", function () { pend = null; paintPending(); });
      ab.appendChild(x); box.appendChild(ab);
    }
  }
  function pick(a) { pend = a; paintPending(); closeSheet(); $("msg").focus(); }

  /* ورقة الاختيار: قائمة بخطوات (نوع المرفق ← المادة ← المحاضرة) */
  var stack = [];
  function showSheet(title, rows) {
    $("sheet").hidden = false;
    $("sheetTitle").textContent = window.I18N && I18N.t ? I18N.t(title) : title;
    $("sheetBack").hidden = stack.length <= 1;
    var list = $("sheetList"); list.textContent = "";
    if (!rows.length) list.appendChild(el("p", "chat-sheet-empty", "لا يوجد شيء للاختيار."));
    rows.forEach(function (r) {
      var b = el("button", "chat-sheet-row"); b.type = "button";
      if (r.icon) { var i = el("span", "chat-sheet-ico"); i.appendChild(MS.icon(r.icon, 20)); b.appendChild(i); }
      var t = el("span", "chat-sheet-txt"); t.appendChild(el("strong", "", r.title)); if (r.sub) t.appendChild(el("small", "", r.sub)); b.appendChild(t);
      b.addEventListener("click", r.go);
      list.appendChild(b);
    });
    if (window.I18N && I18N.apply) try { I18N.apply($("sheet")); } catch (e) { /* ترجمة اختيارية */ }
  }
  function closeSheet() { $("sheet").hidden = true; stack = []; $("attachBtn").focus(); }
  function push(title, rows) { stack.push({ title: title, rows: rows }); showSheet(title, rows); }
  function back() { stack.pop(); var top = stack[stack.length - 1]; if (top) showSheet(top.title, top.rows); else closeSheet(); }
  function two(n) { return ("0" + n).slice(-2); }
  function isoDay(d) { return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()); }

  /* كل الملفات المرفوعة على المنصة (محاضرات وملازم واختبارات)، الأحدث أولاً، مع بحث */
  function allFiles() {
    var rows = [];
    (typeof COURSES !== "undefined" ? COURSES : []).forEach(function (c) {
      var cn = c.nameAr || c.name;
      c.lectures.forEach(function (l) {
        if (l.draft) return;
        l.files.forEach(function (f) {
          if (f.draft) return;
          rows.push({ added: f.added || "", title: f.label || l.title, sub: cn + " · " + I18N_t("المحاضرة") + " " + l.number, hay: [f.label, l.title, cn, c.name].join(" "),
            att: { type: "lecture", title: f.label || l.title, sub: cn + " · " + I18N_t("المحاضرة") + " " + l.number, href: "course.html?id=" + encodeURIComponent(c.id) + "#lec-" + l.number } });
        });
      });
      (c.extras || []).forEach(function (f) {
        rows.push({ added: f.added || "", title: f.label, sub: cn, hay: [f.label, cn, c.name].join(" "),
          att: { type: "lecture", title: f.label, sub: cn, href: "course.html?id=" + encodeURIComponent(c.id) } });
      });
    });
    rows.sort(function (a, b) { return a.added < b.added ? 1 : a.added > b.added ? -1 : 0; });
    return rows;
  }
  function filesSheet() {
    var all = allFiles();
    stack.push({ title: "اختر ملفاً", rows: [] });
    $("sheet").hidden = false;
    $("sheetTitle").textContent = I18N_t("اختر ملفاً");
    $("sheetBack").hidden = false;
    var list = $("sheetList"); list.textContent = "";
    var q = el("input", "field chat-sheet-search"); q.type = "search"; q.placeholder = I18N_t("ابحث عن ملف أو مادة");
    list.appendChild(q);
    var holder = el("div", "chat-sheet-files"); list.appendChild(holder);
    function paint() {
      var key = MS.norm ? MS.norm(q.value) : q.value.toLowerCase();
      holder.textContent = "";
      var shown = all.filter(function (r) { return !key || (MS.norm ? MS.norm(r.hay) : r.hay.toLowerCase()).indexOf(key) >= 0; }).slice(0, 80);
      if (!shown.length) holder.appendChild(el("p", "chat-sheet-empty", "لا يوجد شيء للاختيار."));
      shown.forEach(function (r) {
        var b = el("button", "chat-sheet-row"); b.type = "button";
        var i = el("span", "chat-sheet-ico"); i.appendChild(MS.icon("book", 20)); b.appendChild(i);
        var t = el("span", "chat-sheet-txt"); t.appendChild(el("strong", "", r.title)); t.appendChild(el("small", "", r.sub)); b.appendChild(t);
        b.addEventListener("click", function () { pick(r.att); });
        holder.appendChild(b);
      });
    }
    q.addEventListener("input", paint); paint();
  }
  function I18N_t(x) { return window.I18N && I18N.t ? I18N.t(x) : x; }
  function announcementRows() {
    push("اختر تبليغاً", []);
    fetch("api/announcements", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (d) {
      var rows = (d.items || []).slice(0, 15).map(function (a) {
        return { icon: "bell", title: a.title, sub: a.by, go: function () { pick({ type: "announcement", title: a.title, sub: String(a.body || "").slice(0, 140), href: "index.html#announcements" }); } };
      });
      var top = stack[stack.length - 1]; if (top) top.rows = rows; showSheet("اختر تبليغاً", rows);
    }).catch(function () { /* تبقى القائمة فارغة */ });
  }
  var DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  function tomorrowAttach() {
    var d = new Date(); d.setDate(d.getDate() + 1); var day = isoDay(d);
    fetch("api/timetable?from=" + day + "&to=" + day, { credentials: "same-origin", cache: "no-store" }).then(function (r) {
      if (r.status === 401 || r.status === 403) { note("الجدول متاح لطلاب الكورس الثالث فقط."); closeSheet(); return null; }
      return r.json();
    }).then(function (j) {
      if (!j) return;
      var items = (j.items || []).filter(function (o) { return o.date === day && o.state !== "cancelled" && o.state !== "moved"; });
      if (!items.length) { note("لا محاضرات غداً."); closeSheet(); return; }
      var sub = items.map(function (o) { return o.start + " " + o.subject + (o.room ? " (" + o.room + ")" : ""); }).join("\n");
      pick({ type: "tomorrow", title: I18N_t(DAYS_AR[d.getDay()]) + " " + d.getDate() + "/" + (d.getMonth() + 1), sub: sub, href: "timetable.html?date=" + day });
    }).catch(function () { note("تعذر الاتصال، تحقق من الإنترنت."); closeSheet(); });
  }
  function openSheet() {
    stack = [];
    push("إرفاق", [
      { icon: "book", title: "ملفات المنصة", sub: "كل الملفات المرفوعة: اختر ملفاً", go: filesSheet },
      { icon: "bell", title: "تبليغ", sub: "من تبليغات الدفعة", go: announcementRows },
      { icon: "calendar", title: "جدول محاضرات غداً", sub: "محاضرات الغد ومواعيدها", go: tomorrowAttach },
      { icon: "calendar", title: "الجدول الأسبوعي كامل", sub: "رابط الجدول الجامعي", go: function () { pick({ type: "week", title: I18N_t("الجدول الأسبوعي كامل"), sub: "", href: "timetable.html" }); } }
    ]);
  }
  $("attachBtn").addEventListener("click", openSheet);
  $("sheetX").addEventListener("click", closeSheet);
  $("sheetBack").addEventListener("click", back);
  $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) closeSheet(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("sheet").hidden) closeSheet(); });

  function button(label, fn) { var b = el("button", "chat-act", label); b.type = "button"; b.addEventListener("click", fn); return b; }

  function poll() {
    if (!room || document.hidden) return;
    api("GET", "messages?room=" + room + "&after=" + last + "&since=" + since).then(function (r) {
      if (r.status !== 200) { fail(r); return; }
      if (r.j.now) since = r.j.now;
      (r.j.gone || []).forEach(function (id) { drop(id); });
      r.j.items.forEach(function (m) { draw(m); last = Math.max(last, m.id); });
    });
  }
  function open(id) {
    room = id; last = 0; since = 0; seen = {}; prev = null; $("log").textContent = "";
    Array.prototype.forEach.call($("rooms").children, function (b) { b.setAttribute("aria-selected", String(Number(b.dataset.id) === id)); });
    var cur = $("rooms").querySelector("[data-id=\"" + id + "\"]");
    if (cur) { $("roomTitle").textContent = $("rooms").hidden ? "الدردشة العامة" : cur.textContent; $("roomAv").textContent = cur.textContent.trim().charAt(0).toUpperCase(); }
    poll();
  }

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var body = $("msg").value.trim();
    if ((!body && !pend) || !room) return;
    var rt = replyTo;
    $("send").disabled = true;
    var payload = { room: room, body: body };
    if (pend) payload.attach = pend;
    if (rt) payload.reply_to = rt.id;
    api("POST", "send", payload).then(function (r) {
      if (r.status === 201) { pend = null; replyTo = null; paintPending(); $("msg").value = ""; $("msg").style.height = ""; note(""); poll(); } else fail(r);
    }).then(function () { $("send").disabled = false; });
  });
  $("msg").addEventListener("input", function () { this.style.height = "auto"; this.style.height = Math.min(this.scrollHeight, 120) + "px"; });
  $("msg").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (this.value.trim() || pend) $("form").requestSubmit(); }
  });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(); });

  api("GET", "rooms").then(function (r) {
    if (r.status !== 200) { fail(r); return; }
    me = r.j.me;
    r.j.items.forEach(function (rm) {
      var b = el("button", "chat-room", rm.name);
      b.type = "button"; b.dataset.id = rm.id; b.setAttribute("role", "tab");
      b.addEventListener("click", function () { open(rm.id); });
      $("rooms").appendChild(b);
    });
    if (r.j.items.length < 2) $("rooms").hidden = true; // غرفة عامة واحدة
    $("form").hidden = false;
    var sem = MS.load ? MS.load("ms.sem", null) : null;
    var pick = r.j.items.filter(function (x) { return x.slug === "s" + sem; })[0] || r.j.items[0];
    if (pick) open(pick.id);
    timer = setInterval(poll, 15000);
  });
})();
