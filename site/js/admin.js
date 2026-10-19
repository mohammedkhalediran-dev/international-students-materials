/* js/admin.js — مركز الإدارة (Step 53). يعمل على بيانات Medixa الحقيقية فقط عبر /api/auth/admin/*.
   الصلاحيات تُفحص في الخادم لكل طلب؛ هذه الصفحة لا تخزّن صلاحيات ولا بيانات حسابات في المتصفح
   (localStorage هنا لتفضيل المظهر فقط). لا تظهر رسالة نجاح قبل تأكيد الخادم. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var api = function (m, p, b) { return MSAuth.api(m, p, b); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function icon(n) { return '<svg aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  var NUM = new Intl.NumberFormat("ar-u-nu-latn");
  var DT = new Intl.DateTimeFormat("ar-u-nu-latn", { day: "numeric", month: "short", year: "numeric" });
  var DTT = new Intl.DateTimeFormat("ar-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  var ROLES = {
    admin: { name: "مشرف", color: "purple", icon: "shield", desc: "إدارة المنصة وفريق العمل", from: "ADMIN_EMAILS",
      can: ["هذه الصفحة: الحسابات والأدوار والإيقاف والتصدير والسجل", "رفع المحاضرات والاختبارات من upload.html بلا رمز", "نشر التبليغات وحذفها", "مزامنة تقدّمه مثل أي حساب"], cannot: [] },
    student: { name: "طالب", color: "blue", icon: "users", desc: "التعلّم والوصول للمحتوى (الدور الافتراضي لكل حساب جديد)", from: "student",
      can: ["تصفّح مواد كورسه وأدوات الدراسة", "مزامنة المفضلة والتقدّم بين أجهزته", "الإشعارات وتخصيصها"], cannot: ["لا رفع ولا تبليغات ولا إدارة"] },
    uploader: { name: "رافع ملفات", color: "green", icon: "up", desc: "تنظيم المحتوى التعليمي", from: "uploader",
      can: ["رفع المحاضرات والاختبارات وأسئلة السنوات من upload.html بلا رمز", "كل ما يستطيعه الطالب"], cannot: ["لا تبليغات", "لا إدارة حسابات"] },
    rep: { name: "ممثل الدفعة", color: "amber", icon: "bell", desc: "تنسيق مواد الدفعة وتبليغاتها", from: "rep",
      can: ["رفع الملفات من upload.html بلا رمز", "نشر التبليغات وحذفها من announce.html (تصل كإشعار)", "كل ما يستطيعه الطالب"], cannot: ["لا إدارة حسابات"] }
  };
  var SEM = { 1: "الكورس الأول", 2: "الكورس الثاني", 3: "الكورس الثالث" };
  var ACTION = { role: "تغيير الدور", status: "تغيير الحالة", semester: "تغيير الكورس", export: "تصدير CSV", push_test: "إشعار اختبار", timetable_add: "إضافة محاضرة للجدول", timetable_edit: "تعديل محاضرة في الجدول", timetable_delete: "حذف محاضرة من الجدول", timetable_publish: "نشر الجدول", timetable_unpublish: "إخفاء محاضرة من الجدول", timetable_cancel: "إلغاء محاضرة بتاريخ", timetable_move: "نقل محاضرة", timetable_restore: "إرجاع موعد محاضرة", timetable_import: "استيراد الجدول" };
  var ERR = {
    self_locked: "لا يمكنك إيقاف حسابك أنت من هذه الصفحة.", last_admin: "هذا آخر مشرف فعّال؛ لا يمكن إيقافه.",
    admin_locked: "دور المشرف مقفل: يُحدَّد من ADMIN_EMAILS في Cloudflare.", bad_role: "هذا الدور غير مسموح.",
    bad_semester: "اختر كورساً صحيحاً.", not_found: "الحساب غير موجود (ربما حُذف).", forbidden: "انتهت صلاحية المشرف لهذه الجلسة.",
    unauthorized: "انتهت الجلسة. سجّل الدخول من جديد.", network: "تعذّر الاتصال بالخادم. تحقّق من الإنترنت ثم أعد المحاولة."
  };
  function errText(r) { var e = (r && r.data && r.data.error) || (r && r.status === 0 ? "network" : ""); return ERR[e] || "تعذّر تنفيذ الطلب (" + (r ? r.status : "?") + "). أعد المحاولة."; }

  var me = null, stats = null, state = { page: 1, per: matchMedia("(max-width: 620px)").matches ? 10 : 20 }, list = { users: [], pages: 1, count: 0 }, logPage = 1;
  var opener = null;

  /* ---------- أدوات عامة ---------- */
  var toastTimer;
  function toast(text, bad) { var t = $("toast"); clearTimeout(toastTimer); t.textContent = text; t.className = "toast" + (bad ? " err" : ""); t.hidden = false; toastTimer = setTimeout(function () { t.hidden = true; }, 4200); }
  function busy(btn, on) { btn.disabled = on; if (on) btn.setAttribute("aria-busy", "true"); else btn.removeAttribute("aria-busy"); }
  function initials(n) { return String(n || "؟").trim().split(/\s+/).slice(0, 2).map(function (x) { return x[0]; }).join(" "); }
  function pill(color, text, dot) { return '<span class="pill ' + color + '">' + (dot ? '<span class="dot"></span>' : "") + esc(text) + "</span>"; }
  function roleBadge(r) { var x = ROLES[r] || ROLES.student; return pill(x.color, x.name); }
  function statusBadge(u) { return u.active ? pill("green", "نشط", true) : pill("red", "موقوف", true); }
  function ago(ms) {
    if (!ms) return '<span class="muted">لم يُسجَّل</span>';
    var d = Date.now() - ms, day = 864e5;
    if (d < 36e5) return "قبل أقل من ساعة";
    if (d < day) return "اليوم";
    if (d < 2 * day) return "أمس";
    if (d < 7 * day) return "قبل " + NUM.format(Math.floor(d / day)) + " أيام";
    return '<span class="num">' + esc(DT.format(ms)) + "</span>";
  }
  function openDialog(id, from) { opener = from || document.activeElement; $(id).showModal(); }
  document.addEventListener("close", function (e) { if (e.target.tagName === "DIALOG" && opener && document.contains(opener)) { opener.focus(); } }, true);

  /* ---------- المظهر والقائمة ---------- */
  function setTheme(light) {
    document.documentElement.setAttribute("data-admin-theme", light ? "light" : "dark");
    $("themeToggle").setAttribute("aria-pressed", String(light));
    try { localStorage.setItem("ms.admin.theme", light ? "light" : "dark"); } catch (e) { /* لا شيء */ }
  }
  $("themeToggle").setAttribute("aria-pressed", String(document.documentElement.getAttribute("data-admin-theme") === "light"));
  $("themeToggle").addEventListener("click", function () { setTheme(document.documentElement.getAttribute("data-admin-theme") !== "light"); });
  function menu(open) {
    $("sidebar").classList.toggle("open", open); $("scrim").hidden = !open; $("menuToggle").setAttribute("aria-expanded", String(open));
    if (open) { var f = document.querySelector(".navbtn.active"); if (f) f.focus(); }
  }
  $("menuToggle").addEventListener("click", function () { menu(!$("sidebar").classList.contains("open")); });
  $("scrim").addEventListener("click", function () { menu(false); $("menuToggle").focus(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && $("sidebar").classList.contains("open")) { menu(false); $("menuToggle").focus(); } });

  var TITLES = { accounts: "إدارة الحسابات", roles: "الأدوار والصلاحيات", notifications: "مركز الإشعارات", activity: "سجل التغييرات" };
  function view(id, push) {
    if (!TITLES[id]) id = "accounts";
    document.querySelectorAll(".view").forEach(function (v) { v.hidden = v.id !== id; });
    document.querySelectorAll(".navbtn").forEach(function (b) { var on = b.getAttribute("data-view") === id; b.classList.toggle("active", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    $("crumbTitle").textContent = TITLES[id];
    document.title = TITLES[id] + " | Medixa";
    menu(false);
    if (push !== false && location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    if (id === "notifications") loadPush();
    if (id === "activity") loadAudit(1);
    if (id === "roles") renderRoles();
    window.scrollTo({ top: 0 });
  }

  /* ---------- الإحصاءات ---------- */
  function loadStats() {
    return api("GET", "auth/admin/stats").then(function (r) {
      if (r.status !== 200) return;
      stats = r.data.stats;
      $("navCount").textContent = NUM.format(stats.total);
      $("totalPill").textContent = NUM.format(stats.total) + " حساباً";
      var t = stats.total || 1, cur = $("statusFilter").value;
      var cards = [
        ["إجمالي الحسابات", stats.total, "كل الأدوار والكورسات", "users", "", ""],
        ["الحسابات النشطة", stats.active, Math.round(stats.active / t * 100) + "% مفعّلة، لا تعني متصلة", "check", "green", "active"],
        ["دخلوا خلال 7 أيام", stats.recent, "حسب آخر تسجيل دخول", "login", "amber", null],
        ["الحسابات الموقوفة", stats.suspended, stats.suspended ? "يمكن إعادة تفعيلها" : "لا يوجد حساب موقوف", "stop", "red", "suspended"]
      ];
      $("stats").innerHTML = cards.map(function (c) {
        var inner = '<div class="stat-top"><span>' + esc(c[0]) + '</span><span class="stat-icon">' + icon(c[3]) + "</span></div><strong>" + NUM.format(c[1]) + "</strong><small>" + esc(c[2]) + '</small><div class="track"><i style="width:' + Math.round(c[1] / t * 100) + '%"></i></div>';
        return c[5] === null ? '<div class="stat ' + c[4] + '">' + inner + "</div>"
          : '<button type="button" class="stat ' + c[4] + '" data-stat="' + c[5] + '" aria-pressed="' + (cur === c[5] && c[5] !== "" ? "true" : "false") + '" aria-label="عرض ' + esc(c[0]) + '">' + inner + "</button>";
      }).join("");
      renderRoles();
    });
  }

  /* ---------- قائمة الحسابات ---------- */
  function query(extra) {
    var q = new URLSearchParams();
    var s = $("search").value.trim(); if (s) q.set("q", s);
    [["role", "roleFilter"], ["status", "statusFilter"], ["sem", "semFilter"]].forEach(function (p) { if ($(p[1]).value) q.set(p[0], $(p[1]).value); });
    if (extra) Object.keys(extra).forEach(function (k) { q.set(k, extra[k]); });
    return q;
  }
  var reqId = 0;
  function loadList() {
    var id = ++reqId;
    $("rows").innerHTML = new Array(4).join('<tr class="skel" aria-hidden="true"><td><i style="width:60%"></i></td><td><i></i></td><td class="stagecol"><i></i></td><td><i></i></td><td><i></i></td><td><i></i></td></tr>') ;
    $("listState").hidden = true; $("results").textContent = "جارٍ التحميل…";
    return api("GET", "auth/admin/users?" + query({ page: state.page, per: state.per })).then(function (r) {
      if (id !== reqId) return;
      if (r.status !== 200) {
        $("rows").innerHTML = ""; $("pages").innerHTML = ""; $("results").textContent = "";
        showState("error", errText(r), "إعادة المحاولة", loadList);
        return;
      }
      list = r.data; state.page = r.data.page;
      renderRows();
    });
  }
  function showState(kind, text, btn, fn) {
    var s = $("listState"); s.hidden = false; s.className = "state" + (kind === "error" ? " error" : "");
    s.innerHTML = esc(text) + (btn ? '<br><button type="button" class="btn">' + esc(btn) + "</button>" : "");
    if (btn) s.querySelector("button").addEventListener("click", fn);
  }
  function renderRows() {
    var rows = list.users || [];
    $("rows").innerHTML = rows.map(function (u) {
      var self = u.id === list.me, r = ROLES[u.role] || ROLES.student;
      var lockStatus = self ? "حسابك أنت محمي من الإيقاف هنا" : (u.role === "admin" && u.active && list.activeAdmins <= 1 ? "آخر مشرف فعّال محمي" : "");
      return '<tr><td class="c-person"><button type="button" class="person personbtn" data-action="detail" data-id="' + u.id + '"><span class="avatar ' + r.color + '">' + esc(initials(u.name)) + "</span><span><strong>" + esc(u.name) + (self ? ' <span class="you">(أنت)</span>' : "") + '</strong><span class="email">' + esc(u.email) + "</span></span></button></td>" +
        '<td class="c-last">' + ago(u.lastLogin) + "</td>" +
        '<td class="stagecol"><span class="muted">' + esc(u.semester ? SEM[u.semester] : "غير محدد") + "</span></td>" +
        "<td>" + roleBadge(u.role) + "</td><td>" + statusBadge(u) + "</td>" +
        '<td class="c-actions"><div class="rowactions">' +
        '<button type="button" class="iconbtn" data-action="detail" data-id="' + u.id + '" aria-label="تفاصيل ' + esc(u.name) + '" title="تفاصيل الحساب">' + icon("eye") + "</button>" +
        '<button type="button" class="iconbtn" data-action="edit" data-id="' + u.id + '" aria-label="تعديل ' + esc(u.name) + '" title="تعديل الحساب">' + icon("edit") + "</button>" +
        '<button type="button" class="iconbtn ' + (u.active ? "stop" : "go") + '" data-action="status" data-id="' + u.id + '"' + (lockStatus ? " disabled" : "") +
        ' aria-label="' + (u.active ? "إيقاف " : "إعادة تفعيل ") + esc(u.name) + '" title="' + esc(lockStatus || (u.active ? "إيقاف الحساب" : "إعادة التفعيل")) + '">' + icon(u.active ? "stop" : "check") + "</button>" +
        "</div></td></tr>";
    }).join("");
    var filtered = query().toString() !== "";
    if (!rows.length) {
      if (filtered) showState("empty", "لا توجد حسابات تطابق البحث.", "مسح الفلاتر وإظهار الجميع", resetFilters);
      else showState("empty", "لا توجد حسابات بعد. تُنشأ الحسابات عند أول دخول بحساب Google.");
    } else $("listState").hidden = true;
    var from = (list.page - 1) * list.per + 1, to = Math.min(list.page * list.per, list.count);
    $("results").textContent = list.count ? "عرض " + NUM.format(from) + "–" + NUM.format(to) + " من " + NUM.format(list.count) + " حساباً" + (filtered ? " (بعد التصفية)" : "") : "لا توجد نتائج";
    renderPages($("pages"), list.page, list.pages, function (p) { state.page = p; loadList(); });
  }
  function renderPages(box, page, pages, go) {
    if (pages <= 1) { box.innerHTML = ""; return; }
    var nums = [];
    for (var i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== "…") nums.push("…");
    box.innerHTML = '<button type="button" data-p="' + (page - 1) + '"' + (page === 1 ? " disabled" : "") + ' aria-label="الصفحة السابقة">›</button>' +
      nums.map(function (n) { return n === "…" ? '<span class="gap" aria-hidden="true">…</span>' : '<button type="button" data-p="' + n + '"' + (n === page ? ' class="current" aria-current="page"' : "") + ' aria-label="الصفحة ' + n + '">' + n + "</button>"; }).join("") +
      '<button type="button" data-p="' + (page + 1) + '"' + (page >= pages ? " disabled" : "") + ' aria-label="الصفحة التالية">‹</button>';
    box.onclick = function (e) { var b = e.target.closest("button[data-p]"); if (b && !b.disabled) go(Number(b.getAttribute("data-p"))); };
  }
  function resetFilters() { ["search", "roleFilter", "statusFilter", "semFilter"].forEach(function (id) { $(id).value = ""; }); state.page = 1; loadList(); loadStats(); }
  var debounce;
  $("search").addEventListener("input", function () { clearTimeout(debounce); debounce = setTimeout(function () { state.page = 1; loadList(); }, 250); });
  ["roleFilter", "statusFilter", "semFilter"].forEach(function (id) { $(id).addEventListener("change", function () { state.page = 1; loadList(); if (id === "statusFilter") loadStats(); }); });
  $("resetFilters").addEventListener("click", resetFilters);
  $("stats").addEventListener("click", function (e) {
    var b = e.target.closest("[data-stat]"); if (!b) return;
    ["search", "roleFilter", "semFilter"].forEach(function (id) { $(id).value = ""; });
    $("statusFilter").value = b.getAttribute("data-stat"); state.page = 1; loadList(); loadStats();
  });

  function findUser(id) { return (list.users || []).filter(function (u) { return u.id === id; })[0]; }
  $("rows").addEventListener("click", function (e) {
    var b = e.target.closest("[data-action]"); if (!b || b.disabled) return;
    var id = Number(b.getAttribute("data-id"));
    ({ detail: detail, edit: edit, status: askStatus })[b.getAttribute("data-action")](id, b);
  });

  /* ---------- التفاصيل ---------- */
  var detailId = null;
  function detail(id, from) {
    detailId = id;
    $("detailBody").innerHTML = '<p class="state">جارٍ التحميل…</p>';
    openDialog("detail", from);
    api("GET", "auth/admin/user?id=" + id).then(function (r) {
      if (detailId !== id) return;
      if (r.status !== 200) { $("detailBody").innerHTML = '<p class="state error">' + esc(errText(r)) + "</p>"; return; }
      var u = r.data.user, c = (ROLES[u.role] || ROLES.student).color;
      var rows = [
        ["البريد الإلكتروني", '<bdi class="ltr num">' + esc(u.email) + "</bdi>"],
        ["ربط الحساب", pill("green", "Google", true)],
        ["الدور", roleBadge(u.role)], ["الحالة", statusBadge(u)],
        ["الكورس", esc(u.semester ? SEM[u.semester] : "غير محدد")],
        ["تاريخ الإنشاء", '<span class="num">' + esc(DT.format(u.created)) + "</span>"],
        ["آخر دخول", u.lastLogin ? '<span class="num">' + esc(DTT.format(u.lastLogin)) + "</span>" : "لم يُسجَّل"],
        ["جلسات قائمة", '<span class="num">' + NUM.format(u.sessions) + "</span>"],
        ["أجهزة مفعّل عليها الإشعارات", '<span class="num">' + NUM.format(u.devices) + "</span>"],
        ["المفضلة / المحاضرات المقروءة", '<span class="num">' + NUM.format(u.favorites) + " / " + NUM.format(u.read) + "</span>"]
      ];
      $("detailBody").innerHTML = '<div class="person" style="margin-bottom:16px"><span class="avatar ' + c + '">' + esc(initials(u.name)) + "</span><div><strong>" + esc(u.name) + "</strong><small>" + (u.id === list.me ? "حسابك" : "حساب Medixa") + "</small></div></div>" +
        rows.map(function (x) { return '<div class="info-row"><span class="muted">' + x[0] + "</span><span>" + x[1] + "</span></div>"; }).join("");
    });
  }
  $("detailEdit").addEventListener("click", function () { var id = detailId; $("detail").close(); if (id) edit(id, document.querySelector('[data-action="edit"][data-id="' + id + '"]')); });

  /* ---------- التعديل ---------- */
  var editing = null;
  function edit(id, from) {
    var u = findUser(id); if (!u) return;
    editing = u;
    $("editorTitle").textContent = "تعديل حساب " + u.name;
    $("nameInput").value = u.name; $("emailInput").value = u.email;
    var admin = u.role === "admin";
    $("roleInput").value = u.role; $("roleInput").disabled = admin; $("roleHint").hidden = !admin;
    $("semInput").value = u.semester ? String(u.semester) : "";
    ["roleErr", "semErr", "formError"].forEach(function (k) { $(k).textContent = ""; });
    $("semInput").removeAttribute("aria-invalid");
    busy($("saveBtn"), false);
    openDialog("editor", from);
  }
  $("userForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var u = editing; if (!u) return;
    var body = { id: u.id }, role = $("roleInput").value, sem = $("semInput").value;
    $("semErr").textContent = ""; $("formError").textContent = "";
    if (u.role !== "admin" && role !== u.role) body.role = role;
    if (sem && Number(sem) !== u.semester) body.semester = Number(sem);
    if (!sem && u.semester) { $("semErr").textContent = "اختر كورساً."; $("semInput").setAttribute("aria-invalid", "true"); $("semInput").focus(); return; }
    if (Object.keys(body).length === 1) { $("formError").textContent = "لم تغيّر شيئاً."; return; }
    var send = function () { save(body, $("saveBtn"), $("formError"), function () { $("editor").close(); }); };
    if (body.role) {
      var from = ROLES[u.role].name, to = ROLES[body.role].name;
      var note = body.role === "student" ? "سيفقد صلاحيات الرفع" + (u.role === "rep" ? " والتبليغات" : "") + "." : body.role === "rep" ? "سيستطيع رفع الملفات ونشر التبليغات لكل الطلاب." : "سيستطيع رفع الملفات من صفحة الرفع.";
      confirmBox("تغيير الدور", "تغيير دور " + u.name + " من «" + from + "» إلى «" + to + "». " + note, "نعم، غيّر الدور", "primary", function (btn, err, done) {
        save(body, btn, err, function () { done(); $("editor").close(); });
      });
      return;
    }
    send();
  });
  function save(body, btn, errBox, onOk) {
    busy(btn, true); errBox.textContent = "";
    clearTimeout(toastTimer); $("toast").hidden = true; // لا تبقى رسالة نجاح سابقة أثناء طلب جديد
    return api("POST", "auth/user", body).then(function (r) {
      busy(btn, false);
      if (r.status !== 200) { errBox.textContent = errText(r); return; } // المدخلات تبقى كما هي لإعادة المحاولة
      onOk();
      toast("تم الحفظ في الخادم.");
      loadList(); loadStats(); loadLatest();
    });
  }

  /* ---------- الإيقاف وإعادة التفعيل ---------- */
  function askStatus(id, from) {
    var u = findUser(id); if (!u) return;
    opener = from;
    if (u.active) confirmBox("إيقاف الحساب", "إيقاف حساب " + u.name + " يُخرجه من كل أجهزته فوراً ويمنعه من الدخول. تبقى بياناته وتقدّمه محفوظة، ويمكن إعادة تفعيله لاحقاً.", "نعم، أوقف الحساب", "danger", run);
    else confirmBox("إعادة تفعيل الحساب", "إعادة تفعيل حساب " + u.name + "؟ سيستطيع الدخول من جديد ويجد بياناته كما هي.", "نعم، أعد التفعيل", "primary", run);
    function run(btn, err, done) { save({ id: u.id, active: !u.active }, btn, err, done); }
  }
  var confirmFn = null;
  function confirmBox(title, text, okText, kind, fn) {
    $("confirmTitle").textContent = title; $("confirmText").textContent = text; $("confirmError").textContent = "";
    $("confirmBtn").textContent = okText; $("confirmBtn").className = "btn " + kind; busy($("confirmBtn"), false);
    confirmFn = fn;
    var keep = opener; $("confirm").showModal(); opener = keep;
  }
  $("confirmBtn").addEventListener("click", function () { if (confirmFn) confirmFn($("confirmBtn"), $("confirmError"), function () { $("confirm").close(); }); });
  document.addEventListener("click", function (e) { var b = e.target.closest("[data-close]"); if (b) b.closest("dialog").close(); });

  /* ---------- التصدير ---------- */
  $("export").addEventListener("click", function () {
    var btn = $("export"); busy(btn, true);
    fetch("api/auth/admin/export?" + query(), { credentials: "same-origin" }).then(function (r) {
      if (r.status !== 200) return r.json().catch(function () { return {}; }).then(function (d) { throw { status: r.status, data: d }; });
      var name = ((r.headers.get("content-disposition") || "").match(/filename="([^"]+)"/) || [])[1] || "medixa-accounts.csv";
      return r.blob().then(function (b) {
        var url = URL.createObjectURL(b), a = document.createElement("a");
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        toast("جُهّز ملف CSV لنتائج التصفية الحالية."); loadLatest();
      });
    }).catch(function (r) { toast(errText(r && r.status !== undefined ? r : { status: 0, data: {} }), true); }).then(function () { busy(btn, false); });
  });

  /* ---------- إضافة مستخدم: غير مدعومة يدوياً (Google فقط) ---------- */
  $("add").addEventListener("click", function () {
    $("loginLink").value = new URL("login.html", location.href).href; $("copyResult").textContent = "";
    openDialog("addInfo", $("add"));
  });
  $("copyLink").addEventListener("click", function () {
    var v = $("loginLink").value;
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { $("copyResult").textContent = "نُسخ الرابط."; $("copyResult").className = "result ok"; },
      function () { $("loginLink").select(); $("copyResult").textContent = "حدّدتُ الرابط؛ انسخه يدوياً."; $("copyResult").className = "result"; });
  });

  /* ---------- الأدوار ---------- */
  function renderRoles() {
    $("roleCards").innerHTML = ["admin", "student", "uploader", "rep"].map(function (k) {
      var r = ROLES[k], n = stats ? stats.byRole[k] : null;
      return '<article class="panel rolecard"><div class="panelhead"><h3>' + icon(r.icon) + esc(r.name) + "</h3>" + pill(r.color, n == null ? "…" : NUM.format(n) + " حساب") + '</div><p class="desc">' + esc(r.desc) + ' · <code class="ltr">' + esc(r.from) + "</code></p><ul>" +
        r.can.map(function (p) { return "<li>" + icon("check") + esc(p) + "</li>"; }).join("") +
        r.cannot.map(function (p) { return '<li class="no">' + icon("x") + esc(p) + "</li>"; }).join("") + "</ul></article>";
    }).join("");
  }

  /* ---------- الإشعارات ---------- */
  var push = null;
  function loadPush() {
    $("pushConfigured").textContent = "…";
    api("GET", "auth/admin/push").then(function (r) {
      if (r.status !== 200) { $("pushConfigured").className = "pill red"; $("pushConfigured").textContent = "تعذّر التحقق"; return; }
      push = r.data;
      $("pushConfigured").className = "pill " + (push.configured ? "green" : "amber");
      $("pushConfigured").innerHTML = '<span class="dot"></span>' + (push.configured ? "مضبوطة" : "غير مضبوطة");
      $("pushTotal").textContent = push.table ? NUM.format(push.total) + " جهاز" : "الجدول غير موجود";
      $("pushPrefs").className = "pill " + (push.prefs ? "green" : "amber");
      $("pushPrefs").textContent = push.prefs ? "مفعّلة" : "تحتاج migrations/0004";
      $("pushBySem").innerHTML = [1, 2, 3].map(function (s) { return "<div><strong>" + NUM.format(push.bySemester[s] || 0) + "</strong><small>" + SEM[s] + "</small></div>"; }).join("");
      $("mineLine").textContent = push.mine ? "أجهزتك المشتركة: " + NUM.format(push.mine) + "." : "لا يوجد جهاز مشترك لحسابك. فعّل الإشعارات من القائمة الجانبية في الموقع وأنت مسجّل الدخول، ثم ارجع هنا.";
      $("pushTest").disabled = !push.configured || !push.mine;
      $("keysState").textContent = push.configured ? "المفاتيح مضبوطة على الخادم وتعمل. لا تحتاج إلى توليد مفاتيح." : "الإشعارات غير مضبوطة بعد: ولّد زوج مفاتيح وضعه في Cloudflare.";
      if (!push.configured) $("keysBox").open = true;
    });
  }
  $("pushTest").addEventListener("click", function () {
    var b = $("pushTest"), out = $("pushResult"); busy(b, true); out.textContent = ""; out.className = "result";
    api("POST", "auth/admin/push-test", {}).then(function (r) {
      busy(b, false);
      if (r.status !== 200) { out.className = "result err"; out.textContent = errText(r); return; }
      var d = r.data;
      if (d.sent > 0) { out.className = "result ok"; out.textContent = "قبلته خدمة الإشعارات لـ " + NUM.format(d.sent) + " من " + NUM.format(d.devices) + " من أجهزتك. يظهر عادة خلال ثوانٍ."; }
      else { out.className = "result err"; out.textContent = d.devices ? "لم تقبله خدمة الإشعارات لأي جهاز (فشل " + NUM.format(d.failed) + "، اشتراكات منتهية حُذفت " + NUM.format(d.removed) + ")." : "لا يوجد جهاز مشترك لحسابك."; }
      loadPush(); loadLatest();
    });
  });
  var SAMPLES = {
    lecture: { t: "محاضرة جديدة · المناعة الطبية", b: "المحاضرة 4: Innate immunity", a: ["افتح المحاضرة", "افتح الملف"] },
    group: { t: "محاضرات جديدة · المناعة الطبية", b: "المحاضرات 4، 5 و6", a: ["افتح المادة"] },
    announcement: { t: "تبليغ · موعد امتحان المناعة", b: "يوم الأحد القادم الساعة 9 صباحاً", a: ["اقرأ التبليغ"] }
  };
  function sample(k) {
    var s = SAMPLES[k]; $("pvTitle").textContent = s.t; $("pvBody").textContent = s.b;
    $("pvActs").innerHTML = s.a.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("");
    document.querySelectorAll("[data-sample]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-sample") === k)); });
  }
  document.querySelectorAll("[data-sample]").forEach(function (b) { b.addEventListener("click", function () { sample(b.getAttribute("data-sample")); }); });
  sample("lecture");
  // مفاتيح VAPID: بضغطة صريحة فقط، على الجهاز، ولا تُرسل لأي مكان
  function b64u(buf) { var s = "", a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  $("pushMake").addEventListener("click", function () {
    if (!window.crypto || !crypto.subtle) { $("keysState").textContent = "هذا المتصفح لا يدعم توليد المفاتيح."; return; }
    crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]).then(function (kp) {
      return Promise.all([crypto.subtle.exportKey("raw", kp.publicKey), crypto.subtle.exportKey("jwk", kp.privateKey)]);
    }).then(function (k) { $("pushPub").value = b64u(k[0]); $("pushPriv").value = k[1].d; $("pushOut").hidden = false; });
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]"); if (!b) return;
    var input = $(b.getAttribute("data-copy"));
    (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject()).then(function () { toast("نُسخ."); }, function () { input.select(); });
  });

  /* ---------- السجل ---------- */
  function describe(i) {
    var d = i.detail || {}, who = i.target_name ? "«" + i.target_name + "»" : "";
    if (i.action === "role") return ACTION.role + " " + who + (d.to ? " إلى " + ((ROLES[d.to] || {}).name || d.to) : "");
    if (i.action === "status") return (d.to === "suspended" ? "إيقاف" : "إعادة تفعيل") + " حساب " + who;
    if (i.action === "semester") return "تغيير كورس " + who + " إلى " + (SEM[d.to] || "—");
    if (i.action === "export") return "تصدير " + NUM.format(d.rows || 0) + " حساباً بصيغة CSV";
    if (i.action === "push_test") return "إشعار اختبار إلى أجهزة المشرف (" + NUM.format(d.sent || 0) + "/" + NUM.format(d.devices || 0) + ")";
    if (/^timetable_/.test(i.action)) return (ACTION[i.action] || i.action) + (d.subject ? " «" + d.subject + "»" : "") + (d.date ? " " + d.date : "") + (d.count != null ? " (" + NUM.format(d.count) + ")" : "");
    return i.action;
  }
  var RESULT = { ok: ["green", "تم"], refused: ["red", "مرفوض"], no_delivery: ["amber", "لم يُسلَّم"] };
  function loadAudit(p) {
    logPage = p || 1; $("logs").innerHTML = '<p class="state">جارٍ التحميل…</p>';
    api("GET", "auth/admin/audit?page=" + logPage).then(function (r) {
      if (r.status !== 200) { $("logs").innerHTML = ""; var s = document.createElement("div"); s.className = "state error"; s.textContent = errText(r); $("logs").appendChild(s); return; }
      var d = r.data; $("auditMissing").hidden = d.available;
      if (!d.items.length) { $("logs").innerHTML = '<p class="state">' + (d.available ? "لا توجد تغييرات مسجّلة بعد." : "السجل غير متاح.") + "</p>"; $("logResults").textContent = ""; $("logPages").innerHTML = ""; return; }
      $("logs").innerHTML = d.items.map(function (i) {
        var res = RESULT[i.result] || ["", i.result];
        return '<div class="log"><span class="avatar ' + (i.result === "ok" ? "" : "red") + '">' + icon(i.result === "ok" ? "clock" : "stop") + "</span><div><p>" + esc(describe(i)) + " " + pill(res[0], res[1]) + "</p><small>" + esc(i.actor_name) + ' · <span class="num">' + esc(DTT.format(i.at)) + "</span></small></div></div>";
      }).join("");
      $("logResults").textContent = NUM.format(d.total) + " تغييراً";
      renderPages($("logPages"), d.page, Math.max(1, Math.ceil(d.total / d.per)), loadAudit);
    });
  }
  function loadLatest() {
    api("GET", "auth/admin/audit?page=1").then(function (r) {
      var box = $("latestActivity");
      if (r.status !== 200) { box.textContent = "تعذّر التحميل."; return; }
      if (!r.data.available) { box.textContent = "السجل يحتاج تطبيق migrations/0005 على الخادم."; return; }
      var i = r.data.items[0];
      box.innerHTML = i ? '<span class="dot" style="color:var(--accent)"></span><strong>' + esc(describe(i)) + '</strong><span class="num" style="margin-right:auto;white-space:nowrap">' + esc(DTT.format(i.at)) + "</span>" : "لا توجد تغييرات مسجّلة بعد.";
    });
  }

  /* ---------- البداية: التحقق من المشرف في الخادم ---------- */
  function gate(title, text, btn, href) {
    document.querySelectorAll(".view").forEach(function (v) { v.hidden = true; });
    $("gate").hidden = false; $("gateTitle").textContent = title; $("gateText").textContent = text;
    $("gateBtn").textContent = btn; $("gateBtn").href = href;
  }
  document.querySelectorAll("[data-view]").forEach(function (b) { b.addEventListener("click", function () { if (me) view(b.getAttribute("data-view")); }); });
  api("GET", "auth/me").then(function (r) {
    if (r.status === 401) return gate("سجّل الدخول أولاً", "مركز الإدارة للمشرفين فقط.", "تسجيل الدخول", "login.html?next=admin.html");
    if (r.status !== 200) return gate("تعذّر التحقق", errText(r), "إعادة المحاولة", "admin.html");
    if (r.data.user.role !== "admin") return gate("هذه الصفحة للمشرفين فقط", "حسابك لا يملك صلاحية الإدارة.", "العودة إلى الموقع", "index.html");
    me = r.data.user;
    $("meName").textContent = me.name; $("meAvatar").textContent = initials(me.name);
    view(location.hash.slice(1) || "accounts", false);
    loadStats(); loadList(); loadLatest();
  });
})();
