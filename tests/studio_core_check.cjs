// node tests/studio_core_check.cjs — pure-logic checks for site/js/studio-core.js
const assert = require('node:assert/strict');
const C = require('../site/js/studio-core.js');
let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); };

// validation + migration (legacy v1 stroke stays valid and gains id)
const legacy = { page: 1, tool: 'pen', color: '#e43d56', width: 3, points: [[0.1, 0.2], [0.3, 0.4]] };
ok(C.validStroke(legacy), 'legacy stroke valid');
ok(!C.validStroke({ page: 0, tool: 'pen', points: [[0, 0]] }), 'page 0 invalid');
ok(!C.validStroke({ page: 1, tool: 'pen', points: [[NaN, 0]] }), 'NaN rejected');
ok(!C.validStroke({ page: 1, tool: 'evil', points: [[0, 0]] }), 'unknown tool rejected');
ok(!C.validStroke({ page: 1, tool: 'pen', color: 'red;x', points: [[0, 0]] }), 'bad color rejected');
ok(!C.validStroke({ page: 1, tool: 'pen', points: [[0, 0]], pr: [1, 2] }), 'pr length mismatch rejected');
const bad = { page: 'x', foo: 1 };
const m1 = C.migrate([legacy, bad]);
ok(m1.changed && m1.list.length === 2 && m1.list[1] === bad && m1.invalid.length === 1, 'invalid kept verbatim');
ok(m1.list[0].id && m1.list[0].v === 2 && m1.list[0].points === legacy.points, 'legacy gets id/v');
const m2 = C.migrate(m1.list);
ok(!m2.changed && m2.list[0] === m1.list[0], 'migration idempotent');

// pressure
ok(C.widthAt(3, 0, 'pen') > 0, 'pressure 0 still draws');
ok(C.widthAt(3, 1, 'pen') > C.widthAt(3, 0, 'pen'), 'width grows with pressure');
ok(C.widthAt(3, undefined, 'pen') === C.widthAt(3, C.MOUSE_PRESSURE, 'pen'), 'mouse fallback = constant');
ok(C.widthAt(3, 0.9, 'highlight') === 18, 'highlighter ignores pressure');

// hit testing (CSS px, isotropic)
const s = { id: 'a', page: 1, tool: 'pen', points: [[0.1, 0.5], [0.9, 0.5]] };
ok(C.distToStroke(s, 0.5, 0.5, 800, 1000) < 0.01, 'on line');
ok(Math.abs(C.distToStroke(s, 0.5, 0.52, 800, 1000) - 20) < 0.01, '20px away = 0.02*1000');
const rect = { id: 'r', page: 1, tool: 'rectangle', points: [[0.2, 0.2], [0.6, 0.6]] };
ok(C.distToStroke(rect, 0.4, 0.4, 800, 1000) > 100, 'inside rect is far from outline');
ok(C.distToStroke(rect, 0.2, 0.4, 800, 1000) < 0.01, 'on rect edge');
const ell = { id: 'e', page: 1, tool: 'ellipse', points: [[0.2, 0.2], [0.6, 0.6]] };
ok(C.distToStroke(ell, 0.6, 0.4, 800, 1000) < 2, 'on ellipse edge');

// spatial index
const idx = new C.SpatialIndex();
const many = []; for (let i = 0; i < 2000; i++) many.push({ id: 'm' + i, page: 1, tool: 'pen', points: [[(i % 50) / 50, Math.floor(i / 50) / 40], [(i % 50) / 50 + 0.01, Math.floor(i / 50) / 40]] });
idx.rebuild(many);
ok(idx.query(0.5, 0.5, 0.02).length < 250, 'index narrows candidates');
ok(idx.query(0.5, 0.5, 0.02).some(x => x.id === 'm' + (25 + 50 * 20)), 'index finds nearby stroke');

// history: one gesture = one command; undo/redo by id
const items = [];
const h = new C.History(items);
const a = { id: 'a', page: 1, tool: 'pen', points: [[0, 0]] }, b = { id: 'b', page: 2, tool: 'pen', points: [[0, 0]] };
items.push(a); h.push([{ k: 'add', s: a }]);
items.push(b); h.push([{ k: 'add', s: b }]);
h.undo(); ok(items.length === 1 && items[0] === a, 'undo add');
h.redo(); ok(items.length === 2, 'redo add');
const delOps = [{ k: 'del', s: a, i: 0 }, { k: 'del', s: b, i: 1 }]; items.splice(0, 2); h.push(delOps);
ok(items.length === 0, 'erased');
h.undo(); ok(items.length === 2 && items[0] === a && items[1] === b, 'one undo restores whole erase gesture in order');
const before = { points: a.points, rev: 1 }, after = { points: [[0.5, 0.5]], rev: 2 };
items[0] = Object.assign({}, items[0], after); h.push([{ k: 'edit', id: 'a', before, after }]);
h.undo(); ok(items[0].points[0][0] === 0, 'undo edit');
h.redo(); ok(items[0].points[0][0] === 0.5, 'redo edit');
for (let i = 0; i < 500; i++) { const x = { id: 'x' + i, page: 1, tool: 'pen', points: [[0, 0]] }; items.push(x); h.push([{ k: 'add', s: x }]); }
ok(h.undoStack.length <= 300 && items.length >= 500, 'bounded history never discards the document');

// transforms
const t = C.transformStroke({ points: [[0.4, 0.4], [0.6, 0.6]], rev: 1 }, { sx: 2, sy: 2, cx: 0.5, cy: 0.5, dx: 0.1 });
ok(Math.abs(t.points[0][0] - 0.4) < 1e-9 && Math.abs(t.points[1][0] - 0.8) < 1e-9 && t.rev === 2, 'scale about centre then translate');
const clampT = C.transformStroke({ points: [[0.9, 0.9]], rev: 1 }, { dx: 0.5, dy: 0.5 });
ok(clampT.points[0][0] === 1 && clampT.points[0][1] === 1, 'clamped to page');

// lasso
const poly = [[0, 0], [1, 0], [1, 0.5], [0, 0.5]];
ok(C.lassoHit({ tool: 'pen', points: [[0.2, 0.2], [0.3, 0.3]] }, poly), 'stroke inside lasso');
ok(!C.lassoHit({ tool: 'pen', points: [[0.2, 0.8], [0.3, 0.9]] }, poly), 'stroke outside lasso');
ok(!C.lassoHit({ tool: 'pen', points: [[0.2, 0.2]] }, [[0, 0], [1, 1]]), 'degenerate polygon selects nothing');

// PDF mapping: top-left of displayed page for each rotation (hand-derived from pdf.js transforms)
const box = { x: 10, y: 20, width: 600, height: 800 };
const near = (p, q) => Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9;
ok(near(C.viewToPdf(0, 0, box, 0), [10, 820]), 'rot0 top-left → (x, top)');
ok(near(C.viewToPdf(1, 1, box, 0), [610, 20]), 'rot0 bottom-right');
ok(near(C.viewToPdf(0, 0, box, 90), [10, 20]), 'rot90 top-left → pdf bottom-left');
ok(near(C.viewToPdf(0, 0, box, 180), [610, 20]), 'rot180 top-left → pdf bottom-right');
ok(near(C.viewToPdf(0, 0, box, 270), [610, 820]), 'rot270 top-left → pdf top-right');
ok(C.displaySize(box, 90)[0] === 800 && C.displaySize(box, 0)[0] === 600, 'display size swaps on 90/270');

// merge (multi-tab)
const L = [{ id: 'a', rev: 2, v: 1 }, { id: 'c', rev: 1 }], R = [{ id: 'a', rev: 1 }, { id: 'b', rev: 1 }, { id: 'gone', rev: 1 }];
const merged = C.mergeById(L, R, new Set(['gone']));
ok(merged.length === 3 && merged.find(x => x.id === 'a').rev === 2 && !merged.find(x => x.id === 'gone'), 'merge union, higher rev, tombstone honoured');

console.log('STUDIO CORE OK: ' + n + ' checks');
