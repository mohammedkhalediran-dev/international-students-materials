/* js/ai-chat.js — صندوق "اسأل عن هذه المحاضرة".
   يرسل السؤال إلى /api/assistant/ask (يتطلب تسجيل الدخول؛ الحصة اليومية يفرضها الخادم) ويعرض الجواب.
   الاستخدام: AIChat.mount(عنصر, { courseName, lectureTitle, context }) — context نص المحاضرة (حتى 6000 حرف). */
(function () {
  "use strict";
  var history = [];         // آخر رسائل المحادثة تُرسل مع كل سؤال (الخادم يقصّها إلى 6)
  var LATIN = /([A-Za-z][A-Za-z0-9'’\-\/ ]*[A-Za-z0-9])/;

  var el = function (tag, cls, text) { return MS.el(tag, cls, text); };

  /* نص عادي ← عقد DOM: المصطلحات اللاتينية في عناصر مستقلة حتى لا يختلط الاتجاه */
  function plain(parent, text) {
    text.split(LATIN).forEach(function (part, i) {
      if (!part) return;
      if (i % 2) parent.appendChild(el("span", "en", part));
      else parent.appendChild(document.createTextNode(part));
    });
  }
  /* **غامق** + نص عادي، بلا innerHTML */
  function inline(parent, text) {
    text.split(/(\*\*[^*]+\*\*)/).forEach(function (seg) {
      if (!seg) return;
      if (/^\*\*[^*]+\*\*$/.test(seg)) {
        var s = el("strong");
        plain(s, seg.slice(2, -2));
        parent.appendChild(s);
      } else plain(parent, seg);
    });
  }
  /* تنسيق خفيف لجواب النموذج: عناوين وقوائم وغامق فقط */
  function render(box, text) {
    box.textContent = "";
    var list = null;
    text.split("\n").forEach(function (raw) {
      var line = raw.trim();
      if (!line || /^-{3,}$/.test(line)) { list = null; return; }
      var li = /^[*-]\s+(.*)$/.exec(line);
      if (li) {
        if (!list) { list = el("ul", "ai-list"); box.appendChild(list); }
        inline(list.appendChild(el("li")), li[1]);
        return;
      }
      list = null;
      var h = /^#{1,6}\s+(.*)$/.exec(line);
      var p = el("p", h ? "ai-h" : "ai-p");
      inline(p, h ? h[1] : line);
      box.appendChild(p);
    });
  }

  function mount(root, opts) {
    root.hidden = false;
    var card = el("div", "ai-card");
    card.appendChild(el("h2", "ai-title", opts.title || "اسأل عن هذه المحاضرة"));
    var note = el("p", "ai-note", opts.note || "الإجابات من نص المحاضرة، وقد تخطئ. راجع الملف للتأكد.");
    card.appendChild(note);
    var log = el("div", "ai-log");
    log.setAttribute("aria-live", "polite");
    var form = el("form", "ai-form");
    var label = el("label", "ai-label", "اكتب سؤالك");
    var input = el("textarea", "field ai-input");
    input.rows = 2;
    input.maxLength = 500;
    input.id = "aiQuestion";
    label.htmlFor = "aiQuestion";
    if (opts.placeholder) input.placeholder = opts.placeholder;
    var send = el("button", "btn btn-primary", "إرسال");
    send.type = "submit";
    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(send);
    card.appendChild(log);
    card.appendChild(form);
    root.appendChild(card);

    function add(cls, text) {
      var m = el("div", "ai-msg " + cls);
      if (text) m.appendChild(document.createTextNode(text));
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
      return m;
    }
    function fail(m, text) { m.className = "ai-msg ai-err"; m.textContent = text; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      add("ai-user").appendChild(document.createTextNode(q));
      input.value = "";
      send.disabled = true;
      var wait = add("ai-bot", "جارٍ التفكير…");
      fetch("api/assistant/ask", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, courseName: opts.courseName, lectureTitle: opts.lectureTitle, context: opts.context, history: history })
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j.answer) {
            render(wait, String(res.j.answer));
            history.push({ role: "user", content: q }, { role: "assistant", content: String(res.j.answer) });
            history = history.slice(-6);
            if (res.j.quota) note.textContent = "المتبقي اليوم: " + res.j.quota.remaining + " من " + res.j.quota.limit + " أسئلة.";
          } else if (res.status === 401) {
            wait.className = "ai-msg ai-err"; wait.textContent = "";
            var a = el("a", "", "سجّل الدخول لتستخدم المساعد الذكي"); a.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search);
            wait.appendChild(a);
          } else fail(wait, res.j.message || "حدث خطأ، حاول مرة أخرى.");
        })
        .catch(function () { fail(wait, "تعذر الاتصال، تحقق من الإنترنت."); })
        .then(function () { send.disabled = false; log.scrollTop = log.scrollHeight; });
    });
  }

  window.AIChat = { mount: mount };
})();
