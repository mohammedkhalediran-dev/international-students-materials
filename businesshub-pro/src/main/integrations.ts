import type { Integration, TikTokStatus, WhatsAppStatus } from '../shared/contract';
import type { AuditLog } from './audit';
import { AppError } from './errors';
import { MetaApiError, MetaClient } from './meta/client';
import { DEFAULT_META_CONFIG, userMessage, type MetaConfig } from './meta/service';
import type { SecretBox } from './secrets';
import type { DB, Store } from './store';

type Row = Record<string, unknown>;

const STATIC: Record<Integration['id'], Pick<Integration, 'name' | 'description' | 'requires'>> = {
  meta_marketing: {
    name: 'Meta Marketing API',
    description: 'قراءة حسابات الإعلانات والحملات والمجموعات والإعلانات والإحصاءات (Facebook وInstagram). للقراءة فقط.',
    requires: ['تطبيق Meta for Developers (نوع Business) مع منتج Marketing API', 'تسجيل http://127.0.0.1:53682/meta/callback ضمن Valid OAuth Redirect URIs', 'صلاحيتا ads_read وbusiness_management (وقد تحتاجان مراجعة التطبيق للوصول لحسابات الآخرين)', 'تسجيل الدخول بحساب فيسبوك يملك صلاحية على الحسابات الإعلانية'],
  },
  tiktok_marketing: {
    name: 'TikTok Marketing API',
    description: 'بنية جاهزة لإعدادات التطبيق ورابط التفويض. التفويض الكامل وقراءة الحملات غير منفّذين بعد.',
    requires: ['حساب TikTok for Business وتطبيق في TikTok for Business Developers', 'اعتماد التطبيق من TikTok (App ID وSecret)', 'تسجيل Redirect URL في إعدادات التطبيق', 'تنفيذ تبادل رمز التفويض (غير منجز في هذا الإصدار)'],
  },
  whatsapp_business: {
    name: 'WhatsApp Business Cloud API',
    description: 'التحقق من رقم الأعمال بقراءة معلوماته عبر الواجهة الرسمية. لا إرسال رسائل في المرحلة الحالية.',
    requires: ['حساب Meta Business وWhatsApp Business Account (WABA ID)', 'رقم هاتف مسجّل (Phone Number ID)', 'رمز وصول دائم من System User بصلاحية whatsapp_business_management'],
  },
};

/** الحالة الفعلية لكل تكامل، مُشتقّة من قاعدة البيانات فقط (لا ادّعاء اتصال بلا تفويض صالح). */
export function listIntegrations(db: DB, now = Date.now()): Integration[] {
  const creds = (p: string) => db.prepare('SELECT * FROM integration_credentials WHERE provider=?').get(p) as Row | undefined;
  const out: Integration[] = [];

  const mc = creds('meta');
  const conns = db.prepare('SELECT status, token_expires_at, last_error FROM meta_connections').all() as Row[];
  const live = conns.filter((c) => c.status === 'active' && (!c.token_expires_at || (c.token_expires_at as number) > now));
  const expired = conns.filter((c) => c.status === 'expired' || (c.status === 'active' && c.token_expires_at && (c.token_expires_at as number) <= now));
  let meta: Pick<Integration, 'status' | 'detail'>;
  if (!mc?.app_id) meta = { status: 'not_configured', detail: 'أدخل App ID وApp Secret ثم سجّل الدخول.' };
  else if (live.length) meta = { status: 'connected', detail: `${live.length} اتصال نشط.` };
  else if (expired.length) meta = { status: 'expired', detail: 'انتهت صلاحية الرمز. أعد الربط.' };
  else if (conns.some((c) => c.status === 'error')) meta = { status: 'error', detail: String(conns.find((c) => c.status === 'error')?.last_error ?? 'خطأ') };
  else meta = { status: 'configured', detail: 'الإعدادات محفوظة؛ لم يتم تسجيل الدخول بعد.' };
  out.push({ id: 'meta_marketing', ...STATIC.meta_marketing, ...meta });

  const tc = creds('tiktok');
  out.push({ id: 'tiktok_marketing', ...STATIC.tiktok_marketing, status: tc?.app_id ? 'configured' : 'not_configured', detail: tc?.app_id ? 'الإعدادات محفوظة. التفويض غير منفّذ بعد، لذا لا يوجد اتصال.' : 'أدخل App ID وSecret.' });

  const wc = creds('whatsapp');
  const wx = JSON.parse(String(wc?.extra_json ?? '{}')) as { verifiedAt?: number; lastError?: string };
  let wa: Pick<Integration, 'status' | 'detail'>;
  if (!wc) wa = { status: 'not_configured', detail: 'أدخل WABA ID وPhone Number ID والرمز.' };
  else if (wc.secret_enc && wx.verifiedAt) wa = { status: 'connected', detail: 'تم التحقق من الرقم عبر الواجهة الرسمية.' };
  else if (wx.lastError) wa = { status: 'error', detail: wx.lastError };
  else wa = { status: 'configured', detail: 'الإعدادات محفوظة؛ لم يُتحقق منها بعد.' };
  out.push({ id: 'whatsapp_business', ...STATIC.whatsapp_business, ...wa });
  return out;
}

export interface ProviderDeps {
  store: Store; secrets: SecretBox; audit: AuditLog; config?: Partial<MetaConfig>; fetchImpl?: typeof fetch; now?: () => number;
  clientOptions?: ConstructorParameters<typeof MetaClient>[0];
}

/** TikTok وWhatsApp: بنية الإعدادات والحالات. لا يُعلَن اتصال إلا بعد نجاح تحقق حقيقي. */
export class ProviderService {
  private readonly cfg: MetaConfig;
  constructor(private readonly d: ProviderDeps) { this.cfg = { ...DEFAULT_META_CONFIG, ...d.config }; }
  private get db() { return this.d.store.db; }
  private now() { return (this.d.now ?? Date.now)(); }

  // ───── TikTok ─────
  tiktokStatus(): TikTokStatus {
    const r = this.db.prepare("SELECT app_id, secret_enc FROM integration_credentials WHERE provider='tiktok'").get() as Row | undefined;
    const appId = (r?.app_id as string | null) ?? null;
    const redirectUri = 'http://127.0.0.1:53683/tiktok/callback';
    // معاينة فقط: رابط التفويض لا يُفتح من التطبيق ولا يكتمل التبادل بعده في هذا الإصدار.
    const authUrl = appId ? `https://business-api.tiktok.com/portal/auth?app_id=${encodeURIComponent(appId)}&state=preview&redirect_uri=${encodeURIComponent(redirectUri)}` : null;
    return { appId, hasSecret: !!r?.secret_enc, redirectUri, authUrl, implemented: false };
  }
  async saveTikTok(appId: string, appSecret?: string): Promise<TikTokStatus> {
    const cur = this.db.prepare("SELECT secret_enc FROM integration_credentials WHERE provider='tiktok'").get() as Row | undefined;
    if (!appSecret && !cur?.secret_enc) throw new AppError('أدخل سر التطبيق (App Secret) لأول مرة.');
    const enc = appSecret ? await this.d.secrets.encrypt(appSecret) : (cur!.secret_enc as string);
    this.db.prepare(`INSERT INTO integration_credentials (provider, app_id, secret_enc, extra_json, updated_at) VALUES ('tiktok', ?, ?, '{}', ?)
      ON CONFLICT(provider) DO UPDATE SET app_id=excluded.app_id, secret_enc=excluded.secret_enc, updated_at=excluded.updated_at`).run(appId, enc, this.now());
    this.d.audit.log('tiktok.config.save', 'integration', 'tiktok', { appId });
    return this.tiktokStatus();
  }

  // ───── WhatsApp ─────
  whatsappStatus(): WhatsAppStatus {
    const r = this.db.prepare("SELECT secret_enc, extra_json FROM integration_credentials WHERE provider='whatsapp'").get() as Row | undefined;
    const x = JSON.parse(String(r?.extra_json ?? '{}')) as Record<string, string | number | undefined>;
    const s = (k: string) => (typeof x[k] === 'string' ? (x[k] as string) : null);
    return { phoneNumberId: s('phoneNumberId'), wabaId: s('wabaId'), hasToken: !!r?.secret_enc, verifiedName: s('verifiedName'), displayPhone: s('displayPhone'), qualityRating: s('qualityRating'), verifiedAt: typeof x.verifiedAt === 'number' ? x.verifiedAt : null };
  }
  async saveWhatsApp(wabaId: string, phoneNumberId: string, accessToken?: string): Promise<WhatsAppStatus> {
    const cur = this.db.prepare("SELECT secret_enc FROM integration_credentials WHERE provider='whatsapp'").get() as Row | undefined;
    if (!accessToken && !cur?.secret_enc) throw new AppError('أدخل رمز الوصول لأول مرة.');
    const enc = accessToken ? await this.d.secrets.encrypt(accessToken) : (cur!.secret_enc as string);
    // أي تعديل يُلغي التحقق السابق
    this.db.prepare(`INSERT INTO integration_credentials (provider, app_id, secret_enc, extra_json, updated_at) VALUES ('whatsapp', NULL, ?, ?, ?)
      ON CONFLICT(provider) DO UPDATE SET secret_enc=excluded.secret_enc, extra_json=excluded.extra_json, updated_at=excluded.updated_at`).run(enc, JSON.stringify({ wabaId, phoneNumberId }), this.now());
    this.d.audit.log('whatsapp.config.save', 'integration', 'whatsapp', { wabaId, phoneNumberId });
    return this.whatsappStatus();
  }
  clearWhatsApp(): void {
    this.db.prepare("DELETE FROM integration_credentials WHERE provider='whatsapp'").run();
    this.d.audit.log('whatsapp.config.clear', 'integration', 'whatsapp');
  }
  /** قراءة فقط: GET /{phone_number_id}. ينجح فقط إن قبل Meta الرمز ورجع الرقم. */
  async verifyWhatsApp(): Promise<WhatsAppStatus> {
    const r = this.db.prepare("SELECT secret_enc, extra_json FROM integration_credentials WHERE provider='whatsapp'").get() as Row | undefined;
    if (!r?.secret_enc) throw new AppError('احفظ إعدادات واتساب أولاً.');
    const x = JSON.parse(String(r.extra_json)) as Record<string, unknown>;
    const token = await this.d.secrets.decrypt(r.secret_enc as string);
    const cl = new MetaClient({ baseUrl: this.cfg.graphBase, version: this.cfg.version, fetchImpl: this.d.fetchImpl, ...this.d.clientOptions });
    try {
      const info = await cl.get<{ id?: string; verified_name?: string; display_phone_number?: string; quality_rating?: string }>(`/${x.phoneNumberId as string}`, { fields: 'verified_name,display_phone_number,quality_rating' }, token);
      if (!info.id) throw new MetaApiError('رد غير متوقع', null, null, 200, 'unknown');
      const next = { ...x, verifiedName: info.verified_name ?? null, displayPhone: info.display_phone_number ?? null, qualityRating: info.quality_rating ?? null, verifiedAt: this.now(), lastError: undefined };
      this.db.prepare("UPDATE integration_credentials SET extra_json=?, updated_at=? WHERE provider='whatsapp'").run(JSON.stringify(next), this.now());
      this.d.audit.log('whatsapp.verify', 'integration', 'whatsapp', { ok: true });
    } catch (e) {
      const msg = userMessage(e);
      this.db.prepare("UPDATE integration_credentials SET extra_json=?, updated_at=? WHERE provider='whatsapp'").run(JSON.stringify({ wabaId: x.wabaId, phoneNumberId: x.phoneNumberId, lastError: msg }), this.now());
      this.d.audit.log('whatsapp.verify', 'integration', 'whatsapp', { ok: false });
      throw new AppError(msg);
    }
    return this.whatsappStatus();
  }
}
