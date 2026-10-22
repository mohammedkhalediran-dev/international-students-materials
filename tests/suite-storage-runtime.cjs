const {test} = require('node:test');
const assert = require('node:assert/strict');
const {suiteHarness} = require('./helpers/suite-harness.cjs');
const key = name => 'medixa.v85.lecture.pdf.' + name;
const quiz = [{id: 'q1', page: 1, question: 'Q', answer: 'A'}];
const backup = () => ({format: 'medixa-suite-v85', file: 'lecture.pdf', notes: {'1': 'new note'}, imageQuiz: quiz.map(q=>({...q})), imageQuizReviews: {q1: {attempts: 1, correct: 1}}});
const initial = () => ({[key('splitNotes')]: '{ "1": "old note", "2": "keep me" }', [key('imageQuiz')]: '[]', [key('imageQuizReviews')]: '{}',
  'medixa.v85.other.pdf.splitNotes': '{"1":"another student document"}', 'ms.study': '{"completed":true}',
  'medixa.pdf.annotations.v1:https://example.test/lecture.pdf': '[{"page":1}]'});
function unrelatedPreserved(h, before) { for (const [k, v] of Object.entries(before)) if (!k.startsWith('medixa.v85.lecture.pdf.')) assert.equal(h.values.get(k), v, k); }

test('import writes all three suite keys and preserves unrelated student data', async () => {
  const before = initial(), h = suiteHarness({initial: before}); await h.import(backup());
  assert.deepEqual(JSON.parse(h.values.get(key('splitNotes'))), backup().notes);
  assert.deepEqual(JSON.parse(h.values.get(key('imageQuiz'))), quiz);
  assert.equal(h.confirmations.length, 1); assert.equal(h.alerts.length, 0); unrelatedPreserved(h, before);
});
test('legacy import without review statistics preserves existing review history', async () => {
  const before = initial(), h = suiteHarness({initial: before}), b = backup(); delete b.imageQuizReviews; await h.import(b);
  assert.equal(h.values.get(key('imageQuizReviews')), before[key('imageQuizReviews')]);
});
for (const failureIndex of [1, 2, 3]) test('quota on write ' + failureIndex + ' rolls back exact previous bytes', async () => {
  const before = initial(); let writes = 0;
  const h = suiteHarness({initial: before, fault: c => c.op === 'setItem' && ++writes === failureIndex ? 'throw' : undefined});
  await h.import(backup()); assert.deepEqual(h.snapshot(), before); assert.match(h.alerts[0], /تمت استعادة/);
});
test('rollback removes keys created during a partial import', async () => {
  const before = {'ms.study': 'keep'}; let writes = 0;
  const h = suiteHarness({initial: before, fault: c => c.op === 'setItem' && ++writes === 2 ? 'throw' : undefined});
  await h.import(backup()); assert.deepEqual(h.snapshot(), before);
});
test('silent dropped write is detected and rolled back', async () => {
  const before = initial(); let writes = 0;
  const h = suiteHarness({initial: before, fault: c => c.op === 'setItem' && ++writes === 2 ? 'ignore' : undefined});
  await h.import(backup()); assert.deepEqual(h.snapshot(), before); assert.match(h.alerts[0], /تمت استعادة/);
});
test('blocked reads do not overwrite any stored student data', async () => {
  const before = initial(), h = suiteHarness({initial: before, fault: c => c.op === 'getItem' ? 'throw' : undefined});
  await h.import(backup()); assert.deepEqual(h.snapshot(), before); assert.equal(h.calls.filter(c => c.op === 'setItem').length, 0);
});
test('rollback failure is reported honestly', async () => {
  let writes = 0; const before = initial();
  const h = suiteHarness({initial: before, fault: c => c.op === 'setItem' && ++writes >= 2 ? 'throw' : undefined});
  await h.import(backup()); assert.match(h.alerts[0], /تعذرت استعادة بعض البيانات/); unrelatedPreserved(h, before);
});
for (const kind of ['wrong document', 'wrong format', 'malformed JSON', 'oversized', 'cancelled']) test(kind + ' import makes no writes', async () => {
  const before = initial(), h = suiteHarness({initial: before, confirmed: kind !== 'cancelled'}), b = backup();
  if (kind === 'wrong document') b.file = 'other.pdf'; if (kind === 'wrong format') b.format = 'unknown';
  await h.import(b, kind === 'malformed JSON' ? {raw: '{invalid'} : kind === 'oversized' ? {size: 2000001} : {});
  assert.deepEqual(h.snapshot(), before); assert.equal(h.calls.filter(c => c.op === 'setItem').length, 0);
});
test('autosave changes only the selected page and verifies persistence', async () => {
  const before = initial(), h = suiteHarness({initial: before}); await h.note('updated', 1);
  assert.deepEqual(JSON.parse(h.values.get(key('splitNotes'))), {'1': 'updated', '2': 'keep me'});
  assert.equal(h.status(), 'محفوظ ✓'); unrelatedPreserved(h, before);
});
for (const failure of ['quota', 'blocked', 'silent']) test('autosave ' + failure + ' leaves editable draft and shows failure', async () => {
  const before = initial(), h = suiteHarness({initial: before, fault: c => failure === 'blocked' && c.op === 'getItem' ? 'throw' : c.op === 'setItem' ? failure === 'silent' ? 'ignore' : 'throw' : undefined});
  await h.note('unsaved draft'); assert.match(h.status(), /انسخ النص/); assert.equal(h.nodes.get('suite-note').value, 'unsaved draft'); assert.deepEqual(h.snapshot(), before);
});
for (const raw of ['{broken', 'null', '[]', '42', '"text"']) test('corrupted notes ' + raw + ' are not overwritten', async () => {
  const before = {...initial(), [key('splitNotes')]: raw}, h = suiteHarness({initial: before}); await h.note('draft');
  assert.deepEqual(h.snapshot(), before); assert.match(h.status(), /انسخ النص/);
});
test('quota failure can be retried successfully without losing other pages', async () => {
  const h = suiteHarness({initial: initial(), fault: c => c.op === 'setItem' ? 'throw' : undefined}); await h.note('retry draft');
  h.setFault(undefined); await h.note('retry draft'); assert.equal(h.status(), 'محفوظ ✓');
  assert.deepEqual(JSON.parse(h.values.get(key('splitNotes'))), {'1': 'retry draft', '2': 'keep me'});
});

for (const notes of [[], {'1': {nested: 'invalid'}}, {'0': 'invalid'}, {'1.5': 'invalid'}, {'-1': 'invalid'}]) test('reject invalid imported notes schema ' + JSON.stringify(notes), async () => {
  const before = initial(), h = suiteHarness({initial: before}), b = backup(); b.notes = notes; await h.import(b);
  assert.deepEqual(h.snapshot(), before); assert.equal(h.confirmations.length, 0); assert.ok(h.alerts.length);
});
for (const page of [-1, 1.5, 0, 4, NaN]) test('invalid autosave page ' + page + ' cannot change storage', async () => {
  const before = initial(), h = suiteHarness({initial: before}); await h.note('invalid page draft', page);
  assert.deepEqual(h.snapshot(), before); assert.notEqual(h.status(), 'محفوظ ✓');
});
test('corrupt page-note field is preserved on autosave', async () => {
  const before = {...initial(), [key('splitNotes')]: '{"1":"old", "2":{"unrecognized":"retain"}}'}, h = suiteHarness({initial: before});
  await h.note('new'); assert.deepEqual(h.snapshot(), before); assert.match(h.status(), /انسخ النص/);
});
test('import rejects an invalid quiz instead of silently dropping student entries', async () => {
  const before = initial(), h = suiteHarness({initial: before}), b = backup(); b.imageQuiz.push(null); await h.import(b);
  assert.deepEqual(h.snapshot(), before); assert.equal(h.confirmations.length, 0);
});
test('invalid optional review history is rejected before writes', async () => {
  const before = initial(), h = suiteHarness({initial: before}), b = backup(); b.imageQuizReviews = [];
  await h.import(b); assert.deepEqual(h.snapshot(), before);
});
test('unreadable later import key prevents the entire transaction before any write', async () => {
  const before = initial(), h = suiteHarness({initial: before, fault: c => c.op === 'getItem' && c.key === key('imageQuiz') ? 'throw' : undefined});
  await h.import(backup()); assert.deepEqual(h.snapshot(), before); assert.equal(h.calls.filter(c => c.op === 'setItem').length, 0);
});
test('oversized quiz collection is rejected instead of truncated', async () => {
  const before = initial(), h = suiteHarness({initial: before}), b = backup(); b.imageQuiz = Array(1001).fill(quiz[0]);
  await h.import(b); assert.deepEqual(h.snapshot(), before); assert.equal(h.confirmations.length, 0);
});
test('rollback preserves malformed original bytes for later recovery', async () => {
  const before = {...initial(), [key('splitNotes')]: '{damaged-but-must-retain'}; let writes = 0;
  const h = suiteHarness({initial: before, fault: c => c.op === 'setItem' && ++writes === 2 ? 'throw' : undefined});
  await h.import(backup()); assert.deepEqual(h.snapshot(), before);
});

test('failed note survives switching away and back to split notes', async () => {
  const h = suiteHarness({initial: initial(), fault: c => c.op === 'setItem' ? 'throw' : undefined});
  await h.note('keep this draft'); await h.view('dashboard'); await h.view('split');
  assert.equal(h.nodes.get('suite-note').value, 'keep this draft'); assert.match(h.status(), /انسخ النص/);
});
test('failed drafts stay attached to their page when page navigation also cannot save', async () => {
  const h = suiteHarness({initial: initial(), fault: c => c.op === 'setItem' ? 'throw' : undefined});
  await h.note('page one draft'); await h.input('suite-page', '2');
  assert.equal(h.nodes.get('suite-note').value, 'keep me'); await h.note('page two draft', 2);
  await h.input('suite-page', '1'); assert.equal(h.nodes.get('suite-note').value, 'page one draft');
  await h.input('suite-page', '2'); assert.equal(h.nodes.get('suite-note').value, 'page two draft');
});
test('toggling split view cannot erase a failed draft', async () => {
  const h = suiteHarness({initial: initial(), fault: c => c.op === 'setItem' ? 'throw' : undefined});
  await h.note('draft while quota full'); await h.click('suite-split'); assert.equal(h.nodes.get('suite-note').value, 'draft while quota full');
});
test('dirty draft warns before unload; retry persists and clears warning', async () => {
  const h = suiteHarness({initial: initial(), fault: c => c.op === 'setItem' ? 'throw' : undefined}); await h.note('recover me');
  function unload() { let prevented = false; const event = {preventDefault(){ prevented = true; }}; for (const fn of h.windowEvents.beforeunload || []) fn(event); return prevented; }
  assert.equal(unload(), true); h.setFault(undefined); await h.click('suite-retry-note');
  assert.equal(JSON.parse(h.values.get(key('splitNotes')))['1'], 'recover me'); assert.equal(h.status(), 'محفوظ ✓'); assert.equal(unload(), false);
});
test('retrying one page leaves unload warning for another unsaved page', async () => {
  const h = suiteHarness({initial: initial(), fault: c => c.op === 'setItem' ? 'throw' : undefined});
  await h.note('first'); await h.input('suite-page', '2'); await h.note('second', 2); h.setFault(undefined); await h.click('suite-retry-note');
  let warned = false; for (const fn of h.windowEvents.beforeunload || []) fn({preventDefault(){warned = true;}}); assert.equal(warned, true);
  await h.input('suite-page', '1'); await h.click('suite-retry-note'); assert.equal(JSON.parse(h.values.get(key('splitNotes')))['1'], 'first');
});
test('import cannot discard or overwrite an unsaved draft', async () => {
  const before = initial(), h = suiteHarness({initial: before, fault: c => c.op === 'setItem' ? 'throw' : undefined}); await h.note('keep draft');
  h.setFault(undefined); await h.import(backup()); assert.deepEqual(h.snapshot(), before);
  await h.view('split'); assert.equal(h.nodes.get('suite-note').value, 'keep draft');
});

async function prepareQuiz(h) { await h.view('image'); h.nodes.get('iq-page').value = '1'; h.nodes.get('iq-q').value = 'New question'; h.nodes.get('iq-a').value = 'Answer'; }
for (const raw of ['{broken', '{}', '[null]', '[{"page":1,"answer":"A"}]']) test('quiz creation preserves corrupt collection ' + raw, async () => {
  const before = {...initial(), [key('imageQuiz')]: raw}, h = suiteHarness({initial: before});
  await prepareQuiz(h); await h.click('iq-add'); assert.deepEqual(h.snapshot(), before); assert.ok(h.alerts.length);
});
test('quiz creation verifies writes and preserves input on silent storage failure', async () => {
  const before = initial(), h = suiteHarness({initial: before, fault: c => c.op === 'setItem' ? 'ignore' : undefined});
  await prepareQuiz(h); await h.click('iq-add'); assert.deepEqual(h.snapshot(), before); assert.ok(h.alerts.length); assert.equal(h.nodes.get('iq-q').value, 'New question');
});
test('valid quiz creation preserves existing cards and metadata', async () => {
  const old = [{...quiz[0], extension: {keep: true}}], before = {...initial(), [key('imageQuiz')]: JSON.stringify(old)}, h = suiteHarness({initial: before});
  await prepareQuiz(h); await h.click('iq-add'); const saved = JSON.parse(h.values.get(key('imageQuiz'))); assert.equal(saved.length, 2); assert.deepEqual(saved[0], old[0]); unrelatedPreserved(h, before);
});
test('quiz limit prevents losing existing cards through later truncation', async () => {
  const before = {...initial(), [key('imageQuiz')]: JSON.stringify(Array(1000).fill(quiz[0]))}, h = suiteHarness({initial: before});
  await prepareQuiz(h); await h.click('iq-add'); assert.deepEqual(h.snapshot(), before); assert.ok(h.alerts.length);
});
test('quiz deletion rejects an invalid index instead of deleting the first card', async () => {
  const before = {...initial(), [key('imageQuiz')]: JSON.stringify(quiz)}, h = suiteHarness({initial: before});
  await h.view('image'); await h.click('delete-invalid', {iqdelete: 'garbage'}); assert.deepEqual(h.snapshot(), before);
});
function answerNodes(h, answer = ' a ') { h.nodes.set('answer-input-0', {value: answer}); h.nodes.set('iq-feedback-0', {textContent: ''}); }
for (const raw of ['{broken', '[]', '{"q1":null}']) test('scoring preserves corrupted review history ' + raw, async () => {
  const before = {...initial(), [key('imageQuiz')]: JSON.stringify(quiz), [key('imageQuizReviews')]: raw}, h = suiteHarness({initial: before});
  await h.view('image'); answerNodes(h); await h.click('score', {iqcheck: '0'}); assert.deepEqual(h.snapshot(), before); assert.ok(h.alerts.length || /تعذر/.test(h.nodes.get('iq-feedback-0').textContent));
});
test('silent scoring failure does not report a saved answer', async () => {
  const before = {...initial(), [key('imageQuiz')]: JSON.stringify(quiz)}, h = suiteHarness({initial: before, fault: c => c.op === 'setItem' ? 'ignore' : undefined});
  await h.view('image'); answerNodes(h); await h.click('score', {iqcheck: '0'}); assert.match(h.nodes.get('iq-feedback-0').textContent, /تعذر/); assert.deepEqual(h.snapshot(), before);
});
test('valid scoring keeps earlier attempts and unrelated review entries', async () => {
  const history = {q1: {attempts: 3, correct: 2, extension: 'keep'}, other: {attempts: 8, correct: 4}};
  const before = {...initial(), [key('imageQuiz')]: JSON.stringify(quiz), [key('imageQuizReviews')]: JSON.stringify(history)}, h = suiteHarness({initial: before});
  await h.view('image'); answerNodes(h); await h.click('score', {iqcheck: '0'}); const saved = JSON.parse(h.values.get(key('imageQuizReviews')));
  assert.equal(saved.q1.attempts, 4); assert.equal(saved.q1.correct, 3); assert.equal(saved.q1.extension, 'keep'); assert.deepEqual(saved.other, history.other);
});
test('export refuses to disguise unreadable notes as an empty successful backup', async () => {
  const before = {...initial(), [key('splitNotes')]: '{broken'}, h = suiteHarness({initial: before}); await h.click('suite-export'); assert.ok(h.alerts.length); assert.deepEqual(h.snapshot(), before);
});
