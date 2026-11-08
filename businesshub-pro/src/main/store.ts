import Database from 'better-sqlite3';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { AppError } from './errors';

export type DB = Database.Database;

/** كل عنصر = إصدار مخطط. لا تعدّل عنصراً منشوراً؛ أضف عنصراً جديداً. */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    category TEXT NOT NULL,
    logo_path TEXT,
    color TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE social_accounts (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram','facebook','whatsapp','tiktok')),
    display_name TEXT NOT NULL,
    username_or_number TEXT,
    url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX uq_social_identity ON social_accounts(business_id, platform, username_or_number COLLATE NOCASE)
    WHERE username_or_number IS NOT NULL;
  CREATE INDEX idx_social_business ON social_accounts(business_id);

  CREATE TABLE proxies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    scheme TEXT NOT NULL CHECK (scheme IN ('http','https','socks5')),
    host TEXT NOT NULL,
    port INTEGER NOT NULL CHECK (port BETWEEN 1 AND 65535),
    username TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  -- أسرار البروكسي منفصلة عن جدول البيانات الوصفية، ومشفّرة بتشفير النظام.
  CREATE TABLE proxy_secrets (
    proxy_id TEXT PRIMARY KEY REFERENCES proxies(id) ON DELETE CASCADE,
    secret_enc TEXT NOT NULL
  );

  CREATE TABLE browser_profiles (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    home_url TEXT,
    proxy_id TEXT REFERENCES proxies(id) ON DELETE SET NULL,
    partition_id TEXT NOT NULL UNIQUE,
    last_opened_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (business_id, name)
  );
  CREATE INDEX idx_profiles_business ON browser_profiles(business_id);
  CREATE TRIGGER browser_profiles_partition_immutable BEFORE UPDATE OF partition_id ON browser_profiles
  BEGIN SELECT RAISE(ABORT, 'partition_id is immutable'); END;

  CREATE TABLE ad_accounts (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('meta','tiktok')),
    external_id TEXT,
    display_name TEXT NOT NULL,
    connection_status TEXT NOT NULL DEFAULT 'not_connected'
      CHECK (connection_status IN ('not_connected','pending','connected','error')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX uq_ad_external ON ad_accounts(provider, external_id) WHERE external_id IS NOT NULL;
  CREATE INDEX idx_ads_business ON ad_accounts(business_id);

  -- للقراءة فقط في المرحلة 1: لا يوجد كود يكتب هنا قبل ربط المزوّدين فعلياً.
  CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    ad_account_id TEXT NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    objective TEXT,
    daily_budget REAL,
    currency TEXT,
    synced_at INTEGER NOT NULL,
    UNIQUE (ad_account_id, external_id)
  );

  CREATE TABLE audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    timestamp INTEGER NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX idx_audit_ts ON audit_events(timestamp DESC);
  `,
  `
  -- v2: تكامل Meta (قراءة فقط) + بنية TikTok/WhatsApp
  CREATE TABLE integration_credentials (
    provider TEXT PRIMARY KEY CHECK (provider IN ('meta','tiktok','whatsapp')),
    app_id TEXT,
    secret_enc TEXT,
    extra_json TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE meta_connections (
    id TEXT PRIMARY KEY,
    fb_user_id TEXT NOT NULL UNIQUE,
    fb_user_name TEXT,
    token_enc TEXT,
    token_expires_at INTEGER,
    scopes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked','error')),
    last_error TEXT,
    rate_limited_until INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE meta_ad_accounts (
    external_id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    currency TEXT,
    account_status INTEGER,
    timezone TEXT,
    meta_business_name TEXT,
    discovered_at INTEGER NOT NULL
  );
  ALTER TABLE ad_accounts ADD COLUMN connection_id TEXT REFERENCES meta_connections(id) ON DELETE SET NULL;
  ALTER TABLE campaigns ADD COLUMN effective_status TEXT;
  CREATE TABLE ad_sets (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    daily_budget REAL,
    optimization_goal TEXT,
    synced_at INTEGER NOT NULL,
    UNIQUE (campaign_id, external_id)
  );
  CREATE TABLE ads (
    id TEXT PRIMARY KEY,
    ad_set_id TEXT NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    synced_at INTEGER NOT NULL,
    UNIQUE (ad_set_id, external_id)
  );
  CREATE TABLE insights_daily (
    ad_account_id TEXT NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('campaign','adset','ad')),
    entity_external_id TEXT NOT NULL,
    date TEXT NOT NULL,
    spend REAL NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    conversions REAL NOT NULL DEFAULT 0,
    currency TEXT,
    actions_json TEXT,
    synced_at INTEGER NOT NULL,
    PRIMARY KEY (ad_account_id, level, entity_external_id, date)
  );
  CREATE INDEX idx_insights_date ON insights_daily(ad_account_id, level, date);
  CREATE TABLE sync_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_account_id TEXT NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    status TEXT NOT NULL CHECK (status IN ('running','ok','partial','error')),
    since TEXT NOT NULL,
    until TEXT NOT NULL,
    campaigns INTEGER NOT NULL DEFAULT 0,
    ad_sets INTEGER NOT NULL DEFAULT 0,
    ads INTEGER NOT NULL DEFAULT 0,
    insight_rows INTEGER NOT NULL DEFAULT 0,
    truncated INTEGER NOT NULL DEFAULT 0,
    error TEXT
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;
const REQUIRED_TABLES = ['businesses', 'social_accounts', 'proxies', 'proxy_secrets', 'browser_profiles', 'ad_accounts', 'campaigns', 'audit_events', 'meta_connections', 'insights_daily'];

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');

function userVersion(db: DB): number {
  return db.pragma('user_version', { simple: true }) as number;
}

function openAndMigrate(file: string, backupsDir: string): DB {
  const existed = existsSync(file);
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 3000');
  const current = userVersion(db);
  if (current > SCHEMA_VERSION) {
    db.close();
    throw new AppError(`قاعدة البيانات أحدث (إصدار ${current}) من هذا البرنامج (إصدار ${SCHEMA_VERSION}). حدّث البرنامج.`);
  }
  if (existed && current > 0 && current < SCHEMA_VERSION) {
    // نسخة احتياطية قبل أي تغيير في المخطط
    db.pragma('wal_checkpoint(TRUNCATE)');
    mkdirSync(backupsDir, { recursive: true });
    copyFileSync(file, join(backupsDir, `pre-migration-v${current}-${stamp()}.sqlite`));
  }
  for (let v = current; v < SCHEMA_VERSION; v++) {
    const apply = db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    });
    apply();
  }
  return db;
}

export type ValidateResult = { ok: true; version: number } | { ok: false; reason: string };

export class Store {
  db: DB;

  constructor(
    readonly file: string,
    readonly backupsDir: string,
  ) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = openAndMigrate(file, backupsDir);
  }

  schemaVersion(): number {
    return userVersion(this.db);
  }

  sizeBytes(): number {
    try {
      return statSync(this.file).size;
    } catch {
      return 0;
    }
  }

  integrity(): string {
    return (this.db.pragma('integrity_check', { simple: true }) as string) ?? 'unknown';
  }

  /** نسخة احتياطية متسقة (واجهة backup في SQLite) ثم فحص سلامتها. */
  async backupTo(dest: string): Promise<number> {
    mkdirSync(dirname(dest), { recursive: true });
    await this.db.backup(dest);
    const v = Store.validate(dest);
    if (!v.ok) {
      rmSync(dest, { force: true });
      throw new AppError(`فشل التحقق من النسخة الاحتياطية: ${v.reason}`);
    }
    return statSync(dest).size;
  }

  /**
   * نسخة احتياطية تلقائية إن مضى أكثر من maxAgeMs على آخر نسخة تلقائية، مع الاحتفاظ بآخر `keep` نسخ.
   * تعيد المسار أو null إن لم تلزم نسخة جديدة.
   */
  async autoBackup(maxAgeMs = 86_400_000, keep = 7, now = Date.now()): Promise<string | null> {
    mkdirSync(this.backupsDir, { recursive: true });
    const autos = readdirSync(this.backupsDir).filter((f) => /^auto-.*\.sqlite$/.test(f)).map((f) => ({ f, t: statSync(join(this.backupsDir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
    if (autos[0] && now - autos[0].t < maxAgeMs) return null;
    const dest = this.defaultBackupPath('auto');
    await this.backupTo(dest);
    const all = [{ f: basename(dest), t: now }, ...autos].sort((a, b) => b.t - a.t);
    for (const old of all.slice(keep)) rmSync(join(this.backupsDir, old.f), { force: true });
    return dest;
  }

  defaultBackupPath(prefix = 'businesshub'): string {
    return join(this.backupsDir, `${prefix}-${stamp()}.sqlite`);
  }

  /** يفتح الملف للقراءة فقط ويتحقق من أنه قاعدة BusinessHub سليمة وليست أحدث من البرنامج. */
  static validate(path: string): ValidateResult {
    if (!existsSync(path)) return { ok: false, reason: 'الملف غير موجود' };
    let db: DB | null = null;
    try {
      db = new Database(path, { readonly: true, fileMustExist: true });
      const check = db.pragma('integrity_check', { simple: true });
      if (check !== 'ok') return { ok: false, reason: `فشل فحص السلامة: ${String(check)}` };
      const fk = db.pragma('foreign_key_check') as unknown[];
      if (fk.length > 0) return { ok: false, reason: 'توجد مراجع مفقودة (foreign key) في الملف' };
      const version = userVersion(db);
      if (version < 1) return { ok: false, reason: 'الملف ليس قاعدة بيانات BusinessHub' };
      if (version > SCHEMA_VERSION) return { ok: false, reason: `النسخة أحدث (${version}) من هذا البرنامج (${SCHEMA_VERSION})` };
      const names = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((r) => r.name));
      const missing = REQUIRED_TABLES.filter((t) => !names.has(t) && version === SCHEMA_VERSION);
      if (missing.length) return { ok: false, reason: `جداول ناقصة: ${missing.join(', ')}` };
      return { ok: true, version };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? 'ليس ملف SQLite صالحاً' : 'خطأ غير معروف' };
    } finally {
      db?.close();
    }
  }

  /** استعادة: تحقق → نسخة احتياطية للحالية → استبدال → إعادة فتح مع الهجرات. */
  async restoreFrom(path: string): Promise<{ preRestoreBackup: string }> {
    const v = Store.validate(path);
    if (!v.ok) throw new AppError(`لا يمكن استعادة هذا الملف: ${v.reason}`);
    const pre = this.defaultBackupPath('pre-restore');
    await this.backupTo(pre);
    this.db.close();
    try {
      for (const ext of ['-wal', '-shm']) rmSync(this.file + ext, { force: true });
      copyFileSync(path, this.file);
    } finally {
      this.db = openAndMigrate(this.file, this.backupsDir);
    }
    return { preRestoreBackup: basename(pre) };
  }

  close(): void {
    if (this.db.open) this.db.close();
  }
}
