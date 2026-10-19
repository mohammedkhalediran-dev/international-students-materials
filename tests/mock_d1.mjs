// tests/mock_d1.mjs — يحاكي واجهة D1 التي نستخدمها (prepare/bind/first/all/run وbatch) فوق node:sqlite.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

export function createMockD1({ without = [] } = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8"));
  db.exec(readFileSync(new URL("../migrations/0002_announcements.sql", import.meta.url), "utf8"));
  db.exec(readFileSync(new URL("../migrations/0003_push.sql", import.meta.url), "utf8"));
  if (!without.includes("0004")) db.exec(readFileSync(new URL("../migrations/0004_push_prefs.sql", import.meta.url), "utf8"));
  if (!without.includes("0005")) db.exec(readFileSync(new URL("../migrations/0005_admin.sql", import.meta.url), "utf8"));
  if (!without.includes("0006")) db.exec(readFileSync(new URL("../migrations/0006_timetable.sql", import.meta.url), "utf8"));
  if (!without.includes("0007")) db.exec(readFileSync(new URL("../migrations/0007_grades.sql", import.meta.url), "utf8"));
  if (!without.includes("0008")) db.exec(readFileSync(new URL("../migrations/0008_profile.sql", import.meta.url), "utf8"));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async first() { return db.prepare(sql).get(...args) || null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() { const r = db.prepare(sql).run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } }; }
  });
  return { prepare: (sql) => stmt(sql), async batch(list) { for (const s of list) await s.run(); }, _db: db };
}
