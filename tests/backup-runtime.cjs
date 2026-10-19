// Step 40: executes the shipped unified backup script (site/js/study-backup-v87.js) in a Node VM with
// fault-injectable storage and a minimal DOM. Simulated; not a real browser.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../site/js/study-backup-v87.js'), 'utf8');

const ORIGIN = 'https://example.test';
const FILE = 'files/anatomy/lecture-1.pdf', OTHER = 'files/anatomy/lecture-1.pdf.copy.pdf';
const absOf = f => ORIGIN + '/' + f;
const keysOf = f => ({
  notes: `medixa.v85.${f}.splitNotes`, page: `medixa.v85.${f}.splitPage`, quiz: `medixa.v85.${f}.imageQuiz`, reviews: `medixa.v85.${f}.imageQuizReviews`,
  workspace: `medixa.v86.workspace:${f}`, timer: `medixa.timer.v83:${f}`, goals: `medixa.study.goals.v84:${f}`,
  cards: `medixa.study.v1:${absOf(f)}`, reader: `medixa.reader.v1:${absOf(f)}`, masks: `medixa.occlusion.v1:${absOf(f)}`, ink: `medixa.pdf.annotations.v1:${absOf(f)}`, layout: `medixa.studio.layout.v1:${absOf(f)}`,
});
const K = keysOf(FILE), KO = keysOf(OTHER);
const stroke = (page, x) => ({page, tool: 'pen', color: '#e43d56', width: 3, points: [[x, 1], [x + 1, 2]]});
function fullData(f, tag = 'A') {
  const k = keysOf(f);
  return {
    [k.notes]: JSON.stringify({1: 'note ' + tag}), [k.page]: '2', [k.quiz]: JSON.stringify([{q: 'Q' + tag, a: 'A'}]), [k.reviews]: JSON.stringify({}),
    [k.workspace]: JSON.stringify({bookmarks: [3], reviews: [], lastPage: 3, updatedAt: 1}), [k.timer]: JSON.stringify({minutes: 25, tag}),
    [k.goals]: JSON.stringify({goals: ['finish ' + tag], logs: []}), [k.cards]: JSON.stringify({cards: [{front: tag}]}),
    [k.reader]: JSON.stringify({bookmarks: [1], lastPage: 1, dark: false}), [k.masks]: JSON.stringify([{page: 1, x: 0.1, y: 0.1, w: 0.2, h: 0.1}]),
    [k.ink]: JSON.stringify([stroke(1, 5)]),
    [k.layout]: JSON.stringify({v: 1, margins: {1: {l: 0, t: 0, r: 0.5, b: 0}}}),
  };
}
const UNRELATED = {'medixa.penOnly': 'true', [`medixa.v88.session:${absOf(FILE)}`]: '{"page":4}', 'ms.fav': '["x"]', 'ms.study': '{"a":1}'};

function harness({initial = {}, fault, confirmed = true, file = FILE} = {}) {
  const values = new Map(Object.entries(initial)), calls = [], downloads = [], confirms = [];
  let storageFault = fault;
  const storage = {};
  for (const op of ['getItem', 'setItem', 'removeItem']) storage[op] = (key, value) => {
    const call = {op, key, value}; calls.push(call);
    const action = storageFault?.(call, calls, values);
    if (action === 'throw') { const e = Error('simulated'); e.name = op === 'getItem' ? 'SecurityError' : 'QuotaExceededError'; throw e; }
    if (action === 'ignore') return op === 'getItem' ? null : undefined;
    if (op === 'getItem') return values.has(key) ? values.get(key) : null;
    if (op === 'setItem') values.set(key, String(value)); else values.delete(key);
  };
  const nodes = new Map();
  class El {
    constructor(tag) { this.tagName = tag; this.style = {}; this.attrs = {}; this.value = ''; }
    setAttribute(k, v) { this.attrs[k] = v; }
    set innerHTML(h) { this._h = h; for (const m of h.matchAll(/id="([^"]+)"/g)) nodes.set(m[1], new El('x')); }
    querySelector(s) { return nodes.get(s.slice(1)); }
    click() { if (this.tagName === 'a') downloads.push(this.download); }
  }
  const body = {append: (...ns) => ns.forEach(n => nodes.set(n.id, n))};
  const blobs = [];
  const context = {
    document: {readyState: 'complete', body, getElementById: id => id === 'pages' ? {} : nodes.get(id), createElement: t => new El(t), addEventListener() {}},
    window: {}, location: {href: `${ORIGIN}/pdf-notes.html?file=${encodeURIComponent(file)}`, search: `?file=${encodeURIComponent(file)}`, pathname: '/pdf-notes.html'},
    localStorage: storage, URL: Object.assign(function (...a) { return new URL(...a); }, {createObjectURL: b => { blobs.push(b); return 'blob:x'; }, revokeObjectURL() {}}),
    URLSearchParams, Blob, Date, JSON, Map, Set, Error, Object, Array, Number, setTimeout() {}, confirm: m => { confirms.push(m); return confirmed; },
  };
  context.URL.prototype = URL.prototype;
  vm.runInNewContext(source, context, {filename: 'study-backup-v87.js'});
  const api = context.window.MedixaBackup;
  return {
    values, calls, confirms, downloads, api, storage, loc: context.location,
    setFault(fn) { storageFault = fn; },
    snapshot() { return Object.fromEntries(values); },
    status() { return nodes.get('mx87-status').textContent || ''; },
    async exportFile() { nodes.get('mx87-export').onclick(); return blobs.length ? JSON.parse(await blobs.at(-1).text()) : null; },
    async importFile(data, {raw, size} = {}) {
      const text = raw ?? JSON.stringify(data);
      await nodes.get('mx87-import').onchange({target: {files: [{size: size ?? Buffer.byteLength(text), text: async () => text}], value: 'x'}});
      return this.status();
    },
    writes() { return calls.filter(c => c.op !== 'getItem'); },
  };
}

test('coverage: exact key list for a document, no prefix match into another document', () => {
  const h = harness();
  const scope = h.api.keysFor(h.loc);
  assert.deepEqual(new Set(scope.list.map(x => x.key)), new Set(Object.values(K)));
  for (const k of Object.values(KO)) assert.equal(scope.byKey.has(k), false, k);
  assert.equal(scope.byKey.get(K.ink).mode, 'merge');
});

test('round trip: export all 12 study keys of this document and restore them byte-identical', async () => {
  const seed = {...fullData(FILE), ...fullData(OTHER, 'B'), ...UNRELATED};
  const a = harness({initial: seed});
  const backup = await a.exportFile();
  assert.equal(backup.format, 'medixa-local-backup-v40');
  assert.deepEqual(Object.keys(backup.entries).sort(), Object.values(K).sort());
  assert.equal(a.downloads.length, 1);
  const b = harness({initial: {...fullData(OTHER, 'B'), ...UNRELATED}});
  const before = b.snapshot();
  assert.match(await b.importFile(backup), /اكتمل/);
  for (const k of Object.values(K)) assert.equal(b.values.get(k), seed[k], k);
  for (const [k, v] of Object.entries(before)) assert.equal(b.values.get(k), v, 'unrelated ' + k);
});

test('legacy v8.7 backup (v8.5 + v8.6 keys) still imports', async () => {
  const legacy = {format: 'medixa-local-backup-v87', document: FILE, createdAt: 'x', entries: {[K.notes]: '{"1":"old"}', [K.workspace]: '{"bookmarks":[],"reviews":[],"lastPage":1,"updatedAt":0}'}};
  const h = harness();
  assert.match(await h.importFile(legacy), /اكتمل/);
  assert.equal(h.values.get(K.notes), '{"1":"old"}');
});

test('legacy v8.7 backup cannot carry keys v8.7 never exported', async () => {
  const h = harness();
  const s = await h.importFile({format: 'medixa-local-backup-v87', document: FILE, entries: {[K.ink]: JSON.stringify([stroke(1, 1)])}});
  assert.match(s, /غير صالحة/); assert.equal(h.writes().length, 0);
});

test('wrong document is rejected without writes (document and documentUrl)', async () => {
  const src = harness({initial: fullData(OTHER, 'B'), file: OTHER});
  const backup = await src.exportFile();
  const h = harness({initial: fullData(FILE)});
  assert.match(await h.importFile(backup), /لا تخص/);
  assert.match(await h.importFile({...backup, document: FILE}), /لا تخص/);
  assert.match(await h.importFile({format: 'medixa-local-backup-v87', document: OTHER, entries: {[K.notes]: '{}'}}), /لا تخص/);
  assert.equal(h.writes().length, 0);
});

test('a key belonging to another document smuggled into a backup is rejected', async () => {
  const h = harness();
  const s = await h.importFile({format: 'medixa-local-backup-v40', document: FILE, documentUrl: absOf(FILE), entries: {[K.notes]: '{}', [KO.notes]: '{}'}});
  assert.match(s, /غير صالحة/); assert.equal(h.writes().length, 0);
});

for (const at of [1, 3, 6]) test(`partial write failure at write ${at} rolls back every key, including new ones`, async () => {
  const initial = {[K.notes]: '{"1":"keep"}', [K.masks]: '{corrupt mask bytes', [K.cards]: '{"cards":[]}', ...UNRELATED};
  const backup = await harness({initial: fullData(FILE)}).exportFile();
  const h = harness({initial});
  let n = 0; h.setFault(c => c.op === 'setItem' && ++n === at ? 'throw' : undefined);
  assert.match(await h.importFile(backup), /أُعيدت بياناتك/);
  assert.deepEqual(h.snapshot(), initial);
});

test('silently dropped writes are detected and rolled back', async () => {
  const initial = {[K.goals]: '{"goals":["mine"],"logs":[]}'};
  const backup = await harness({initial: fullData(FILE)}).exportFile();
  const h = harness({initial});
  let n = 0; h.setFault(c => c.op === 'setItem' && ++n === 4 ? 'ignore' : undefined);
  assert.match(await h.importFile(backup), /أُعيدت/);
  assert.deepEqual(h.snapshot(), initial);
});

test('quota error on the first write leaves storage unchanged', async () => {
  const backup = await harness({initial: fullData(FILE)}).exportFile();
  const h = harness({initial: UNRELATED});
  h.setFault(c => c.op === 'setItem' ? 'throw' : undefined);
  assert.match(await h.importFile(backup), /أُعيدت/);
  assert.deepEqual(h.snapshot(), UNRELATED);
});

test('blocked reads: import writes nothing, export creates no file', async () => {
  const backup = await harness({initial: fullData(FILE)}).exportFile();
  const h = harness({initial: fullData(FILE, 'Z')});
  h.setFault(c => c.op === 'getItem' ? 'throw' : undefined);
  assert.match(await h.importFile(backup), /تعذر قراءة/);
  assert.equal(h.writes().length, 0);
  assert.equal(await h.exportFile(), null);
  assert.match(h.status(), /تعذر قراءة/);
});

test('failed rollback is reported, not hidden', async () => {
  const backup = await harness({initial: fullData(FILE)}).exportFile();
  const h = harness({initial: {}});
  let n = 0; h.setFault(c => (c.op === 'setItem' && ++n === 2) || c.op === 'removeItem' ? 'throw' : undefined);
  assert.match(await h.importFile(backup), /فشل الاستيراد والتراجع/);
});

test('ink is merged without deleting existing strokes and without duplicates', async () => {
  const mine = [stroke(1, 50), stroke(2, 60)];
  const backup = {format: 'medixa-local-backup-v40', document: FILE, documentUrl: absOf(FILE), entries: {[K.ink]: JSON.stringify([stroke(2, 60), stroke(3, 70)])}};
  const h = harness({initial: {[K.ink]: JSON.stringify(mine)}});
  assert.match(await h.importFile(backup), /اكتمل/);
  assert.deepEqual(JSON.parse(h.values.get(K.ink)), [...mine, stroke(3, 70)]);
});

test('corrupted existing ink blocks the whole import (nothing written)', async () => {
  const backup = await harness({initial: fullData(FILE)}).exportFile();
  const initial = {[K.ink]: '[{"page":0}]', [K.notes]: '{"1":"keep"}'};
  const h = harness({initial});
  assert.match(await h.importFile(backup), /الرسومات الحالية غير صالحة/);
  assert.equal(h.writes().length, 0); assert.deepEqual(h.snapshot(), initial);
});

test('corrupted or invalid values inside a new-format backup are rejected', async () => {
  for (const entries of [{[K.cards]: '{not json'}, {[K.ink]: JSON.stringify([{page: 1, tool: 'pen', points: [[1, 'x']]}])}, {[K.notes]: 5}, {}]) {
    const h = harness();
    assert.match(await h.importFile({format: 'medixa-local-backup-v40', document: FILE, documentUrl: absOf(FILE), entries}), /غير صالحة/);
    assert.equal(h.writes().length, 0);
  }
});

test('export skips and reports corrupted stored values instead of hiding them', async () => {
  const h = harness({initial: {...fullData(FILE), [K.cards]: '{broken', [K.ink]: '[{"page":-1}]'}});
  const b = await h.exportFile();
  assert.equal(K.cards in b.entries, false); assert.equal(K.ink in b.entries, false);
  assert.deepEqual(b.skipped.sort(), [K.cards, K.ink].sort());
  assert.match(h.status(), /تالفة: 2/);
  assert.equal(h.writes().length, 0, 'export never writes');
});

test('cancelled confirmation, oversized file, invalid JSON and identical data write nothing', async () => {
  const backup = await harness({initial: fullData(FILE)}).exportFile();
  const c = harness({confirmed: false}); await c.importFile(backup); assert.equal(c.writes().length, 0); assert.equal(c.confirms.length, 1);
  const s = harness(); assert.match(await s.importFile(backup, {size: 12_000_001}), /أكبر من الحد/); assert.equal(s.writes().length, 0);
  const j = harness(); assert.match(await j.importFile(null, {raw: '{oops'}), /JSON/); assert.equal(j.writes().length, 0);
  const same = harness({initial: fullData(FILE)}); assert.match(await same.importFile(backup), /مطابقة/); assert.equal(same.writes().length, 0);
});

test('nothing to export reports clearly and creates no file', async () => {
  const h = harness({initial: UNRELATED});
  assert.equal(await h.exportFile(), null);
  assert.match(h.status(), /لا توجد بيانات/);
});
