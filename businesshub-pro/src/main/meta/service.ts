import { randomUUID } from 'node:crypto';
import type {
  AdAccount, AdRow, AdSetRow, CampaignPage, CampaignRow, CurrencyTotals, MetaConnection, MetaDiscoveredAccount, MetaStatus, Metrics, SyncRun,
} from '../../shared/contract';
import type { AuditLog } from '../audit';
import { AppError } from '../errors';
import type { SecretBox } from '../secrets';
import type { Services } from '../services';
import type { Store } from '../store';
import { MetaApiError, MetaClient, classify, minorToMajor } from './client';
import { META_SCOPES, startLoopbackAuth, type OAuthSession } from './oauth';

type Row = Record<string, unknown>;

export interface MetaConfig {
  /** نسخة Graph API. تحقق من أحدث نسخة مدعومة في وثائق Meta قبل الإنتاج. */
  version: string;
  graphBase: string;
  dialogBase: string;
  /** منفذ redirect URI على 127.0.0.1. يجب تسجيل http://127.0.0.1:<port>/meta/callback في إعدادات تطبيق Meta. 0 = عشوائي (اختبارات). */
  redirectPort: number;
}
export const DEFAULT_META_CONFIG: MetaConfig = { version: 'v24.0', graphBase: 'https://graph.facebook.com', dialogBase: 'https://www.facebook.com', redirectPort: 53682 };

/** أنواع actions التي تُحتسب «تحويلات». القائمة معلنة للشفافية والـ actions الخام تُحفظ في actions_json. */
export const CONVERSION_ACTIONS = new Set([
  'purchase', 'omni_purchase', 'lead', 'omni_complete_registration', 'complete_registration', 'omni_add_to_cart', 'schedule', 'submit_application',
  'offsite_conversion.fb_pixel_purchase', 'offsite_conversion.fb_pixel_lead', 'offsite_conversion.fb_pixel_complete_registration',
  'onsite_conversion.lead_grouped', 'onsite_conversion.purchase',
]);

const DAY = 86_400_000;
const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (ms: number) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };

export function userMessage(e: unknown): string {
  if (!(e instanceof MetaApiError)) return e instanceof AppError ? e.message : 'حدث خطأ غير متوقع أثناء الاتصال بـ Meta.';
  switch (e.kind) {
    case 'token': return 'انتهت صلاحية رمز Meta أو أُلغي. أعد ربط الحساب.';
    case 'rate_limit': return `تجاوزتَ حد الطلبات في Meta. حاول بعد ${Math.ceil((e.retryAfterSec ?? 300) / 60)} دقيقة.`;
    case 'permission': return `ليست لديك صلاحية كافية في Meta (${e.message}).`;
    case 'transient': return 'خدمة Meta غير متاحة مؤقتاً. حاول لاحقاً.';
    case 'invalid': return `رفض Meta الطلب: ${e.message}`;
    default: return `خطأ من Meta: ${e.message}`;
  }
}

export interface MetaServiceDeps {
  store: Store; secrets: SecretBox; audit: AuditLog; svc: Services;
  openExternal: (url: string) => Promise<void>;
  config?: Partial<MetaConfig>;
  fetchImpl?: typeof fetch;
  now?: () => number;
  clientOptions?: ConstructorParameters<typeof MetaClient>[0];
}

export class MetaService {
  private readonly cfg: MetaConfig;
  private readonly now: () => number;
  private auth: OAuthSession | null = null;
  private syncing = new Set<string>();

  constructor(private readonly d: MetaServiceDeps) {
    this.cfg = { ...DEFAULT_META_CONFIG, ...d.config };
    this.now = d.now ?? Date.now;
  }

  private get db() { return this.d.store.db; }
  private client(): MetaClient {
    return new MetaClient({ baseUrl: this.cfg.graphBase, version: this.cfg.version, fetchImpl: this.d.fetchImpl, ...this.d.clientOptions });
  }

  // ───────── بيانات التطبيق (App ID / Secret) ─────────
  private creds(): { appId: string; secret: string } | null {
    const r = this.db.prepare("SELECT app_id, secret_enc FROM integration_credentials WHERE provider='meta'").get() as Row | undefined;
    return r?.app_id && r.secret_enc ? { appId: r.app_id as string, secret: r.secret_enc as string } : null;
  }

  async saveCredentials(appId: string, appSecret?: string): Promise<MetaStatus> {
    const cur = this.db.prepare("SELECT secret_enc FROM integration_credentials WHERE provider='meta'").get() as Row | undefined;
    if (!appSecret && !cur?.secret_enc) throw new AppError('أدخل سر التطبيق (App Secret) لأول مرة.');
    const enc = appSecret ? await this.d.secrets.encrypt(appSecret) : (cur!.secret_enc as string);
    this.db.prepare(`INSERT INTO integration_credentials (provider, app_id, secret_enc, extra_json, updated_at) VALUES ('meta', ?, ?, '{}', ?)
      ON CONFLICT(provider) DO UPDATE SET app_id=excluded.app_id, secret_enc=excluded.secret_enc, updated_at=excluded.updated_at`).run(appId, enc, this.now());
    this.d.audit.log('meta.credentials.save', 'integration', 'meta', { appId });
    return this.status();
  }

  clearCredentials(): void {
    this.db.prepare("DELETE FROM integration_credentials WHERE provider='meta'").run();
    this.d.audit.log('meta.credentials.clear', 'integration', 'meta');
  }

  private async appSecret(): Promise<{ appId: string; secret: string }> {
    const c = this.creds();
    if (!c) throw new AppError('أدخل معرّف تطبيق Meta وسرّه أولاً.');
    return { appId: c.appId, secret: await this.d.secrets.decrypt(c.secret) };
  }

  // ───────── الحالة ─────────
  private mapConn = (r: Row): MetaConnection => ({
    id: r.id as string, fbUserId: r.fb_user_id as string, fbUserName: (r.fb_user_name as string | null) ?? null,
    status: this.effectiveStatus(r), scopes: String(r.scopes ?? '').split(',').filter(Boolean),
    tokenExpiresAt: (r.token_expires_at as number | null) ?? null, lastError: (r.last_error as string | null) ?? null,
    rateLimitedUntil: (r.rate_limited_until as number | null) ?? null, adAccountCount: (r.ad_count as number) ?? 0, createdAt: r.created_at as number,
  });
  private effectiveStatus(r: Row): MetaConnection['status'] {
    const exp = r.token_expires_at as number | null;
    if (r.status === 'active' && exp && exp <= this.now()) return 'expired';
    return r.status as MetaConnection['status'];
  }

  listConnections(): MetaConnection[] {
    return (this.db.prepare('SELECT c.*, (SELECT COUNT(*) FROM meta_ad_accounts a WHERE a.connection_id=c.id) AS ad_count FROM meta_connections c ORDER BY c.created_at').all() as Row[]).map(this.mapConn);
  }

  status(): MetaStatus {
    const c = this.db.prepare("SELECT app_id, secret_enc FROM integration_credentials WHERE provider='meta'").get() as Row | undefined;
    return {
      configured: !!(c?.app_id && c.secret_enc), appId: (c?.app_id as string | null) ?? null, hasSecret: !!c?.secret_enc,
      redirectUri: `http://127.0.0.1:${this.cfg.redirectPort || '<port>'}/meta/callback`, apiVersion: this.cfg.version,
      scopes: META_SCOPES, connections: this.listConnections(), connecting: this.auth !== null,
    };
  }

  // ───────── OAuth ─────────
  async connect(): Promise<MetaConnection> {
    if (this.auth) throw new AppError('هناك عملية ربط جارية بالفعل.');
    const { appId, secret } = await this.appSecret();
    const session = await startLoopbackAuth({ port: this.cfg.redirectPort, dialogBase: this.cfg.dialogBase, version: this.cfg.version, appId });
    this.auth = session;
    try {
      await this.d.openExternal(session.authUrl);
      const code = await session.code;
      const conn = await this.completeConnection(appId, secret, code, session.redirectUri);
      this.d.audit.log('meta.connect', 'meta_connection', conn.id, { user: conn.fbUserName, scopes: conn.scopes.join(',') });
      return conn;
    } finally {
      this.auth = null;
    }
  }

  cancelConnect(): void {
    this.auth?.cancel();
  }

  private async exchange(params: Record<string, string>): Promise<{ access_token: string; expires_in?: number }> {
    let res: Response;
    try {
      res = await (this.d.fetchImpl ?? fetch)(`${this.cfg.graphBase}/${this.cfg.version}/oauth/access_token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams(params).toString(),
      });
    } catch { throw new AppError('تعذّر الاتصال بخوادم Meta (الشبكة).'); }
    const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
    if (!res.ok || !body?.access_token) throw new AppError(userMessage(classify(res.status, body)));
    return { access_token: body.access_token, expires_in: body.expires_in };
  }

  private async completeConnection(appId: string, secret: string, code: string, redirectUri: string): Promise<MetaConnection> {
    const short = await this.exchange({ client_id: appId, client_secret: secret, redirect_uri: redirectUri, code });
    const long = await this.exchange({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: secret, fb_exchange_token: short.access_token });
    const token = long.access_token;
    const cl = this.client();
    let me: { id: string; name?: string };
    let dbg: { data?: { is_valid?: boolean; expires_at?: number; scopes?: string[] } } = {};
    try {
      me = await cl.get<{ id: string; name?: string }>('/me', { fields: 'id,name' }, token);
      dbg = await cl.get('/debug_token', { input_token: token }, `${appId}|${secret}`);
    } catch (e) { throw new AppError(userMessage(e)); }
    if (dbg.data && dbg.data.is_valid === false) throw new AppError('Meta أبلغ أن الرمز غير صالح.');
    const exp = dbg.data?.expires_at ? dbg.data.expires_at * 1000 : long.expires_in ? this.now() + long.expires_in * 1000 : null;
    const scopes = (dbg.data?.scopes ?? META_SCOPES).join(',');
    const enc = await this.d.secrets.encrypt(token);
    const now = this.now();
    const existing = this.db.prepare('SELECT id FROM meta_connections WHERE fb_user_id=?').get(me.id) as { id: string } | undefined;
    const id = existing?.id ?? randomUUID();
    if (existing) {
      this.db.prepare("UPDATE meta_connections SET fb_user_name=?, token_enc=?, token_expires_at=?, scopes=?, status='active', last_error=NULL, rate_limited_until=NULL, updated_at=? WHERE id=?").run(me.name ?? null, enc, exp, scopes, now, id);
    } else {
      this.db.prepare("INSERT INTO meta_connections (id, fb_user_id, fb_user_name, token_enc, token_expires_at, scopes, status, created_at, updated_at) VALUES (?,?,?,?,?,?, 'active', ?, ?)").run(id, me.id, me.name ?? null, enc, exp, scopes, now, now);
    }
    // الحسابات الإعلانية المرتبطة سابقاً بهذا الاتصال تعود «متصلة»
    this.db.prepare("UPDATE ad_accounts SET connection_status='connected', updated_at=? WHERE connection_id=?").run(now, id);
    return this.listConnections().find((c) => c.id === id)!;
  }

  disconnect(id: string): void {
    const c = this.db.prepare('SELECT id FROM meta_connections WHERE id=?').get(id);
    if (!c) throw new AppError('الاتصال غير موجود.');
    this.db.transaction(() => {
      this.db.prepare("UPDATE ad_accounts SET connection_status='not_connected', updated_at=? WHERE connection_id=?").run(this.now(), id);
      // الرمز يُحذف نهائياً؛ البيانات المخزّنة مسبقاً تبقى للاطلاع (قديمة)
      this.db.prepare("UPDATE meta_connections SET token_enc=NULL, status='revoked', updated_at=? WHERE id=?").run(this.now(), id);
    })();
    this.d.audit.log('meta.disconnect', 'meta_connection', id);
  }

  private async token(connId: string): Promise<string> {
    const r = this.db.prepare('SELECT * FROM meta_connections WHERE id=?').get(connId) as Row | undefined;
    if (!r) throw new AppError('الاتصال غير موجود.');
    if (!r.token_enc || r.status === 'revoked') throw new AppError('هذا الاتصال مفصول. أعد الربط.');
    if (r.status === 'expired') throw new AppError('انتهت صلاحية رمز Meta. أعد ربط الحساب.');
    const exp = r.token_expires_at as number | null;
    if (exp && exp <= this.now()) { this.markExpired(connId, 'انتهت صلاحية الرمز'); throw new AppError('انتهت صلاحية رمز Meta. أعد ربط الحساب.'); }
    const until = r.rate_limited_until as number | null;
    if (until && until > this.now()) throw new AppError(`حد الطلبات في Meta مفعّل. حاول بعد ${Math.ceil((until - this.now()) / 60000)} دقيقة.`);
    return this.d.secrets.decrypt(r.token_enc as string);
  }

  private markExpired(connId: string, msg: string): void {
    this.db.prepare("UPDATE meta_connections SET status='expired', last_error=?, updated_at=? WHERE id=?").run(msg, this.now(), connId);
    this.db.prepare("UPDATE ad_accounts SET connection_status='error', updated_at=? WHERE connection_id=?").run(this.now(), connId);
  }

  /** يسجّل أثر الخطأ على الاتصال (انتهاء الرمز / حد المعدل) ويعيد AppError عربياً. */
  private handleApiError(connId: string, e: unknown): AppError {
    if (e instanceof MetaApiError) {
      if (e.kind === 'token') this.markExpired(connId, e.message);
      else if (e.kind === 'rate_limit') this.db.prepare('UPDATE meta_connections SET rate_limited_until=?, last_error=?, updated_at=? WHERE id=?').run(this.now() + (e.retryAfterSec ?? 300) * 1000, e.message, this.now(), connId);
      else this.db.prepare('UPDATE meta_connections SET last_error=?, updated_at=? WHERE id=?').run(e.message, this.now(), connId);
    }
    return new AppError(userMessage(e));
  }

  // ───────── اكتشاف الحسابات الإعلانية وربطها ─────────
  async discover(connectionId: string): Promise<MetaDiscoveredAccount[]> {
    const token = await this.token(connectionId);
    try {
      const res = await this.client().paginate<{ id: string; name?: string; currency?: string; account_status?: number; timezone_name?: string; business?: { name?: string } }>(
        '/me/adaccounts', { fields: 'id,name,currency,account_status,timezone_name,business{name}', limit: 100 }, token, 20);
      const up = this.db.prepare(`INSERT INTO meta_ad_accounts (external_id, connection_id, name, currency, account_status, timezone, meta_business_name, discovered_at) VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(external_id) DO UPDATE SET connection_id=excluded.connection_id, name=excluded.name, currency=excluded.currency, account_status=excluded.account_status, timezone=excluded.timezone, meta_business_name=excluded.meta_business_name, discovered_at=excluded.discovered_at`);
      this.db.transaction(() => { for (const a of res.data) if (/^act_\d+$/.test(a.id)) up.run(a.id, connectionId, a.name ?? a.id, a.currency ?? null, a.account_status ?? null, a.timezone_name ?? null, a.business?.name ?? null, this.now()); })();
      this.d.audit.log('meta.discover', 'meta_connection', connectionId, { count: res.data.length, truncated: res.truncated });
    } catch (e) { throw this.handleApiError(connectionId, e); }
    return this.discovered(connectionId);
  }

  discovered(connectionId?: string): MetaDiscoveredAccount[] {
    const rows = this.db.prepare(`SELECT m.*, a.id AS linked_id, a.business_id AS linked_business, b.name AS linked_business_name FROM meta_ad_accounts m
      LEFT JOIN ad_accounts a ON a.provider='meta' AND a.external_id=m.external_id LEFT JOIN businesses b ON b.id=a.business_id
      ${connectionId ? 'WHERE m.connection_id=?' : ''} ORDER BY m.name`).all(...(connectionId ? [connectionId] : [])) as Row[];
    return rows.map((r) => ({
      externalId: r.external_id as string, connectionId: r.connection_id as string, name: r.name as string, currency: (r.currency as string | null) ?? null,
      accountStatus: (r.account_status as number | null) ?? null, timezone: (r.timezone as string | null) ?? null, metaBusinessName: (r.meta_business_name as string | null) ?? null,
      linkedAdAccountId: (r.linked_id as string | null) ?? null, linkedBusinessId: (r.linked_business as string | null) ?? null, linkedBusinessName: (r.linked_business_name as string | null) ?? null,
    }));
  }

  /** يربط حساباً إعلانياً مكتشفاً بنشاط (مساحة العمل). حساب مرتبط بنشاط آخر يُرفض حتى يُفكّ ربطه. */
  link(externalId: string, businessId: string): AdAccount {
    const m = this.db.prepare('SELECT * FROM meta_ad_accounts WHERE external_id=?').get(externalId) as Row | undefined;
    if (!m) throw new AppError('الحساب الإعلاني غير مكتشف. نفّذ «اكتشاف الحسابات» أولاً.');
    this.d.svc.getBusiness(businessId) ?? (() => { throw new AppError('النشاط غير موجود.'); })();
    const ex = this.db.prepare("SELECT id, business_id FROM ad_accounts WHERE provider='meta' AND external_id=?").get(externalId) as { id: string; business_id: string } | undefined;
    if (ex && ex.business_id !== businessId) throw new AppError('هذا الحساب الإعلاني مرتبط بنشاط آخر. فُكّ ربطه أولاً.');
    const now = this.now();
    let id = ex?.id;
    if (ex) {
      this.db.prepare("UPDATE ad_accounts SET connection_id=?, connection_status='connected', display_name=?, updated_at=? WHERE id=?").run(m.connection_id, m.name, now, ex.id);
    } else {
      id = randomUUID();
      this.db.prepare("INSERT INTO ad_accounts (id, business_id, provider, external_id, display_name, connection_status, connection_id, created_at, updated_at) VALUES (?,?,?,?,?,'connected',?,?,?)")
        .run(id, businessId, 'meta', externalId, m.name, m.connection_id, now, now);
    }
    this.d.audit.log('meta.link', 'ad_account', id!, { externalId, businessId });
    return this.d.svc.listAds().find((a) => a.id === id)!;
  }

  unlink(adAccountId: string): void {
    const a = this.db.prepare("SELECT id FROM ad_accounts WHERE id=? AND provider='meta' AND connection_id IS NOT NULL").get(adAccountId);
    if (!a) throw new AppError('الحساب الإعلاني غير مربوط عبر Meta.');
    // فكّ الربط يحذف السجل المحلي وبياناته المخزّنة (حملات/إحصاءات) عبر CASCADE؛ لا يمس Meta
    this.db.prepare('DELETE FROM ad_accounts WHERE id=?').run(adAccountId);
    this.d.audit.log('meta.unlink', 'ad_account', adAccountId);
  }

  // ───────── المزامنة (قراءة فقط) ─────────
  private validateRange(since: string, until: string): void {
    const s = Date.parse(since + 'T00:00:00Z');
    const u = Date.parse(until + 'T00:00:00Z');
    if (u < s) throw new AppError('تاريخ النهاية قبل تاريخ البداية.');
    if (u > this.now() + DAY) throw new AppError('لا يمكن اختيار تاريخ مستقبلي.');
    if ((u - s) / DAY > 1095) throw new AppError('الحد الأقصى للنطاق 37 شهراً (قيد Meta).');
  }

  async sync(adAccountId: string, since: string, until: string): Promise<SyncRun> {
    this.validateRange(since, until);
    const a = this.db.prepare("SELECT * FROM ad_accounts WHERE id=? AND provider='meta'").get(adAccountId) as Row | undefined;
    if (!a || !a.external_id || !a.connection_id) throw new AppError('الحساب الإعلاني غير مربوط عبر Meta.');
    if (this.syncing.has(adAccountId)) throw new AppError('المزامنة جارية لهذا الحساب.');
    const connId = a.connection_id as string;
    const token = await this.token(connId);
    const act = a.external_id as string;
    const cur = ((this.db.prepare('SELECT currency FROM meta_ad_accounts WHERE external_id=?').get(act) as Row | undefined)?.currency as string | null) ?? null;
    const runId = Number(this.db.prepare("INSERT INTO sync_runs (ad_account_id, started_at, status, since, until) VALUES (?,?,'running',?,?)").run(adAccountId, this.now(), since, until).lastInsertRowid);
    const counts = { campaigns: 0, adSets: 0, ads: 0, insightRows: 0, truncated: false };
    this.syncing.add(adAccountId);
    const cl = this.client();
    try {
      const camps = await cl.paginate<Row>(`/${act}/campaigns`, { fields: 'id,name,status,effective_status,objective,daily_budget', limit: 100 }, token, 50);
      counts.truncated ||= camps.truncated;
      const upC = this.db.prepare(`INSERT INTO campaigns (id, ad_account_id, external_id, name, status, effective_status, objective, daily_budget, currency, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, status=excluded.status, effective_status=excluded.effective_status, objective=excluded.objective, daily_budget=excluded.daily_budget, currency=excluded.currency, synced_at=excluded.synced_at`);
      this.db.transaction(() => { for (const c of camps.data) { upC.run(`meta:${c.id}`, adAccountId, String(c.id), String(c.name ?? c.id), String(c.status ?? 'UNKNOWN'), (c.effective_status as string) ?? null, (c.objective as string) ?? null, minorToMajor(c.daily_budget as string, cur), cur, this.now()); counts.campaigns++; } })();

      const sets = await cl.paginate<Row>(`/${act}/adsets`, { fields: 'id,name,status,campaign_id,daily_budget,optimization_goal', limit: 100 }, token, 50);
      counts.truncated ||= sets.truncated;
      const upS = this.db.prepare(`INSERT INTO ad_sets (id, campaign_id, external_id, name, status, daily_budget, optimization_goal, synced_at) VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, status=excluded.status, daily_budget=excluded.daily_budget, optimization_goal=excluded.optimization_goal, synced_at=excluded.synced_at`);
      const campExists = this.db.prepare('SELECT 1 FROM campaigns WHERE id=?');
      this.db.transaction(() => { for (const s of sets.data) if (campExists.get(`meta:${s.campaign_id}`)) { upS.run(`meta:${s.id}`, `meta:${s.campaign_id}`, String(s.id), String(s.name ?? s.id), String(s.status ?? 'UNKNOWN'), minorToMajor(s.daily_budget as string, cur), (s.optimization_goal as string) ?? null, this.now()); counts.adSets++; } })();

      const ads = await cl.paginate<Row>(`/${act}/ads`, { fields: 'id,name,status,adset_id', limit: 100 }, token, 100);
      counts.truncated ||= ads.truncated;
      const upA = this.db.prepare(`INSERT INTO ads (id, ad_set_id, external_id, name, status, synced_at) VALUES (?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, status=excluded.status, synced_at=excluded.synced_at`);
      const setExists = this.db.prepare('SELECT 1 FROM ad_sets WHERE id=?');
      this.db.transaction(() => { for (const x of ads.data) if (setExists.get(`meta:${x.adset_id}`)) { upA.run(`meta:${x.id}`, `meta:${x.adset_id}`, String(x.id), String(x.name ?? x.id), String(x.status ?? 'UNKNOWN'), this.now()); counts.ads++; } })();

      // الإحصاءات على نوافذ ≤ 31 يوماً لتقليل الحمولة
      const upI = this.db.prepare(`INSERT INTO insights_daily (ad_account_id, level, entity_external_id, date, spend, impressions, clicks, reach, conversions, currency, actions_json, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(ad_account_id, level, entity_external_id, date) DO UPDATE SET spend=excluded.spend, impressions=excluded.impressions, clicks=excluded.clicks, reach=excluded.reach, conversions=excluded.conversions, currency=excluded.currency, actions_json=excluded.actions_json, synced_at=excluded.synced_at`);
      for (const level of ['campaign', 'adset', 'ad'] as const) {
        const idField = level === 'campaign' ? 'campaign_id' : level === 'adset' ? 'adset_id' : 'ad_id';
        for (let from = Date.parse(since + 'T00:00:00Z'); from <= Date.parse(until + 'T00:00:00Z'); from += 31 * DAY) {
          const to = Math.min(from + 30 * DAY, Date.parse(until + 'T00:00:00Z'));
          const ins = await cl.paginate<Row>(`/${act}/insights`, {
            level, time_increment: 1, time_range: JSON.stringify({ since: ymd(from), until: ymd(to) }), limit: 500,
            fields: `${idField},date_start,spend,impressions,clicks,reach,actions`,
          }, token, 100);
          counts.truncated ||= ins.truncated;
          this.db.transaction(() => {
            for (const r of ins.data) {
              const actions = Array.isArray(r.actions) ? (r.actions as { action_type: string; value: string }[]) : [];
              const conv = actions.filter((x) => CONVERSION_ACTIONS.has(x.action_type)).reduce((t, x) => t + num(x.value), 0);
              upI.run(adAccountId, level, String(r[idField]), String(r.date_start), num(r.spend), Math.round(num(r.impressions)), Math.round(num(r.clicks)), Math.round(num(r.reach)), conv, cur, actions.length ? JSON.stringify(actions) : null, this.now());
              counts.insightRows++;
            }
          })();
        }
      }
      const status = counts.truncated ? 'partial' : 'ok';
      this.db.prepare('UPDATE sync_runs SET finished_at=?, status=?, campaigns=?, ad_sets=?, ads=?, insight_rows=?, truncated=? WHERE id=?').run(this.now(), status, counts.campaigns, counts.adSets, counts.ads, counts.insightRows, counts.truncated ? 1 : 0, runId);
      this.db.prepare("UPDATE meta_connections SET last_error=NULL, updated_at=? WHERE id=?").run(this.now(), connId);
      this.d.audit.log('meta.sync', 'ad_account', adAccountId, { since, until, status, ...counts });
    } catch (e) {
      const ae = this.handleApiError(connId, e);
      this.db.prepare("UPDATE sync_runs SET finished_at=?, status='error', campaigns=?, ad_sets=?, ads=?, insight_rows=?, error=? WHERE id=?").run(this.now(), counts.campaigns, counts.adSets, counts.ads, counts.insightRows, ae.message, runId);
      this.d.audit.log('meta.sync.error', 'ad_account', adAccountId, { error: ae.message });
      throw ae;
    } finally {
      this.syncing.delete(adAccountId);
    }
    return this.syncRuns().find((r) => r.id === runId)!;
  }

  syncRuns(adAccountId?: string): SyncRun[] {
    const rows = this.db.prepare(`SELECT r.*, a.display_name FROM sync_runs r JOIN ad_accounts a ON a.id=r.ad_account_id ${adAccountId ? 'WHERE r.ad_account_id=?' : ''} ORDER BY r.id DESC LIMIT 50`).all(...(adAccountId ? [adAccountId] : [])) as Row[];
    return rows.map((r) => ({
      id: r.id as number, adAccountId: r.ad_account_id as string, adAccountName: r.display_name as string, startedAt: r.started_at as number, finishedAt: (r.finished_at as number | null) ?? null,
      status: r.status as SyncRun['status'], since: r.since as string, until: r.until as string, campaigns: r.campaigns as number, adSets: r.ad_sets as number, ads: r.ads as number,
      insightRows: r.insight_rows as number, truncated: !!r.truncated, error: (r.error as string | null) ?? null,
    }));
  }

  // ───────── استعلامات التحليلات (من البيانات المخزّنة فقط) ─────────
  private metrics(r: Row): Metrics {
    const spend = num(r.spend), impressions = num(r.impressions), clicks = num(r.clicks);
    return { spend, impressions, clicks, reach: num(r.reach), conversions: num(r.conversions), ctr: impressions > 0 ? (clicks / impressions) * 100 : null, cpc: clicks > 0 ? spend / clicks : null };
  }

  campaigns(f: { adAccountId?: string; businessId?: string; since: string; until: string; query?: string; status?: string; page: number; pageSize: number }): CampaignPage {
    const where: string[] = ["a.provider='meta'"];
    const p: (string | number)[] = [f.since, f.until];
    if (f.adAccountId) { where.push('c.ad_account_id=?'); p.push(f.adAccountId); }
    if (f.businessId) { where.push('a.business_id=?'); p.push(f.businessId); }
    if (f.status) { where.push('COALESCE(c.effective_status, c.status)=?'); p.push(f.status); }
    if (f.query?.trim()) { where.push("c.name LIKE ? ESCAPE '\\'"); p.push(`%${f.query.trim().replace(/[\\%_]/g, (m) => '\\' + m)}%`); }
    const base = `FROM campaigns c JOIN ad_accounts a ON a.id=c.ad_account_id JOIN businesses b ON b.id=a.business_id
      LEFT JOIN insights_daily i ON i.ad_account_id=c.ad_account_id AND i.level='campaign' AND i.entity_external_id=c.external_id AND i.date BETWEEN ? AND ?
      WHERE ${where.join(' AND ')}`;
    const total = (this.db.prepare(`SELECT COUNT(DISTINCT c.id) n ${base}`).get(...p) as { n: number }).n;
    const rows = this.db.prepare(`SELECT c.*, a.display_name AS ad_name, a.business_id, b.name AS business_name,
      COALESCE(SUM(i.spend),0) spend, COALESCE(SUM(i.impressions),0) impressions, COALESCE(SUM(i.clicks),0) clicks, COALESCE(SUM(i.reach),0) reach, COALESCE(SUM(i.conversions),0) conversions
      ${base} GROUP BY c.id ORDER BY spend DESC, c.name LIMIT ? OFFSET ?`).all(...p, f.pageSize, (f.page - 1) * f.pageSize) as Row[];
    const totRows = this.db.prepare(`SELECT COALESCE(c.currency, 'غير محددة') AS currency, SUM(i.spend) spend, SUM(i.impressions) impressions, SUM(i.clicks) clicks, SUM(i.reach) reach, SUM(i.conversions) conversions
      ${base} AND i.date IS NOT NULL GROUP BY COALESCE(c.currency, 'غير محددة')`).all(...p) as Row[];
    return {
      total, page: f.page, pageSize: f.pageSize,
      rows: rows.map((r): CampaignRow => ({
        id: r.id as string, adAccountId: r.ad_account_id as string, adAccountName: r.ad_name as string, businessId: r.business_id as string, businessName: r.business_name as string,
        externalId: r.external_id as string, name: r.name as string, status: r.status as string, effectiveStatus: (r.effective_status as string | null) ?? null,
        objective: (r.objective as string | null) ?? null, dailyBudget: (r.daily_budget as number | null) ?? null, currency: (r.currency as string | null) ?? null, syncedAt: r.synced_at as number, metrics: this.metrics(r),
      })),
      totals: totRows.map((r): CurrencyTotals => ({ currency: r.currency as string, ...this.metrics(r) })),
    };
  }

  adSets(campaignId: string, since: string, until: string): AdSetRow[] {
    const rows = this.db.prepare(`SELECT s.*, COALESCE(SUM(i.spend),0) spend, COALESCE(SUM(i.impressions),0) impressions, COALESCE(SUM(i.clicks),0) clicks, COALESCE(SUM(i.reach),0) reach, COALESCE(SUM(i.conversions),0) conversions
      FROM ad_sets s JOIN campaigns c ON c.id=s.campaign_id LEFT JOIN insights_daily i ON i.ad_account_id=c.ad_account_id AND i.level='adset' AND i.entity_external_id=s.external_id AND i.date BETWEEN ? AND ?
      WHERE s.campaign_id=? GROUP BY s.id ORDER BY spend DESC, s.name`).all(since, until, campaignId) as Row[];
    return rows.map((r) => ({ id: r.id as string, externalId: r.external_id as string, name: r.name as string, status: r.status as string, dailyBudget: (r.daily_budget as number | null) ?? null, optimizationGoal: (r.optimization_goal as string | null) ?? null, metrics: this.metrics(r) }));
  }

  adsOf(adSetId: string, since: string, until: string): AdRow[] {
    const rows = this.db.prepare(`SELECT x.*, COALESCE(SUM(i.spend),0) spend, COALESCE(SUM(i.impressions),0) impressions, COALESCE(SUM(i.clicks),0) clicks, COALESCE(SUM(i.reach),0) reach, COALESCE(SUM(i.conversions),0) conversions
      FROM ads x JOIN ad_sets s ON s.id=x.ad_set_id JOIN campaigns c ON c.id=s.campaign_id LEFT JOIN insights_daily i ON i.ad_account_id=c.ad_account_id AND i.level='ad' AND i.entity_external_id=x.external_id AND i.date BETWEEN ? AND ?
      WHERE x.ad_set_id=? GROUP BY x.id ORDER BY spend DESC, x.name`).all(since, until, adSetId) as Row[];
    return rows.map((r) => ({ id: r.id as string, externalId: r.external_id as string, name: r.name as string, status: r.status as string, metrics: this.metrics(r) }));
  }
}
