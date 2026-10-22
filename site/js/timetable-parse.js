/* js/timetable-parse.js — تحويل نص جدول المحاضرات (من PDF نصي أو نص ملصوق أو نص OCR) إلى صفوف قابلة للتعديل.
   استنتاج فقط: الصفوف تظهر في المعاينة ليراجعها المشرف ويصححها قبل الاعتماد. لا يرسل شيئاً إلى أي مكان.
   يعمل في المتصفح (window.TTParse) وفي Node للفحص (module.exports). */
(function (root) {
  "use strict";
  // getDay: 0 = الأحد ... 6 = السبت
  var DAY_WORDS = [
    [0, ["الأحد", "الاحد", "sunday", "sun", "یکشنبه", "يكشنبه"]],
    [1, ["الاثنين", "الإثنين", "الأثنين", "monday", "mon", "دوشنبه"]],
    [2, ["الثلاثاء", "الثلاثا", "ثلاثاء", "tuesday", "tue", "tues", "سه‌شنبه", "سه شنبه", "سهشنبه"]],
    [3, ["الأربعاء", "الاربعاء", "wednesday", "wed", "چهارشنبه"]],
    [4, ["الخميس", "thursday", "thu", "thur", "thurs", "پنجشنبه", "پنج‌شنبه"]],
    [5, ["الجمعة", "الجمعه", "friday", "fri", "جمعه"]],
    [6, ["السبت", "saturday", "sat", "شنبه"]]
  ];
  var DIGITS = "٠١٢٣٤٥٦٧٨٩", FDIGITS = "۰۱۲۳۴۵۶۷۸۹";
  function latin(s) {
    return String(s || "").replace(/[٠-٩]/g, function (c) { return DIGITS.indexOf(c); }).replace(/[۰-۹]/g, function (c) { return FDIGITS.indexOf(c); });
  }
  function clean(s) { return latin(s).replace(/[‏‎‪-‮]/g, "").replace(/\s+/g, " ").trim(); }

  function dayOf(text) {
    var t = " " + clean(text).toLowerCase().replace(/[.,:؛،|()\[\]]/g, " ") + " ";
    // الأطول أولاً حتى لا تطابق «شنبه» داخل «دوشنبه»
    var best = null, len = 0;
    DAY_WORDS.forEach(function (d) {
      d[1].forEach(function (w) {
        var short = w.length <= 4 && /^[a-z]+$/.test(w);
        var hit = short ? t.indexOf(" " + w + " ") !== -1 : t.indexOf(w) !== -1;
        if (hit && w.length > len) { best = d[0]; len = w.length; }
      });
    });
    return best;
  }

  // ساعات الدوام: 1–7 بلا صباح/مساء تعني بعد الظهر (1:00 = 13:00)
  function hour24(h, m, ampm) {
    h = +h; m = +(m || 0);
    if (ampm === "pm" && h < 12) h += 12;
    else if (ampm === "am" && h === 12) h = 0;
    else if (!ampm && h >= 1 && h <= 7) h += 12;
    if (h > 23 || m > 59) return null;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }
  var T = "(\\d{1,2})(?:\\s*[:.٫]\\s*(\\d{2}))?\\s*(am|pm|ص|م)?";
  var RANGE = new RegExp(T + "\\s*(?:-|–|—|to|إلى|الى|الی|تا)\\s*" + T, "i");
  function ap(x) { x = (x || "").toLowerCase(); return x === "ص" ? "am" : x === "م" ? "pm" : x; }
  function timeRange(text) {
    var m = clean(text).match(RANGE);
    if (!m) return null;
    // «9-10» بلا دقائق مقبول فقط إن كانت أرقام ساعات معقولة
    if (!m[2] && !m[5] && (+m[1] > 12 || +m[4] > 12)) return null;
    var b = ap(m[6]), a = ap(m[3]) || (b === "pm" && +m[1] <= +m[4] ? "pm" : "");
    var s = hour24(m[1], m[2], a), e = hour24(m[4], m[5], b);
    if (!s || !e) return null;
    if (e <= s) { var e2 = hour24(+m[4] + 12, m[5], "x"); if (e2 && e2 > s) e = e2; else return null; }
    return { start: s, end: e, text: m[0] };
  }

  var LECT = /((?:أ\.?\s?د\.?|ا\.?\s?د\.?|م\.?\s?د\.?|د\s?\.|دكتور|الدكتور|دكتورة|الدكتورة|prof\.?|dr\.?|professor|doctor|lecturer|استاد|دکتر)\s*[^،,|\-–\n]{2,40})/i;
  var ROOM = /((?:القاعة|قاعة|قاعه|القاعه|مختبر|المختبر|hall|room|lab|class|كلاس|سالن|کلاس)\s*[:#.]?\s*[\w؀-ۿ\-]{1,12})/i;

  /* نص خلية/سطر → مادة، عنوان، أستاذ، قاعة */
  function splitCell(text) {
    var t = clean(text), lecturer = "", room = "";
    var rm = t.match(ROOM); if (rm) { room = rm[1].trim(); t = t.replace(rm[1], " | "); }
    var lm = t.match(LECT); if (lm) { lecturer = lm[1].trim(); t = t.replace(lm[1], " "); }
    var parts = t.split(/\s*(?:\||\t|،|,|\s[-–—]\s|:)\s*/).map(function (x) { return x.trim(); }).filter(Boolean);
    return { subject: parts[0] || "", topic: parts.slice(1).join(" - "), lecturer: lecturer, room: room };
  }
  function row(day, tr, cell) {
    var c = splitCell(cell);
    return { repeat: "weekly", weekday: day, start: tr ? tr.start : "", end: tr ? tr.end : "", subject: c.subject.slice(0, 80), topic: c.topic.slice(0, 140), lecturer: c.lecturer.slice(0, 60), room: c.room.slice(0, 40) };
  }

  /* نص حر: سطر لكل محاضرة، واليوم من السطر نفسه أو من آخر عنوان يوم */
  function parseText(text) {
    var out = [], day = null;
    String(text || "").split(/\r?\n/).forEach(function (raw) {
      var line = clean(raw.replace(/^[#>*\-\s|]+/, "")).replace(/\|+\s*$/, "");
      if (!line) return;
      var d = dayOf(line), tr = timeRange(line);
      if (d !== null) day = d;
      if (!tr) return;
      var rest = line.replace(tr.text, " ");
      DAY_WORDS.forEach(function (x) { if (x[0] === d) x[1].forEach(function (w) { rest = rest.replace(new RegExp(w.length <= 4 && /^[a-z]+$/.test(w) ? "\\b" + w + "\\b" : w, "gi"), " "); }); });
      rest = rest.replace(/^[\s|:،,\-–—]+|[\s|:،,\-–—]+$/g, "");
      if (!rest || !/[a-z؀-ۿ]/i.test(rest)) return;
      out.push(row(day, tr, rest));
    });
    return out;
  }

  /* عناصر نص PDF بمواضعها [{str, x, y}] → جدول: أيام في الأعلى أو أيام في الجانب، والأوقات في المحور الآخر */
  function parseItems(items) {
    var list = (items || []).filter(function (i) { return i && clean(i.str); }).map(function (i) { return { s: clean(i.str), x: +i.x, y: +i.y, w: +i.w || 0 }; });
    if (!list.length) return [];
    list.sort(function (a, b) { return b.y - a.y || a.x - b.x; });
    var rows = [], tol = 4;
    list.forEach(function (it) {
      var r = rows.length ? rows[rows.length - 1] : null;
      if (r && Math.abs(r.y - it.y) <= tol) r.items.push(it); else rows.push({ y: it.y, items: [it] });
    });
    rows.forEach(function (r) { r.items.sort(function (a, b) { return a.x - b.x; }); r.text = r.items.map(function (i) { return i.s; }).join(" "); });
    var cx = function (i) { return i.x + i.w / 2; };
    function nearest(cols, x) { var best = null, dist = Infinity; cols.forEach(function (c) { var d = Math.abs(c.x - x); if (d < dist) { dist = d; best = c; } }); return best; }

    // (أ) صف عناوين فيه 3 أيام فأكثر
    var hi = -1, cols = [];
    rows.some(function (r, i) {
      var c = r.items.map(function (it) { return { x: cx(it), day: dayOf(it.s) }; }).filter(function (c) { return c.day !== null; });
      if (c.length >= 3) { hi = i; cols = c; return true; } return false;
    });
    var out = [];
    if (hi >= 0) {
      var cur = null;
      rows.slice(hi + 1).forEach(function (r) {
        var trItem = null, tr = null;
        r.items.forEach(function (it) { var t = timeRange(it.s); if (t && !tr) { tr = t; trItem = it; } });
        if (!tr) { var t2 = timeRange(r.text); if (t2) tr = t2; }
        if (tr) cur = { tr: tr, cells: {} };
        if (!cur) return;
        r.items.forEach(function (it) {
          if (it === trItem || timeRange(it.s)) return;
          var c = nearest(cols, cx(it)); if (!c) return;
          cur.cells[c.day] = (cur.cells[c.day] ? cur.cells[c.day] + " " : "") + it.s;
        });
        if (tr) out.push(cur);
      });
      var res = [];
      out.forEach(function (o) { Object.keys(o.cells).forEach(function (d) { if (/[a-z؀-ۿ]/i.test(o.cells[d])) res.push(row(+d, o.tr, o.cells[d])); }); });
      return res;
    }
    // (ب) صف عناوين فيه وقتان فأكثر، والأيام في بداية الصفوف
    var th = -1, tcols = [];
    rows.some(function (r, i) {
      var c = r.items.map(function (it) { return { x: cx(it), tr: timeRange(it.s) }; }).filter(function (c) { return c.tr; });
      if (c.length >= 2) { th = i; tcols = c; return true; } return false;
    });
    if (th >= 0) {
      var day = null, res2 = [], cells = null;
      var flush = function () { if (cells) Object.keys(cells).forEach(function (k) { if (/[a-z؀-ۿ]/i.test(cells[k])) res2.push(row(day, tcols[+k].tr, cells[k])); }); };
      rows.slice(th + 1).forEach(function (r) {
        var d = null, dItem = null;
        r.items.forEach(function (it) { var x = dayOf(it.s); if (x !== null && d === null && it.s.length <= 14) { d = x; dItem = it; } });
        if (d !== null) { flush(); day = d; cells = {}; }
        if (!cells) return;
        r.items.forEach(function (it) {
          if (it === dItem) return;
          var best = -1, dist = Infinity; tcols.forEach(function (c, k) { var dd = Math.abs(c.x - cx(it)); if (dd < dist) { dist = dd; best = k; } });
          cells[best] = (cells[best] ? cells[best] + " " : "") + it.s;
        });
      });
      flush();
      return res2;
    }
    // (ج) بلا شبكة واضحة: سطر بسطر
    return parseText(rows.map(function (r) { return r.text; }).join("\n"));
  }

  var api = { parseText: parseText, parseItems: parseItems, dayOf: dayOf, timeRange: timeRange, splitCell: splitCell };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.TTParse = api;
})(typeof window !== "undefined" ? window : this);
