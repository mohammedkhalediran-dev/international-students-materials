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
    if (parsed.att) bub.appendChild(attCard(parsed.att));
    var body = el("p", "chat-body"); body.setAttribute("dir", "auto");
    body.appendChild(document.createTextNode(parsed.text)); body.appendChild(time);
    bub.appendChild(body);
    var acts = el("div", "chat-acts");
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
    if (acts.children.length) { bub.appendChild(acts); bub.addEventListener("click", function () { bub.classList.toggle("show-acts"); }); }
    return box;
  }
  /* ---------- المرفقات ---------- */
  var ATT = "[[att]]";
  function parseAtt(body) {
    body = String(body || "");
    if (body.indexOf(ATT) !== 0) return { text: body };
    var rest = body.slice(ATT.length), nl = rest.indexOf("\n"), js = nl < 0 ? rest : rest.slice(0, nl);
    try {
      var a = JSON.parse(js);
      if (a && /^(?!\/\/)[\w\-.\/?=&#%]+$/.test(a.href || "")) return { att: a, text: nl < 0 ? "" : rest.slice(nl + 1) };
    } catch (e) { /* مرفق تالف: يُعرض النص فقط */ }
    return { text: nl < 0 ? "" : rest.slice(nl + 1) };
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
  function paintPending() {
    var box = $("pending"); box.textContent = ""; box.hidden = !pend;
    if (!pend) return;
    box.appendChild(attCard(pend));
    var x = el("button", "chat-pending-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "إزالة المرفق");
    x.addEventListener("click", function () { pend = null; paintPending(); });
    box.appendChild(x);
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

  function courseRows() {
    return (window.COURSES || []).filter(function (c) { return c.lectures.some(function (l) { return !l.draft && l.files.length; }) || (c.extras || []).length; }).map(function (c) {
      return { icon: "book", title: c.nameAr || c.name, sub: c.name, go: function () { push(c.nameAr || c.name, lectureRows(c)); } };
    });
  }
  function lectureRows(c) {
    var rows = c.lectures.filter(function (l) { return !l.draft && l.files.length; }).sort(function (a, b) { return b.number - a.number; }).map(function (l) {
      return { icon: "book", title: "المحاضرة " + l.number + "، " + l.title, sub: l.files.length + " ملف", go: function () {
        pick({ type: "lecture", title: l.title, sub: (c.nameAr || c.name) + " · " + I18N_t("المحاضرة") + " " + l.number, href: "course.html?id=" + encodeURIComponent(c.id) + "#lec-" + l.number });
      } };
    });
    (c.extras || []).forEach(function (f) {
      rows.push({ icon: "help", title: f.label, sub: "اختبارات وأسئلة", go: function () {
        pick({ type: "lecture", title: f.label, sub: c.nameAr || c.name, href: "course.html?id=" + encodeURIComponent(c.id) });
      } });
    });
    return rows;
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
      { icon: "book", title: "ملف المحاضرة أو الملزمة", sub: "اختر مادة ثم محاضرة", go: function () { push("اختر المادة", courseRows()); } },
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
    $("send").disabled = true;
    var payload = { room: room, body: body };
    if (pend) payload.attach = pend;
    api("POST", "send", payload).then(function (r) {
      if (r.status === 201) { pend = null; paintPending(); $("msg").value = ""; $("msg").style.height = ""; note(""); poll(); } else fail(r);
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
