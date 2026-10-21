// node tests/pdf_sync_core_check.cjs — Step 63: منطق مزامنة كتابة PDF (الدمج الثلاثي) بلا شبكة. بيانات وهمية.
const C = require('../site/js/pdf-sync-core.js');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const st = (id, page, extra) => Object.assign({ id, page, tool: 'pen', points: [[0, 0], [1, 1]], rev: 1, v: 2 }, extra);
const ids = l => l.map(x => x.id).sort().join(',');

// --- تجزئة ومعرّفات
ok(/^[0-9a-f]{24}$/.test(C.docId('/files/anatomy/lecture-1.pdf')), 'docId is 24 hex');
ok(C.docId('/a.pdf') !== C.docId('/b.pdf') && C.docId('/a.pdf') === C.docId('/a.pdf'), 'docId deterministic and distinct');
ok(!C.docId('/files/المحاضرة.pdf').includes('files'), 'docId hides the path');
ok(C.hashOf({ a: 1, b: 2 }) === C.hashOf({ b: 2, a: 1 }), 'hash ignores key order');
ok(C.hashOf({ a: 1 }) !== C.hashOf({ a: 2 }), 'hash sees changes');

// --- merge3: الحالات الأساسية
const A = st('a', 1), B = st('b', 1), Cc = st('c', 2);
const base = C.snap([A, B]);
let m = C.merge3(base, [A, B, Cc], [A, B]);
ok(ids(m) === 'a,b,c', 'local add kept');
m = C.merge3(base, [A, B], [A, B, Cc]);
ok(ids(m) === 'a,b,c', 'remote add kept');
m = C.merge3(base, [A], [A, B]);
ok(ids(m) === 'a', 'local delete propagates (remote unchanged)');
m = C.merge3(base, [A, B], [A]);
ok(ids(m) === 'a', 'remote delete propagates (local unchanged)');
const B2 = st('b', 1, { color: '#112233', rev: 2 });
m = C.merge3(base, [A], [A, B2]);
ok(ids(m) === 'a,b' && m.find(x => x.id === 'b').color === '#112233', 'local delete vs remote edit: edit survives');
m = C.merge3(base, [A, B2], [A]);
ok(ids(m) === 'a,b' && m.find(x => x.id === 'b').rev === 2, 'remote delete vs local edit: edit survives');
m = C.merge3(base, [A, B2], [A, B]);
ok(m.find(x => x.id === 'b').rev === 2, 'local edit only: local wins');
m = C.merge3(base, [A, B], [A, B2]);
ok(m.find(x => x.id === 'b').rev === 2, 'remote edit only: remote wins');
const B3 = st('b', 1, { color: '#aaaaaa', rev: 3 });
m = C.merge3(base, [A, B2], [A, B3]);
ok(m.find(x => x.id === 'b').rev === 3, 'both edited: higher rev wins');
const B4 = st('b', 1, { color: '#bbbbbb', rev: 2 });
m = C.merge3(base, [A, B2], [A, B4]);
ok(m.find(x => x.id === 'b').color === '#112233', 'both edited, equal rev: this device wins');
m = C.merge3({}, [A, B], [B, Cc]);
ok(ids(m) === 'a,b,c', 'no base (first sync on both): union');
m = C.merge3(base, [], []);
ok(m.length === 0, 'both deleted everything');
m = C.merge3(C.snap([A]), [A, st('x', 1), st('y', 1)], [A, st('z', 1)]);
ok(ids(m) === 'a,x,y,z', 'adds on both sides all kept');
ok(m.map(x => x.id).join() === 'a,z,x,y', 'order: server order first, then local additions ' + m.map(x => x.id).join());
// عناصر قديمة بلا id
const old = { page: 1, tool: 'pen', points: [[0, 0], [1, 1]] };
m = C.merge3(C.snap([old]), [old], [old]);
ok(m.length === 1, 'legacy item without id is not duplicated');
// idempotent: دمج النتيجة مع الخادم مرة ثانية لا يغيّر شيئاً
const m1 = C.merge3(base, [A, B2, Cc], [A, B, st('z', 3)]);
const m2 = C.merge3(C.snap(m1), m1, m1);
ok(C.hashOf(m1) === C.hashOf(m2), 'merging a merged result is stable');

// --- plan: فتح الصفحة
const rowOf = (data, t) => ({ d: JSON.stringify(data), t });
const emptyState = { rows: {} };
// جهاز جديد: لا شيء عنده، والخادم عنده صفحتان
let p = C.plan({ ink: null, study: null, layout: null }, { 'ink:1': rowOf([A], 10), 'ink:2': rowOf([Cc], 11), study: rowOf({ cards: [{ id: 'k1', question: 'q', answer: 'a', page: 1 }] }, 12) }, emptyState);
ok(p.writeLocal.ink && ids(p.writeLocal.ink) === 'a,c', 'new device receives server pages');
ok(p.writeLocal.study && p.writeLocal.study.cards.length === 1, 'new device receives server study data');
ok(Object.values(p.rows).every(r => !r.push && r.state), 'nothing to push after a pure download; state recorded');
ok(p.rows['ink:1'].state.t === 10 && p.rows['ink:2'].state.t === 11, 'state keeps server t');
// أول جهاز: عنده كتابة والخادم فارغ
p = C.plan({ ink: [A, B, Cc], study: { cards: [{ id: 'k', question: 'q', answer: 'a', page: 1 }], masks: [], notes: [], quiz: [], maps: [] }, layout: null }, {}, emptyState);
ok(!p.writeLocal.ink && !p.writeLocal.study, 'first device: no local write');
ok(p.rows['ink:1'].push.base === null && p.rows['ink:2'].push.base === null && p.rows.study.push, 'first device uploads pages and study');
ok(!p.rows.layout, 'absent layout is not uploaded');
ok(JSON.parse(p.rows['ink:1'].push.d).length === 2, 'page 1 row holds only page 1 items');
// لا تغيير
const synced = { rows: { 'ink:1': C.stateAfterPush('ink:1', [A, B], 10) } };
p = C.plan({ ink: [A, B] }, { 'ink:1': rowOf([A, B], 10) }, synced);
ok(!p.rows['ink:1'].push && !p.rows['ink:1'].write && !p.writeLocal.ink, 'unchanged: nothing to do');
// تعديل محلي والخادم كما هو
p = C.plan({ ink: [A, B, Cc] }, { 'ink:1': rowOf([A, B], 10) }, synced);
ok(p.rows['ink:2'] && p.rows['ink:2'].push && p.rows['ink:2'].push.base === null, 'local new page uploaded as new row');
p = C.plan({ ink: [A, B2] }, { 'ink:1': rowOf([A, B], 10) }, synced);
ok(p.rows['ink:1'].push && p.rows['ink:1'].push.base === 10 && !p.writeLocal.ink, 'local edit uploaded with the server t as base');
// الخادم تغيّر والجهاز لم يتغير
p = C.plan({ ink: [A, B] }, { 'ink:1': rowOf([A, B, st('r', 1)], 20) }, synced);
ok(ids(p.writeLocal.ink) === 'a,b,r' && !p.rows['ink:1'].push && p.rows['ink:1'].state.t === 20, 'server changed: download, no upload');
// الطرفان تغيّرا
p = C.plan({ ink: [A, B, st('l', 1)] }, { 'ink:1': rowOf([A, B, st('r', 1)], 20) }, synced);
ok(ids(p.writeLocal.ink) === 'a,b,l,r' && p.rows['ink:1'].push && p.rows['ink:1'].push.base === 20, 'both changed: merged, written locally, uploaded on top of the server version');
ok(ids(JSON.parse(p.rows['ink:1'].push.d)) === 'a,b,l,r', 'uploaded merged content');
// حذف محلي ينتشر كصف فارغ
p = C.plan({ ink: [] }, { 'ink:1': rowOf([A, B], 10) }, synced);
ok(p.rows['ink:1'].push && p.rows['ink:1'].push.d === '[]', 'clearing a page uploads an empty row');
// حذف عند الجهاز الآخر ينتشر إلى هذا الجهاز
p = C.plan({ ink: [A, B] }, { 'ink:1': rowOf([A], 20) }, synced);
ok(ids(p.writeLocal.ink) === 'a', 'deletion on the other device removes it here');
// صفحة جديدة عند الخادم فقط، وصفحة محلية لم تتغير تبقى كما هي
p = C.plan({ ink: [A, B] }, { 'ink:1': rowOf([A, B], 10), 'ink:5': rowOf([st('p5', 5)], 30) }, synced);
ok(ids(p.writeLocal.ink) === 'a,b,p5', 'new remote page appended; other pages untouched');
// صف بعيد تالف لا يُلمس
p = C.plan({ ink: [A] }, { 'ink:1': { d: '{not json', t: 99 } }, emptyState);
ok(p.rows['ink:1'].skip === 'bad_remote' && !p.writeLocal.ink, 'corrupt remote row is skipped, nothing overwritten');
p = C.plan({ ink: [A] }, { 'ink:1': { d: '{"a":1}', t: 99 } }, emptyState);
ok(p.rows['ink:1'].skip === 'bad_remote', 'wrong shape remote row is skipped');
// هوامش الصفحات
p = C.plan({ ink: null, layout: null }, { layout: rowOf({ v: 1, margins: { 2: { l: 0, t: 0.2, r: 0, b: 0 } }, blanks: [], order: null }, 5) }, emptyState);
ok(p.writeLocal.layout && p.writeLocal.layout.margins[2], 'layout downloaded to a device without one');
ok(!p.rows.layout.push, 'empty local layout does not overwrite the server layout');
p = C.plan({ layout: { v: 1, margins: { 3: { l: 0, t: 0, r: 0, b: 0.1 } }, blanks: [], order: null } }, { layout: rowOf({ v: 1, margins: { 2: { l: 0, t: 0.2, r: 0, b: 0 } }, blanks: [], order: null }, 5) }, emptyState);
ok(p.rows.layout.push && !p.writeLocal.layout, 'layout changed on both, no base: this device wins and uploads');

// --- study: دمج لكل قائمة
const card = (id, extra) => Object.assign({ id, question: 'q' + id, answer: 'a', page: 1 }, extra || {});
const studyBase = C.stateAfterPush('study', { cards: [card('1')], notes: [], masks: [], quiz: [], maps: [] }, 7);
p = C.plan({ study: { cards: [card('1'), card('2')], notes: [{ id: 'n1', body: 'x', page: 1 }], masks: [], quiz: [], maps: [] } },
  { study: rowOf({ cards: [card('1'), card('3')], notes: [], masks: [], quiz: [], maps: [] }, 8) }, { rows: { study: studyBase } });
const sm = JSON.parse(p.rows.study.push.d);
ok(ids(sm.cards) === '1,2,3' && sm.notes.length === 1, 'study cards merged by id, notes kept');
ok(p.writeLocal.study && ids(p.writeLocal.study.cards) === '1,2,3', 'study written locally');
// مراجعة بطاقة (Anki) على جهاز واحد
const reviewed = card('1', { due: 123, reps: 2 });
p = C.plan({ study: { cards: [reviewed], notes: [], masks: [], quiz: [], maps: [] } }, { study: rowOf({ cards: [card('1')], notes: [], masks: [], quiz: [], maps: [] }, 7) }, { rows: { study: studyBase } });
ok(p.rows.study.push && JSON.parse(p.rows.study.push.d).cards[0].reps === 2, 'card review on this device is uploaded');
// study فارغ محلياً لا يُرفع
p = C.plan({ study: { masks: [], cards: [], notes: [], quiz: [], maps: [] } }, {}, emptyState);
ok(!(p.rows.study && p.rows.study.push), 'empty study object is not uploaded');

// --- dirtyRows: أثناء الجلسة
let d = C.dirtyRows({ ink: [A, B] }, { rows: {} });
ok(d.length === 1 && d[0].k === 'ink:1' && d[0].base === null, 'first save: one new row');
d = C.dirtyRows({ ink: [A, B] }, synced);
ok(d.length === 0, 'no change: nothing dirty');
d = C.dirtyRows({ ink: [A, B2, Cc] }, synced);
ok(d.map(x => x.k).sort().join() === 'ink:1,ink:2' && d.find(x => x.k === 'ink:1').base === 10 && d.find(x => x.k === 'ink:2').base === null, 'edit + new page: two dirty rows with the right bases');
d = C.dirtyRows({ ink: [] }, synced);
ok(d.length === 1 && d[0].d === '[]', 'erased page is dirty as an empty row');
d = C.dirtyRows({ ink: [A, B], layout: { v: 1, margins: {}, blanks: [], order: null } }, synced);
ok(d.length === 0, 'default layout is not dirty');
const after = C.stateAfterPush('ink:1', [A, B2], 11);
ok(C.dirtyRows({ ink: [A, B2] }, { rows: { 'ink:1': after } }).length === 0, 'after a successful push the row is clean');
ok(Object.keys(after.base).sort().join() === 'a,b' && after.t === 11, 'base snapshot recorded');

console.log(fails ? `PDF SYNC CORE FAIL ${fails}/${n}` : `PDF SYNC CORE OK: ${n} checks`);
process.exit(fails ? 1 : 0);
