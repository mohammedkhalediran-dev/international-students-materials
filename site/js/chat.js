/* js/chat.js — الدردشة: غرف حسب الكورس. يستعلم كل 15 ثانية ويتوقف حين تكون الصفحة مخفية. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) { return MS.el(tag, cls, text); };
  var room = null, last = 0, me = null, timer = null, seen = {};
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
  function draw(m) {
    if (seen[m.id]) { var old = seen[m.id]; if (m.deleted_at && !old.dataset.gone) { old.replaceWith(build(m, old.classList.contains("is-cont"))); } return; }
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
    if (m.deleted_at) { box.dataset.gone = "1"; var g = el("p", "chat-body chat-gone", "تم حذف هذه الرسالة."); bub.appendChild(g); g.appendChild(time); return box; }
    var body = el("p", "chat-body"); body.setAttribute("dir", "auto");
    body.appendChild(document.createTextNode(m.body)); body.appendChild(time);
    bub.appendChild(body);
    var acts = el("div", "chat-acts");
    if (!mine) acts.appendChild(button("إبلاغ", function () {
      var why = window.prompt(I18N && I18N.t ? I18N.t("اكتب سبب البلاغ") : "اكتب سبب البلاغ");
      if (why) api("POST", "report", { message_id: m.id, reason: why }).then(function (r) { r.status === 200 ? note("تم إرسال البلاغ.") : fail(r); });
    }));
    if (mine || (me && me.mod)) acts.appendChild(button("حذف", function () {
      api("POST", "delete", { message_id: m.id }).then(function (r) { r.status === 200 ? open(room) : fail(r); });
    }));
    if (me && me.mod && !mine) acts.appendChild(button("كتم 10 دقائق", function () {
      api("POST", "mute", { user_id: m.user_id, minutes: 10 }).then(function (r) { r.status === 200 ? note("تم الكتم.") : fail(r); });
    }));
    if (acts.children.length) { bub.appendChild(acts); bub.addEventListener("click", function () { bub.classList.toggle("show-acts"); }); }
    return box;
  }
  function button(label, fn) { var b = el("button", "chat-act", label); b.type = "button"; b.addEventListener("click", fn); return b; }

  function poll() {
    if (!room || document.hidden) return;
    api("GET", "messages?room=" + room + "&after=" + last).then(function (r) {
      if (r.status !== 200) { fail(r); return; }
      r.j.items.forEach(function (m) { draw(m); last = Math.max(last, m.id); });
    });
  }
  function open(id) {
    room = id; last = 0; seen = {}; prev = null; $("log").textContent = "";
    Array.prototype.forEach.call($("rooms").children, function (b) { b.setAttribute("aria-selected", String(Number(b.dataset.id) === id)); });
    var cur = $("rooms").querySelector("[data-id=\"" + id + "\"]");
    if (cur) { $("roomTitle").textContent = $("rooms").hidden ? "الدردشة العامة" : cur.textContent; $("roomAv").textContent = cur.textContent.trim().charAt(0).toUpperCase(); }
    poll();
  }

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var body = $("msg").value.trim();
    if (!body || !room) return;
    $("send").disabled = true;
    api("POST", "send", { room: room, body: body }).then(function (r) {
      if (r.status === 201) { $("msg").value = ""; $("msg").style.height = ""; note(""); poll(); } else fail(r);
    }).then(function () { $("send").disabled = false; });
  });
  $("msg").addEventListener("input", function () { this.style.height = "auto"; this.style.height = Math.min(this.scrollHeight, 120) + "px"; });
  $("msg").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (this.value.trim()) $("form").requestSubmit(); }
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
