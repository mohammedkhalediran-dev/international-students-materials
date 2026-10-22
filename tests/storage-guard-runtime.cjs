// Step 42: unit tests for site/js/study-storage-guard.js with shared, fault-injectable storage (simulated tabs).
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../site/js/study-storage-guard.js'), 'utf8');
function load() { const window = {}; vm.runInNewContext(source, {window, JSON, Error}); return window.MedixaGuard; }
function store(initial = {}, fault) {
  const values = new Map(Object.entries(initial)), calls = [];
  const s = {values, calls, fault};
  for (const op of ['getItem', 'setItem', 'removeItem']) s[op] = (k, v) => {
    calls.push(op); const a = s.fault?.(op, k, v, values);
    if (a === 'throw') throw Object.assign(Error('sim'), {name: 'QuotaExceededError'});
    if (a === 'ignore') return op === 'getItem' ? null : undefined;
    if (op === 'getItem') return values.has(k) ? values.get(k) : null;
    if (op === 'setItem') values.set(k, String(v)); else values.delete(k);
  };
  return s;
}
const G = load(), K = 'medixa.pdf.annotations.v1:https://x.test/a.pdf';
const arr = {fallback: () => [], valid: Array.isArray};

test('fresh key: fallback value, first write saves and is verified', () => {
  const s = store(); const g = G.open(s, K, arr);
  assert.deepEqual(g.value, []); assert.equal(g.state, 'ok');
  assert.equal(g.write([1]), 'saved'); assert.equal(s.values.get(K), '[1]');
  assert.equal(g.write([1, 2]), 'saved'); assert.equal(s.values.get(K), '[1,2]');
});

for (const bad of ['{broken', '{"a":1}', '42', 'null']) test(`corrupted or wrong-shape stored value ${bad} is never overwritten`, () => {
  const s = store({[K]: bad}); const g = G.open(s, K, arr);
  assert.equal(g.state, 'corrupt'); assert.deepEqual(g.value, []);
  assert.equal(g.write([1]), 'corrupt'); assert.equal(s.values.get(K), bad);
  assert.equal(s.calls.filter(c => c !== 'getItem').length, 0);
});

test('unreadable storage blocks writes', () => {
  const s = store({[K]: '[1]'}, op => op === 'getItem' ? 'throw' : undefined);
  const g = G.open(s, K, arr); assert.equal(g.state, 'unreadable');
  s.fault = null; assert.equal(g.write([]), 'unreadable'); assert.equal(s.values.get(K), '[1]');
});

test('two tabs: the stale tab cannot overwrite newer data written by the other tab', () => {
  const s = store({[K]: '[1]'});
  const a = G.open(s, K, arr), b = G.open(s, K, arr);
  assert.equal(a.write([1, 'A']), 'saved');
  assert.equal(b.write([1, 'B']), 'conflict'); assert.equal(s.values.get(K), '[1,"A"]');
  assert.equal(b.state, 'conflict'); assert.equal(b.changed(), true);
  assert.equal(b.write([1, 'B2']), 'conflict', 'stays blocked until reload');
  assert.equal(a.write([1, 'A', 'A2']), 'saved', 'the tab with current data keeps saving');
  const c = G.open(s, K, arr); assert.deepEqual(c.value, [1, 'A', 'A2'], 'reload sees everything');
});

test('a backup import in the same tab is detected before the next save', () => {
  const s = store({[K]: '[1]'}); const g = G.open(s, K, arr);
  s.values.set(K, '[1,"imported"]');
  assert.equal(g.write([1, 'new stroke']), 'conflict'); assert.equal(s.values.get(K), '[1,"imported"]');
});

test('another tab deleting the key is a conflict, not permission to recreate stale data', () => {
  const s = store({[K]: '[1]'}); const g = G.open(s, K, arr);
  s.values.delete(K);
  assert.equal(g.write([1, 2]), 'conflict'); assert.equal(s.values.has(K), false);
});

test('quota error: previous bytes kept, reported as failed, later save can succeed', () => {
  const s = store({[K]: '[1]'}, op => op === 'setItem' ? 'throw' : undefined); const g = G.open(s, K, arr);
  assert.equal(g.write([1, 2]), 'failed'); assert.equal(s.values.get(K), '[1]');
  s.fault = null; assert.equal(g.write([1, 2]), 'saved');
});

test('silently dropped write is detected and the previous bytes are restored', () => {
  const s = store({[K]: '[1]'}); const g = G.open(s, K, arr);
  let n = 0; s.fault = (op, k, v, values) => { if (op === 'setItem' && ++n === 1) { values.set(k, '[garbage'); return 'ignore'; } };
  assert.equal(g.write([1, 2]), 'failed'); assert.equal(s.values.get(K), '[1]');
});

test('blocked read at save time reports failure without writing', () => {
  const s = store({[K]: '[1]'}); const g = G.open(s, K, arr);
  s.fault = op => op === 'getItem' ? 'throw' : undefined;
  assert.equal(g.write([2]), 'failed'); s.fault = null; assert.equal(s.values.get(K), '[1]');
});

test('every result has a student-facing Arabic message', () => {
  for (const r of ['saved', 'corrupt', 'unreadable', 'conflict', 'failed']) assert.ok(G.MSG[r] && /[؀-ۿ]/.test(G.MSG[r]), r);
});
