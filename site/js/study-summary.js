/* MEDIXA Step 44: read-only per-lecture study summary for course.html.
   Reads the same local keys the PDF reader writes (see BACKUP-COVERAGE.md). Never writes, never creates keys.
   Unreadable or corrupted values are skipped. */
(function () {
  "use strict";
  var DUE = function (c, now) { return !Number(c && c.due) || Number(c.due) <= now; };
  function get(k) { try { var raw = localStorage.getItem(k); return raw === null ? null : JSON.parse(raw); } catch (e) { return null; } }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }

  /* url: the same string the course page passes to pdf-notes.html?file= */
  function forFile(url, now) {
    now = now || Date.now();
    var abs; try { abs = new URL(url, location.href).href; } catch (e) { return null; }
    var ink = arr(get("medixa.pdf.annotations.v1:" + abs)).filter(function (s) { return s && Number.isInteger(s.page) && s.page > 0; });
    var study = get("medixa.study.v1:" + abs); if (!study || typeof study !== "object" || Array.isArray(study)) study = {};
    var cards = arr(study.cards), notes = arr(study.notes).length;
    var split = get("medixa.v85." + url + ".splitNotes");
    if (split && typeof split === "object" && !Array.isArray(split)) Object.keys(split).forEach(function (k) { if (typeof split[k] === "string" && split[k].trim()) notes++; });
    var masks = arr(get("medixa.occlusion.v1:" + abs)).length + arr(study.masks).length;
    var last = 0;
    cards.forEach(function (c) { last = Math.max(last, num(c && c.lastReviewed)); });
    var ws = get("medixa.v86.workspace:" + url); if (ws && typeof ws === "object") last = Math.max(last, num(ws.updatedAt));
    var ses = get("medixa.v88.session:" + abs); if (ses && typeof ses === "object") last = Math.max(last, num(ses.savedAt));
    var pages = {}; ink.forEach(function (s) { pages[s.page] = 1; });
    var out = {
      strokes: ink.length, inkPages: Object.keys(pages).length,
      cards: cards.length, due: cards.filter(function (c) { return c && typeof c === "object" && DUE(c, now); }).length,
      notes: notes, masks: masks, last: last > now + 864e5 ? 0 : last
    };
    out.empty = !out.strokes && !out.cards && !out.notes && !out.masks;
    return out;
  }

  /* Small DOM block: each label is its own text node so i18n.js can translate it. */
  function element(url, opts) {
    var s = forFile(url); if (!s || s.empty) return null;
    var box = document.createElement("p"); box.className = "file-study";
    function part(label, value) {
      var span = document.createElement("span"); span.className = "fs-item";
      var b = document.createElement("b"); b.textContent = value; span.appendChild(b);
      span.appendChild(document.createTextNode(" "));
      var l = document.createElement("span"); l.textContent = label; span.appendChild(l);
      box.appendChild(span);
    }
    if (s.cards) part("بطاقات", String(s.cards));
    if (s.notes) part("ملاحظات", String(s.notes));
    if (s.strokes) part("رسومات", String(s.strokes));
    if (s.masks) part("أقنعة", String(s.masks));
    if (s.last) {
      var t = document.createElement("time"); t.className = "fs-item";
      t.setAttribute("datetime", new Date(s.last).toISOString());
      var l = document.createElement("span"); l.textContent = "آخر دراسة"; t.appendChild(l);
      t.appendChild(document.createTextNode(" " + new Date(s.last).toLocaleDateString((opts && opts.locale) || "ar-u-nu-latn", { day: "numeric", month: "short" })));
      box.appendChild(t);
    }
    if (s.due) {
      var d = document.createElement("span"); d.className = "fs-item fs-due";
      var dl = document.createElement("span"); dl.textContent = "للمراجعة الآن"; d.appendChild(dl);
      d.appendChild(document.createTextNode(": " + s.due));
      box.appendChild(d);
    }
    return box;
  }
  window.MedixaStudySummary = { forFile: forFile, element: element };
})();
