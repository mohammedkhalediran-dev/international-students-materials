import { randomUUID } from 'node:crypto';
import type { Group, GroupInput, Profile, ProfileFilter, ProfileInput, ProxyType } from '../shared/types';
import type { DB } from './db';
import { AppError } from './errors';
import type { SecretBox } from './secrets';

type SqlParam = string | number | null;

interface ProfileRow {
  id: string;
  name: string;
  group_id: number | null;
  notes: string;
  start_url: string;
  user_agent: string;
  proxy_type: ProxyType;
  proxy_host: string;
  proxy_port: number | null;
  proxy_username: string;
  proxy_password_enc: string | null;
  created_at: number;
  updated_at: number;
  last_opened_at: number | null;
}

function toProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    name: r.name,
    groupId: r.group_id,
    notes: r.notes,
    startUrl: r.start_url,
    userAgent: r.user_agent,
    proxyType: r.proxy_type,
    proxyHost: r.proxy_host,
    proxyPort: r.proxy_port,
    proxyUsername: r.proxy_username,
    hasProxyPassword: r.proxy_password_enc !== null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lastOpenedAt: r.last_opened_at,
  };
}

export class ProfileService {
  constructor(
    private readonly db: DB,
    private readonly secrets: SecretBox,
  ) {}

  list(filter: ProfileFilter): Profile[] {
    const where: string[] = [];
    const params: SqlParam[] = [];
    if (filter.group === 'none') where.push('p.group_id IS NULL');
    else if (typeof filter.group === 'number') {
      where.push('p.group_id = ?');
      params.push(filter.group);
    }
    const q = filter.query.trim();
    if (q) {
      const like = `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
      where.push(
        "(p.name LIKE ? ESCAPE '\\' OR p.notes LIKE ? ESCAPE '\\' OR p.proxy_host LIKE ? ESCAPE '\\' OR g.name LIKE ? ESCAPE '\\')",
      );
      params.push(like, like, like, like);
    }
    const sql = `SELECT p.* FROM profiles p LEFT JOIN groups g ON g.id = p.group_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY p.created_at DESC, p.rowid DESC`;
    return (this.db.prepare(sql).all(...params) as unknown as ProfileRow[]).map(toProfile);
  }

  private row(id: string): ProfileRow | undefined {
    return this.db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as unknown as ProfileRow | undefined;
  }

  get(id: string): Profile | null {
    const r = this.row(id);
    return r ? toProfile(r) : null;
  }

  private assertGroup(groupId: number | null): void {
    if (groupId === null) return;
    if (!this.db.prepare('SELECT 1 FROM groups WHERE id = ?').get(groupId)) throw new AppError('التصنيف المحدد غير موجود.');
  }

  async create(input: ProfileInput): Promise<Profile> {
    this.assertGroup(input.groupId);
    const enc = input.proxyType !== 'none' && input.proxyPassword ? await this.secrets.encrypt(input.proxyPassword) : null;
    const id = randomUUID();
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO profiles (id, name, group_id, notes, start_url, user_agent, proxy_type, proxy_host, proxy_port,
          proxy_username, proxy_password_enc, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(id, input.name, input.groupId, input.notes, input.startUrl, input.userAgent, input.proxyType, input.proxyHost,
        input.proxyPort, input.proxyUsername, enc, now, now);
    return this.get(id)!;
  }

  async update(id: string, input: ProfileInput): Promise<Profile> {
    const existing = this.row(id);
    if (!existing) throw new AppError('الملف غير موجود.');
    this.assertGroup(input.groupId);
    let enc: string | null;
    if (input.proxyType === 'none' || input.clearProxyPassword) enc = null;
    else if (input.proxyPassword) enc = await this.secrets.encrypt(input.proxyPassword);
    else enc = existing.proxy_password_enc;
    this.db
      .prepare(
        `UPDATE profiles SET name=?, group_id=?, notes=?, start_url=?, user_agent=?, proxy_type=?, proxy_host=?,
          proxy_port=?, proxy_username=?, proxy_password_enc=?, updated_at=? WHERE id=?`,
      )
      .run(input.name, input.groupId, input.notes, input.startUrl, input.userAgent, input.proxyType, input.proxyHost,
        input.proxyPort, input.proxyUsername, enc, Date.now(), id);
    return this.get(id)!;
  }

  remove(id: string): void {
    this.db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  }

  touchOpened(id: string): void {
    this.db.prepare('UPDATE profiles SET last_opened_at = ? WHERE id = ?').run(Date.now(), id);
  }

  async getProxyCredentials(id: string): Promise<{ username: string; password: string } | null> {
    const r = this.row(id);
    if (!r || r.proxy_type === 'none' || !r.proxy_username) return null;
    const password = r.proxy_password_enc ? await this.secrets.decrypt(r.proxy_password_enc) : '';
    return { username: r.proxy_username, password };
  }

  // ---- التصنيفات ----
  listGroups(): Group[] {
    return this.db
      .prepare(
        `SELECT g.id, g.name, g.color, COUNT(p.id) AS profileCount FROM groups g
         LEFT JOIN profiles p ON p.group_id = g.id GROUP BY g.id ORDER BY g.name`,
      )
      .all() as unknown as Group[];
  }

  private group(id: number): Group {
    const g = this.listGroups().find((x) => x.id === id);
    if (!g) throw new AppError('التصنيف غير موجود.');
    return g;
  }

  createGroup(input: GroupInput): Group {
    try {
      const r = this.db.prepare('INSERT INTO groups (name, color, created_at) VALUES (?,?,?)').run(input.name, input.color, Date.now());
      return this.group(Number(r.lastInsertRowid));
    } catch (e) {
      throw this.groupError(e);
    }
  }

  updateGroup(id: number, input: GroupInput): Group {
    try {
      const r = this.db.prepare('UPDATE groups SET name=?, color=? WHERE id=?').run(input.name, input.color, id);
      if (r.changes === 0) throw new AppError('التصنيف غير موجود.');
      return this.group(id);
    } catch (e) {
      throw this.groupError(e);
    }
  }

  deleteGroup(id: number): void {
    this.db.prepare('DELETE FROM groups WHERE id = ?').run(id);
  }

  private groupError(e: unknown): unknown {
    if (e instanceof Error && /UNIQUE/i.test(e.message)) return new AppError('يوجد تصنيف بنفس الاسم.');
    return e;
  }
}
