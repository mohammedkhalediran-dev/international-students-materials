import { randomUUID } from 'node:crypto';
import type {
  AdAccount, AdAccountInputT, BrowserProfile, Business, BusinessInputT, BusinessStatus, Campaign, Overview, Platform, ProfileInputT, Proxy,
  ProxyInputT, ReportSummary, SocialAccount, SocialInputT,
} from '../shared/contract';
import { PLATFORMS } from '../shared/contract';
import { AuditLog } from './audit';
import { AppError } from './errors';
import { INTEGRATIONS } from './integrations';
import type { SecretBox } from './secrets';
import type { Store } from './store';

type Row = Record<string, unknown>;
type Param = string | number | null;

const likeEscape = (q: string) => `%${q.trim().replace(/[\\%_]/g, (m) => '\\' + m)}%`;

/** يحوّل أخطاء القيود في SQLite إلى رسائل عربية مفهومة. */
function friendly(e: unknown): unknown {
  if (!(e instanceof Error)) return e;
  const m = e.message;
  if (/UNIQUE constraint failed: businesses\.name/.test(m)) return new AppError('يوجد نشاط بنفس الاسم.');
  if (/UNIQUE constraint failed: .*social_accounts/.test(m) || /uq_social_identity/.test(m)) return new AppError('هذا الحساب (المنصة + المعرّف/الرقم) مسجّل مسبقاً لنفس النشاط.');
  if (/UNIQUE constraint failed: proxies\.name/.test(m)) return new AppError('يوجد بروكسي بنفس الاسم.');
  if (/UNIQUE constraint failed: browser_profiles\.business_id, browser_profiles\.name/.test(m)) return new AppError('يوجد ملف متصفح بنفس الاسم لدى هذا النشاط.');
  if (/uq_ad_external|ad_accounts\.provider, ad_accounts\.external_id/.test(m)) return new AppError('معرّف الحساب الإعلاني مسجّل مسبقاً لنفس المزوّد.');
  if (/FOREIGN KEY/.test(m)) return new AppError('أحد العناصر المرتبطة غير موجود.');
  return e;
}

export class Services {
  constructor(
    readonly store: Store,
    readonly secrets: SecretBox,
    readonly audit: AuditLog,
  ) {}

  private get db() {
    return this.store.db;
  }

  private tx<T>(fn: () => T): T {
    try {
      return this.db.transaction(fn)();
    } catch (e) {
      throw friendly(e);
    }
  }

  // ───────── الأنشطة ─────────
  private mapBusiness = (r: Row): Business => ({
    id: r.id as string, name: r.name as string, category: r.category as string, logoPath: (r.logo_path as string | null) ?? null,
    color: r.color as string, notes: (r.notes as string | null) ?? null, status: r.status as BusinessStatus,
    createdAt: r.created_at as number, updatedAt: r.updated_at as number,
    socialCount: r.social_count as number, profileCount: r.profile_count as number, adCount: r.ad_count as number,
  });

  private readonly businessSelect = `SELECT b.*,
    (SELECT COUNT(*) FROM social_accounts s WHERE s.business_id=b.id) AS social_count,
    (SELECT COUNT(*) FROM browser_profiles p WHERE p.business_id=b.id) AS profile_count,
    (SELECT COUNT(*) FROM ad_accounts a WHERE a.business_id=b.id) AS ad_count FROM businesses b`;

  listBusinesses(f: { query?: string; status: 'active' | 'archived' | 'all'; category?: string }): Business[] {
    const where: string[] = [];
    const p: Param[] = [];
    if (f.status !== 'all') { where.push('b.status = ?'); p.push(f.status); }
    if (f.category) { where.push('b.category = ?'); p.push(f.category); }
    if (f.query?.trim()) {
      where.push("(b.name LIKE ? ESCAPE '\\' OR b.category LIKE ? ESCAPE '\\' OR b.notes LIKE ? ESCAPE '\\')");
      const l = likeEscape(f.query);
      p.push(l, l, l);
    }
    const sql = `${this.businessSelect} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY b.created_at DESC, b.rowid DESC`;
    return (this.db.prepare(sql).all(...p) as Row[]).map(this.mapBusiness);
  }

  getBusiness(id: string): Business | null {
    const r = this.db.prepare(`${this.businessSelect} WHERE b.id = ?`).get(id) as Row | undefined;
    return r ? this.mapBusiness(r) : null;
  }

  private mustBusiness(id: string): Business {
    const b = this.getBusiness(id);
    if (!b) throw new AppError('النشاط غير موجود.');
    return b;
  }

  createBusiness(d: BusinessInputT): Business {
    const id = randomUUID();
    const now = Date.now();
    this.tx(() => this.db.prepare('INSERT INTO businesses (id,name,category,color,notes,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, d.name, d.category, d.color, d.notes, 'active', now, now));
    this.audit.log('business.create', 'business', id, { name: d.name });
    return this.mustBusiness(id);
  }

  updateBusiness(id: string, d: BusinessInputT): Business {
    this.mustBusiness(id);
    this.tx(() => this.db.prepare('UPDATE businesses SET name=?, category=?, color=?, notes=?, updated_at=? WHERE id=?').run(d.name, d.category, d.color, d.notes, Date.now(), id));
    this.audit.log('business.update', 'business', id, { name: d.name });
    return this.mustBusiness(id);
  }

  setBusinessStatus(id: string, status: BusinessStatus): Business {
    this.mustBusiness(id);
    this.db.prepare('UPDATE businesses SET status=?, updated_at=? WHERE id=?').run(status, Date.now(), id);
    this.audit.log(status === 'archived' ? 'business.archive' : 'business.unarchive', 'business', id);
    return this.mustBusiness(id);
  }

  /** معرّفات ملفات المتصفح التابعة لنشاط (لتنظيف جلساتها قبل الحذف). */
  profileIdsOfBusiness(businessId: string): string[] {
    return (this.db.prepare('SELECT id FROM browser_profiles WHERE business_id=?').all(businessId) as { id: string }[]).map((r) => r.id);
  }

  /**
   * سياسة الحذف: حذف نشاط يحذف تبعاً له (CASCADE) حساباته الاجتماعية وحساباته الإعلانية وحملاتها وملفات المتصفح.
   * البروكسيات المشتركة لا تُحذف. سجل التدقيق يبقى. يتطلب تأكيداً بكتابة اسم النشاط. الأرشفة هي البديل الآمن.
   */
  deleteBusiness(id: string, confirmName: string): { removedSocial: number; removedProfiles: number; removedAds: number } {
    const b = this.mustBusiness(id);
    if (confirmName.trim() !== b.name) throw new AppError('اسم التأكيد لا يطابق اسم النشاط.');
    this.tx(() => this.db.prepare('DELETE FROM businesses WHERE id=?').run(id));
    this.audit.log('business.delete', 'business', id, { name: b.name, social: b.socialCount, profiles: b.profileCount, ads: b.adCount });
    return { removedSocial: b.socialCount, removedProfiles: b.profileCount, removedAds: b.adCount };
  }

  // ───────── الحسابات الاجتماعية ─────────
  private mapSocial = (r: Row): SocialAccount => ({
    id: r.id as string, businessId: r.business_id as string, businessName: r.business_name as string, platform: r.platform as Platform,
    displayName: r.display_name as string, usernameOrNumber: (r.username_or_number as string | null) ?? null, url: (r.url as string | null) ?? null,
    status: r.status as SocialAccount['status'], createdAt: r.created_at as number, updatedAt: r.updated_at as number,
  });
  private readonly socialSelect = 'SELECT s.*, b.name AS business_name FROM social_accounts s JOIN businesses b ON b.id = s.business_id';

  listSocial(f: { businessId?: string; platform?: Platform; query?: string }): SocialAccount[] {
    const where: string[] = [];
    const p: Param[] = [];
    if (f.businessId) { where.push('s.business_id=?'); p.push(f.businessId); }
    if (f.platform) { where.push('s.platform=?'); p.push(f.platform); }
    if (f.query?.trim()) {
      where.push("(s.display_name LIKE ? ESCAPE '\\' OR s.username_or_number LIKE ? ESCAPE '\\' OR b.name LIKE ? ESCAPE '\\')");
      const l = likeEscape(f.query);
      p.push(l, l, l);
    }
    return (this.db.prepare(`${this.socialSelect} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY b.name, s.platform, s.display_name`).all(...p) as Row[]).map(this.mapSocial);
  }

  private mustSocial(id: string): SocialAccount {
    const r = this.db.prepare(`${this.socialSelect} WHERE s.id=?`).get(id) as Row | undefined;
    if (!r) throw new AppError('الحساب غير موجود.');
    return this.mapSocial(r);
  }

  createSocial(d: SocialInputT): SocialAccount {
    this.mustBusiness(d.businessId);
    const id = randomUUID();
    const now = Date.now();
    this.tx(() => this.db.prepare('INSERT INTO social_accounts (id,business_id,platform,display_name,username_or_number,url,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, d.businessId, d.platform, d.displayName, d.usernameOrNumber, d.url, d.status, now, now));
    this.audit.log('social.create', 'social_account', id, { platform: d.platform });
    return this.mustSocial(id);
  }

  updateSocial(id: string, d: SocialInputT): SocialAccount {
    const cur = this.mustSocial(id);
    if (cur.businessId !== d.businessId) this.mustBusiness(d.businessId);
    this.tx(() => {
      this.db.prepare('UPDATE social_accounts SET business_id=?, platform=?, display_name=?, username_or_number=?, url=?, status=?, updated_at=? WHERE id=?')
        .run(d.businessId, d.platform, d.displayName, d.usernameOrNumber, d.url, d.status, Date.now(), id);
      // ملف متصفح مرتبط بحساب انتقل إلى نشاط آخر يفقد الربط
      this.db.prepare('UPDATE browser_profiles SET social_account_id=NULL WHERE social_account_id=? AND business_id<>?').run(id, d.businessId);
    });
    this.audit.log('social.update', 'social_account', id);
    return this.mustSocial(id);
  }

  deleteSocial(id: string): void {
    this.mustSocial(id);
    this.db.prepare('DELETE FROM social_accounts WHERE id=?').run(id);
    this.audit.log('social.delete', 'social_account', id);
  }

  // ───────── البروكسيات ─────────
  private mapProxy = (r: Row): Proxy => ({
    id: r.id as string, name: r.name as string, scheme: r.scheme as Proxy['scheme'], host: r.host as string, port: r.port as number,
    username: (r.username as string | null) ?? null, hasSecret: !!r.has_secret, createdAt: r.created_at as number, updatedAt: r.updated_at as number,
    profileCount: r.profile_count as number,
  });
  private readonly proxySelect = `SELECT x.*, EXISTS(SELECT 1 FROM proxy_secrets s WHERE s.proxy_id=x.id) AS has_secret,
    (SELECT COUNT(*) FROM browser_profiles p WHERE p.proxy_id=x.id) AS profile_count FROM proxies x`;

  listProxies(): Proxy[] {
    return (this.db.prepare(`${this.proxySelect} ORDER BY x.name`).all() as Row[]).map(this.mapProxy);
  }
  private mustProxy(id: string): Proxy {
    const r = this.db.prepare(`${this.proxySelect} WHERE x.id=?`).get(id) as Row | undefined;
    if (!r) throw new AppError('البروكسي غير موجود.');
    return this.mapProxy(r);
  }

  async createProxy(d: ProxyInputT): Promise<Proxy> {
    const enc = d.password ? await this.secrets.encrypt(d.password) : null;
    const id = randomUUID();
    const now = Date.now();
    this.tx(() => {
      this.db.prepare('INSERT INTO proxies (id,name,scheme,host,port,username,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(id, d.name, d.scheme, d.host, d.port, d.username, now, now);
      if (enc) this.db.prepare('INSERT INTO proxy_secrets (proxy_id, secret_enc) VALUES (?,?)').run(id, enc);
    });
    this.audit.log('proxy.create', 'proxy', id, { scheme: d.scheme, host: d.host, hasSecret: !!enc });
    return this.mustProxy(id);
  }

  async updateProxy(id: string, d: ProxyInputT): Promise<Proxy> {
    this.mustProxy(id);
    const enc = d.password ? await this.secrets.encrypt(d.password) : null;
    this.tx(() => {
      this.db.prepare('UPDATE proxies SET name=?, scheme=?, host=?, port=?, username=?, updated_at=? WHERE id=?').run(d.name, d.scheme, d.host, d.port, d.username, Date.now(), id);
      if (d.clearPassword || d.scheme === 'socks5') this.db.prepare('DELETE FROM proxy_secrets WHERE proxy_id=?').run(id);
      else if (enc) this.db.prepare('INSERT INTO proxy_secrets (proxy_id, secret_enc) VALUES (?,?) ON CONFLICT(proxy_id) DO UPDATE SET secret_enc=excluded.secret_enc').run(id, enc);
    });
    this.audit.log('proxy.update', 'proxy', id, { scheme: d.scheme, host: d.host });
    return this.mustProxy(id);
  }

  deleteProxy(id: string): void {
    this.mustProxy(id);
    this.db.prepare('DELETE FROM proxies WHERE id=?').run(id);
    this.audit.log('proxy.delete', 'proxy', id);
  }

  /** للعملية الرئيسية فقط: بيانات البروكسي مع السر المفكوك. لا يُرسل أبداً للواجهة ولا يُسجَّل. */
  async proxyForLaunch(id: string): Promise<{ scheme: Proxy['scheme']; host: string; port: number; credentials: { username: string; password: string } | null } | null> {
    const r = this.db.prepare('SELECT * FROM proxies WHERE id=?').get(id) as Row | undefined;
    if (!r) return null;
    const sec = this.db.prepare('SELECT secret_enc FROM proxy_secrets WHERE proxy_id=?').get(id) as { secret_enc: string } | undefined;
    const username = (r.username as string | null) ?? '';
    const credentials = username || sec ? { username, password: sec ? await this.secrets.decrypt(sec.secret_enc) : '' } : null;
    return { scheme: r.scheme as Proxy['scheme'], host: r.host as string, port: r.port as number, credentials };
  }

  // ───────── ملفات المتصفح ─────────
  private mapProfile = (r: Row): BrowserProfile => ({
    id: r.id as string, businessId: r.business_id as string, businessName: r.business_name as string,
    socialAccountId: (r.social_account_id as string | null) ?? null, socialLabel: (r.social_label as string | null) ?? null,
    name: r.name as string, homeUrl: (r.home_url as string | null) ?? null, proxyId: (r.proxy_id as string | null) ?? null,
    proxyName: (r.proxy_name as string | null) ?? null, partitionId: r.partition_id as string,
    lastOpenedAt: (r.last_opened_at as number | null) ?? null, createdAt: r.created_at as number, updatedAt: r.updated_at as number,
  });
  private readonly profileSelect = `SELECT p.*, b.name AS business_name, x.name AS proxy_name,
    CASE WHEN s.id IS NULL THEN NULL ELSE s.platform || ' · ' || s.display_name END AS social_label
    FROM browser_profiles p JOIN businesses b ON b.id=p.business_id
    LEFT JOIN proxies x ON x.id=p.proxy_id LEFT JOIN social_accounts s ON s.id=p.social_account_id`;

  listProfiles(f: { businessId?: string; query?: string }): BrowserProfile[] {
    const where: string[] = [];
    const p: Param[] = [];
    if (f.businessId) { where.push('p.business_id=?'); p.push(f.businessId); }
    if (f.query?.trim()) {
      where.push("(p.name LIKE ? ESCAPE '\\' OR b.name LIKE ? ESCAPE '\\' OR p.home_url LIKE ? ESCAPE '\\')");
      const l = likeEscape(f.query);
      p.push(l, l, l);
    }
    return (this.db.prepare(`${this.profileSelect} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY b.name, p.name`).all(...p) as Row[]).map(this.mapProfile);
  }

  getProfile(id: string): BrowserProfile | null {
    const r = this.db.prepare(`${this.profileSelect} WHERE p.id=?`).get(id) as Row | undefined;
    return r ? this.mapProfile(r) : null;
  }
  private mustProfile(id: string): BrowserProfile {
    const p = this.getProfile(id);
    if (!p) throw new AppError('ملف المتصفح غير موجود.');
    return p;
  }

  private checkProfileRefs(d: ProfileInputT): void {
    this.mustBusiness(d.businessId);
    if (d.socialAccountId) {
      const s = this.db.prepare('SELECT business_id FROM social_accounts WHERE id=?').get(d.socialAccountId) as { business_id: string } | undefined;
      if (!s) throw new AppError('الحساب الاجتماعي غير موجود.');
      if (s.business_id !== d.businessId) throw new AppError('الحساب الاجتماعي يتبع نشاطاً آخر.');
    }
    if (d.proxyId) this.mustProxy(d.proxyId);
  }

  createProfile(d: ProfileInputT): BrowserProfile {
    this.checkProfileRefs(d);
    const id = randomUUID();
    const now = Date.now();
    // partitionId يُولَّد مرة واحدة ولا يتغير (يمنعه trigger في القاعدة)
    this.tx(() => this.db.prepare('INSERT INTO browser_profiles (id,business_id,social_account_id,name,home_url,proxy_id,partition_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, d.businessId, d.socialAccountId, d.name, d.homeUrl, d.proxyId, `profile-${id}`, now, now));
    this.audit.log('profile.create', 'browser_profile', id, { name: d.name });
    return this.mustProfile(id);
  }

  updateProfile(id: string, d: ProfileInputT): BrowserProfile {
    const cur = this.mustProfile(id);
    if (cur.businessId !== d.businessId) throw new AppError('لا يمكن نقل ملف المتصفح إلى نشاط آخر (جلسته مرتبطة بنشاطه). أنشئ ملفاً جديداً.');
    this.checkProfileRefs(d);
    this.tx(() => this.db.prepare('UPDATE browser_profiles SET social_account_id=?, name=?, home_url=?, proxy_id=?, updated_at=? WHERE id=?').run(d.socialAccountId, d.name, d.homeUrl, d.proxyId, Date.now(), id));
    this.audit.log('profile.update', 'browser_profile', id);
    return this.mustProfile(id);
  }

  /** نسخ البيانات الوصفية فقط: جلسة جديدة فارغة (لا كوكيز ولا تخزين). */
  duplicateProfile(id: string): BrowserProfile {
    const src = this.mustProfile(id);
    const names = new Set((this.db.prepare('SELECT name FROM browser_profiles WHERE business_id=?').all(src.businessId) as { name: string }[]).map((r) => r.name));
    let name = `${src.name} (نسخة)`;
    for (let i = 2; names.has(name); i++) name = `${src.name} (نسخة ${i})`;
    const copy = this.createProfile({ businessId: src.businessId, socialAccountId: src.socialAccountId, name, homeUrl: src.homeUrl, proxyId: src.proxyId });
    this.audit.log('profile.duplicate', 'browser_profile', copy.id, { from: id });
    return copy;
  }

  deleteProfile(id: string): void {
    this.mustProfile(id);
    this.db.prepare('DELETE FROM browser_profiles WHERE id=?').run(id);
    this.audit.log('profile.delete', 'browser_profile', id);
  }

  touchProfileOpened(id: string): void {
    this.db.prepare('UPDATE browser_profiles SET last_opened_at=? WHERE id=?').run(Date.now(), id);
  }

  // ───────── الحسابات الإعلانية والحملات ─────────
  private mapAd = (r: Row): AdAccount => ({
    id: r.id as string, businessId: r.business_id as string, businessName: r.business_name as string, provider: r.provider as AdAccount['provider'],
    externalId: (r.external_id as string | null) ?? null, displayName: r.display_name as string,
    connectionStatus: r.connection_status as AdAccount['connectionStatus'], createdAt: r.created_at as number, updatedAt: r.updated_at as number,
  });
  private readonly adSelect = 'SELECT a.*, b.name AS business_name FROM ad_accounts a JOIN businesses b ON b.id=a.business_id';

  listAds(businessId?: string): AdAccount[] {
    const rows = businessId ? this.db.prepare(`${this.adSelect} WHERE a.business_id=? ORDER BY a.display_name`).all(businessId) : this.db.prepare(`${this.adSelect} ORDER BY b.name, a.display_name`).all();
    return (rows as Row[]).map(this.mapAd);
  }
  private mustAd(id: string): AdAccount {
    const r = this.db.prepare(`${this.adSelect} WHERE a.id=?`).get(id) as Row | undefined;
    if (!r) throw new AppError('الحساب الإعلاني غير موجود.');
    return this.mapAd(r);
  }
  /** الحالة تُنشأ دائماً not_connected: لا يوجد ربط حقيقي في المرحلة 1 ولا يمكن للمستخدم ادعاؤه. */
  createAd(d: AdAccountInputT): AdAccount {
    this.mustBusiness(d.businessId);
    const id = randomUUID();
    const now = Date.now();
    this.tx(() => this.db.prepare("INSERT INTO ad_accounts (id,business_id,provider,external_id,display_name,connection_status,created_at,updated_at) VALUES (?,?,?,?,?,'not_connected',?,?)")
      .run(id, d.businessId, d.provider, d.externalId, d.displayName, now, now));
    this.audit.log('ad.create', 'ad_account', id, { provider: d.provider });
    return this.mustAd(id);
  }
  updateAd(id: string, d: AdAccountInputT): AdAccount {
    this.mustAd(id);
    this.mustBusiness(d.businessId);
    this.tx(() => this.db.prepare('UPDATE ad_accounts SET business_id=?, provider=?, external_id=?, display_name=?, updated_at=? WHERE id=?').run(d.businessId, d.provider, d.externalId, d.displayName, Date.now(), id));
    this.audit.log('ad.update', 'ad_account', id);
    return this.mustAd(id);
  }
  deleteAd(id: string): void {
    this.mustAd(id);
    this.db.prepare('DELETE FROM ad_accounts WHERE id=?').run(id);
    this.audit.log('ad.delete', 'ad_account', id);
  }

  listCampaigns(businessId?: string): Campaign[] {
    const sql = `SELECT c.* FROM campaigns c JOIN ad_accounts a ON a.id=c.ad_account_id ${businessId ? 'WHERE a.business_id=?' : ''} ORDER BY c.synced_at DESC`;
    const rows = (businessId ? this.db.prepare(sql).all(businessId) : this.db.prepare(sql).all()) as Row[];
    return rows.map((r) => ({
      id: r.id as string, adAccountId: r.ad_account_id as string, externalId: r.external_id as string, name: r.name as string, status: r.status as string,
      objective: (r.objective as string | null) ?? null, dailyBudget: (r.daily_budget as number | null) ?? null, currency: (r.currency as string | null) ?? null,
      syncedAt: r.synced_at as number,
    }));
  }

  // ───────── النظرة العامة والتقارير ─────────
  private count(sql: string): number {
    return (this.db.prepare(sql).get() as { c: number }).c;
  }

  overview(): Overview {
    return {
      counts: {
        businesses: this.count("SELECT COUNT(*) c FROM businesses WHERE status='active'"),
        archivedBusinesses: this.count("SELECT COUNT(*) c FROM businesses WHERE status='archived'"),
        socialAccounts: this.count('SELECT COUNT(*) c FROM social_accounts'),
        profiles: this.count('SELECT COUNT(*) c FROM browser_profiles'),
        adAccounts: this.count('SELECT COUNT(*) c FROM ad_accounts'),
        campaigns: this.count('SELECT COUNT(*) c FROM campaigns'),
        proxies: this.count('SELECT COUNT(*) c FROM proxies'),
      },
      businesses: this.listBusinesses({ status: 'active' }).slice(0, 8),
      recentProfiles: (this.db.prepare(`${this.profileSelect} WHERE p.last_opened_at IS NOT NULL ORDER BY p.last_opened_at DESC LIMIT 6`).all() as Row[]).map(this.mapProfile),
      integrations: INTEGRATIONS,
    };
  }

  reports(): ReportSummary {
    const all = <T>(sql: string) => this.db.prepare(sql).all() as T[];
    return {
      byCategory: all<{ category: string; count: number }>("SELECT category, COUNT(*) count FROM businesses WHERE status='active' GROUP BY category ORDER BY count DESC, category"),
      byPlatform: PLATFORMS.map((platform) => ({ platform, count: (this.db.prepare('SELECT COUNT(*) c FROM social_accounts WHERE platform=?').get(platform) as { c: number }).c })),
      byProvider: all<{ provider: 'meta' | 'tiktok'; count: number }>('SELECT provider, COUNT(*) count FROM ad_accounts GROUP BY provider'),
      profilesWithoutProxy: this.count('SELECT COUNT(*) c FROM browser_profiles WHERE proxy_id IS NULL'),
      businessesWithoutAccounts: this.count("SELECT COUNT(*) c FROM businesses b WHERE status='active' AND NOT EXISTS (SELECT 1 FROM social_accounts s WHERE s.business_id=b.id)"),
    };
  }

  // ───────── بيانات تجريبية (اختيارية وموسومة) ─────────
  static readonly SAMPLE_PREFIX = '[تجريبي] ';

  seedSample(): { businesses: number; socialAccounts: number } {
    const categories = ['مطاعم', 'أزياء', 'إلكترونيات', 'عقارات', 'تجميل', 'سياحة'];
    const palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
    let biz = 0;
    let soc = 0;
    this.tx(() => {
      for (let i = 1; i <= 30; i++) {
        const name = `${Services.SAMPLE_PREFIX}نشاط ${i}`;
        if (this.db.prepare('SELECT 1 FROM businesses WHERE name=?').get(name)) continue;
        const b = this.createBusiness({ name, category: categories[i % categories.length], color: palette[i % palette.length], notes: 'بيانات تجريبية — يمكن حذفها من الإعدادات' });
        biz++;
        for (const platform of PLATFORMS) {
          this.createSocial({ businessId: b.id, platform, displayName: `${name} (${platform})`, usernameOrNumber: `sample_${i}_${platform}`, url: null, status: 'active' });
          soc++;
        }
      }
    });
    this.audit.log('sample.seed', 'system', null, { businesses: biz, socialAccounts: soc });
    return { businesses: biz, socialAccounts: soc };
  }

  sampleProfileIds(): string[] {
    return (this.db.prepare("SELECT p.id FROM browser_profiles p JOIN businesses b ON b.id=p.business_id WHERE b.name LIKE ? ESCAPE '\\'").all(`${Services.SAMPLE_PREFIX.replace(/[\\%_]/g, (m) => '\\' + m)}%`) as { id: string }[]).map((r) => r.id);
  }

  removeSample(): { removed: number } {
    const r = this.tx(() => this.db.prepare("DELETE FROM businesses WHERE name LIKE ? ESCAPE '\\'").run(`${Services.SAMPLE_PREFIX.replace(/[\\%_]/g, (m) => '\\' + m)}%`));
    this.audit.log('sample.remove', 'system', null, { removed: r.changes });
    return { removed: r.changes };
  }
}
