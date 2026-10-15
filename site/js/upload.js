/* js/upload.js — صفحة رفع المحاضرات: الدخول بالرمز، رفع الملف على قطع، قائمة المرفوعات والحذف */
(function () {
  "use strict";
  var $ = MS.$, el = MS.el;

  var KEY = "ms.uploadCode";
  var CHUNK = 2 * 1024 * 1024;        // حجم القطعة المرسلة
  var MAX = 20 * 1024 * 1024;         // أكبر ملف
  var code = "";
  var busy = false;

  var ERR = {
    bad_code: "الرمز غير صحيح.",
    locked: "محاولات خاطئة كثيرة. انتظر ربع ساعة ثم حاول مرة أخرى.",
    not_configured: "لم تُضبط رموز الرفع بعد في إعدادات Netlify.",
    bad_request: "تأكد من تعبئة كل الحقول بشكل صحيح.",
    not_pdf: "الملف ليس PDF صالحاً.",
    too_big: "الملف أكبر من 20 ميغا.",
    missing_chunk: "انقطع الرفع في المنتصف. حاول مرة أخرى.",
    busy: "الخادم مشغول. حاول بعد قليل.",
    not_found: "العنصر غير موجود.",
    network: "لا يوجد اتصال بالإنترنت. حاول مرة أخرى.",
    server: "حدث خطأ غير متوقع. حاول مرة أخرى."
  };
  function errText(c) { return ERR[c] || ERR.server; }

  document.querySelectorAll("[data-site-title]").forEach(function (n) { n.textContent = SITE.title; });

  function showMsg(node, text, ok) {
    node.textContent = "";
    if (!text) { node.hidden = true; return; }
    node.className = "up-msg" + (ok ? " is-ok" : "");
    if (typeof text === "string") node.textContent = text;
    else node.appendChild(text);
    node.hidden = false;
  }

  async function api(path, opts) {
    opts = opts || {};
    var headers = {};
    if (code) headers["x-upload-code"] = code;
    var body = opts.body;
    if (body && !(body instanceof Blob)) { body = JSON.stringify(body); headers["content-type"] = "application/json"; }
    var res;
    try { res = await fetch("api/" + path, { method: opts.method || "POST", headers: headers, body: body }); }
    catch (e) { return { status: 0, data: { error: "network" } }; }
    var data = {};
    try { data = await res.json(); } catch (e) { /* ردّ بلا JSON */ }
    return { status: res.status, data: data };
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }
  function mb(n) { return (n / 1048576).toFixed(1) + " ميغا"; }

  /* ---------- الدخول ---------- */
  function savedCode() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function rememberCode(v) { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) { /* التخزين ممنوع */ } }

  async function login(candidate, silent) {
    code = candidate;
    var r = await api("check");
    if (r.status === 200 && r.data.ok) {
      rememberCode(candidate);
      $("who").textContent = "مرحباً " + r.data.name;
      $("loginCard").hidden = true;
      $("appArea").hidden = false;
      refreshList();
      return true;
    }
    code = "";
    if (!silent || r.data.error === "locked") showMsg($("loginMsg"), errText(r.data.error));
    if (r.data.error === "bad_code") rememberCode("");
    return false;
  }

  $("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var v = $("code").value.trim();
    if (!v) return;
    $("loginBtn").disabled = true;
    showMsg($("loginMsg"), "");
    await login(v, false);
    $("loginBtn").disabled = false;
  });

  $("logout").addEventListener("click", function () {
    code = "";
    rememberCode("");
    $("code").value = "";
    $("appArea").hidden = true;
    $("loginCard").hidden = false;
  });

  /* ---------- نموذج الرفع ---------- */
  function fillCourses() {
    var sel = $("course");
    sel.appendChild(new Option("اختر المادة", ""));
    SEMESTERS.forEach(function (sem) {
      var group = document.createElement("optgroup");
      group.label = sem.name;
      COURSES.filter(function (c) { return c.semester === sem.id; }).forEach(function (c) {
        group.appendChild(new Option(c.nameAr, c.id));
      });
      if (group.children.length) sel.appendChild(group);
    });
  }
  fillCourses();

  var autoTitle = false; // العنوان مأخوذ تلقائياً من محاضرة موجودة
  var autoLabel = false; // الاسم الظاهر مأخوذ تلقائياً من اسم الملف

  function syncLecture() {
    var c = MS.course($("course").value);
    $("courseEn").textContent = c ? c.name : "";
    var n = parseInt($("number").value, 10);
    var lec = c && n ? c.lectures.filter(function (l) { return l.number === n; })[0] : null;
    if (lec) {
      $("title").value = lec.title;
      autoTitle = true;
      $("lecHint").textContent = "هذه المحاضرة موجودة، وسيُضاف الملف إليها.";
    } else {
      if (autoTitle) { $("title").value = ""; autoTitle = false; }
      $("lecHint").textContent = c && n ? "محاضرة جديدة: اكتب عنوانها كما هو في الملف." : "اختر المادة واكتب رقم المحاضرة.";
    }
  }
  $("course").addEventListener("change", syncLecture);
  $("number").addEventListener("input", syncLecture);
  $("title").addEventListener("input", function () { autoTitle = false; });

  $("file").addEventListener("change", function () {
    var f = $("file").files[0];
    showMsg($("formMsg"), "");
    if (!f) { $("fileHint").textContent = ""; return; }
    $("fileHint").textContent = f.name + " (" + mb(f.size) + ")";
    // الاسم الظاهر يُملأ من اسم الملف، ويتبدّل مع كل ملف جديد ما دام المشرف لم يكتبه بنفسه
    if (!$("label").value.trim() || autoLabel) {
      $("label").value = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
      autoLabel = true;
    }
  });
  $("label").addEventListener("input", function () { autoLabel = false; });

  function progress(pct, text) {
    $("progress").hidden = false;
    $("progressFill").style.setProperty("--p", pct + "%");
    $("progressLabel").textContent = text || "";
  }

  async function sendChunk(id, i, blob) {
    var last = "server";
    for (var t = 0; t < 3; t++) {
      var r = await api("chunk?id=" + id + "&index=" + i, { body: blob });
      if (r.status === 200) return;
      last = r.data.error || "server";
      if (r.status !== 0 && r.status < 500) break; // الخطأ ليس مؤقتاً
      await new Promise(function (res) { setTimeout(res, 800 * (t + 1)); });
    }
    var err = new Error(last);
    err.code = last;
    throw err;
  }

  function setBusy(on) {
    busy = on;
    $("send").disabled = on;
    $("send").textContent = on ? "جارٍ الرفع..." : "رفع الملف";
  }

  $("form").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (busy) return;
    var msgBox = $("formMsg");
    showMsg(msgBox, "");

    var courseId = $("course").value;
    var number = parseInt($("number").value, 10);
    var title = $("title").value.trim();
    var label = $("label").value.trim();
    var file = $("file").files[0];

    if (!courseId || !(number >= 1 && number <= 999) || !title || !file) {
      showMsg(msgBox, "اختر المادة، واكتب رقم المحاضرة وعنوانها، واختر ملف PDF.");
      return;
    }
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") { showMsg(msgBox, ERR.not_pdf); return; }
    if (file.size > MAX) { showMsg(msgBox, ERR.too_big); return; }

    setBusy(true);
    var id = uuid();
    var total = Math.max(1, Math.ceil(file.size / CHUNK));
    try {
      progress(0, "بدأ الرفع");
      for (var i = 0; i < total; i++) {
        await sendChunk(id, i, file.slice(i * CHUNK, (i + 1) * CHUNK));
        progress(Math.round(((i + 1) / total) * 95), "تم رفع " + mb(Math.min(file.size, (i + 1) * CHUNK)) + " من " + mb(file.size));
      }
      var fin = await api("finish", { body: { id: id, chunks: total, courseId: courseId, number: number, title: title, label: label, filename: file.name } });
      if (fin.status !== 200) { var fe = new Error(fin.data.error); fe.code = fin.data.error || "server"; throw fe; }
      progress(100, "اكتمل الرفع");

      var wrap = document.createElement("span");
      wrap.appendChild(document.createTextNode("تم رفع الملف. "));
      var a = el("a", "", "افتح المحاضرة");
      a.href = "course.html?id=" + encodeURIComponent(courseId) + "#lec-" + number;
      wrap.appendChild(a);
      wrap.appendChild(document.createTextNode(" (قد يتأخر ظهوره للطلاب نصف دقيقة)."));
      showMsg(msgBox, wrap, true);
      MS.toast("تم رفع الملف");
      $("file").value = "";
      $("fileHint").textContent = "";
      $("label").value = "";
      autoLabel = false;
      refreshList();
    } catch (err) {
      await api("abort", { body: { id: id } });
      if (err.code === "bad_code" || err.code === "locked") { showMsg(msgBox, errText(err.code)); }
      else showMsg(msgBox, errText(err.code));
      $("progress").hidden = true;
    }
    setBusy(false);
  });

  /* ---------- قائمة المرفوعات والحذف ---------- */
  async function refreshList() {
    var box = $("list");
    var r = await api("uploads", { method: "GET" });
    box.textContent = "";
    var items = (r.data && r.data.items) || [];
    if (!items.length) {
      var empty = el("div", "empty");
      empty.appendChild(el("strong", "", "لم تُرفع ملفات من هنا بعد"));
      box.appendChild(empty);
      return;
    }
    items.slice().reverse().forEach(function (it) {
      var c = MS.course(it.courseId);
      var row = el("div", "up-item");
      var main = el("div", "up-item-main");
      main.appendChild(el("div", "up-item-name", (c ? c.nameAr : it.courseId) + " — محاضرة " + it.number));
      var sub = el("div", "up-item-sub up-ltr", it.title + " / " + it.label);
      main.appendChild(sub);
      main.appendChild(el("div", "up-item-sub", mb(it.size) + " · " + it.added));
      row.appendChild(main);

      var del = el("button", "btn btn-secondary btn-sm up-del", "حذف");
      del.type = "button";
      del.addEventListener("click", async function () {
        if (!window.confirm("حذف هذا الملف نهائياً من الموقع؟")) return;
        del.disabled = true;
        var d = await api("delete", { body: { id: it.id } });
        if (d.status === 200) MS.toast("تم حذف الملف");
        else MS.toast(errText(d.data.error));
        refreshList();
      });
      row.appendChild(del);
      box.appendChild(row);
    });
  }

  /* دخول تلقائي بالرمز المحفوظ على هذا الجهاز */
  var saved = savedCode();
  if (saved) login(saved, true);
})();
