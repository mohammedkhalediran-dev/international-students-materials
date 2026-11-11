/* js/dm.js — الرسائل الخاصة: قائمة محادثات ← محادثة. dm.html?u=<رقم الحساب> يفتح المحادثة مباشرة.
   الاستعلام كل 15 ثانية (القائمة 30) ويتوقف حين تكون الصفحة مخفية. النصوص تُكتب textContent فقط. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) { return MS.el(tag, cls, text); };
  var t = function (s) { return window.I18N && I18N.t ? I18N.t(s) : s; };
  var ERR = { muted: "أنت مكتوم مؤقتاً.", slow_down: "تمهّل قليلاً قبل الرسالة التالية.", unauthorized: "سجّل الدخول لاستعمال الرسائل الخاصة.", not_found: "هذا الحساب غير متاح.",
    cant_message: "لا يمكنك مراسلة هذا الحساب.", you_blocked: "حظرتَ هذا الحساب. ارفع الحظر أولاً." };
  var ROLE = { admin: "مشرف", rep: "ممثل الدفعة" };
  var peerId = null, peer = null, last = 0, since = 0, seen = {}, prev = null, blocked = false, me = null, timer = null;

  MS.initShared(); MS.initHeader();
  $("footBottom").textContent = "© " + new Date().getFullYear() + " " + SITE.title;

  function note(text) { var n = $("dmNote"); n.textContent = text ? t(text) : ""; n.hidden = !text; }
  function api(method, path, body) {
    var o = { method: method, credentials: "same-origin", headers: {} };
    if (body !== undefined) { o.body = JSON.stringify(body); o.headers["content-type"] = "application/json"; }
    return fetch("api/dm/" + path, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); });
  }
  function fail(r) { note(r.status === 401 ? ERR.unauthorized : (ERR[r.j && r.j.error] || "حدث خطأ، حاول مرة أخرى.")); }
  function hue(id) { return 1 + (Math.abs(Number(id) || 0) % 6); }
  function avatar(p, cls) {
    var a = el("span", cls + " hue-" + hue(p.id), (String(p.name || "?").trim().charAt(0) || "?").toUpperCase());
    a.setAttribute("aria-hidden", "true");
    if (p.av) {
      var im = el("img"); im.alt = ""; im.loading = "lazy"; im.src = "api/avatar/" + p.id + "?v=" + p.av;
      im.addEventListener("load", function () { a.textContent = ""; a.appendChild(im); });
    }
    return a;
  }
  function clock(ms) { return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }
  function dayLabel(ms) { return new Date(ms).toLocaleDateString(MS.lang === "en" ? "en-GB" : "ar", { day: "numeric", month: "long" }); }
  function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }

  /* ---------- القائمة ---------- */
  function showList() {
    peerId = null; peer = null; clearInterval(timer); timer = setInterval(loadList, 30000);
    $("dmList").hidden = false; $("dmPrivacy").hidden = false; $("log").hidden = true; $("form").hidden = true; $("dmBlocked").hidden = true;
    $("dmNew").hidden = false; $("dmBlock").hidden = true; $("dmBack").href = "chat.html";
    $("dmTitle").textContent = t("الرسائل الخاصة"); $("dmSub").textContent = t("محادثات بينك وبين زملائك");
    var av = $("dmAv"); av.textContent = "✉"; av.className = "chat-top-av";
    loadList();
  }
  function loadList() {
    if (document.hidden) return;
    api("GET", "threads").then(function (r) {
      if (r.status !== 200) { fail(r); return; }
      me = r.j.me; note("");
      var box = $("dmList"); box.textContent = "";
      if (!r.j.items.length) {
        var e = el("div", "dm-empty"); e.appendChild(el("strong", "", "لا محادثات بعد.")); e.appendChild(el("span", "", "ابدأ محادثة مع المشرف أو ممثل الدفعة أو زميل."));
        box.appendChild(e);
        if (window.I18N && I18N.apply) try { I18N.apply(box); } catch (x) { /* اختياري */ }
        return;
      }
      r.j.items.forEach(function (it) {
        var row = el("a", "dm-row"); row.href = "dm.html?u=" + it.peer.id;
        row.appendChild(avatar(it.peer, "dm-av"));
        var tx = el("span", "dm-row-txt");
        var top = el("span", "dm-row-top");
        top.appendChild(el("strong", "", it.peer.name));
        if (ROLE[it.peer.role]) top.appendChild(el("em", "dm-role", ROLE[it.peer.role]));
        top.appendChild(el("small", "", clock(it.last.at)));
        tx.appendChild(top);
        var snip = el("span", "dm-snip"); snip.setAttribute("dir", "auto");
        snip.textContent = (it.last.mine ? "أنت: " : "") + it.last.body;
        tx.appendChild(snip);
        row.appendChild(tx);
        if (it.unread) row.appendChild(el("span", "dm-badge", String(it.unread)));
        row.addEventListener("click", function (ev) { ev.preventDefault(); go(it.peer.id); });
        box.appendChild(row);
      });
      if (window.I18N && I18N.apply) try { I18N.apply(box); } catch (x) { /* اختياري */ }
    });
  }

  /* ---------- المحادثة ---------- */
  function go(id) { history.pushState({ u: id }, "", "dm.html?u=" + id); route(); }
  function route() {
    var u = Number(new URLSearchParams(location.search).get("u")) || 0;
    if (u) openThread(u); else showList();
  }
  function openThread(id) {
    peerId = id; peer = null; last = 0; since = 0; seen = {}; prev = null; blocked = false;
    $("dmList").hidden = true; $("dmPrivacy").hidden = true; $("log").hidden = false; $("log").textContent = "";
    $("dmNew").hidden = true; $("dmBack").href = "dm.html";
    $("dmTitle").textContent = "…"; $("dmSub").textContent = "";
    clearInterval(timer); timer = setInterval(poll, 15000);
    poll(true);
  }
  function applyPeer(p, b) {
    peer = p; blocked = b;
    $("dmTitle").textContent = p.name; $("dmSub").textContent = ROLE[p.role] ? t(ROLE[p.role]) : t("طالب");
    var av = avatar(p, "chat-top-av"); av.id = "dmAv"; $("dmAv").replaceWith(av);
    $("dmBlock").hidden = false; $("dmBlock").textContent = t(b ? "رفع الحظر" : "حظر");
    $("form").hidden = b; $("dmBlocked").hidden = !b;
  }
  function drop(id) { var n = seen[id]; if (n) { n.remove(); delete seen[id]; } }
  function poll(first) {
    if (!peerId || document.hidden) return;
    api("GET", "messages?peer=" + peerId + "&after=" + last + "&since=" + since).then(function (r) {
      if (r.status !== 200) { if (first) { note(r.status === 404 ? ERR.not_found : "حدث خطأ، حاول مرة أخرى."); } return; }
      me = { id: r.j.me }; if (r.j.now) since = r.j.now;
      applyPeer(r.j.peer, r.j.blocked);
      (r.j.gone || []).forEach(drop);
      var got = false;
      r.j.items.forEach(function (m) { draw(m); last = Math.max(last, m.id); if (m.sender_id !== me.id) got = true; });
      if (first || got) api("POST", "read", { peer: peerId });
    });
  }
  function draw(m) {
    if (seen[m.id]) return;
    var log = $("log"), stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 60;
    if (!prev || !sameDay(prev.at, m.created_at)) { log.appendChild(el("div", "chat-day", dayLabel(m.created_at))); prev = null; }
    var mine = m.sender_id === me.id;
    var cont = !!prev && prev.uid === m.sender_id && (m.created_at - prev.at) < 300000;
    var box = el("div", "chat-msg" + (mine ? " is-mine" : "") + (cont ? " is-cont" : ""));
    box.dataset.id = m.id;
    var bub = el("div", "chat-bubble");
    var body = el("p", "chat-body"); body.setAttribute("dir", "auto");
    body.appendChild(document.createTextNode(m.body)); body.appendChild(el("span", "chat-time", clock(m.created_at)));
    bub.appendChild(body);
    var acts = el("div", "chat-acts");
    if (mine) acts.appendChild(act("حذف", function () { api("POST", "delete", { message_id: m.id }).then(function (r) { r.status === 200 ? drop(m.id) : fail(r); }); }));
    else acts.appendChild(act("إبلاغ", function () {
      var why = window.prompt(t("اكتب سبب البلاغ"));
      if (why) api("POST", "report", { message_id: m.id, reason: why }).then(function (r) { r.status === 200 ? note("تم إرسال البلاغ.") : fail(r); });
    }));
    bub.appendChild(acts);
    bub.addEventListener("click", function (e) { if (e.target.closest("button")) return; bub.classList.toggle("show-acts"); });
    box.appendChild(bub);
    seen[m.id] = box; log.appendChild(box);
    prev = { uid: m.sender_id, at: m.created_at };
    if (stick || mine) log.scrollTop = log.scrollHeight;
  }
  function act(label, fn) { var b = el("button", "chat-act", label); b.type = "button"; b.addEventListener("click", fn); return b; }

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var body = $("msg").value.trim();
    if (!body || !peerId) return;
    $("send").disabled = true;
    api("POST", "send", { peer: peerId, body: body }).then(function (r) {
      if (r.status === 201) { $("msg").value = ""; $("msg").style.height = ""; note(""); poll(); } else fail(r);
    }).then(function () { $("send").disabled = false; });
  });
  $("msg").addEventListener("input", function () { this.style.height = "auto"; this.style.height = Math.min(this.scrollHeight, 120) + "px"; });
  $("msg").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (this.value.trim()) $("form").requestSubmit(); }
  });
  $("dmBlock").addEventListener("click", function () {
    if (!peerId) return;
    api("POST", blocked ? "unblock" : "block", { peer: peerId }).then(function (r) {
      if (r.status === 200) { blocked = !blocked; applyPeer(peer, blocked); } else fail(r);
    });
  });
  $("dmBack").addEventListener("click", function (e) { if (peerId) { e.preventDefault(); history.pushState({}, "", "dm.html"); route(); } });
  window.addEventListener("popstate", route);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { peerId ? poll() : loadList(); } });

  /* ---------- محادثة جديدة: المشرف/الممثل + بحث عن طالب ---------- */
  function closeSheet() { $("sheet").hidden = true; $("dmNew").focus(); }
  function personRow(p) {
    var b = el("button", "chat-sheet-row"); b.type = "button";
    b.appendChild(avatar(p, "dm-av"));
    var tx = el("span", "chat-sheet-txt"); tx.appendChild(el("strong", "", p.name)); tx.appendChild(el("small", "", ROLE[p.role] ? t(ROLE[p.role]) : t("طالب")));
    b.appendChild(tx);
    b.addEventListener("click", function () { closeSheet(); go(p.id); });
    return b;
  }
  $("dmNew").addEventListener("click", function () {
    $("sheet").hidden = false;
    var list = $("sheetList"); list.textContent = "";
    list.appendChild(el("p", "dm-sheet-h", "المشرف وممثل الدفعة"));
    var staff = el("div"); list.appendChild(staff);
    list.appendChild(el("p", "dm-sheet-h", "ابحث عن طالب"));
    var q = el("input", "field chat-sheet-search"); q.type = "search"; q.placeholder = t("اكتب حرفين من اسمه"); list.appendChild(q);
    var found = el("div"); list.appendChild(found);
    api("GET", "staff").then(function (r) {
      if (r.status !== 200) { fail(r); return; }
      if (!r.j.items.length) staff.appendChild(el("p", "chat-sheet-empty", "لا يوجد شيء للاختيار."));
      r.j.items.forEach(function (p) { staff.appendChild(personRow(p)); });
      if (window.I18N && I18N.apply) try { I18N.apply($("sheet")); } catch (x) { /* اختياري */ }
    });
    var tm = null;
    q.addEventListener("input", function () {
      clearTimeout(tm);
      tm = setTimeout(function () {
        found.textContent = "";
        if (q.value.trim().length < 2) return;
        api("GET", "people?q=" + encodeURIComponent(q.value.trim())).then(function (r) {
          if (r.status !== 200) return;
          if (!r.j.items.length) found.appendChild(el("p", "chat-sheet-empty", "لا يوجد شيء للاختيار."));
          r.j.items.forEach(function (p) { found.appendChild(personRow(p)); });
          if (window.I18N && I18N.apply) try { I18N.apply(found); } catch (x) { /* اختياري */ }
        });
      }, 300);
    });
    if (window.I18N && I18N.apply) try { I18N.apply($("sheet")); } catch (x) { /* اختياري */ }
  });
  $("sheetX").addEventListener("click", closeSheet);
  $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) closeSheet(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("sheet").hidden) closeSheet(); });

  /* ---------- بلاغات الرسائل الخاصة (للمشرف فقط) ---------- */
  function adminReports() {
    api("GET", "reports").then(function (r) {
      if (r.status !== 200 || !r.j.items.length || peerId) return;
      var box = el("div", "dm-reports"); box.appendChild(el("h2", "dm-sheet-h", "بلاغات الرسائل الخاصة"));
      r.j.items.forEach(function (x) {
        var c = el("div", "dm-report");
        c.appendChild(el("strong", "", x.sender_name));
        var b = el("p", "dm-report-body"); b.setAttribute("dir", "auto"); b.textContent = x.body; c.appendChild(b);
        var why = el("small", "", x.reporter_name + ": " + x.reason); why.setAttribute("dir", "auto"); c.appendChild(why);
        box.appendChild(c);
      });
      $("dmList").after(box);
      if (window.I18N && I18N.apply) try { I18N.apply(box); } catch (x) { /* اختياري */ }
    });
  }

  api("GET", "threads").then(function (r) {
    if (r.status === 401) { note(ERR.unauthorized); $("dmNew").hidden = true; $("dmList").hidden = true; $("dmPrivacy").hidden = true; return; }
    route();
    if (r.status === 200 && r.j.me && r.j.me.mod) adminReports();
  });
})();
