import { z } from 'zod';
import { normalizeUrl } from './url';

// ───────── تعدادات ─────────
export const PLATFORMS = ['instagram', 'facebook', 'whatsapp', 'tiktok'] as const;
export const PROXY_SCHEMES = ['http', 'https', 'socks5'] as const;
export const AD_PROVIDERS = ['meta', 'tiktok'] as const;
export const CONNECTION_STATUSES = ['not_connected', 'pending', 'connected', 'error'] as const;
export const BUSINESS_STATUSES = ['active', 'archived'] as const;
export const ACCOUNT_STATUSES = ['active', 'inactive'] as const;

export type Platform = (typeof PLATFORMS)[number];
export type ProxyScheme = (typeof PROXY_SCHEMES)[number];
export type AdProvider = (typeof AD_PROVIDERS)[number];
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

// ───────── مخططات الإدخال (Zod) ─────────
const id = z.string().uuid();
const text = (label: string, max: number) => z.string().trim().min(1, `${label} مطلوب`).max(max, `${label} طويل جداً`);
const optText = (max: number) => z.string().trim().max(max).nullish().transform((v) => (v ? v : null));
const optUrl = z
  .string()
  .trim()
  .max(2000)
  .nullish()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = normalizeUrl(v, false);
    if (!n || n === 'about:blank') {
      ctx.addIssue({ code: 'custom', message: 'الرابط يجب أن يكون http أو https' });
      return z.NEVER;
    }
    return n;
  });
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'لون غير صالح').transform((c) => c.toLowerCase());

export const BusinessInput = z.object({
  name: text('اسم النشاط', 80),
  category: text('الفئة', 60),
  color,
  notes: optText(2000),
});
export const SocialInput = z.object({
  businessId: id,
  platform: z.enum(PLATFORMS),
  displayName: text('الاسم الظاهر', 80),
  usernameOrNumber: optText(80),
  url: optUrl,
  status: z.enum(ACCOUNT_STATUSES).default('active'),
});
const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;
export const ProxyInput = z
  .object({
    name: text('اسم البروكسي', 60),
    scheme: z.enum(PROXY_SCHEMES),
    host: z.string().trim().toLowerCase().max(253).regex(HOST_RE, 'عنوان غير صالح'),
    port: z.number().int().min(1, 'منفذ غير صالح').max(65535, 'منفذ غير صالح'),
    username: optText(128),
    /** فارغ/غير موجود = إبقاء السر الحالي */
    password: z.string().max(256).optional(),
    clearPassword: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.scheme === 'socks5' && (v.username || v.password)) {
      ctx.addIssue({ code: 'custom', path: ['username'], message: 'Chromium لا يدعم مصادقة SOCKS5 بالاسم وكلمة المرور؛ استخدم http/https أو بروكسي بلا مصادقة.' });
    }
  });
export const ProfileInput = z.object({
  businessId: id,
  socialAccountId: id.nullish().transform((v) => v ?? null),
  name: text('اسم الملف', 80),
  homeUrl: optUrl,
  proxyId: id.nullish().transform((v) => v ?? null),
});
export const AdAccountInput = z.object({
  businessId: id,
  provider: z.enum(AD_PROVIDERS),
  externalId: optText(80),
  displayName: text('الاسم الظاهر', 80),
});

export type BusinessInputT = z.infer<typeof BusinessInput>;
export type SocialInputT = z.infer<typeof SocialInput>;
export type ProxyInputT = z.infer<typeof ProxyInput>;
export type ProfileInputT = z.infer<typeof ProfileInput>;
export type AdAccountInputT = z.infer<typeof AdAccountInput>;
// الأنواع قبل التحويل (ما تُرسله الواجهة)
export type BusinessForm = z.input<typeof BusinessInput>;
export type SocialForm = z.input<typeof SocialInput>;
export type ProxyForm = z.input<typeof ProxyInput>;
export type ProfileForm = z.input<typeof ProfileInput>;
export type AdAccountForm = z.input<typeof AdAccountInput>;

// ───────── مدخلات القنوات ─────────
const none = z.undefined();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح (YYYY-MM-DD)').refine((d) => !Number.isNaN(Date.parse(d + 'T00:00:00Z')), 'تاريخ غير صالح');
const byId = z.object({ id });
export const inputs = {
  'overview:get': none,
  'businesses:list': z.object({ query: z.string().max(200).optional(), status: z.enum(['active', 'archived', 'all']).default('active'), category: z.string().max(60).optional() }),
  'businesses:get': byId,
  'businesses:create': BusinessInput,
  'businesses:update': z.object({ id, data: BusinessInput }),
  'businesses:setStatus': z.object({ id, status: z.enum(BUSINESS_STATUSES) }),
  'businesses:delete': z.object({ id, confirmName: z.string().max(200) }),
  'social:list': z.object({ businessId: id.optional(), platform: z.enum(PLATFORMS).optional(), query: z.string().max(200).optional() }),
  'social:create': SocialInput,
  'social:update': z.object({ id, data: SocialInput }),
  'social:delete': byId,
  'profiles:list': z.object({ businessId: id.optional(), query: z.string().max(200).optional() }),
  'profiles:create': ProfileInput,
  'profiles:update': z.object({ id, data: ProfileInput }),
  'profiles:delete': byId,
  'profiles:duplicate': byId,
  'profiles:launch': byId,
  'profiles:close': byId,
  'profiles:openUrl': z.object({ id, url: z.string().trim().min(1).max(2000) }),
  'profiles:running': none,
  'proxies:list': none,
  'proxies:create': ProxyInput,
  'proxies:update': z.object({ id, data: ProxyInput }),
  'proxies:delete': byId,
  'ads:list': z.object({ businessId: id.optional() }),
  'ads:create': AdAccountInput,
  'ads:update': z.object({ id, data: AdAccountInput }),
  'ads:delete': byId,
  'campaigns:list': z.object({ businessId: id.optional() }),
  'integrations:list': none,
  'meta:status': none,
  'meta:saveCredentials': z.object({ appId: z.string().trim().regex(/^\d{5,25}$/, 'معرّف التطبيق أرقام فقط'), appSecret: z.string().trim().min(8, 'سر التطبيق قصير').max(128).optional() }),
  'meta:clearCredentials': none,
  'meta:connect': none,
  'meta:cancelConnect': none,
  'meta:disconnect': byId,
  'meta:discover': z.object({ connectionId: id }),
  'meta:accounts': none,
  'meta:link': z.object({ externalId: z.string().regex(/^act_\d+$/), businessId: id }),
  'meta:unlink': z.object({ adAccountId: id }),
  'meta:sync': z.object({ adAccountId: id, since: dateStr, until: dateStr }),
  'analytics:campaigns': z.object({
    adAccountId: id.optional(), businessId: id.optional(), since: dateStr, until: dateStr, query: z.string().max(100).optional(),
    status: z.string().max(40).optional(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(100).default(25),
  }),
  'analytics:adsets': z.object({ campaignId: z.string().min(1).max(100), since: dateStr, until: dateStr }),
  'analytics:ads': z.object({ adSetId: z.string().min(1).max(100), since: dateStr, until: dateStr }),
  'analytics:syncRuns': z.object({ adAccountId: id.optional() }),
  'tiktok:status': none,
  'tiktok:saveConfig': z.object({ appId: z.string().trim().min(3).max(64), appSecret: z.string().trim().min(8).max(128).optional() }),
  'whatsapp:status': none,
  'whatsapp:saveConfig': z.object({ wabaId: z.string().trim().regex(/^\d{5,25}$/, 'WABA ID أرقام فقط'), phoneNumberId: z.string().trim().regex(/^\d{5,25}$/, 'Phone Number ID أرقام فقط'), accessToken: z.string().trim().min(20).max(1024).optional() }),
  'whatsapp:verify': none,
  'whatsapp:clear': none,
  'reports:summary': none,
  'settings:info': none,
  'settings:backup': none,
  'settings:restore': none,
  'settings:seedSample': none,
  'settings:removeSample': none,
  'audit:list': z.object({ limit: z.number().int().min(1).max(500).default(100) }),
} as const;

export type Channel = keyof typeof inputs;
export const CHANNELS = Object.keys(inputs) as Channel[];
export const EVENT_RUNNING = 'profiles:running-changed';
export const BAR_COMMAND = 'bar:command';
export const BAR_STATE = 'bar:state';
export const BAR_READY = 'bar:ready';

// ───────── كيانات الإخراج ─────────
export interface Business {
  id: string; name: string; category: string; logoPath: string | null; color: string; notes: string | null;
  status: BusinessStatus; createdAt: number; updatedAt: number;
  socialCount: number; profileCount: number; adCount: number;
  platformCounts: Record<Platform, number>;
}
export interface SocialAccount {
  id: string; businessId: string; businessName: string; platform: Platform; displayName: string;
  usernameOrNumber: string | null; url: string | null; status: AccountStatus; createdAt: number; updatedAt: number;
}
export interface BrowserProfile {
  id: string; businessId: string; businessName: string; socialAccountId: string | null; socialLabel: string | null;
  name: string; homeUrl: string | null; proxyId: string | null; proxyName: string | null; partitionId: string;
  lastOpenedAt: number | null; createdAt: number; updatedAt: number;
}
export interface Proxy {
  id: string; name: string; scheme: ProxyScheme; host: string; port: number; username: string | null;
  hasSecret: boolean; createdAt: number; updatedAt: number; profileCount: number;
}
export interface AdAccount {
  id: string; businessId: string; businessName: string; provider: AdProvider; externalId: string | null;
  displayName: string; connectionStatus: ConnectionStatus; connectionId: string | null; createdAt: number; updatedAt: number;
}
/** للقراءة فقط: ستملؤها مزامنة المزوّدين مستقبلاً. لا يوجد في المرحلة 1 أي كود يكتب فيها. */
export interface Campaign {
  id: string; adAccountId: string; externalId: string; name: string; status: string; objective: string | null;
  dailyBudget: number | null; currency: string | null; syncedAt: number;
}
export interface AuditEvent {
  id: number; eventType: string; entityType: string; entityId: string | null; timestamp: number; metadata: Record<string, unknown>;
}
export type IntegrationState = 'not_configured' | 'configured' | 'connected' | 'expired' | 'error';
export interface Integration {
  id: 'meta_marketing' | 'tiktok_marketing' | 'whatsapp_business';
  name: string; status: IntegrationState; detail: string; description: string; requires: string[];
}
export interface MetaConnection {
  id: string; fbUserId: string; fbUserName: string | null; status: 'active' | 'expired' | 'revoked' | 'error';
  scopes: string[]; tokenExpiresAt: number | null; lastError: string | null; rateLimitedUntil: number | null; adAccountCount: number; createdAt: number;
}
export interface MetaDiscoveredAccount {
  externalId: string; connectionId: string; name: string; currency: string | null; accountStatus: number | null; timezone: string | null;
  metaBusinessName: string | null; linkedAdAccountId: string | null; linkedBusinessId: string | null; linkedBusinessName: string | null;
}
export interface MetaStatus {
  configured: boolean; appId: string | null; hasSecret: boolean; redirectUri: string; apiVersion: string;
  scopes: string[]; connections: MetaConnection[]; connecting: boolean;
}
export interface TikTokStatus { appId: string | null; hasSecret: boolean; redirectUri: string; authUrl: string | null; implemented: false }
export interface WhatsAppStatus { phoneNumberId: string | null; wabaId: string | null; hasToken: boolean; verifiedName: string | null; displayPhone: string | null; qualityRating: string | null; verifiedAt: number | null }

export interface Metrics { spend: number; impressions: number; clicks: number; reach: number; conversions: number; ctr: number | null; cpc: number | null }
export interface CampaignRow {
  id: string; adAccountId: string; adAccountName: string; businessId: string; businessName: string; externalId: string; name: string;
  status: string; effectiveStatus: string | null; objective: string | null; dailyBudget: number | null; currency: string | null; syncedAt: number; metrics: Metrics;
}
export interface AdSetRow { id: string; externalId: string; name: string; status: string; dailyBudget: number | null; optimizationGoal: string | null; metrics: Metrics }
export interface AdRow { id: string; externalId: string; name: string; status: string; metrics: Metrics }
export interface CurrencyTotals extends Metrics { currency: string }
export interface CampaignPage { rows: CampaignRow[]; total: number; page: number; pageSize: number; totals: CurrencyTotals[] }
export interface SyncRun {
  id: number; adAccountId: string; adAccountName: string; startedAt: number; finishedAt: number | null; status: 'running' | 'ok' | 'partial' | 'error';
  since: string; until: string; campaigns: number; adSets: number; ads: number; insightRows: number; truncated: boolean; error: string | null;
}
export interface Overview {
  counts: { businesses: number; archivedBusinesses: number; socialAccounts: number; profiles: number; adAccounts: number; campaigns: number; proxies: number };
  businesses: Business[];
  recentProfiles: BrowserProfile[];
  integrations: Integration[];
}
export interface ReportSummary {
  byCategory: { category: string; count: number }[];
  byPlatform: { platform: Platform; count: number }[];
  byProvider: { provider: AdProvider; count: number }[];
  profilesWithoutProxy: number;
  businessesWithoutAccounts: number;
}
export interface SettingsInfo {
  appVersion: string; electron: string; chrome: string; platform: string;
  dataDir: string; dbPath: string; dbSizeBytes: number; schemaVersion: number; backupsDir: string;
  encryptionAvailable: boolean; encryptionBackend: string;
}
export interface BackupResult { path: string; sizeBytes: number }
export interface RestoreResult { restored: boolean; reason?: string; preRestoreBackup?: string }
export interface SeedResult { businesses: number; socialAccounts: number }

export interface Outputs {
  'overview:get': Overview;
  'businesses:list': Business[];
  'businesses:get': Business | null;
  'businesses:create': Business;
  'businesses:update': Business;
  'businesses:setStatus': Business;
  'businesses:delete': { removedSocial: number; removedProfiles: number; removedAds: number };
  'social:list': SocialAccount[];
  'social:create': SocialAccount;
  'social:update': SocialAccount;
  'social:delete': null;
  'profiles:list': BrowserProfile[];
  'profiles:create': BrowserProfile;
  'profiles:update': BrowserProfile;
  'profiles:delete': null;
  'profiles:duplicate': BrowserProfile;
  'profiles:launch': null;
  'profiles:close': null;
  'profiles:openUrl': null;
  'profiles:running': string[];
  'proxies:list': Proxy[];
  'proxies:create': Proxy;
  'proxies:update': Proxy;
  'proxies:delete': null;
  'ads:list': AdAccount[];
  'ads:create': AdAccount;
  'ads:update': AdAccount;
  'ads:delete': null;
  'campaigns:list': Campaign[];
  'integrations:list': Integration[];
  'meta:status': MetaStatus;
  'meta:saveCredentials': MetaStatus;
  'meta:clearCredentials': null;
  'meta:connect': MetaConnection;
  'meta:cancelConnect': null;
  'meta:disconnect': null;
  'meta:discover': MetaDiscoveredAccount[];
  'meta:accounts': MetaDiscoveredAccount[];
  'meta:link': AdAccount;
  'meta:unlink': null;
  'meta:sync': SyncRun;
  'analytics:campaigns': CampaignPage;
  'analytics:adsets': AdSetRow[];
  'analytics:ads': AdRow[];
  'analytics:syncRuns': SyncRun[];
  'tiktok:status': TikTokStatus;
  'tiktok:saveConfig': TikTokStatus;
  'whatsapp:status': WhatsAppStatus;
  'whatsapp:saveConfig': WhatsAppStatus;
  'whatsapp:verify': WhatsAppStatus;
  'whatsapp:clear': null;
  'reports:summary': ReportSummary;
  'settings:info': SettingsInfo;
  'settings:backup': BackupResult | null;
  'settings:restore': RestoreResult;
  'settings:seedSample': SeedResult;
  'settings:removeSample': { removed: number };
  'audit:list': AuditEvent[];
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export type Call = <K extends Channel>(channel: K, ...args: z.input<(typeof inputs)[K]> extends undefined ? [] : [z.input<(typeof inputs)[K]>]) => Promise<Result<Outputs[K]>>;

export interface Api {
  call: Call;
  onRunningChanged(cb: (ids: string[]) => void): () => void;
}

export type BarCommand = { cmd: 'back' | 'forward' | 'reload' | 'stop' } | { cmd: 'navigate'; url: string };
export interface BarState { profileName: string; url: string; title: string; canGoBack: boolean; canGoForward: boolean; loading: boolean }
export interface BarApi { send(c: BarCommand): void; onState(cb: (s: BarState) => void): () => void; ready(): void }
