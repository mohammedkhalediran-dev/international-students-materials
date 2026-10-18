/* js/notes-store.js — تخزين تعليقات الطالب على ملفات PDF: محلي أولاً (IndexedDB) ثم مزامنة مع الحساب.
   النموذج: لكل صفحة {items:{id:عنصر}, removed:{id:وقت الحذف}}. العنصر: قلم/تظليل (k:"p"|"h") أو نص (k:"t").
   الدمج: الاتحاد حسب المعرّف، والأحدث (t) يغلب، والمحذوف يبقى محذوفاً إلا إن عُدّل بعد الحذف.
   هذا نفس منطق supabase/schema.sql، فتتوافق النتيجة محلياً وفي الخادم.
   الخصوصية: التخزين المحلي مفصول بحساب الطالب (scope)، ويُمسح عند تسجيل الخروج. الزائر له نطاق "guest". */
(function () {
  "use strict";
  var MS = window.MS = window.MS || {};
  var DB_NAME = "medixa-notes", STORE = "kv";
  var PUSH_DELAY = 1500, POLL_MS = 15000;

  /* ---------- تخزين مفتاح/قيمة: IndexedDB وبديلها الذاكرة ---------- */
  var dbP = null, mem = {};
  function idb() {
    if (dbP) return dbP;
    dbP = new Promise(function (ok) {
      try {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
        req.onsuccess = function () { ok(req.result); };
        req.onerror = req.onblocked = function () { ok(null); };
      } catch (e) { ok(null); }
    });
    return dbP;
  }
  function tx(mode, fn) {
    return idb().then(function (db) {
      if (!db) return fn(null);
      return new Promise(function (ok, bad) {
        var t = db.transaction(STORE, mode), s = t.objectStore(STORE), out;
        out = fn(s);
        t.oncomplete = function () { ok(out instanceof IDBRequest ? out.result : out); };
        t.onerror = t.onabort = function () { bad(t.error); };
      });
    });
  }
  function kvGet(k) {
    return tx("readonly", function (s) { return s ? s.get(k) : (mem[k] === undefined ? undefined : JSON.parse(mem[k])); });
  }
  function kvSet(k, v) {
    return tx("readwrite", function (s) { if (s) s.put(v, k); else mem[k] = JSON.stringify(v); });
  }
  function kvDel(k) {
    return tx("readwrite", function (s) { if (s) s.delete(k); else delete mem[k]; });
  }
  function kvKeys(prefix) {
    return tx("readonly", function (s) {
      if (!s) return Object.keys(mem).filter(function (k) { return k.indexOf(prefix) === 0; });
      return s.getAllKeys(IDBKeyRange.bound(prefix, prefix + "￿"));
    });
  }

  /* ---------- أدوات خالصة (مكشوفة للاختبار) ---------- */
  function enc(points) {
    var out = [];
    for (var i = 0; i < points.length; i++) out.push(Math.round(points[i][0] * 10000), Math.round(points[i][1] * 10000));
    return out.join(" ");
  }
  function dec(str) {
    var a = String(str || "").split(" "), out = [];
    for (var i = 0; i + 1 < a.length; i += 2) out.push([+a[i] / 10000, +a[i + 1] / 10000]);
    return out;
  }
  /* تخفيف النقاط القريبة جداً (يقلل الحجم دون أن يتغير الشكل) */
  function thin(points, minDist) {
    if (points.length < 3) return points;
    var out = [points[0]], last = points[0];
    for (var i = 1; i < points.length - 1; i++) {
      if (Math.hypot(points[i][0] - last[0], points[i][1] - last[1]) >= minDist) { out.push(points[i]); last = points[i]; }
    }
    out.push(points[points.length - 1]);
    return out;
  }
  function blank() { return { items: {}, removed: {}, pend: { add: {}, rem: {} } }; }
  function itemT(it) { return (it && it.t) || 0; }
  /* دمج بيانات صفحة قادمة من الخادم في السجل المحلي؛ يعيد true إن تغيّر شيء */
  function mergeInto(rec, rItems, rRemoved) {
    var changed = false, k;
    rItems = rItems || {}; rRemoved = rRemoved || {};
    for (k in rRemoved) if (!(rec.removed[k] >= rRemoved[k])) { rec.removed[k] = rRemoved[k]; changed = true; }
    for (k in rItems) {
      var l = rec.items[k];
      if (!l || itemT(rItems[k]) > itemT(l)) { rec.items[k] = rItems[k]; changed = true; }
    }
    for (k in rec.removed) if (rec.items[k] && itemT(rec.items[k]) <= rec.removed[k]) { delete rec.items[k]; changed = true; }
    return changed;
  }
  function now() { return Date.now(); }
  function uid() { return now().toString(36) + Math.random().toString(36).slice(2, 8); }

  /* ---------- النطاق: حساب الطالب أو زائر ---------- */
  function scope() { var u = MS.cloud && MS.cloud.user(); return u ? u.id : "guest"; }
  function canSync(sc) { return sc !== "guest" && MS.cloud && MS.cloud.enabled && MS.cloud.user(); }

  /* ---------- سجلات الصفحات في الذاكرة (نسخة واحدة لكل صفحة) ---------- */
  var cache = {};   // "scope|key|n" -> rec
  var fileCache = {};
  function pk(sc, key, n) { return "p|" + sc + "|" + key + "|" + n; }
  function fk(sc, key) { return "f|" + sc + "|" + key; }
  function getPage(sc, key, n) {
    var ck = pk(sc, key, n);
    if (cache[ck]) return Promise.resolve(cache[ck]);
    return kvGet(ck).then(function (v) {
      var rec = cache[ck] || (cache[ck] = v ? Object.assign(blank(), v) : blank());
      rec.pend = rec.pend || { add: {}, rem: {} };
      return rec;
    });
  }
  function putPage(sc, key, n, rec) { cache[pk(sc, key, n)] = rec; return kvSet(pk(sc, key, n), rec); }
  function getFile(sc, key) {
    var ck = fk(sc, key);
    if (fileCache[ck]) return Promise.resolve(fileCache[ck]);
    return kvGet(ck).then(function (v) { return fileCache[ck] || (fileCache[ck] = v || { key: key, title: "", course: "", url: "", pages: 0, updated: 0, sv: 0 }); });
  }
  function putFile(sc, key, meta) { fileCache[fk(sc, key)] = meta; return kvSet(fk(sc, key), meta); }
  function pageNumbers(sc, key) {
    return kvKeys("p|" + sc + "|" + key + "|").then(function (ks) {
      return ks.map(function (k) { return +k.slice(k.lastIndexOf("|") + 1); }).sort(function (a, b) { return a - b; });
    });
  }

  /* ---------- المزامنة ---------- */
  var status = "local", statusListeners = [], retryTimer = null, retryStep = 0, pushing = null;
  function setStatus(s) { if (s !== status) { status = s; statusListeners.forEach(function (f) { try { f(s); } catch (e) {} }); } }
  function hasPending(rec) { return Object.keys(rec.pend.add).length || Object.keys(rec.pend.rem).length; }

  /* يرسل كل ما لم يُرسل بعد لملف واحد؛ آمن عند تكراره (الخادم يدمج ولا يستبدل) */
  function pushFile(sc, key) {
    if (!canSync(sc)) return Promise.resolve(false);
    return getFile(sc, key).then(function (meta) {
      return pageNumbers(sc, key).then(function (nums) {
        var chain = Promise.resolve(false);
        nums.forEach(function (n) {
          chain = chain.then(function (any) {
            return getPage(sc, key, n).then(function (rec) {
              if (!hasPending(rec)) return any;
              var add = {}, rem = {}, id;
              for (id in rec.pend.add) if (rec.items[id]) add[id] = rec.items[id];
              for (id in rec.pend.rem) rem[id] = rec.pend.rem[id];
              return MS.cloud.rpc("notes_save_page", {
                p_file: key, p_page: n, p_add: add, p_remove: rem,
                p_meta: { title: meta.title, course: meta.course, url: meta.url, pages: meta.pages }
              }).then(function () {
                for (id in add) if (rec.pend.add[id] && rec.items[id] && itemT(rec.items[id]) === itemT(add[id])) delete rec.pend.add[id];
                for (id in rem) if (rec.pend.rem[id] === rem[id]) delete rec.pend.rem[id];
                return putPage(sc, key, n, rec).then(function () { return true; });
              });
            });
          });
        });
        return chain;
      });
    });
  }

  /* يجلب تغييرات الأجهزة الأخرى ويدمجها؛ يعيد أرقام الصفحات التي تغيّرت */
  function pullFile(sc, key) {
    if (!canSync(sc)) return Promise.resolve([]);
    return getFile(sc, key).then(function (meta) {
      return MS.cloud.rpc("notes_get_file", { p_file: key, p_since: meta.sv || 0 }).then(function (pages) {
        var changedPages = [], chain = Promise.resolve();
        (pages || []).forEach(function (rp) {
          chain = chain.then(function () {
            return getPage(sc, key, rp.page).then(function (rec) {
              var ch = mergeInto(rec, rp.items, rp.removed);
              if (rp.updated > (meta.sv || 0)) meta.sv = rp.updated;
              if (rp.page > (meta.pages || 0)) meta.pages = rp.page;
              return ch ? putPage(sc, key, rp.page, rec).then(function () { changedPages.push(rp.page); }) : null;
            });
          });
        });
        return chain.then(function () { return putFile(sc, key, meta); }).then(function () { return changedPages; });
      });
    });
  }

  function failStatus(e) {
    var m = String((e && (e.message || e.code)) || "");
    if (/page_too_big|54000/.test(m)) return "full";
    if (/not_authenticated|401|JWT|expired/i.test(m)) return "login";
    return "offline";
  }

  /* ---------- مستند (ملف مفتوح) ---------- */
  function Doc(meta, sc) {
    this.sc = sc; this.key = meta.key; this.meta = meta; this.recs = {};
    this.undoS = []; this.redoS = []; this.cb = { change: [], history: [] };
    this.timer = null; this.poll = null; this.closed = false;
  }
  Doc.prototype.on = function (ev, f) { this.cb[ev].push(f); };
  Doc.prototype._emit = function (ev, a) { this.cb[ev].forEach(function (f) { try { f(a); } catch (e) {} }); };
  Doc.prototype.rec = function (n) { return this.recs[n] || (this.recs[n] = blank()); };
  Doc.prototype.items = function (n) {
    var r = this.recs[n]; if (!r) return [];
    return Object.keys(r.items).map(function (k) { return r.items[k]; }).sort(function (a, b) { return itemT(a) - itemT(b); });
  };
  Doc.prototype.get = function (n, id) { var r = this.recs[n]; return r ? r.items[id] : null; };
  Doc.prototype.count = function () {
    var c = 0, self = this; Object.keys(this.recs).forEach(function (n) { c += Object.keys(self.recs[n].items).length; }); return c;
  };
  Doc.prototype._save = function (n) {
    var self = this;
    putPage(this.sc, this.key, n, this.recs[n]);
    this.meta.updated = now();
    putFile(this.sc, this.key, this.meta);
    this._emit("change", n);
    this._queue();
  };
  Doc.prototype._queue = function () {
    var self = this;
    if (!canSync(this.sc)) { setStatus("local"); return; }
    setStatus("saving");
    clearTimeout(this.timer);
    this.timer = setTimeout(function () { self.sync(); }, PUSH_DELAY);
  };
  /* عمليات خام (بلا سجل تراجع) */
  Doc.prototype._put = function (n, item) {
    var r = this.rec(n), floor = (r.removed[item.id] || 0) + 1;
    item.t = Math.max(now(), floor, itemT(r.items[item.id]) + 1);
    r.items[item.id] = item; r.pend.add[item.id] = 1; this._save(n);
  };
  Doc.prototype._del = function (n, id) {
    var r = this.rec(n), it = r.items[id]; if (!it) return false;
    var ts = Math.max(now(), itemT(it));
    delete r.items[id]; r.removed[id] = ts; r.pend.rem[id] = ts; delete r.pend.add[id]; this._save(n); return true;
  };
  /* عمليات المستخدم (تدخل سجل التراجع) */
  Doc.prototype._record = function (op) { this.undoS.push(op); if (this.undoS.length > 100) this.undoS.shift(); this.redoS = []; this._emit("history"); };
  Doc.prototype.add = function (n, item) { this._put(n, item); this._record({ op: "add", n: n, item: JSON.parse(JSON.stringify(item)) }); return item; };
  Doc.prototype.edit = function (n, item) {
    var before = JSON.parse(JSON.stringify(this.get(n, item.id) || null));
    this._put(n, item);
    this._record({ op: "edit", n: n, before: before, after: JSON.parse(JSON.stringify(item)) });
  };
  Doc.prototype.remove = function (n, ids) {
    var self = this, ops = [];
    [].concat(ids).forEach(function (id) {
      var it = self.get(n, id); if (!it) return;
      ops.push({ op: "remove", n: n, item: JSON.parse(JSON.stringify(it)) }); self._del(n, id);
    });
    if (ops.length) this._record(ops.length === 1 ? ops[0] : { op: "group", ops: ops });
    return ops.length;
  };
  Doc.prototype._apply = function (o, undo) {
    var self = this;
    if (o.op === "group") { (undo ? o.ops.slice().reverse() : o.ops).forEach(function (x) { self._apply(x, undo); }); return; }
    var addIt = (o.op === "add" && !undo) || (o.op === "remove" && undo);
    if (o.op === "edit") { if (undo) { o.before ? this._put(o.n, JSON.parse(JSON.stringify(o.before))) : this._del(o.n, o.after.id); } else this._put(o.n, JSON.parse(JSON.stringify(o.after))); return; }
    if (addIt) this._put(o.n, JSON.parse(JSON.stringify(o.item))); else this._del(o.n, o.item.id);
  };
  Doc.prototype.undo = function () { var o = this.undoS.pop(); if (!o) return false; this._apply(o, true); this.redoS.push(o); this._emit("history"); return true; };
  Doc.prototype.redo = function () { var o = this.redoS.pop(); if (!o) return false; this._apply(o, false); this.undoS.push(o); this._emit("history"); return true; };
  Doc.prototype.canUndo = function () { return this.undoS.length > 0; };
  Doc.prototype.canRedo = function () { return this.redoS.length > 0; };
  Doc.prototype.setPages = function (n) { if (n > (this.meta.pages || 0)) { this.meta.pages = n; putFile(this.sc, this.key, this.meta); } };

  /* مزامنة كاملة: إرسال ما لم يُرسل ثم جلب تغييرات الأجهزة الأخرى */
  Doc.prototype.sync = function () {
    var self = this;
    clearTimeout(this.timer);
    if (!canSync(this.sc)) { setStatus("local"); return Promise.resolve(); }
    if (pushing) return pushing.then(function () { return self.sync(); });
    setStatus("saving");
    pushing = pushFile(this.sc, this.key).then(function () { return pullFile(self.sc, self.key); }).then(function (changed) {
      return Promise.all(changed.map(function (n) { return getPage(self.sc, self.key, n).then(function (r) { self.recs[n] = r; self._emit("change", n); }); }));
    }).then(function () {
      retryStep = 0; setStatus("synced");
    }).catch(function (e) {
      var s = failStatus(e); setStatus(s);
      if (s === "offline" && !self.closed) { retryStep = Math.min(retryStep + 1, 3); clearTimeout(retryTimer); retryTimer = setTimeout(function () { self.sync(); }, [5000, 15000, 60000][retryStep - 1] || 60000); }
    }).then(function () { pushing = null; });
    return pushing;
  };
  Doc.prototype.start = function () {
    var self = this;
    if (!canSync(this.sc)) { setStatus("local"); return; }
    function visible() { if (document.visibilityState === "visible") self.sync(); else if (self.timer) self.sync(); }
    this._onVis = visible; this._onOnline = function () { self.sync(); };
    document.addEventListener("visibilitychange", this._onVis);
    window.addEventListener("online", this._onOnline);
    this.poll = setInterval(function () { if (document.visibilityState === "visible" && !self.closed) self.sync(); }, POLL_MS);
    this.sync();
  };
  Doc.prototype.close = function () {
    this.closed = true; clearInterval(this.poll); clearTimeout(this.timer); clearTimeout(retryTimer);
    if (this._onVis) document.removeEventListener("visibilitychange", this._onVis);
    if (this._onOnline) window.removeEventListener("online", this._onOnline);
  };

  /* ---------- واجهة عامة ---------- */
  MS.notes = {
    util: { enc: enc, dec: dec, thin: thin, mergeInto: mergeInto, uid: uid },
    scope: scope,
    status: function () { return status; },
    onStatus: function (f) { statusListeners.push(f); },
    /* يفتح ملفاً: يحمّل المحلي فوراً ثم يزامن في الخلفية */
    open: function (meta) {
      var sc = scope(), key = meta.key;
      return getFile(sc, key).then(function (m) {
        m = Object.assign(m, { key: key, title: meta.title || m.title, course: meta.course || m.course, url: meta.url || m.url });
        var doc = new Doc(m, sc);
        return pageNumbers(sc, key).then(function (nums) {
          return Promise.all(nums.map(function (n) { return getPage(sc, key, n).then(function (r) { doc.recs[n] = r; }); }));
        }).then(function () { putFile(sc, key, m); return doc; });
      });
    },
    /* قائمة الملفات المعلّق عليها لنطاق معيّن (الحالي افتراضياً) */
    list: function (sc) {
      sc = sc || scope();
      return kvKeys("f|" + sc + "|").then(function (ks) {
        return Promise.all(ks.map(function (k) {
          var key = k.slice(("f|" + sc + "|").length);
          return getFile(sc, key).then(function (m) {
            return pageNumbers(sc, key).then(function (nums) {
              return Promise.all(nums.map(function (n) { return getPage(sc, key, n); })).then(function (recs) {
                var c = 0; recs.forEach(function (r) { c += Object.keys(r.items).length; });
                return Object.assign({}, m, { key: key, count: c });
              });
            });
          });
        })).then(function (all) { return all.filter(function (f) { return f.count > 0 || f.pages; }).sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); }); });
      });
    },
    /* يجلب قائمة ملفات الحساب من الخادم ويضيف ما لم يكن موجوداً محلياً (جهاز جديد) */
    refreshList: function () {
      var sc = scope();
      if (!canSync(sc)) return Promise.resolve();
      return MS.cloud.rpc("notes_list_files").then(function (rows) {
        return Promise.all((rows || []).map(function (r) {
          return getFile(sc, r.file_key).then(function (m) {
            var changed = false;
            [["title", r.title], ["course", r.course], ["url", r.url]].forEach(function (p) { if (p[1] && m[p[0]] !== p[1]) { m[p[0]] = p[1]; changed = true; } });
            if ((r.pages || 0) > (m.pages || 0)) { m.pages = r.pages; changed = true; }
            if (!m.updated || r.updated > m.updated) { m.updated = r.updated; changed = true; }
            m.serverCount = r.count;
            return changed || !fileCache[fk(sc, r.file_key)] ? putFile(sc, r.file_key, m) : null;
          });
        }));
      });
    },
    /* فتح ملف من القائمة على جهاز جديد: يسحب صفحاته من الخادم قبل العرض */
    pullAll: function (key) { var sc = scope(); return pullFile(sc, key); },
    /* ينقل تعليقات الزائر المحفوظة على الجهاز إلى الحساب الحالي ثم يمسحها من نطاق الزائر */
    guestSummary: function () { return MS.notes.list("guest").then(function (l) { return l.filter(function (f) { return f.count > 0; }); }); },
    migrateGuest: function () {
      var sc = scope(); if (sc === "guest") return Promise.resolve(0);
      return MS.notes.guestSummary().then(function (files) {
        var chain = Promise.resolve(0);
        files.forEach(function (f) {
          chain = chain.then(function (n) {
            return Promise.all([getFile(sc, f.key), pageNumbers("guest", f.key)]).then(function (a) {
              var meta = a[0], nums = a[1];
              meta.title = meta.title || f.title; meta.course = meta.course || f.course; meta.url = meta.url || f.url; meta.pages = Math.max(meta.pages || 0, f.pages || 0);
              meta.updated = now();
              return Promise.all(nums.map(function (p) {
                return Promise.all([getPage("guest", f.key, p), getPage(sc, f.key, p)]).then(function (r) {
                  var g = r[0], u = r[1], id;
                  mergeInto(u, g.items, g.removed);
                  for (id in g.items) if (u.items[id]) u.pend.add[id] = 1;
                  for (id in g.removed) if (u.removed[id] !== undefined) u.pend.rem[id] = u.removed[id];
                  return putPage(sc, f.key, p, u);
                });
              })).then(function () { return putFile(sc, f.key, meta); }).then(function () { return MS.notes.wipe("guest", f.key); }).then(function () { return n + 1; });
            });
          });
        });
        return chain;
      });
    },
    /* يرسل المعلّق من كل ملفات الحساب (بعد الدمج أو بعد العودة للاتصال) */
    pushAll: function () {
      var sc = scope(); if (!canSync(sc)) return Promise.resolve();
      return kvKeys("f|" + sc + "|").then(function (ks) {
        var chain = Promise.resolve();
        ks.forEach(function (k) { chain = chain.then(function () { return pushFile(sc, k.slice(("f|" + sc + "|").length)); }); });
        return chain;
      });
    },
    /* حذف ملف من نطاق (محلياً)، ومن الخادم أيضاً إن كان نطاق الحساب */
    wipe: function (sc, key) {
      return pageNumbers(sc, key).then(function (nums) {
        nums.forEach(function (n) { delete cache[pk(sc, key, n)]; });
        delete fileCache[fk(sc, key)];
        return Promise.all(nums.map(function (n) { return kvDel(pk(sc, key, n)); }).concat([kvDel(fk(sc, key))]));
      });
    },
    removeFile: function (key) {
      var sc = scope();
      var remote = canSync(sc) ? MS.cloud.rpc("notes_delete_file", { p_file: key }) : Promise.resolve();
      return remote.then(function () { return MS.notes.wipe(sc, key); });
    },
    removeAll: function () {
      var sc = scope();
      var remote = canSync(sc) ? MS.cloud.rpc("notes_delete_all") : Promise.resolve();
      return remote.then(function () { return MS.notes.wipeScope(sc); });
    },
    /* مسح كل بيانات نطاق من هذا الجهاز (عند تسجيل الخروج: بيانات الطالب تبقى في حسابه فقط) */
    wipeScope: function (sc) {
      return kvKeys("f|" + sc + "|").then(function (ks) {
        return Promise.all(ks.map(function (k) { return MS.notes.wipe(sc, k.slice(("f|" + sc + "|").length)); }));
      });
    },
    /* مفتاح الملف: مساره من جذر الموقع (أو رابطه الكامل إن كان من موقع آخر) */
    fileKey: function (url) {
      try { var u = new URL(url, location.href); return u.origin === location.origin ? decodeURIComponent(u.pathname.replace(/^\//, "")) : u.href; }
      catch (e) { return String(url); }
    }
  };
})();
