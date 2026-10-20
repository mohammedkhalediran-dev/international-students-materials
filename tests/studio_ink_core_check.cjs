// node tests/studio_ink_core_check.cjs — ink-engine math in site/js/studio-core.js (pens, rotation, images, arrows,
// partial erasing, shape recognition, filter, history). Pure node, no browser.
const assert = require('node:assert/strict');
const C = require('../site/js/studio-core.js');
let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); };
const close = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const nearP = (p, q, e = 1e-9) => close(p[0], q[0], e) && close(p[1], q[1], e);
const isoLen = (p, q, k) => Math.hypot(q[0] - p[0], (q[1] - p[1]) * k);
const noNaN = arr => arr.flat(3).every(Number.isFinite);
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
// separate stream for added checks, so the original fixtures above keep their exact random data
let seed2 = 11; const rnd2 = () => { seed2 = (seed2 * 16807) % 2147483647; return seed2 / 2147483647; };

// 1. constants (old order kept, new entries appended)
ok(JSON.stringify(C.TOOLS) === JSON.stringify(['pen', 'highlight', 'line', 'rectangle', 'ellipse', 'text', 'sticky', 'texthl', 'arrow', 'image']), 'TOOLS appended arrow,image');
ok(JSON.stringify(C.SHAPES) === JSON.stringify(['line', 'rectangle', 'ellipse', 'arrow']), 'SHAPES order');
ok(JSON.stringify(C.PENS) === JSON.stringify(['ballpoint', 'fountain', 'pencil', 'technical']), 'PENS exported');
ok(JSON.stringify(C.OPS) === JSON.stringify(['add', 'del', 'edit', 'mv']), 'OPS exported');

// 2. validation: legacy unchanged, optional ink fields, arrow and image records
const legacy = { page: 1, tool: 'pen', color: '#e43d56', width: 3, points: [[0.1, 0.2], [0.3, 0.4]] };
ok(C.validStroke(legacy), 'legacy v1 stroke still valid');
const mg = C.migrate([legacy]);
ok(mg.list[0].points === legacy.points && mg.list[0].v === 2 && Object.keys(mg.list[0]).sort().join() === 'color,id,page,points,rev,tool,v,width', 'legacy migrate unchanged (only id/v/rev added)');
const ink = { page: 1, tool: 'pen', pen: 'fountain', op: 0.6, wr: [0.3, 2.5], k: 1.414, points: [[0.1, 0.1], [0.2, 0.2]], pr: [0.2, 0.8] };
ok(C.validStroke(ink), 'stroke with every pen field valid');
ok(C.migrate([ink]).list[0].pen === 'fountain' && C.migrate([ink]).list[0].wr === ink.wr, 'migrate keeps ink fields');
const txt = { page: 1, tool: 'text', text: 'Aorta', points: [[0.2, 0.2]], bold: true, italic: false, size: 18 };
ok(C.validStroke(txt), 'text styling valid');
const bad = (base, patch, m) => ok(!C.validStroke(Object.assign({}, base, patch)), m);
bad(ink, { pen: 'brush' }, 'unknown pen rejected');
bad(ink, { op: 0.01 }, 'op below 0.02 rejected'); bad(ink, { op: 1.5 }, 'op above 1 rejected'); bad(ink, { op: NaN }, 'op NaN rejected'); bad(ink, { op: '0.5' }, 'op string rejected');
bad(ink, { wr: [0.05, 1] }, 'wr min < 0.1 rejected'); bad(ink, { wr: [2, 1] }, 'wr min > max rejected'); bad(ink, { wr: [1, 5] }, 'wr max > 4 rejected'); bad(ink, { wr: [1] }, 'wr length rejected'); bad(ink, { wr: [NaN, 1] }, 'wr NaN rejected');
bad(ink, { rot: 51 }, 'rot > 50 rejected'); bad(ink, { rot: -Infinity }, 'rot infinite rejected');
bad(ink, { k: 0.01 }, 'k < 0.05 rejected'); bad(ink, { k: 25 }, 'k > 20 rejected');
bad(txt, { bold: 'yes' }, 'bold non-boolean rejected'); bad(txt, { italic: 1 }, 'italic non-boolean rejected');
bad(txt, { size: 3 }, 'size < 4 rejected'); bad(txt, { size: 401 }, 'size > 400 rejected');
const arrow = { page: 1, tool: 'arrow', color: '#2255aa', width: 3, k: 1.414, points: [[0.1, 0.5], [0.5, 0.5]] };
ok(C.validStroke(arrow) && C.validStroke(Object.assign({}, arrow, { head: 'both' })), 'arrow valid (end/both)');
bad(arrow, { head: 'start' }, 'bad head rejected'); bad(arrow, { points: [[0.1, 0.5]] }, 'arrow needs 2 points');
const img = { page: 2, tool: 'image', asset: 'img_0123456789abcdef', points: [[0.2, 0.2]], w: 0.2, h: 0.1, k: 1.25, ar: 2, crop: [0, 0, 1, 1], fx: true, fy: false, op: 0.9 };
ok(C.validStroke(img), 'image record valid');
const imgMin = { page: 2, tool: 'image', asset: 'img_' + 'a'.repeat(64), points: [[0.2, 0.2]], w: 0.2, h: 0.1, k: 1.25 };
ok(C.validStroke(imgMin), 'minimal image valid (64 hex)');
bad(img, { asset: undefined }, 'image needs asset'); bad(img, { asset: 'img_0123456789abcde' }, 'asset 15 hex rejected'); bad(img, { asset: 'img_0123456789ABCDEF' }, 'asset upper-case rejected'); bad(img, { asset: 'img_' + 'a'.repeat(65) }, 'asset 65 hex rejected'); bad(img, { asset: '../x' }, 'asset path rejected');
bad(img, { points: [[0.2, 0.2], [0.3, 0.3]] }, 'image needs exactly one point');
bad(img, { w: 0 }, 'image w 0 rejected'); bad(img, { w: 10.5 }, 'image w > 10 rejected'); bad(img, { h: NaN }, 'image h NaN rejected'); bad(img, { h: undefined }, 'image needs h');
bad(img, { k: undefined }, 'image needs k'); bad(img, { fx: 'y' }, 'fx non-boolean rejected'); bad(img, { fy: 0 }, 'fy non-boolean rejected');
bad(img, { crop: [0, 0, 0.005, 1] }, 'crop too narrow rejected'); bad(img, { crop: [0, 0.5, 1, 0.505] }, 'crop too short rejected'); bad(img, { crop: [-0.1, 0, 1, 1] }, 'crop out of range rejected'); bad(img, { crop: [0, 0, 1] }, 'crop length rejected');
bad(img, { ar: 0 }, 'ar 0 rejected'); bad(img, { ar: -2 }, 'ar negative rejected'); bad(img, { op: 0 }, 'image op rejected');
// every new field: wrong type / non-finite / out of range is rejected; the documented limits are accepted
bad(ink, { pen: 1 }, 'pen non-string rejected'); bad(ink, { pen: 'Fountain' }, 'pen is case-sensitive');
bad(ink, { op: Infinity }, 'op infinite rejected'); bad(ink, { wr: '0.3,2' }, 'wr non-array rejected'); bad(ink, { wr: [0.3, 2, 3] }, 'wr length 3 rejected'); bad(ink, { wr: [0.3, '2'] }, 'wr string entry rejected');
bad(ink, { rot: NaN }, 'rot NaN rejected'); bad(ink, { rot: '1' }, 'rot string rejected'); bad(ink, { k: NaN }, 'k NaN rejected'); bad(ink, { k: '1.4' }, 'k string rejected'); bad(ink, { k: 0 }, 'k 0 rejected');
bad(txt, { size: NaN }, 'size NaN rejected'); bad(txt, { size: '18' }, 'size string rejected'); bad(txt, { bold: 0 }, 'bold 0 rejected'); bad(txt, { italic: 'false' }, 'italic string rejected');
bad(arrow, { head: 1 }, 'head non-string rejected'); bad(arrow, { head: 'END' }, 'head is case-sensitive'); bad(arrow, { points: [] }, 'arrow without points rejected');
bad(img, { asset: 7 }, 'asset number rejected'); bad(img, { asset: 'IMG_0123456789abcdef' }, 'asset prefix case rejected'); bad(img, { asset: 'img_0123456789abcdeg' }, 'asset non-hex rejected');
bad(img, { points: [] }, 'image without point rejected'); bad(img, { points: [[0.2, NaN]] }, 'image NaN point rejected');
bad(img, { w: '0.2' }, 'image w string rejected'); bad(img, { h: -0.1 }, 'image h negative rejected'); bad(img, { h: 10.01 }, 'image h > 10 rejected');
bad(img, { k: 0 }, 'image k 0 rejected'); bad(img, { k: 30 }, 'image k > 20 rejected'); bad(img, { rot: 60 }, 'image rot > 50 rejected');
bad(img, { crop: [0, 0, 1.2, 1] }, 'crop above 1 rejected'); bad(img, { crop: [0.5, 0, 0.2, 1] }, 'crop inverted rejected'); bad(img, { crop: [0, 0, 1, NaN] }, 'crop NaN rejected'); bad(img, { crop: '0,0,1,1' }, 'crop string rejected');
bad(img, { ar: Infinity }, 'ar infinite rejected'); bad(img, { ar: '2' }, 'ar string rejected'); bad(img, { fx: null, fy: 'n' }, 'fy string rejected');
const edge = [{ op: 0.02 }, { op: 1 }, { wr: [0.1, 0.1] }, { wr: [4, 4] }, { rot: -50 }, { rot: 50 }, { k: 0.05 }, { k: 20 }];
ok(edge.every(p => C.validStroke(Object.assign({}, ink, p))) && [{ size: 4 }, { size: 400 }, { bold: false, italic: true }].every(p => C.validStroke(Object.assign({}, txt, p))), 'limits themselves are accepted');
ok(C.validStroke(Object.assign({}, img, { w: 10, h: 10, crop: [0, 0, 0.02, 0.02], k: 20 })) && C.validStroke(Object.assign({}, img, { fx: null, crop: null, ar: null })), 'image limits accepted; null optional fields = absent');
// v1 records of every old tool stay valid, and migrate only adds id/v/rev (the stored geometry is the same object)
const v1 = [legacy,
  { page: 2, tool: 'highlight', color: '#ffee00', width: 4, points: [[0.1, 0.1], [0.4, 0.1]], pr: [0.5, 0.5] },
  { page: 1, tool: 'line', color: '#000', width: 2, points: [[0, 0], [1, 1]] },
  { page: 1, tool: 'rectangle', color: '#123456', width: 2, points: [[0.2, 0.2], [0.6, 0.6]] },
  { page: 1, tool: 'ellipse', color: '#123456', width: 2, points: [[0.2, 0.2], [0.6, 0.5]] },
  { page: 3, tool: 'text', color: '#222222', text: 'Aorta', points: [[0.1, 0.1]] },
  { page: 3, tool: 'sticky', text: '', points: [[0.1, 0.1]], w: 0.2, h: 0.1 },
  { page: 4, tool: 'texthl', color: '#f2c230', points: [[0.1, 0.1], [0.5, 0.12]], rects: [[0.1, 0.1, 0.5, 0.12]], quote: 'q' }];
ok(v1.every(C.validStroke), 'every v1 tool still valid without ink fields');
const mv1 = C.migrate(v1);
ok(mv1.changed && mv1.invalid.length === 0 && mv1.list.every((s, i) => Object.keys(s).filter(x => !(x in v1[i])).sort().join() === 'id,rev,v' && Object.keys(v1[i]).every(x => s[x] === v1[i][x])), 'migrate adds only id/v/rev to every v1 tool');
const mv2 = C.migrate(mv1.list);
ok(!mv2.changed && mv2.list.every((s, i) => s === mv1.list[i]) && new Set(mv1.list.map(s => s.id)).size === v1.length, 'migrate idempotent; ids unique');
ok(C.migrate(v1).list.every((s, i) => s.id === mv1.list[i].id), 'legacy ids deterministic across runs');

// 3. geometry
ok(nearP(C.toIso([0.3, 0.4], 1.5), [0.3, 0.6]) && nearP(C.fromIso([0.3, 0.6], 1.5), [0.3, 0.4]) && nearP(C.toIso([0.3, 0.4]), [0.3, 0.4]), 'toIso/fromIso');
ok(nearP(C.rotateIso([0.6, 0.5], [0.5, 0.5], Math.PI / 2, 2), [0.5, 0.55]), 'rotateIso: +90° is clockwise on screen, iso-correct');
const b0 = C.bounds(img);
ok(nearP(b0.slice(0, 2), [0.2, 0.2]) && nearP(b0.slice(2), [0.4, 0.3]), 'image bounds unrotated');
const img90 = Object.assign({}, img, { rot: Math.PI / 2 }), b90 = C.bounds(img90);
ok(close(b90[2] - b90[0], 0.1 * 1.25) && close(b90[3] - b90[1], 0.2 / 1.25) && close((b90[0] + b90[2]) / 2, 0.3) && close((b90[1] + b90[3]) / 2, 0.25), 'image bounds after 90°: iso dimensions swap about the centre');
const K = 1.414;
const sq = { page: 1, tool: 'rectangle', k: K, rot: Math.PI / 4, points: [[0.4, 0.4], [0.6, 0.4 + 0.2 / K]] };
const bs = C.bounds(sq), hd = 0.1 * Math.SQRT2, cyq = 0.4 + 0.1 / K;
ok(close(bs[0], 0.5 - hd) && close(bs[2], 0.5 + hd) && close(bs[1], cyq - hd / K) && close(bs[3], cyq + hd / K), 'rotated square bounds = diagonal (iso)');
const el = { page: 1, tool: 'ellipse', k: K, rot: Math.PI / 2, points: [[0.4, 0.5], [0.6, 0.5 + 0.1 / K]] };
const be = C.bounds(el), ecy = 0.5 + 0.05 / K;
ok(close(be[0], 0.5 - 0.05) && close(be[2], 0.5 + 0.05) && close(be[1], ecy - 0.1 / K) && close(be[3], ecy + 0.1 / K), 'rotated ellipse bounds swap radii');
ok(JSON.stringify(C.bounds({ page: 1, tool: 'rectangle', points: [[0.2, 0.2], [0.6, 0.6]] })) === JSON.stringify([0.2, 0.2, 0.6, 0.6]), 'unrotated rectangle bounds unchanged');
const segR = C.shapeSegments(sq);
ok(segR.length === 4 && segR.every(([a, b]) => close(isoLen(a, b, K), 0.2)) && close(segR[0][0][0], 0.5, 1e-12) && close(segR[0][0][1], cyq - hd / K), 'rotated rectangle segments: same side lengths, corner moved');
const segE = C.shapeSegments(el);
ok(segE.length === 40 && segE.every(([a]) => close(isoLen(a, [0.5, ecy], K) <= 0.1 + 1e-9 ? 1 : 0, 1)), 'rotated ellipse segments stay within radius');
const head = C.arrowHead([0.1, 0.5], [0.5, 0.5], 0.05, K);
const angIso = (o, p, q) => { const ax = p[0] - o[0], ay = (p[1] - o[1]) * K, bx = q[0] - o[0], by = (q[1] - o[1]) * K; return Math.acos((ax * bx + ay * by) / Math.hypot(ax, ay) / Math.hypot(bx, by)); };
ok(head.length === 2 && head.every(([o, p]) => nearP(o, [0.5, 0.5]) && close(isoLen(o, p, K), 0.05)), 'arrow head: 2 segments from the tip, length sizeU in iso');
ok(head.every(([o, p]) => close(angIso(o, [0.1, 0.5], p), 28 * Math.PI / 180, 1e-9)), 'arrow head at ±28° from the shaft');
const headD = C.arrowHead([0.1, 0.1], [0.4, 0.5], 0.04, K);
ok(headD.every(([o, p]) => close(angIso(o, [0.1, 0.1], p), 28 * Math.PI / 180, 1e-9) && close(isoLen(o, p, K), 0.04)), 'diagonal arrow head is iso-correct on a tall page');
ok(nearP(headD[0][1].map((x, i) => x - 0.4 * (i === 0) - 0.5 * (i === 1)), [0, 0]) === false, 'head points differ from the tip');
const sa = C.shapeSegments(arrow), sab = C.shapeSegments(Object.assign({}, arrow, { head: 'both' }));
ok(sa.length === 3 && sab.length === 5 && nearP(sab[3][0], [0.1, 0.5]), 'arrow segments: shaft + head (+ start head for both)');
const hs = C.arrowHeadSize(arrow);
ok(close(hs, 15 / 800) && C.arrowHeadSize(Object.assign({}, arrow, { points: [[0.1, 0.5], [0.12, 0.5]] })) <= 0.45 * 0.02 + 1e-12, 'arrow head size follows width, capped at 45% of the shaft');
const ba = C.bounds(arrow);
ok(ba[0] === 0.1 && ba[2] === 0.5 && ba[1] < 0.5 && ba[3] > 0.5 && close(0.5 - ba[1], hs * Math.sin(28 * Math.PI / 180) / K), 'arrow bounds include the head');
ok(C.distToStroke(img, 0.3, 0.25, 800, 1000) === 0 && close(C.distToStroke(img, 0.5, 0.25, 800, 1000), 80), 'image hit: inside 0, else px to outline');
ok(C.distToStroke(img90, 0.36, 0.25, 800, 1000) === 0 && C.distToStroke(img90, 0.3, 0.32, 800, 1000) === 0 && close(C.distToStroke(img90, 0.37, 0.25, 800, 1000), 6, 1e-6), 'rotated image hit uses the rotated box');
ok(C.distToStroke(img90, 0.38, 0.25, 800, 1000) > 0 && C.distToStroke(img, 0.38, 0.25, 800, 1000) === 0, 'rotation changes what is hit');
ok(C.distToStroke(arrow, 0.5 - hs * Math.cos(28 * Math.PI / 180), 0.5 - hs * Math.sin(28 * Math.PI / 180) / K, 800, 800 * K) < 1e-6, 'arrow head is hittable');
ok(C.lassoHit(img, [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]]) && !C.lassoHit(img, [[0, 0], [0.25, 0], [0.25, 0.22], [0, 0.22]]), 'image lasso = box centre inside');
const idx = new C.SpatialIndex(); const imgI = Object.assign({ id: 'i1' }, img90); idx.insert(imgI);
ok(idx.query(0.36, 0.25, 0).includes(imgI), 'spatial index uses rotated image bounds');
const bK1 = C.bounds(Object.assign({}, img, { k: 1, rot: Math.PI / 2 })), b180 = C.bounds(Object.assign({}, img, { rot: Math.PI }));
ok(close(bK1[0], 0.25) && close(bK1[2], 0.35) && close(bK1[1], 0.15) && close(bK1[3], 0.35), 'image 90° on a square page: w and h swap exactly');
ok(b180.every((x, i) => close(x, b0[i], 1e-12)), 'image 180°: same bounds as unrotated');
const b30 = C.bounds(Object.assign({}, img, { rot: Math.PI / 6 })), wI = 0.2, hI = 0.1 * 1.25;
ok(close(b30[2] - b30[0], wI * Math.cos(Math.PI / 6) + hI * Math.sin(Math.PI / 6)) && close((b30[3] - b30[1]) * 1.25, wI * Math.sin(Math.PI / 6) + hI * Math.cos(Math.PI / 6)), 'image 30°: bounds = rotated iso box');
const cs = C.boxCorners(img90);
ok(cs.length === 4 && close(isoLen(cs[0], cs[1], 1.25), 0.2) && close(isoLen(cs[1], cs[2], 1.25), 0.125) && nearP(cs[0], [0.3 + 0.0625, 0.25 - 0.08]), 'boxCorners: tl rotated clockwise about the centre, iso side lengths kept');
ok(segE.every(([p]) => { const q = C.rotateIso(p, [0.5, ecy], -Math.PI / 2, K); return close(((q[0] - 0.5) / 0.1) ** 2 + ((q[1] - ecy) / (0.05 / K)) ** 2, 1, 1e-9); }), 'rotated ellipse points satisfy the ellipse equation once rotated back');
ok(nearP(C.rotateIso(C.rotateIso([0.7, 0.2], [0.4, 0.6], 0.83, 1.7), [0.4, 0.6], -0.83, 1.7), [0.7, 0.2], 1e-12) && nearP(C.rotateIso([0.7, 0.2], [0.4, 0.6], 0, 1.7), [0.7, 0.2]), 'rotateIso inverse and identity');

// 4. transforms: rotation (iso), images, text upright, texthl fixed, pr kept
const pen = { page: 1, tool: 'pen', rev: 3, points: [[0.3, 0.4], [0.5, 0.45], [0.6, 0.5]], pr: [0.2, 0.5, 0.9] };
const piv = { cx: 0.45, cy: 0.45, k: K };
const r1 = C.transformStroke(pen, Object.assign({ rot: Math.PI / 2 }, piv));
const r2 = C.transformStroke(Object.assign({}, pen, r1), Object.assign({ rot: -Math.PI / 2 }, piv));
ok(r2.points.every((p, i) => nearP(p, pen.points[i])), 'rotate 90° about centre on k=1.414 and back = original (1e-9)');
ok(close(isoLen(r1.points[0], r1.points[2], K), isoLen(pen.points[0], pen.points[2], K)) && r1.rev === 4 && r1.pr === pen.pr && r2.pr === pen.pr, 'rotation keeps iso lengths, bumps rev, never drops pr');
const dv = [pen.points[2][0] - pen.points[0][0], (pen.points[2][1] - pen.points[0][1]) * K], dr = [r1.points[2][0] - r1.points[0][0], (r1.points[2][1] - r1.points[0][1]) * K];
ok(close(dv[0] * dr[0] + dv[1] * dr[1], 0, 1e-12) && close(dr[0], -dv[1]) && close(dr[1], dv[0]), '90° rotation is perpendicular in iso space (clockwise)');
const t0 = C.transformStroke(pen, { sx: 1.5, sy: 0.5, cx: 0.4, cy: 0.4, dx: 0.05 }), t0r = C.transformStroke(pen, { sx: 1.5, sy: 0.5, cx: 0.4, cy: 0.4, dx: 0.05, rot: 0 });
ok(JSON.stringify(t0.points) === JSON.stringify(t0r.points) && close(t0.points[0][0], 0.4 + (0.3 - 0.4) * 1.5 + 0.05), 'rot 0 = legacy scale/translate exactly');
const ar1 = C.transformStroke(arrow, { rot: Math.PI / 2, cx: 0.3, cy: 0.5, k: K });
ok(ar1.k === K && close(isoLen(ar1.points[0], ar1.points[1], K), 0.4) && close(ar1.points[0][0], 0.3), 'arrow rotates like a line and records k');
const ip = { cx: 0.5, cy: 0.5, k: 1.25, rot: Math.PI / 2 };
const ri = C.transformStroke(img, ip);
ok(nearP(ri.points[0], [0.7125, 0.29]) && ri.w === 0.2 && ri.h === 0.1 && close(ri.rot, Math.PI / 2) && ri.k === 1.25, 'image: centre rotates about the pivot, size kept, rot added, k set');
const riBack = C.transformStroke(Object.assign({}, img, ri), Object.assign({}, ip, { rot: -Math.PI / 2 }));
ok(nearP(riBack.points[0], img.points[0]) && riBack.rot === 0, 'image rotate and back = original');
const rSelf = C.transformStroke(img, { cx: 0.3, cy: 0.25, k: 1.25, rot: 0.3 });
ok(nearP(rSelf.points[0], img.points[0]) && close(rSelf.rot, 0.3), 'image rotated about its own centre: top-left (unrotated box) unchanged');
const iscale = C.transformStroke(img, { sx: 2, sy: 0.5, cx: 0.2, cy: 0.2 });
ok(nearP(iscale.points[0], [0.2, 0.2]) && close(iscale.w, 0.4) && close(iscale.h, 0.05), 'image scale: w,h by |sx|,|sy|, top-left follows the scale');
const iflip = C.transformStroke(img, { sx: -1, cx: 0.5, cy: 0.5 });
ok(close(iflip.w, 0.2) && nearP(iflip.points[0], [0.6, 0.2]), 'image negative scale keeps a positive box');
const iclamp = C.transformStroke(img, { dx: 2 });
ok(nearP(iclamp.points[0], [0.9, 0.2]), 'image move clamped to the page by its centre');
const iclampM = C.transformStroke(img, { dx: 2, bx: [-0.2, 1.2] });
ok(nearP(iclampM.points[0], [1.1, 0.2]), 'image clamp honours margins (bx)');
const rect = { page: 1, tool: 'rectangle', points: [[0.2, 0.2], [0.4, 0.3]] };
const rr = C.transformStroke(rect, ip);
ok(nearP(rr.points[0], [0.7125, 0.29]) && nearP(rr.points[1], [0.9125, 0.39]) && close(rr.rot, Math.PI / 2) && rr.k === 1.25, 'rectangle: corners re-centred on the rotated centre, rot/k set');
const rrb = C.bounds(Object.assign({}, rect, rr));
ok(close(rrb[2] - rrb[0], 0.125) && close(rrb[3] - rrb[1], 0.16), 'rotated rectangle bounds = swapped iso size');
const ell = { page: 1, tool: 'ellipse', rot: 0.2, k: 1.25, points: [[0.2, 0.2], [0.4, 0.3]] };
ok(close(C.transformStroke(ell, ip).rot, 0.2 + Math.PI / 2), 'ellipse rot accumulates');
ok(close(C.transformStroke(Object.assign({}, ell, { rot: 3 }), { rot: 1, k: 1.25 }).rot, 4 - 2 * Math.PI), 'accumulated rot is normalised to (-π, π]');
const text = { page: 1, tool: 'text', text: 'x', points: [[0.2, 0.2]], w: 0.2, h: 0.1 };
const rt = C.transformStroke(text, ip);
ok(nearP(rt.points[0], [0.7125, 0.29]) && rt.rot === undefined && rt.w === 0.2, 'text: anchor follows the rotated centre, text stays upright');
const th = { page: 1, tool: 'texthl', points: [[0.1, 0.1], [0.5, 0.12]], rects: [[0.1, 0.1, 0.5, 0.12]], rev: 5 };
const rth = C.transformStroke(th, ip);
ok(JSON.stringify(rth.points) === JSON.stringify(th.points) && rth.rev === 6 && rth.rot === undefined, 'texthl geometry unchanged by rotation (rev+1)');
const rclamp = C.transformStroke({ page: 1, tool: 'pen', points: [[0.95, 0.5], [0.99, 0.5]] }, { rot: Math.PI / 2, cx: 0.5, cy: 0.5 });
ok(rclamp.points.every(p => p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1), 'rotated points clamped to the page');
// texthl: never moved, scaled or rotated, whatever the transform; rev+1 and pr kept
const thp = Object.assign({}, th, { pr: [0.3, 0.6] });
for (const m of [{ dx: 0.3, dy: -0.1 }, { sx: 2, sy: 3, cx: 0.2, cy: 0.2 }, { rot: 1, cx: 0.5, cy: 0.5, k: 1.3 }, { sx: -1, dx: 2, rot: -2, bx: [-0.5, 1.5] }]) {
  const t = C.transformStroke(thp, m);
  ok(JSON.stringify(t.points) === JSON.stringify(thp.points) && JSON.stringify(t.rects) === JSON.stringify(thp.rects) && t.rev === 6 && t.pr === thp.pr && Object.keys(t).sort().join() === 'points,pr,rects,rev', 'texthl untouched by ' + JSON.stringify(m));
}
// scale/translate without rotation = the pre-rotation code exactly (every tool that existed then, except texthl)
const legacyT = (s, m) => {
  const sx = m.sx == null ? 1 : m.sx, sy = m.sy == null ? 1 : m.sy, cx = m.cx || 0, cy = m.cy || 0, dx = m.dx || 0, dy = m.dy || 0, bx = m.bx || [0, 1], by = m.by || [0, 1];
  const o = { points: s.points.map(p => [C.clamp(cx + (p[0] - cx) * sx + dx, bx[0], bx[1]), C.clamp(cy + (p[1] - cy) * sy + dy, by[0], by[1])]), rev: (s.rev || 1) + 1 };
  if (s.w != null) o.w = Math.max(0.02, s.w * Math.abs(sx)); if (s.h != null) o.h = Math.max(0.02, s.h * Math.abs(sy));
  return o;
};
const fixtures = [pen, Object.assign({}, pen, { tool: 'highlight' }), { page: 1, tool: 'line', points: [[0.2, 0.3], [0.7, 0.8]] }, rect, Object.assign({}, ell, { rot: undefined }),
  text, { page: 1, tool: 'sticky', text: '', points: [[0.6, 0.7]] }, arrow];
// already-rotated boxes have no legacy behaviour: they scale about the pivot and are moved/clamped by their centre
// (their stored corners may lie off the page; clamping each corner would resize and shift them)
const rotBoxes = [Object.assign({}, ell), Object.assign({}, sq, { rev: 9 })];
const byCentre = (s, m) => {
  const sx = m.sx == null ? 1 : m.sx, sy = m.sy == null ? 1 : m.sy, cx = m.cx || 0, cy = m.cy || 0, bx = m.bx || [0, 1], by = m.by || [0, 1];
  const sp = s.points.map(p => [cx + (p[0] - cx) * sx, cy + (p[1] - cy) * sy]), a = sp[0], b = sp[sp.length - 1], c0 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const ox = C.clamp(c0[0] + (m.dx || 0), bx[0], bx[1]) - c0[0], oy = C.clamp(c0[1] + (m.dy || 0), by[0], by[1]) - c0[1];
  return sp.map(p => [p[0] + ox, p[1] + oy]);
};
let sameAsLegacy = true, noRotKeys = true, rotByCentre = true;
for (let i = 0; i < 40; i++) {
  const m = { sx: 0.2 + rnd2() * 2 * (rnd2() < 0.2 ? -1 : 1), sy: 0.2 + rnd2() * 2, cx: rnd2(), cy: rnd2(), dx: (rnd2() - 0.5) * 0.6, dy: (rnd2() - 0.5) * 0.6 };
  if (i % 3 === 1) { m.bx = [-0.2, 1.2]; m.by = [-0.1, 1.1]; }
  if (i % 2) m.rot = 0;
  for (const s of fixtures) {
    const t = C.transformStroke(s, m), L = legacyT(s, m);
    if (JSON.stringify([t.points, t.w, t.h, t.rev]) !== JSON.stringify([L.points, L.w, L.h, L.rev])) sameAsLegacy = false;
    if ('rot' in t || 'k' in t) noRotKeys = false;
  }
  for (const s of rotBoxes) {
    const t = C.transformStroke(s, m), e = byCentre(s, m);
    if (!(t.points.every((p, j) => nearP(p, e[j], 1e-12)) && t.rev === (s.rev || 1) + 1)) rotByCentre = false;
    if ('rot' in t || 'k' in t) noRotKeys = false;
  }
}
ok(sameAsLegacy, 'no rotation: scale/translate/clamp identical to the legacy transform (40 random cases x 8 strokes)');
ok(noRotKeys, 'no rotation: rot/k never written (a rotated shape keeps its own rot)');
ok(rotByCentre, 'no rotation, already-rotated rectangle/ellipse: scaled about the pivot, moved and clamped by its centre');
// pen/highlight/line rotate their points in iso space; arrow does too and records k; pr kept by reference
const hlS = { page: 1, tool: 'highlight', width: 4, points: [[0.3, 0.3], [0.5, 0.35]], pr: [0.4, 0.6] }, lnS = { page: 1, tool: 'line', points: [[0.3, 0.3], [0.5, 0.35]] };
const pv = { cx: 0.4, cy: 0.4, rot: -Math.PI / 2, k: K };
for (const s of [hlS, lnS]) {
  const t = C.transformStroke(s, pv), e = s.points.map(p => C.rotateIso(p, [0.4, 0.4], -Math.PI / 2, K));
  ok(t.points.every((p, i) => nearP(p, e[i], 1e-12)) && close(isoLen(t.points[0], t.points[1], K), isoLen(s.points[0], s.points[1], K)), s.tool + ': points rotated in iso space');
}
ok(C.transformStroke(hlS, pv).pr === hlS.pr, 'highlight pr kept through rotation');
ok(nearP(C.transformStroke(lnS, pv).points[0], [0.4 + (0.3 - 0.4) * K, 0.4 + 0.1 / K], 1e-12), 'counter-clockwise -90°: (x,y) -> (y,-x) in iso');
const arK = C.transformStroke(arrow, { rot: Math.PI / 3, cx: 0.3, cy: 0.5 });
ok(arK.k === K && close(isoLen(arK.points[0], arK.points[1], K), 0.4), 'without m.k the stroke\'s own k is used (and recorded)');
const pM = C.transformStroke({ page: 1, tool: 'pen', points: [[0.5, 0.5], [0.5, 0]] }, { rot: Math.PI / 2, cx: 0.5, cy: 0.5, k: 1, dx: 0.3, bx: [-0.1, 1.1], by: [-0.05, 1.05] });
ok(nearP(pM.points[0], [0.8, 0.5], 1e-12) && nearP(pM.points[1], [1.1, 0.5], 1e-12), 'rotate + move clamps to the margins in m.bx/m.by');
// image / rectangle / ellipse: centre rotates about the pivot, size kept, rot accumulates, k on the result
const ri2 = C.transformStroke(img, { sx: 2, sy: 2, cx: 0.5, cy: 0.5, rot: Math.PI / 2, k: 1.25 });
ok(nearP(ri2.points[0], [0.8, 0.08], 1e-12) && close(ri2.w, 0.4) && close(ri2.h, 0.2) && close(ri2.rot, Math.PI / 2) && ri2.k === 1.25, 'image scale + rotate: centre scaled, rotated, then clamped to the page');
const imgR = Object.assign({}, img, { rot: 0.4 }), ri3 = C.transformStroke(imgR, { rot: 0.5, cx: 0.1, cy: 0.9 });
const cExp = C.rotateIso([0.3, 0.25], [0.1, 0.9], 0.5, 1.25);
ok(nearP([ri3.points[0][0] + 0.1, ri3.points[0][1] + 0.05], cExp, 1e-12) && close(ri3.rot, 0.9) && ri3.k === 1.25 && ri3.w === 0.2 && ri3.h === 0.1, 'image without m.k: rotates with its own k, rot 0.4 + 0.5');
const re = C.transformStroke(ell, ip), ec = [(re.points[0][0] + re.points[1][0]) / 2, (re.points[0][1] + re.points[1][1]) / 2];
ok(nearP(ec, C.rotateIso([0.3, 0.25], [0.5, 0.5], Math.PI / 2, 1.25), 1e-12) && close(re.points[1][0] - re.points[0][0], 0.2) && close(re.points[1][1] - re.points[0][1], 0.1) && re.k === 1.25, 'ellipse: centre rotated, size kept, k set');
ok(C.validStroke(Object.assign({}, img, ri2)) && C.validStroke(Object.assign({}, rect, rr)) && C.validStroke(Object.assign({}, ell, re)), 'rotated results stay valid records');
// text/sticky: only the anchor moves with the rotated centre (default box 0.28 x 0.1 when w/h are absent)
const stk = { page: 1, tool: 'sticky', text: 'n', points: [[0.1, 0.1]], rev: 2 }, rs = C.transformStroke(stk, { cx: 0.5, cy: 0.5, k: 1, rot: Math.PI / 2 });
ok(nearP(rs.points[0], [0.71, 0.19], 1e-12) && !('w' in rs) && !('h' in rs) && !('rot' in rs) && rs.rev === 3, 'sticky: anchor follows the rotated default box centre, no size or rot written');
const rtb = C.transformStroke(text, { cx: 0.5, cy: 0.5, k: 1.25, rot: Math.PI / 2, dx: 0.9, bx: [0, 1] });
ok(close(rtb.points[0][0], 1) && close(rtb.points[0][1], 0.29), 'text: rotated anchor still clamped');

// 5. pens
const PS = { ballpoint: [0.25, 0.12, 0.45, 1, 0, 0], fountain: [1, 0.55, 0.55, 1, 0.35, 0.35], pencil: [0.6, 0.3, 0.35, 0.82, 0.1, 0], technical: [0, 0, 0.15, 1, 0, 0] };
const key = st => [st.pressure, st.taper, st.smooth, st.alpha, st.thin, st.nib];
ok(Object.entries(PS).every(([p, v]) => JSON.stringify(key(C.penStyle(p))) === JSON.stringify(v)), 'penStyle table');
ok(JSON.stringify(C.penStyle('quill')) === JSON.stringify(C.penStyle('ballpoint')) && JSON.stringify(C.penStyle()) === JSON.stringify(C.penStyle('ballpoint')), 'unknown/undefined pen = ballpoint');
const ps = C.penStyle('pencil'); ps.alpha = 0; ok(C.penStyle('pencil').alpha === 0.82, 'penStyle returns a copy');
const line41 = Array.from({ length: 41 }, (_, i) => [0.1 + i * 0.01, 0.5]);
const wt = C.penWidths({ points: line41, width: 3, pen: 'technical', pr: line41.map((_, i) => i / 40) }, 800, 1131);
ok(wt.length === 41 && wt.every(w => w === 3), 'technical pen: constant width, ignores pressure, no taper');
ok(JSON.stringify(C.penWidths({ points: [[0.5, 0.5]], width: 4, pr: [1] }, 1600, 2000)) === JSON.stringify([8]), 'single point -> [base] (base = width*pw/800)');
const wb = C.penWidths({ points: line41, width: 3, pen: 'ballpoint', pr: line41.map((_, i) => i / 40) }, 800, 1131);
ok(close(wb[20], 3) && close(wb[30], 3 * (1 + 0.25 * (0.35 + 1.3 * 0.75 - 1))), 'ballpoint: pressure formula (p=.5 -> base)');
ok(wb[30] > wb[20] && wb[20] > wb[10], 'ballpoint width grows with pressure');
const wflat = C.penWidths({ points: line41, width: 3 }, 800, 1131);
ok(close(wflat[0], 3 * (1 - 0.85 * 0.12)) && close(wflat[40], wflat[0]) && close(wflat[20], 3) && wflat[1] > wflat[0], 'taper: ends start at (1-0.85*taper)*base and ease to base');
ok(wflat.filter(w => w < 3 - 1e-9).length <= 6, 'taper limited to ~3 widths of distance');
const wclamp = C.penWidths({ points: line41, width: 3, pr: line41.map(() => 1), wr: [0.5, 1.1] }, 800, 1131);
ok(close(wclamp[20], 3.3), 'width clamped to base*wr[1]');
const wlo = C.penWidths({ points: line41, width: 3, pen: 'fountain', pr: line41.map(() => 0), wr: [0.9, 2] }, 800, 1131);
ok(close(wlo[20], 2.7), 'width clamped to base*wr[0]');
const diag = Array.from({ length: 41 }, (_, i) => [0.1 + i * 0.01, 0.1 + i * 8 / 1131]);   // 45° in pixels on an 800x1131 page
const wfh = C.penWidths({ points: line41, width: 3, pen: 'fountain', pr: line41.map(() => 0.5) }, 800, 1131);
const wfd = C.penWidths({ points: diag, width: 3, pen: 'fountain', pr: diag.map(() => 0.5) }, 800, 1131);
ok(close(wfd[20], 3) && close(wfh[20], 3 * (1 - 0.35 * 0.5 * Math.sin(Math.PI / 4))), 'fountain nib: 45° full width, horizontal thinner');
const slow = Array.from({ length: 200 }, (_, i) => [0.1 + i / 800, 0.5]), fast = Array.from({ length: 20 }, (_, i) => [0.1 + i * 30 / 800, 0.5]);
const wsl = C.penWidths({ points: slow, width: 3, pen: 'fountain' }, 800, 1131), wfa = C.penWidths({ points: fast, width: 3, pen: 'fountain' }, 800, 1131);
ok(wsl[100] > wfa[10] * 1.5, 'fountain without pressure: slow (dense) ink is wider than fast (sparse)');
const pSlow = (0.75 - 0.5 * (1 / 16)), pFast = 0.25;
ok(close(wsl[100], 3 * (1 + (0.35 + 1.3 * pSlow - 1)) * (1 - 0.175 * Math.SQRT1_2)) && close(wfa[10], 3 * (1 + (0.35 + 1.3 * pFast - 1)) * (1 - 0.175 * Math.SQRT1_2)), 'simulated pressure range 0.25..0.75 from spacing');
const wbn = C.penWidths({ points: slow, width: 3, pen: 'ballpoint' }, 800, 1131);
ok(close(wbn[100], 3), 'ballpoint without pressure uses 0.5 (no simulation)');
const wdup = C.penWidths({ points: [[0.2, 0.2], [0.2, 0.2], [0.2, 0.2]], width: 3, pen: 'fountain' }, 800, 1131);
ok(wdup.every(Number.isFinite) && wdup.every(w => w > 0), 'duplicate points never give NaN widths');
const sp0 = [[0, 0], [10, 5], [20, 0], [30, 5], [40, 0]];
const s0 = C.smoothPoints(sp0, 0);
ok(JSON.stringify(s0) === JSON.stringify(sp0) && s0 !== sp0 && s0[0] !== sp0[0], 'smoothPoints strength 0: exact copy');
const s1 = C.smoothPoints(sp0, 0.45), s2 = C.smoothPoints(sp0, 1);
ok(s1.length === 10 && s2.length === 20 && s2.length <= 4 * sp0.length, 'Chaikin iterations 1 and 2, length <= 4x');
ok(nearP(s2[0], sp0[0]) && nearP(s2[s2.length - 1], sp0[4]) && nearP(s1[1], [2.5, 1.25]), 'endpoints preserved, 1/4-3/4 cuts');
ok(JSON.stringify(C.smoothPoints(sp0, 1)) === JSON.stringify(s2), 'smoothing deterministic');
ok(JSON.stringify(C.smoothPoints([[0, 0, 1], [10, 0, 3], [20, 0, 1]], 0.5)) === JSON.stringify([[0, 0, 1], [2.5, 0, 1.5], [7.5, 0, 2.5], [12.5, 0, 2.5], [17.5, 0, 1.5], [20, 0, 1]]), 'smoothPoints carries extra components (width)');
ok(C.smoothPoints([[0, 0], [1, 1]], 1).length === 2, 'two points are not subdivided');
const o1 = C.strokeOutline([[0, 0], [100, 0]], [10, 10]);
const ys = o1.map(p => p[1]), xs = o1.map(p => p[0]);
ok(o1.length === 18 && close(Math.min(...ys), -5) && close(Math.max(...ys), 5) && close(Math.min(...xs), -5) && close(Math.max(...xs), 105), 'outline of a straight segment: width 10, round caps');
ok(o1.filter(p => p[0] > 100).every(p => close(Math.hypot(p[0] - 100, p[1]), 5)), 'end cap points lie on the cap circle');
const oc = C.strokeOutline([[50, 50]], [8]);
ok(oc.length === 16 && oc.every(p => close(Math.hypot(p[0] - 50, p[1] - 50), 4)), 'one point -> 16-gon circle');
ok(C.strokeOutline([[0, 0], [0, 0], [100, 0], [100, 0]], [10, 10, 10, 10]).length === 18, 'consecutive duplicates skipped');
const oj = C.strokeOutline([[0, 0], [100, 0], [100, 100]], [10, 10, 10]);
ok(oj.some(p => nearP(p, [95, 5], 1e-9)) && oj.some(p => nearP(p, [105, -5], 1e-9)), 'right-angle join: averaged normal, miter 5/cos45');
const sharp = [[0, 0], [100, 0], [0, 4]], os = C.strokeOutline(sharp, [10, 10, 10]);
ok(os.every(p => Math.min(...sharp.map(q => Math.hypot(p[0] - q[0], p[1] - q[1]))) <= 10 + 1e-9), 'sharp join: miter capped at 2x half width');
const orv = C.strokeOutline([[0, 0], [10, 0], [0, 0]], [4, 4, 4]);
ok(noNaN(orv) && noNaN(C.strokeOutline([[0, 0], [10, 0]], [0, 0])) && noNaN(C.strokeOutline([[0, 0], [10, 0], [20, 0]], [NaN, 4])) && C.strokeOutline([], []).length === 0, 'reversal / zero / NaN widths never give NaN');
const fP = new C.InkFilter(0, K), raw = Array.from({ length: 50 }, () => [rnd(), rnd()]);
ok(raw.every((p, i) => { const q = fP.push(p, i * 8); return q[0] === p[0] && q[1] === p[1]; }), 'InkFilter strength 0 = exact passthrough');
const fS = new C.InkFilter(1, K), jitter = Array.from({ length: 120 }, () => [0.5 + (rnd() - 0.5) * 0.01, 0.5 + (rnd() - 0.5) * 0.01]);
const outJ = jitter.map((p, i) => fS.push(p, i * 1000 / 120));
const spread = a => Math.max(...a.slice(20).map(p => Math.hypot(p[0] - 0.5, p[1] - 0.5)));
ok(spread(outJ) < spread(jitter) / 3, 'strong filter steadies a shaky hand');
for (const st of [0.3, 1]) for (const secs of [0.25, 0.5, 2]) {
  const f = new C.InkFilter(st, K), N = Math.round(secs * 120); let last;
  for (let i = 0; i <= N; i++) last = f.push([0.1 + 0.5 * i / N, 0.5], i * 1000 / 120);
  ok(Math.hypot(0.6 - last[0], (0.5 - last[1]) * K) < 0.02 * 0.5, 'filter lag bounded: within 2% of a 0.5 line (strength ' + st + ', ' + secs + 's)');
  const end = f.finish([0.6, 0.5]);
  ok(end[0] === 0.6 && end[1] === 0.5, 'finish(raw) returns the raw last point');
  const again = f.push([0.2, 0.3], 0); ok(again[0] === 0.2 && again[1] === 0.3, 'filter resets after finish');
}
const fT = new C.InkFilter(0.5, K); fT.push([0.1, 0.1], 100);
ok(noNaN([fT.push([0.2, 0.2], 100), fT.push([0.3, 0.3], undefined), fT.push([0.4, 0.4], 50)]), 'filter survives equal, missing and backwards timestamps');
// penWidths: pixel units follow pw, pressure clamped, pencil simulates with a smaller gain, taper both ends
const prR = line41.map((_, i) => 0.2 + 0.6 * ((i * 7) % 11) / 10);
const w1x = C.penWidths({ points: line41, width: 3, pen: 'ballpoint', pr: prR }, 800, 1131), w2x = C.penWidths({ points: line41, width: 3, pen: 'ballpoint', pr: prR }, 1600, 2262);
ok(w2x.every((w, i) => close(w, 2 * w1x[i], 1e-9)), 'widths are in the units of pw (2x page = 2x widths)');
ok(JSON.stringify(C.penWidths({ points: line41, width: 3, pen: 'fountain', pr: line41.map(() => 3) }, 800, 1131)) === JSON.stringify(C.penWidths({ points: line41, width: 3, pen: 'fountain', pr: line41.map(() => 1) }, 800, 1131)), 'pressure above 1 is treated as 1');
ok(JSON.stringify(C.penWidths({ points: line41, width: 3, pen: 'ballpoint', pr: [1, 1] }, 800, 1131)) === JSON.stringify(C.penWidths({ points: line41, width: 3, pen: 'ballpoint' }, 800, 1131)), 'pr of the wrong length is ignored (0.5)');
const wpf = C.penWidths({ points: fast, width: 3, pen: 'pencil' }, 800, 1131), pPen = 0.5 + (0.25 - 0.5) * (0.1 / 0.35);
ok(close(wpf[10], 3 * (1 + 0.6 * (0.35 + 1.3 * pPen - 1))), 'pencil without pressure: simulated pressure scaled by thin/0.35');
ok(close(wpf[0], wpf[10] * (1 - 0.85 * 0.3)) && close(wpf[19], wpf[0]), 'pencil taper starts at (1-0.85*0.3) of the width at both ends');
ok(C.penWidths({ points: line41, width: 3, pen: 'technical', wr: [1.5, 2] }, 800, 1131).every(w => close(w, 4.5)), 'wr minimum raises even the technical pen');
ok(JSON.stringify(C.penWidths({ points: [[0.5, 0.5]], width: 3 })) === JSON.stringify([3]) && C.penWidths({ points: line41 }, 0, NaN).every(Number.isFinite), 'missing/invalid page size falls back to 800 px');
// strokeOutline: the polygon's half-width is the given width / 2 at each point
const ov = C.strokeOutline([[0, 0], [100, 0]], [4, 20]);
ok(ov.some(p => nearP(p, [0, 2])) && ov.some(p => nearP(p, [0, -2])) && ov.some(p => nearP(p, [100, 10])) && ov.some(p => nearP(p, [100, -10])), 'variable width: offsets ±2 at the start, ±10 at the end');
ok(ov.filter(p => p[0] > 100 + 1e-9).every(p => close(Math.hypot(p[0] - 100, p[1]), 10)) && ov.filter(p => p[0] < -1e-9).every(p => close(Math.hypot(p[0], p[1]), 2)), 'caps use the half-width of their own end');
const od = C.strokeOutline([[0, 0], [30, 40]], [6, 6]), dSeg = p => C.segDist(p[0], p[1], 0, 0, 30, 40);
ok(od.every(p => close(dSeg(p), 3, 1e-9)) && od.length === 18, 'diagonal segment: every outline point exactly half a width from the centre line');
ok(nearP(od[0], [-3 * 0.8, 3 * 0.6]), 'outline starts on the left side (normal = (-dy, dx))');
// InkFilter: strength clamped to 0..1; the first sample is never delayed
const fN = new C.InkFilter(NaN, K), fNeg = new C.InkFilter(-2, K);
ok([[0.2, 0.3], [0.7, 0.1]].every((p, i) => { const a = fN.push(p, i * 8), b = fNeg.push(p, i * 8); return a[0] === p[0] && a[1] === p[1] && b[0] === p[0] && b[1] === p[1]; }), 'NaN / negative strength = passthrough');
const fBig = new C.InkFilter(5, K), fOne = new C.InkFilter(1, K), seqF = Array.from({ length: 30 }, (_, i) => [0.1 + 0.01 * i + 0.003 * Math.sin(i), 0.4 + 0.002 * Math.cos(i * 3)]);
ok(seqF.every((p, i) => { const a = fBig.push(p, i * 8), b = fOne.push(p, i * 8); return a[0] === b[0] && a[1] === b[1]; }), 'strength above 1 behaves as 1');
const fFirst = new C.InkFilter(1, K), f1 = fFirst.push([0.33, 0.44], 0), f2 = fFirst.push([0.43, 0.44], 8);
ok(f1[0] === 0.33 && f1[1] === 0.44 && f2[0] > 0.33 && f2[0] < 0.43 && close(f2[1], 0.44, 1e-12), 'first sample passes through, the next is smoothed toward the input');

// 6. partial erasing
const hl = { page: 1, tool: 'pen', points: [[0.1, 0.5], [0.3, 0.5], [0.5, 0.5], [0.7, 0.5], [0.9, 0.5]], pr: [0.1, 0.3, 0.5, 0.7, 0.9] };
const sp = C.splitStroke(hl, 0.5, 0.5, 0.05, K);
ok(Array.isArray(sp) && sp.length === 2, 'erasing the middle of a line -> 2 pieces');
ok(nearP(sp[0].points[sp[0].points.length - 1], [0.45, 0.5]) && nearP(sp[1].points[0], [0.55, 0.5]), 'inner ends at the circle boundary');
ok(close(sp[0].pr[sp[0].pr.length - 1], 0.45) && close(sp[1].pr[0], 0.55) && sp[0].pr.length === sp[0].points.length && sp[1].pr.length === sp[1].points.length, 'pressure interpolated at the cut');
ok(nearP(sp[0].points[0], [0.1, 0.5]) && nearP(sp[1].points[sp[1].points.length - 1], [0.9, 0.5]) && sp[0].points.length === 3 && sp[1].points.length === 3, 'outer parts kept intact');
const off = C.splitStroke(hl, 0.5, 0.5 + 0.02 / K, 0.05, K);
ok(off.length === 2 && close(isoLen(off[0].points[2], [0.5, 0.5 + 0.02 / K], K), 0.05) && close(isoLen(off[1].points[0], [0.5, 0.5 + 0.02 / K], K), 0.05), 'off-centre cut: both ends exactly on the circle (iso)');
const vert = C.splitStroke({ page: 1, tool: 'pen', points: [[0.5, 0.1], [0.5, 0.9]] }, 0.5, 0.5, 0.05, 2);
ok(vert.length === 2 && close(vert[0].points[1][1], 0.475) && close(vert[1].points[0][1], 0.525) && vert[0].pr === undefined, 'vertical cut uses iso radius (k=2); no pr when the stroke had none');
ok(C.splitStroke(hl, 0.5, 0.6, 0.05, K) === null, 'miss -> null');
const endCut = C.splitStroke(hl, 0.9, 0.5, 0.05, K);
ok(endCut.length === 1 && nearP(endCut[0].points[endCut[0].points.length - 1], [0.85, 0.5]), 'erasing an end shortens the stroke');
const tiny = C.splitStroke(hl, 0.16, 0.5, 0.05, K);
ok(tiny.length === 1 && nearP(tiny[0].points[0], [0.21, 0.5]), 'pieces shorter than 0.5*r dropped');
ok(JSON.stringify(C.splitStroke({ page: 1, tool: 'pen', points: [[0.5, 0.5], [0.52, 0.5]] }, 0.51, 0.5, 0.05, K)) === '[]', 'fully covered stroke -> []');
ok(JSON.stringify(C.splitStroke({ page: 1, tool: 'pen', points: [[0.5, 0.5]] }, 0.51, 0.5, 0.05, K)) === '[]' && C.splitStroke({ page: 1, tool: 'pen', points: [[0.5, 0.5]] }, 0.7, 0.5, 0.05, K) === null, 'single point: inside [] / outside null');
const zz = C.splitStroke({ page: 1, tool: 'highlight', points: [[0.1, 0.5], [0.9, 0.5], [0.1, 0.52]] }, 0.5, 0.51, 0.03, 1);
ok(zz.length === 3, 'highlighter: a cut through two passes gives 3 pieces');
ok(C.splitStroke({ page: 1, tool: 'line', points: [[0.1, 0.5], [0.9, 0.5]] }, 0.5, 0.51, 0.02, K) === 'whole' && C.splitStroke(arrow, 0.3, 0.5, 0.01, K) === 'whole', 'line/arrow erased whole');
ok(C.splitStroke(text, 0.3, 0.25, 0.01, K) === 'whole' && C.splitStroke(img, 0.3, 0.25, 0.01, 1.25) === 'whole' && C.splitStroke(img, 0.8, 0.8, 0.01, 1.25) === null, 'text/image: whole when hit, null when missed');
ok(C.splitStroke(rect, 0.2, 0.25, 0.01, K) === 'whole' && C.splitStroke(rect, 0.3, 0.25, 0.01, K) === null && C.splitStroke(th, 0.3, 0.11, 0.01, K) === 'whole', 'rectangle outline / texthl');
// diagonal stroke on a tall page, uneven pressure: cut ends lie on the iso circle; pr is linear along the segment
const dg = { page: 1, tool: 'pen', points: [[0.1, 0.1], [0.5, 0.5], [0.9, 0.6]], pr: [0.2, 0.9, 0.4] }, ctr = [0.3, 0.3 + 0.01], rr0 = 0.04;
const sd = C.splitStroke(dg, ctr[0], ctr[1], rr0, K);
ok(Array.isArray(sd) && sd.length === 2 && sd[0].points.length === 2 && sd[1].points.length === 3, 'diagonal cut -> 2 pieces');
const qa = sd[0].points[1], qb = sd[1].points[0], tA = (qa[0] - 0.1) / 0.4, tB = (qb[0] - 0.1) / 0.4;
ok(close(isoLen(qa, ctr, K), rr0, 1e-12) && close(isoLen(qb, ctr, K), rr0, 1e-12), 'both cut points exactly on the circle (iso)');
ok(close(qa[1], 0.1 + 0.4 * tA, 1e-12) && close(qb[1], 0.1 + 0.4 * tB, 1e-12) && tA < tB, 'cut points stay on the original segment, in order');
ok(close(sd[0].pr[1], 0.2 + 0.7 * tA, 1e-12) && close(sd[1].pr[0], 0.2 + 0.7 * tB, 1e-12) && sd[1].pr[1] === 0.9 && sd[1].pr[2] === 0.4 && sd[0].pr[0] === 0.2, 'pr interpolated at the cuts, untouched elsewhere');
ok(nearP(sd[1].points[1], [0.5, 0.5]) && nearP(sd[1].points[2], [0.9, 0.6]) && sd.every(q => C.validStroke(Object.assign({}, dg, q))), 'kept points unchanged; every piece is a valid stroke');
const sCorner = C.splitStroke(dg, 0.5, 0.5, 0.03, K);
ok(sCorner.length === 2 && close(isoLen(sCorner[0].points[1], [0.5, 0.5], K), 0.03, 1e-12) && close(isoLen(sCorner[1].points[0], [0.5, 0.5], K), 0.03, 1e-12), 'cut at a corner point: ends on the circle on both segments');
ok(C.splitStroke(dg, 0.3, 0.3, 0, K) === null && C.splitStroke(dg, 0.3, 0.3, NaN, K) === null && C.splitStroke({ page: 1, tool: 'pen', points: [] }, 0.3, 0.3, 0.1, K) === null && C.splitStroke(null, 0, 0, 0.1) === null, 'bad radius / empty stroke -> null');
ok(C.splitStroke({ page: 1, tool: 'sticky', text: '', points: [[0.1, 0.1]] }, 0.15, 0.12, 0.01, K) === 'whole' && C.splitStroke(el, 0.5, ecy, 0.01, K) === null && C.splitStroke(el, 0.5, ecy - 0.1 / K, 0.01, K) === 'whole', 'sticky whole; rotated ellipse hit on its outline only');

// 7. straighten + shape recognition
const st1 = C.straighten([[0.1, 0.5], [0.3, 0.52], [0.6, 0.53]], { horizontal: true, k: 1 });
ok(nearP(st1[0], [0.1, 0.5]) && nearP(st1[1], [0.6, 0.5]), 'straighten snaps a near-horizontal line');
const st2 = C.straighten([[0.1, 0.5], [0.6, 0.59]], { horizontal: true, k: K }), st3 = C.straighten([[0.1, 0.5], [0.6, 0.59]], { horizontal: true, k: 1 });
ok(st2[1][1] === 0.59 && st3[1][1] === 0.5, '12° threshold measured in iso space (10.2° uv = 14.3° iso on k=1.414)');
const src = [[0.6, 0.5], [0.1, 0.51]], st4 = C.straighten(src, { horizontal: true, k: K });
ok(st4[1][1] === 0.5 && st4[0] !== src[0] && nearP(C.straighten(src)[1], [0.1, 0.51]), 'right-to-left lines snap too; copies; no option = first..last');
const circ = []; for (let i = 0; i <= 64; i++) { const t = i / 64 * 2 * Math.PI * 0.97, r = 0.15 * (1 + (rnd() - 0.5) * 0.05); circ.push([0.5 + r * Math.cos(t), (0.5 * K + r * Math.sin(t)) / K]); }
const rc = C.recognizeShape(circ, K);
ok(rc && rc.tool === 'ellipse' && close((rc.points[0][0] + rc.points[1][0]) / 2, 0.5, 0.01) && close(rc.points[1][0] - rc.points[0][0], 0.3, 0.02) && close((rc.points[1][1] - rc.points[0][1]) * K, 0.3, 0.02), 'noisy circle -> ellipse with its box');
const rpts = [], cr = [[0.2, 0.3], [0.7, 0.3], [0.7, 0.6], [0.2, 0.6], [0.2, 0.3]];
for (let c = 0; c < 4; c++) for (let i = 0; i < 20; i++) { const t = i / 20, a = cr[c], b = cr[c + 1]; rpts.push([a[0] + (b[0] - a[0]) * t + (rnd() - 0.5) * 0.008, a[1] + (b[1] - a[1]) * t + (rnd() - 0.5) * 0.008]); }
rpts.push([0.21, 0.31]);
const rr2 = C.recognizeShape(rpts, K);
ok(rr2 && rr2.tool === 'rectangle' && nearP(rr2.points[0], [0.2, 0.3], 0.01) && nearP(rr2.points[1], [0.7, 0.6], 0.01), 'noisy rectangle -> rectangle (axis-aligned corners)');
const lpts = []; for (let i = 0; i <= 40; i++) lpts.push([0.1 + 0.6 * i / 40 + (rnd() - 0.5) * 0.004, 0.3 + 0.2 * i / 40 + (rnd() - 0.5) * 0.004]);
const rl = C.recognizeShape(lpts, K);
ok(rl && rl.tool === 'line' && nearP(rl.points[0], lpts[0], 1e-12) && nearP(rl.points[1], lpts[40], 1e-12), 'noisy line -> line (first..last)');
const zig = []; for (let i = 0; i <= 40; i++) zig.push([0.1 + 0.4 * i / 40, 0.5 + (i % 2 ? 0.03 : -0.03)]);
ok(C.recognizeShape(zig, K) === null, 'handwriting-like zigzag -> null');
const loops = []; for (let i = 0; i <= 120; i++) { const t = i / 120 * 6 * Math.PI; loops.push([0.1 + 0.3 * i / 120 + 0.02 * Math.cos(t), 0.5 + 0.02 * Math.sin(t)]); }
ok(C.recognizeShape(loops, K) === null, 'cursive loops -> null');
const blob = []; for (let i = 0; i < 60; i++) blob.push([0.4 + rnd() * 0.2, 0.4 + rnd() * 0.2]); blob.push(blob[0].slice());
ok(C.recognizeShape(blob, K) === null, 'closed scribble -> null');
const back = [[0.1, 0.5], [0.6, 0.5], [0.15, 0.5], [0.6, 0.5]];
ok(C.recognizeShape(back, K) === null, 'back-and-forth along a line is not a line');
const twice = []; for (let i = 0; i <= 128; i++) { const t = i / 64 * 2 * Math.PI; twice.push([0.5 + 0.15 * Math.cos(t), 0.5 + 0.15 * Math.sin(t) / K]); }
ok(C.recognizeShape(twice, K) === null, 'two laps around a circle -> null');
ok(C.recognizeShape([[0.5, 0.5]], K) === null && C.recognizeShape([[0.5, 0.5], [0.5, 0.5]], K) === null && C.recognizeShape([[0.1, NaN], [0.2, 0.2]], K) === null, 'degenerate input -> null');
// wider ellipse, rectangle on a tall page drawn the other way round, vertical line, scribbled zigzag: same rules
const wide = []; for (let i = 0; i <= 80; i++) { const t = 0.3 + i / 80 * 2 * Math.PI * 0.96; wide.push([0.5 + 0.3 * Math.cos(t) + (rnd2() - 0.5) * 0.006, (0.6 * K + 0.1 * Math.sin(t) + (rnd2() - 0.5) * 0.006) / K]); }
const rw = C.recognizeShape(wide, K);
ok(rw && rw.tool === 'ellipse' && close(rw.points[0][0], 0.2, 0.01) && close(rw.points[1][0], 0.8, 0.01) && close(rw.points[0][1] * K, 0.6 * K - 0.1, 0.01) && close(rw.points[1][1] * K, 0.6 * K + 0.1, 0.01), 'noisy 3:1 ellipse -> ellipse with its box (v back in page units)');
const ccw = [], cr2 = [[0.3, 0.2], [0.3, 0.7], [0.8, 0.7], [0.8, 0.2], [0.3, 0.2]];
for (let c = 0; c < 4; c++) for (let i = 0; i < 25; i++) { const t = i / 25, a = cr2[c], b = cr2[c + 1]; ccw.push([a[0] + (b[0] - a[0]) * t + (rnd2() - 0.5) * 0.006, a[1] + (b[1] - a[1]) * t + (rnd2() - 0.5) * 0.006]); }
ccw.push([0.305, 0.215]);
const rr3 = C.recognizeShape(ccw, 2);
ok(rr3 && rr3.tool === 'rectangle' && nearP(rr3.points[0], [0.3, 0.2], 0.01) && nearP(rr3.points[1], [0.8, 0.7], 0.01) && rr3.points[0][0] < rr3.points[1][0] && rr3.points[0][1] < rr3.points[1][1], 'counter-clockwise rectangle on k=2 -> rectangle, corners top-left/bottom-right');
const vl = []; for (let i = 0; i <= 30; i++) vl.push([0.4 + (rnd2() - 0.5) * 0.003, 0.2 + 0.5 * i / 30]);
const rv = C.recognizeShape(vl, K);
ok(rv && rv.tool === 'line' && nearP(rv.points[0], vl[0], 1e-12) && nearP(rv.points[1], vl[30], 1e-12), 'vertical noisy line -> line');
const zz2 = []; for (let i = 0; i <= 60; i++) zz2.push([0.1 + 0.5 * i / 60 + (rnd2() - 0.5) * 0.004, 0.4 + (i % 4 < 2 ? 0.05 : -0.05) + (rnd2() - 0.5) * 0.004]);
ok(C.recognizeShape(zz2, K) === null, 'noisy zigzag (handwriting-like) -> null');
const arc = []; for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI; arc.push([0.5 + 0.2 * Math.cos(t), (0.5 * K + 0.2 * Math.sin(t)) / K]); }
ok(C.recognizeShape(arc, K) === null, 'half circle (open curve) -> null');

// 8. history: add at index, move (z-order)
const A = { id: 'a' }, B = { id: 'b' }, Cc = { id: 'c' }, D = { id: 'd' }, X = { id: 'x' }, Y = { id: 'y' };
const items = [A, B, Cc];
const h = new C.History(items);
items.splice(1, 0, X); h.push([{ k: 'add', s: X, i: 1 }]);
h.undo(); ok(items.map(s => s.id).join() === 'a,b,c', 'undo add-at-index removes by id');
h.redo(); ok(items.map(s => s.id).join() === 'a,x,b,c', 'redo inserts at the recorded index');
items.push(Y); h.push([{ k: 'add', s: Y, i: 99 }]); h.undo(); h.redo();
ok(items.map(s => s.id).join() === 'a,x,b,c,y', 'index past the end inserts at min(i,len)');
const items2 = [A, B, Cc, D], h2 = new C.History(items2);
items2.splice(0, 1); items2.splice(2, 0, A); h2.push([{ k: 'mv', id: 'a', from: 0, to: 2 }]);
ok(items2.map(s => s.id).join() === 'b,c,a,d', 'mv applied');
h2.undo(); ok(items2.map(s => s.id).join() === 'a,b,c,d', 'undo mv moves it back by id');
h2.redo(); ok(items2.map(s => s.id).join() === 'b,c,a,d', 'redo mv');
items2.splice(2, 1); items2.push(A); h2.push([{ k: 'mv', id: 'a', from: 2, to: 3 }]);
ok(items2.map(s => s.id).join() === 'b,c,d,a', 'bring to front');
h2.undo(); h2.undo(); ok(items2.map(s => s.id).join() === 'a,b,c,d', 'two undos restore the original order');
const items3 = [A, B], h3 = new C.History(items3);
h3.push([{ k: 'mv', id: 'gone', from: 0, to: 1 }]); h3.undo();
ok(items3.map(s => s.id).join() === 'a,b', 'mv of a missing id is a no-op');
const items4 = [A], h4 = new C.History(items4); items4.push(B); h4.push([{ k: 'add', s: B }]); h4.undo(); h4.redo();
ok(items4.map(s => s.id).join() === 'a,b', 'old add (no i) still appends');
// precise-eraser gesture as the engine records it: del at i, pieces added at i, i+1 — then a piece is split again
const P0 = { id: 'p0', page: 1, tool: 'pen', points: hl.points, pr: hl.pr }, items5 = [A, P0, B], h5 = new C.History(items5), ops5 = [];
const replace = (s, pieces) => {
  const i = items5.indexOf(s); items5.splice(i, 1); ops5.push({ k: 'del', s, i });
  return pieces.map((q, j) => { const nS = Object.assign({}, s, { id: s.id + '.' + j, points: q.points, pr: q.pr }); items5.splice(i + j, 0, nS); ops5.push({ k: 'add', s: nS, i: i + j }); return nS; });
};
const pcs = replace(P0, C.splitStroke(P0, 0.5, 0.5, 0.05, K));
replace(pcs[0], C.splitStroke(pcs[0], 0.3, 0.5, 0.03, K));
h5.push(ops5);
const after5 = JSON.stringify(items5.map(s => [s.id, s.points, s.pr || null]));
ok(items5.map(s => s.id).join() === 'a,p0.0.0,p0.0.1,p0.1,b' && items5.slice(1, 4).every(s => C.validStroke(s)), 'split twice: pieces in place of the original, in order');
h5.undo(); ok(items5.length === 3 && items5[1] === P0 && items5.map(s => s.id).join() === 'a,p0,b', 'one undo restores the original stroke at its index');
h5.redo(); ok(JSON.stringify(items5.map(s => [s.id, s.points, s.pr || null])) === after5, 'redo reproduces the exact pieces (points and pr)');
for (let r = 0; r < 3; r++) { h5.undo(); h5.redo(); }
ok(JSON.stringify(items5.map(s => [s.id, s.points, s.pr || null])) === after5 && !h5.canRedo && h5.canUndo, 'undo/redo round trips are stable');
// mv mixed with edit and add in one gesture (bring to front after a transform), undone and redone as a unit
const E = { id: 'e', page: 1, tool: 'pen', points: [[0.1, 0.1], [0.2, 0.2]], rev: 1 }, items6 = [A, E, B, Cc], h6 = new C.History(items6);
const tE = C.transformStroke(E, { dx: 0.1 }), Z = { id: 'z' };
items6[1] = Object.assign({}, E, tE); items6.splice(1, 1); items6.push(Object.assign({}, E, tE)); items6.splice(0, 0, Z);
h6.push([{ k: 'edit', id: 'e', before: { points: E.points, rev: 1 }, after: tE }, { k: 'mv', id: 'e', from: 1, to: 3 }, { k: 'add', s: Z, i: 0 }]);
const final6 = items6.map(s => s.id).join();
ok(final6 === 'z,a,b,c,e' && nearP(items6[4].points[0], [0.2, 0.1]) && items6[4].rev === 2, 'edit + mv + add applied');
h6.undo(); ok(items6.map(s => s.id).join() === 'a,e,b,c' && items6[1].points === E.points && items6[1].rev === 1, 'undo: add removed, mv reversed, edit reverted');
h6.redo(); ok(items6.map(s => s.id).join() === final6 && nearP(items6[4].points[0], [0.2, 0.1]), 'redo: same order and geometry');
ok(C.OPS.every(k => h5.undoStack.concat(h6.undoStack).flat().some(o => o.k === k)), 'every OPS kind exercised through History');

// 9. review fixes (each failed before its fix)
const nt = { page: 1, tool: 'sticky', text: 'n', points: [[0.2, 0.2]] };
bad(nt, { w: 'abc' }, 'text box w string rejected (bounds would be NaN)'); bad(nt, { h: Infinity }, 'text box h infinite rejected'); bad(nt, { w: -1 }, 'text box w negative rejected');
bad(nt, { fill: 'url(https://x.example/a.png)' }, 'sticky fill must be a hex colour (it reaches a CSS background)'); bad(nt, { fill: 3 }, 'sticky fill number rejected');
ok(C.validStroke(Object.assign({}, nt, { w: 0, h: 0.1, fill: '#fff3a3' })) && C.validStroke(Object.assign({}, nt, { tool: 'text', w: 0.28, h: null })), 'text box w 0 / null and hex fill still valid');
ok(C.bounds(Object.assign({}, nt, { w: 0.3, h: 0.2 })).every(Number.isFinite), 'valid text box bounds are finite');
const tallR = { page: 1, tool: 'rectangle', k: 1, rot: Math.PI / 2, points: [[0.1, 0.45], [0.9, 0.55]] };   // drawn as u 0.45..0.55, v 0.1..0.9
ok(C.lassoHit(tallR, [[0.4, 0.05], [0.6, 0.05], [0.6, 0.95], [0.4, 0.95]]) && !C.lassoHit(tallR, [[0.05, 0.4], [0.15, 0.4], [0.15, 0.5], [0.05, 0.5]]), 'lasso tests a rotated rectangle where it is drawn, not its stored corners');
ok(C.lassoHit(Object.assign({}, tallR, { tool: 'ellipse' }), [[0.4, 0.05], [0.6, 0.05], [0.6, 0.95], [0.4, 0.95]]) && C.lassoHit(rect, [[0.1, 0.1], [0.3, 0.1], [0.3, 0.25], [0.1, 0.25]]), 'rotated ellipse too; unrotated rectangle unchanged');
const offR = { page: 1, tool: 'rectangle', k: 1, rot: Math.PI / 2, points: [[-0.25, 0.45], [0.55, 0.55]] }, bo = C.bounds(offR), bm = C.bounds(Object.assign({}, offR, C.transformStroke(offR, { dx: 0.01 })));
ok(close(bm[0] - bo[0], 0.01) && close(bm[2] - bo[2], 0.01) && close(bm[1], bo[1]) && close(bm[3], bo[3]), 'moving a rotated rectangle whose stored corners are off the page moves it, size kept');
ok(JSON.stringify(C.displayOrder(3, [{ id: 100001, template: 'lined', w: 595, h: 842, after: 5 }, { id: 100002, template: 'grid', w: 595, h: 842, after: 1 }])) === JSON.stringify([1, 100002, 2, 3, 100001]), 'blank whose page hint no longer exists stays visible (at the end)');
const noIdS = { page: 'x' }, mc = C.mergeById([noIdS], [{ id: JSON.stringify(noIdS), rev: 1 }]);
ok(mc.length === 2 && mc.includes(noIdS) && mc.filter(x => x.id).length === 1, 'merge: an id equal to another entry\'s JSON neither duplicates nor hides');
const pbox = { x: 10, y: 20, width: 600, height: 800 };
ok([45, 30, -45, NaN, undefined].every(r => JSON.stringify(C.viewToPdf(0.2, 0.3, pbox, r)) === JSON.stringify(C.viewToPdf(0.2, 0.3, pbox, 0)) && C.displaySize(pbox, r)[0] === 600), '/Rotate not a multiple of 90 is ignored like pdf.js');
ok(JSON.stringify(C.viewToPdf(0.2, 0.3, pbox, -90)) === JSON.stringify(C.viewToPdf(0.2, 0.3, pbox, 270)) && JSON.stringify(C.viewToPdf(0.2, 0.3, pbox, 450)) === JSON.stringify(C.viewToPdf(0.2, 0.3, pbox, 90)), 'negative and >= 360 rotations still normalised');
for (const gh of [848, 104, 842]) {
  const g = C.templateGeometry('grid', 595, gh), hz = g.lines.filter(l => l[1] === l[3]), vt = g.lines.filter(l => l[0] === l[2]);
  ok(vt.length > 0 && vt.every(l => l[1] === 56 && l[3] === hz[hz.length - 1][1]), 'grid h=' + gh + ': vertical lines end on the last horizontal rule');
}

console.log('STUDIO INK CORE OK: ' + n + ' checks');
