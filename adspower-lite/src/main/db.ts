import { DatabaseSync } from 'node:sqlite';

export type DB = DatabaseSync;

const MIGRATIONS: string[] = [
  `
  CREATE TABLE groups (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    color      TEXT NOT NULL DEFAULT '#6366f1',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE profiles (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    group_id           INTEGER REFERENCES groups(id) ON DELETE SET NULL,
    notes              TEXT NOT NULL DEFAULT '',
    start_url          TEXT NOT NULL DEFAULT '',
    user_agent         TEXT NOT NULL DEFAULT '',
    proxy_type         TEXT NOT NULL DEFAULT 'none',
    proxy_host         TEXT NOT NULL DEFAULT '',
    proxy_port         INTEGER,
    proxy_username     TEXT NOT NULL DEFAULT '',
    proxy_password_enc TEXT,
    created_at         INTEGER NOT NULL,
    updated_at         INTEGER NOT NULL,
    last_opened_at     INTEGER
  );
  CREATE INDEX idx_profiles_group ON profiles(group_id);
  CREATE INDEX idx_profiles_name ON profiles(name);
  `,
];

export function openDatabase(file: string): DB {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  migrate(db);
  return db;
}

function migrate(db: DB): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let i = row.user_version; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}
