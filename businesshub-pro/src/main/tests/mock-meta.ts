import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

/**
 * خادم Meta وهمي (test double) يعمل داخل الاختبار فقط لمحاكاة سلوك Graph API:
 * الترقيم، الأخطاء (190، 613، 500)، الترويسات. لا شيء من بياناته يدخل التطبيق خارج هذا الاختبار.
 */
export const V = '/v24.0';
export const APP_ID = '123456789012';
export const APP_SECRET = 'super-secret-app-value';
export const TOKEN = 'LONG_TOKEN_abcdefghijklmnopqrstuvwxyz';
export const NOW0 = Date.parse('2026-11-08T12:00:00Z');

interface Rec { method: string; path: string; query: URLSearchParams; auth: string | undefined; body: string }
export const mock = { reqs: [] as Rec[], mode: 'ok' as 'ok' | 'rate' | 'expired' | 'flaky' | 'heavy', flakyLeft: 0, waToken: 'WA_TOKEN_abcdefghijklmnop' };

const ACCOUNTS = [
  { id: 'act_111', name: 'حساب المتجر', currency: 'USD', account_status: 1, timezone_name: 'Asia/Baghdad', business: { name: 'Meta Biz' } },
  { id: 'act_222', name: 'حساب المطعم', currency: 'IQD', account_status: 1, timezone_name: 'Asia/Baghdad' },
  { id: 'act_333', name: 'حساب ثالث', currency: 'USD', account_status: 2 },
];
const CAMPAIGNS = [
  { id: 'c1', name: 'حملة المبيعات', status: 'ACTIVE', effective_status: 'ACTIVE', objective: 'OUTCOME_SALES', daily_budget: '5000' },
  { id: 'c2', name: 'حملة الوعي', status: 'PAUSED', effective_status: 'PAUSED', objective: 'OUTCOME_AWARENESS', daily_budget: '2500' },
  { id: 'c3', name: 'حملة العملاء', status: 'ACTIVE', effective_status: 'ACTIVE', objective: 'OUTCOME_LEADS' },
];
const ADSETS = [{ id: 's1', name: 'مجموعة 1', status: 'ACTIVE', campaign_id: 'c1', daily_budget: '5000', optimization_goal: 'OFFSITE_CONVERSIONS' }, { id: 's2', name: 'مجموعة 2', status: 'ACTIVE', campaign_id: 'c1' }, { id: 's3', name: 'مجموعة 3', status: 'PAUSED', campaign_id: 'c2' }, { id: 's9', name: 'يتيمة', status: 'ACTIVE', campaign_id: 'cX' }];
const ADS = [{ id: 'a1', name: 'إعلان 1', status: 'ACTIVE', adset_id: 's1' }, { id: 'a2', name: 'إعلان 2', status: 'ACTIVE', adset_id: 's1' }, { id: 'a3', name: 'إعلان 3', status: 'PAUSED', adset_id: 's3' }];

function paged<T>(all: T[], q: URLSearchParams, size: number) {
  const start = Number(q.get('after') ?? 0);
  const slice = all.slice(start, start + size);
  const more = start + size < all.length;
  return { data: slice, paging: { cursors: { before: 'x', after: String(start + size) }, ...(more ? { next: 'https://evil.example/steal?after=' + (start + size) } : {}) } };
}
const days = (since: string, until: string) => { const out: string[] = []; for (let t = Date.parse(since); t <= Date.parse(until); t += 86400000) out.push(new Date(t).toISOString().slice(0, 10)); return out; };

export const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const u = new URL(req.url ?? '/', 'http://x');
    mock.reqs.push({ method: req.method ?? '', path: u.pathname, query: u.searchParams, auth: req.headers.authorization, body });
    const send = (status: number, json: unknown, headers: Record<string, string> = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(json)); };
    const p = u.pathname.replace(V, '');
    if (p === '/oauth/access_token' && req.method === 'POST') {
      const f = new URLSearchParams(body);
      if (f.get('client_secret') !== APP_SECRET) return send(400, { error: { message: 'Invalid client secret', code: 1, type: 'OAuthException' } });
      if (f.get('grant_type') === 'fb_exchange_token') return f.get('fb_exchange_token') === 'SHORT_TOKEN' ? send(200, { access_token: TOKEN, token_type: 'bearer', expires_in: 5184000 }) : send(400, { error: { message: 'bad exchange', code: 100 } });
      return f.get('code') === 'GOODCODE' ? send(200, { access_token: 'SHORT_TOKEN', token_type: 'bearer' }) : send(400, { error: { message: 'Invalid verification code', code: 100 } });
    }
    if (req.method !== 'GET') return send(405, { error: { message: 'read-only test server', code: 3 } });
    if (p.match(/^\/\d+$/) && p !== '/me') { // WhatsApp phone number
      return req.headers.authorization === `Bearer ${mock.waToken}` ? send(200, { id: p.slice(1), verified_name: 'متجري', display_phone_number: '+964 770 000 0000', quality_rating: 'GREEN' }) : send(400, { error: { message: 'Invalid OAuth access token', code: 190, error_subcode: 463 } });
    }
    if (p === '/debug_token') return req.headers.authorization === `Bearer ${APP_ID}|${APP_SECRET}` ? send(200, { data: { is_valid: true, expires_at: Math.floor((NOW0 + 60 * 86400000) / 1000), scopes: ['ads_read', 'business_management'] } }) : send(400, { error: { message: 'bad app token', code: 190 } });
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(400, { error: { message: 'Invalid OAuth access token.', code: 190, error_subcode: 467 } });
    if (mock.mode === 'expired' && p !== '/me') return send(400, { error: { message: 'Error validating access token: Session has expired', code: 190, error_subcode: 463 } });
    if (mock.mode === 'rate' && p !== '/me') return send(400, { error: { message: 'Application request limit reached', code: 4, error_subcode: 1349193 } }, { 'x-app-usage': JSON.stringify({ call_count: 100, total_cputime: 80, total_time: 90 }) });
    if (mock.mode === 'flaky' && mock.flakyLeft > 0) { mock.flakyLeft--; return send(500, { error: { message: 'temporary', code: 2 } }); }
    const hdr: Record<string, string> = mock.mode === 'heavy' ? { 'x-business-use-case-usage': JSON.stringify({ '111': [{ type: 'ads_insights', call_count: 96, total_cputime: 10, total_time: 10 }] }) } : {};
    if (p === '/me') return send(200, { id: '1001', name: 'مستخدم الاختبار' });
    if (p === '/me/adaccounts') return send(200, paged(ACCOUNTS, u.searchParams, 2), hdr);
    const m = p.match(/^\/(act_\d+)\/(campaigns|adsets|ads|insights)$/);
    if (!m) return send(404, { error: { message: 'unknown', code: 803 } });
    if (m[1] !== 'act_111') return send(200, { data: [] });
    if (m[2] === 'campaigns') return send(200, paged(CAMPAIGNS, u.searchParams, 2), hdr);
    if (m[2] === 'adsets') return send(200, paged(ADSETS, u.searchParams, 2), hdr);
    if (m[2] === 'ads') return send(200, paged(ADS, u.searchParams, 2), hdr);
    const level = u.searchParams.get('level')!;
    const range = JSON.parse(u.searchParams.get('time_range')!) as { since: string; until: string };
    const idField = level === 'campaign' ? 'campaign_id' : level === 'adset' ? 'adset_id' : 'ad_id';
    if (u.searchParams.get('breakdowns') === 'publisher_platform') {
      const split = [['facebook', 0.6], ['instagram', 0.4]] as const;
      const base = [['c1', 10.5, 1000, 50], ['c2', 4, 400, 10]] as const;
      const rowsBp = base.flatMap(([cid, sp, im, cl]) => days(range.since, range.until).flatMap((d) => split.map(([pf, ratio]) => ({ campaign_id: cid, publisher_platform: pf, date_start: d, date_stop: d, spend: (sp * ratio).toFixed(2), impressions: String(Math.round(im * ratio)), clicks: String(Math.round(cl * ratio)) }))));
      return send(200, paged(rowsBp, u.searchParams, 15), hdr);
    }
    const ents = level === 'campaign' ? ['c1', 'c2'] : level === 'adset' ? ['s1', 's3'] : ['a1', 'a3'];
    const rows = ents.flatMap((e, ei) => days(range.since, range.until).map((d) => ({
      [idField]: e, date_start: d, date_stop: d, spend: ei === 0 ? '10.50' : '4.00', impressions: ei === 0 ? '1000' : '400', clicks: ei === 0 ? '50' : '10', reach: '900',
      actions: [{ action_type: 'link_click', value: '40' }, ...(ei === 0 ? [{ action_type: 'purchase', value: '2' }, { action_type: 'lead', value: '1' }] : [])],
    })));
    return send(200, paged(rows, u.searchParams, 15), hdr);
  });
});

