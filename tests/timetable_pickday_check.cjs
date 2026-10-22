// node tests/timetable_pickday_check.cjs — الرئيسية: محاضرات اليوم حتى تنتهي آخرها، ثم الغد، ثم أقرب يوم.
const fs = require('node:fs'), vm = require('node:vm');
const src = fs.readFileSync('site/js/timetable.js', 'utf8');
const ctx = { window: {}, document: { getElementById: () => null, querySelectorAll: () => [], documentElement: { lang: 'ar' } }, URLSearchParams, setTimeout, clearTimeout };
vm.createContext(ctx); vm.runInContext(src, ctx);
const pick = ctx.window.MTT.pickDay;
let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const L = (date, start, end, state = 'normal') => ({ date, start, end, state, subject: 'X' });
const list = [L('2026-10-20', '08:00', '10:00'), L('2026-10-20', '10:00', '12:00'), L('2026-10-20', '13:00', '15:00'), L('2026-10-21', '08:00', '10:00')];
const at = (h, m) => new Date(2026, 9, 20, h, m);
let p = pick(list, at(7, 0)); ok(p.day === '2026-10-20' && p.when === 'محاضرات اليوم' && p.until === '15:00', 'morning: today');
p = pick(list, at(14, 59)); ok(p.day === '2026-10-20', 'during last lecture: still today');
p = pick(list, at(15, 0)); ok(p.day === '2026-10-21' && p.when === 'محاضرات غداً', 'after last ends: tomorrow');
p = pick([L('2026-10-20', '13:00', '15:00', 'cancelled'), L('2026-10-21', '08:00', '10:00')], at(9, 0)); ok(p.day === '2026-10-21', 'only cancelled today: tomorrow');
p = pick([L('2026-10-24', '08:00', '10:00')], at(16, 0)); ok(p.day === '2026-10-24' && p.next, 'nothing tomorrow: next day with lectures');
p = pick([], at(9, 0)); ok(p.day === '2026-10-21' && !p.items.length, 'empty');
console.log(f ? `pickday: ${f}/${n} FAILED` : `PASS timetable pickday: ${n} checks`); process.exit(f ? 1 : 0);
