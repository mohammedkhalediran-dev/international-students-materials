/**
 * عميل Graph API لقراءة بيانات Meta فقط.
 * - الطلبات الوحيدة المسموحة على نقاط البيانات هي GET (لا توجد دالة كتابة هنا إطلاقاً).
 * - الرمز يُرسل في ترويسة Authorization ولا يُكتب في الروابط ولا في السجلات.
 * - الترقيم يعتمد على المؤشرات (cursors.after) لا على روابط next، فلا يُرسَل الرمز لأي مضيف آخر.
 */
export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
    readonly subcode: number | null,
    readonly httpStatus: number,
    readonly kind: 'token' | 'rate_limit' | 'permission' | 'transient' | 'invalid' | 'unknown',
    readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = 'MetaApiError';
  }
}

export interface MetaClientOptions {
  baseUrl?: string;
  version?: string;
  fetchImpl?: typeof fetch;
  /** أقصى محاولات لأخطاء الشبكة/5xx العابرة */
  maxRetries?: number;
  retryBaseMs?: number;
  /** إبطاء الطلبات عند اقتراب الحد (نسبة الاستخدام ≥ هذا الرقم) */
  slowdownAtPct?: number;
  slowdownMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onUsage?: (pct: number) => void;
}

export interface Page<T> { data: T[]; truncated: boolean; pages: number }

const RATE_CODES = new Set([4, 17, 32, 341, 613]);
const TOKEN_CODES = new Set([102, 190]);
const PERM_CODES = new Set([10, 200, 278]);

/** يستخرج أعلى نسبة استخدام من ترويسات حدود المعدل الخاصة بـ Meta. */
export function usagePct(headers: Headers): number {
  let max = 0;
  for (const h of ['x-app-usage', 'x-business-use-case-usage', 'x-ad-account-usage']) {
    const raw = headers.get(h);
    if (!raw) continue;
    try {
      const walk = (v: unknown): void => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') {
          for (const [k, val] of Object.entries(v)) {
            if (typeof val === 'number' && /(call_count|total_cputime|total_time|util_pct)/.test(k)) max = Math.max(max, val);
            else walk(val);
          }
        }
      };
      walk(JSON.parse(raw));
    } catch { /* ترويسة غير مفهومة: تُتجاهل */ }
  }
  return max;
}

export function classify(status: number, body: unknown): MetaApiError {
  const err = (body as { error?: { message?: string; code?: number; error_subcode?: number; type?: string; error_data?: unknown; estimated_time_to_regain_access?: number } } | null)?.error;
  const code = typeof err?.code === 'number' ? err.code : null;
  const sub = typeof err?.error_subcode === 'number' ? err.error_subcode : null;
  const msg = (err?.message ?? `HTTP ${status}`).slice(0, 300);
  if (code !== null && TOKEN_CODES.has(code)) return new MetaApiError(msg, code, sub, status, 'token');
  if (code !== null && (RATE_CODES.has(code) || (code >= 80000 && code <= 80014))) {
    const mins = (err as { estimated_time_to_regain_access?: number } | undefined)?.estimated_time_to_regain_access;
    return new MetaApiError(msg, code, sub, status, 'rate_limit', mins ? mins * 60 : 300);
  }
  if (code !== null && PERM_CODES.has(code)) return new MetaApiError(msg, code, sub, status, 'permission');
  if (status === 429) return new MetaApiError(msg, code, sub, status, 'rate_limit', 300);
  if (status >= 500 || code === 1 || code === 2) return new MetaApiError(msg, code, sub, status, 'transient');
  if (status === 400) return new MetaApiError(msg, code, sub, status, 'invalid');
  return new MetaApiError(msg, code, sub, status, 'unknown');
}

export class MetaClient {
  readonly baseUrl: string;
  readonly version: string;
  private readonly f: typeof fetch;
  private readonly o: Required<Pick<MetaClientOptions, 'maxRetries' | 'retryBaseMs' | 'slowdownAtPct' | 'slowdownMs'>>;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly onUsage?: (pct: number) => void;
  private slowdown = false;

  constructor(opts: MetaClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? 'https://graph.facebook.com').replace(/\/$/, '');
    this.version = opts.version ?? 'v24.0';
    this.f = opts.fetchImpl ?? fetch;
    this.o = { maxRetries: opts.maxRetries ?? 2, retryBaseMs: opts.retryBaseMs ?? 500, slowdownAtPct: opts.slowdownAtPct ?? 90, slowdownMs: opts.slowdownMs ?? 2000 };
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.onUsage = opts.onUsage;
  }

  private url(path: string, params: Record<string, string | number | undefined>): string {
    if (!/^\/[A-Za-z0-9_./:-]+$/.test(path)) throw new MetaApiError('مسار غير صالح', null, null, 0, 'invalid');
    const u = new URL(`${this.baseUrl}/${this.version}${path}`);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
    return u.toString();
  }

  /** GET واحد مع إعادة محاولة للأخطاء العابرة فقط. */
  async get<T = unknown>(path: string, params: Record<string, string | number | undefined>, token: string): Promise<T> {
    const url = this.url(path, params);
    for (let attempt = 0; ; attempt++) {
      if (this.slowdown) await this.sleep(this.o.slowdownMs);
      let res: Response;
      try {
        res = await this.f(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      } catch {
        if (attempt < this.o.maxRetries) { await this.sleep(this.o.retryBaseMs * 2 ** attempt); continue; }
        throw new MetaApiError('تعذّر الاتصال بخوادم Meta (الشبكة).', null, null, 0, 'transient');
      }
      const pct = usagePct(res.headers);
      this.slowdown = pct >= this.o.slowdownAtPct;
      this.onUsage?.(pct);
      let body: unknown = null;
      try { body = await res.json(); } catch { /* جسم غير JSON */ }
      if (res.ok && !(body as { error?: unknown } | null)?.error) return body as T;
      const e = classify(res.status, body);
      if (e.kind === 'transient' && attempt < this.o.maxRetries) { await this.sleep(this.o.retryBaseMs * 2 ** attempt); continue; }
      throw e;
    }
  }

  /** يجمع كل الصفحات عبر cursors.after حتى maxPages. */
  async paginate<T>(path: string, params: Record<string, string | number | undefined>, token: string, maxPages = 50): Promise<Page<T>> {
    const out: T[] = [];
    let after: string | undefined;
    let pages = 0;
    for (;;) {
      const r = await this.get<{ data?: T[]; paging?: { cursors?: { after?: string }; next?: string } }>(path, { ...params, after }, token);
      out.push(...(r.data ?? []));
      pages++;
      const next = r.paging?.next ? r.paging.cursors?.after : undefined;
      if (!next) return { data: out, truncated: false, pages };
      if (pages >= maxPages) return { data: out, truncated: true, pages };
      after = next;
    }
  }
}

/** عدد الخانات العشرية (offset) للعملات: Meta تُرجع الميزانيات بأصغر وحدة. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'HUF', 'TWD', 'PYG', 'UGX', 'XAF', 'XOF', 'XPF', 'COP', 'IDR', 'CRC', 'HUF']);
export function minorToMajor(minor: string | number | null | undefined, currency: string | null | undefined): number | null {
  if (minor === null || minor === undefined || minor === '') return null;
  const n = Number(minor);
  if (!Number.isFinite(n)) return null;
  return ZERO_DECIMAL.has((currency ?? '').toUpperCase()) ? n : n / 100;
}
