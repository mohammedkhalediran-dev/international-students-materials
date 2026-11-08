import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BusinessInput } from '../../shared/contract';
import { AuditLog } from '../audit';
import { AppError } from '../errors';
import { listIntegrations, ProviderService } from '../integrations';
import { MetaApiError, MetaClient, classify, minorToMajor, usagePct } from '../meta/client';
import { MetaService } from '../meta/service';
import { Services } from '../services';
import { Store } from '../store';
import { check, run, testSecretBox } from './harness';
import { APP_ID, APP_SECRET, mock, NOW0, server, TOKEN } from './mock-meta';

const rejects = async (fn: () => Promise<unknown>, label: string, match?: RegExp) => {
  try { await fn(); check(false, label); } catch (e) { check(e instanceof AppError && (!match || match.test(e.message)), label); }
};

run('Meta: OAuth، الاكتشاف، المزامنة، الأخطاء، القراءة فقط (على خادم وهمي محلي)', async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const dir = mkdtempSync(join(tmpdir(), 'bh-meta-'));
  const store = new Store(join(dir, 'bh.sqlite'), join(dir, 'backups'));
  const secrets = testSecretBox();
  const audit = new AuditLog(store);
  const svc = new Services(store, secrets, audit);
  let nowMs = NOW0;
  const sleeps: number[] = [];
  const co = { retryBaseMs: 1, slowdownMs: 7, sleep: async (ms: number) => { sleeps.push(ms); } };
  let browserAction: (authUrl: URL) => Promise<void> = async () => undefined;
  const meta = new MetaService({
    store, secrets, audit, svc, now: () => nowMs, clientOptions: co,
    config: { graphBase: base, dialogBase: base, redirectPort: 0, version: 'v24.0' },
    openExternal: async (url) => { void browserAction(new URL(url)); },
  });
  const providers = new ProviderService({ store, secrets, audit, now: () => nowMs, clientOptions: co, config: { graphBase: base, version: 'v24.0' } });

  // ───── وحدات العميل ─────
  check(minorToMajor('5000', 'USD') === 50 && minorToMajor('5000', 'JPY') === 5000 && minorToMajor(null, 'USD') === null, 'تحويل الميزانية من أصغر وحدة حسب العملة');
  check(usagePct(new Headers({ 'x-business-use-case-usage': JSON.stringify({ '1': [{ call_count: 12, total_time: 80 }] }) })) === 80, 'قراءة نسبة الاستخدام من ترويسة BUC');
  check(classify(400, { error: { code: 190, error_subcode: 463, message: 'x' } }).kind === 'token' && classify(400, { error: { code: 613, message: 'x' } }).kind === 'rate_limit' && classify(400, { error: { code: 80004, message: 'x' } }).kind === 'rate_limit' && classify(500, null).kind === 'transient' && classify(400, { error: { code: 200, message: 'x' } }).kind === 'permission', 'تصنيف أخطاء Meta (رمز/معدل/صلاحية/عابر)');
  let pathBlocked = false;
  try { await new MetaClient({ baseUrl: base }).get('/../etc/passwd?x=1', {}, 't'); } catch (e) { pathBlocked = e instanceof MetaApiError; }
  check(pathBlocked, 'مسار مشبوه يُرفض قبل أي طلب');

  // ───── إعداد التطبيق ─────
  check(!meta.status().configured && listIntegrations(store.db)[0].status === 'not_configured', 'قبل الإعداد: غير مُعدّ');
  await rejects(() => meta.connect(), 'الربط يتطلب App ID وSecret أولاً', /أدخل معرّف/);
  await rejects(() => meta.saveCredentials(APP_ID), 'السر مطلوب أول مرة', /سر التطبيق/);
  const st = await meta.saveCredentials(APP_ID, APP_SECRET);
  check(st.configured && st.appId === APP_ID && st.hasSecret && !JSON.stringify(st).includes(APP_SECRET), 'حفظ بيانات التطبيق والحالة بلا سر');
  check(listIntegrations(store.db)[0].status === 'configured', 'بعد الإعداد: مُعدّ لكن غير متصل');

  // ───── OAuth ─────
  let seenAuth: URL | null = null;
  browserAction = async (u) => { seenAuth = u; await fetch(`${u.searchParams.get('redirect_uri')}?code=GOODCODE&state=WRONG`); };
  const pending = meta.connect();
  pending.catch(() => undefined);
  await new Promise((r) => setTimeout(r, 400));
  check(meta.status().connecting, 'state خاطئ لا ينهي الربط (ما زال بانتظار رد صحيح)');
  meta.cancelConnect();
  await rejects(() => pending, 'الإلغاء يرفض الوعد', /أُلغي/);
  check(!meta.status().connecting, 'المستمع المحلي أُغلق بعد الإلغاء');
  const au = seenAuth!;
  check(au.pathname === '/v24.0/dialog/oauth' && au.searchParams.get('client_id') === APP_ID && au.searchParams.get('scope') === 'ads_read,business_management' && au.searchParams.get('response_type') === 'code' && /^http:\/\/127\.0\.0\.1:\d+\/meta\/callback$/.test(au.searchParams.get('redirect_uri')!) && au.searchParams.get('state')!.length >= 32, 'رابط OAuth صحيح: client_id/scope/redirect حلقة مرتدة/state عشوائي');

  browserAction = async (u) => { await fetch(`${u.searchParams.get('redirect_uri')}?error=access_denied&state=${u.searchParams.get('state')}`); };
  await rejects(() => meta.connect(), 'رفض المستخدم للتفويض يُعالَج', /رُفض/);

  browserAction = async (u) => { await fetch(`${u.searchParams.get('redirect_uri')}?code=GOODCODE&state=${u.searchParams.get('state')}`); };
  const conn = await meta.connect();
  check(conn.status === 'active' && conn.fbUserName === 'مستخدم الاختبار' && conn.scopes.includes('ads_read') && conn.tokenExpiresAt === NOW0 + 60 * 86400000, 'الربط ناجح: مستخدم، صلاحيات، تاريخ انتهاء من debug_token');
  check(listIntegrations(store.db)[0].status === 'connected', 'الحالة «متصل» بعد تفويض صالح فقط');
  store.db.pragma('wal_checkpoint(TRUNCATE)');
  const raw = readdirSync(dir).filter((f) => f.startsWith('bh.sqlite')).map((f) => readFileSync(join(dir, f)).toString('latin1')).join('');
  check(!raw.includes(TOKEN) && !raw.includes(APP_SECRET) && !raw.includes('SHORT_TOKEN'), 'الرمز وسر التطبيق غير موجودين كنص صريح في قاعدة البيانات');
  check(!JSON.stringify(meta.status()).includes(TOKEN) && !JSON.stringify(meta.listConnections()).includes('LONG_TOKEN'), 'الرمز لا يظهر في واجهة الحالة');
  const ex = mock.reqs.filter((r) => r.path.endsWith('/oauth/access_token'));
  check(ex.length === 2 && ex.every((r) => r.method === 'POST' && !r.query.has('client_secret') && r.body.includes('client_secret')), 'تبادل الرمز بـ POST وسر التطبيق في الجسم لا في الرابط');

  // ───── اكتشاف الحسابات (ترقيم) ─────
  const found = await meta.discover(conn.id);
  check(found.length === 3 && mock.reqs.filter((r) => r.path.endsWith('/me/adaccounts')).length === 2, 'اكتشاف 3 حسابات عبر صفحتين (ترقيم بالمؤشر)');
  check(mock.reqs.every((r) => !r.query.has('access_token') && !r.path.includes(TOKEN)), 'الرمز لا يُرسل في الروابط أبداً');
  check(mock.reqs.every((r) => !r.path.includes('evil')), 'روابط next الخبيثة لا تُتّبع (الترقيم بالمؤشر فقط)');
  const biz = svc.createBusiness(BusinessInput.parse({ name: 'نشاط ميتا', category: 'متاجر', color: '#336699' }));
  const biz2 = svc.createBusiness(BusinessInput.parse({ name: 'نشاط آخر', category: 'متاجر', color: '#336699' }));
  const linked = meta.link('act_111', biz.id);
  check(linked.businessId === biz.id && linked.provider === 'meta' && linked.connectionStatus === 'connected' && linked.connectionId === conn.id, 'ربط الحساب الإعلاني بالنشاط الصحيح (connected)');
  check(meta.discovered().find((a) => a.externalId === 'act_111')!.linkedBusinessName === 'نشاط ميتا', 'الحساب المكتشف يعرض النشاط المرتبط');
  let blocked = false;
  try { meta.link('act_111', biz2.id); } catch (e) { blocked = e instanceof AppError && /نشاط آخر/.test(e.message); }
  check(blocked, 'منع ربط نفس الحساب بنشاط ثانٍ');
  let editBlocked = false;
  try { svc.updateAd(linked.id, { businessId: biz.id, provider: 'tiktok', displayName: 'x', externalId: null }); } catch (e) { editBlocked = e instanceof AppError; }
  check(editBlocked, 'منع تغيير مزوّد/معرّف حساب مربوط');

  // ───── لا بيانات قبل المزامنة ─────
  const none = meta.campaigns({ since: '2026-10-01', until: '2026-10-10', page: 1, pageSize: 25 });
  check(none.total === 0 && none.rows.length === 0 && none.totals.length === 0, 'قبل المزامنة: لا حملات ولا أرقام (لا اختلاق)');

  // ───── المزامنة ─────
  await rejects(() => meta.sync(linked.id, '2026-10-10', '2026-10-01'), 'نهاية قبل بداية', /قبل/);
  await rejects(() => meta.sync(linked.id, '2026-10-01', '2026-12-31'), 'تاريخ مستقبلي', /مستقبلي/);
  await rejects(() => meta.sync(linked.id, '2020-01-01', '2026-10-01'), 'نطاق أكبر من 37 شهراً', /37/);
  mock.reqs.length = 0;
  const run1 = await meta.sync(linked.id, '2026-10-01', '2026-10-10');
  check(run1.status === 'ok' && run1.campaigns === 3 && run1.adSets === 3 && run1.ads === 3 && !run1.truncated, 'مزامنة ناجحة: 3 حملات، 3 مجموعات (اليتيمة تُستبعد)، 3 إعلانات');
  check(mock.reqs.filter((r) => r.path.endsWith('/campaigns')).length === 2 && mock.reqs.filter((r) => r.path.endsWith('/insights')).length >= 6, 'الترقيم يعمل لكل المسارات');
  check(run1.insightRows === 2 * 10 * 3, `صفوف الإحصاء 60 (2 كيان × 10 أيام × 3 مستويات): ${run1.insightRows}`);
  check(mock.reqs.every((r) => r.method === 'GET' || r.path.endsWith('/oauth/access_token')), 'كل طلبات البيانات GET فقط — لا كتابة على Meta أبداً');

  const pg = meta.campaigns({ since: '2026-10-01', until: '2026-10-10', page: 1, pageSize: 5 });
  const c1 = pg.rows.find((r) => r.externalId === 'c1')!;
  check(pg.total === 3 && c1.metrics.spend === 105 && c1.metrics.impressions === 10000 && c1.metrics.clicks === 500 && c1.metrics.conversions === 30, 'مقاييس الحملة (إنفاق 105، ظهور 10000، نقرات 500، تحويلات 30)');
  check(c1.metrics.ctr === 5 && Math.abs((c1.metrics.cpc ?? 0) - 0.21) < 1e-9 && c1.dailyBudget === 50 && c1.currency === 'USD', 'CTR وCPC والميزانية اليومية والعملة');
  check(pg.rows[0].externalId === 'c1' && pg.rows.find((r) => r.externalId === 'c3')!.metrics.spend === 0 && pg.rows.find((r) => r.externalId === 'c3')!.metrics.ctr === null, 'الترتيب بالإنفاق؛ حملة بلا بيانات = أصفار وCTR فارغ (لا اختلاق)');
  check(pg.totals.length === 1 && pg.totals[0].currency === 'USD' && pg.totals[0].spend === 145 && pg.totals[0].conversions === 30, 'الإجماليات مجمّعة حسب العملة');
  const narrow = meta.campaigns({ since: '2026-10-05', until: '2026-10-07', page: 1, pageSize: 25 });
  check(narrow.rows.find((r) => r.externalId === 'c1')!.metrics.spend === 31.5, 'فلتر التاريخ يحدّد المجموع (3 أيام × 10.5)');
  check(meta.campaigns({ since: '2026-10-01', until: '2026-10-10', page: 2, pageSize: 5 }).rows.length === 0 && meta.campaigns({ since: '2026-10-01', until: '2026-10-10', page: 1, pageSize: 5, query: 'الوعي' }).total === 1 && meta.campaigns({ since: '2026-10-01', until: '2026-10-10', page: 1, pageSize: 5, status: 'PAUSED' }).total === 1, 'ترقيم الواجهة والبحث والتصفية بالحالة');
  check(meta.campaigns({ businessId: biz2.id, since: '2026-10-01', until: '2026-10-10', page: 1, pageSize: 5 }).total === 0, 'تصفية بالنشاط: نشاط آخر بلا حملات');
  const sets = meta.adSets('meta:c1', '2026-10-01', '2026-10-10');
  check(sets.length === 2 && sets[0].externalId === 's1' && sets[0].metrics.spend === 105 && sets[0].dailyBudget === 50 && sets[0].optimizationGoal === 'OFFSITE_CONVERSIONS', 'مجموعات الحملة مع مقاييسها');
  const ads = meta.adsOf('meta:s1', '2026-10-01', '2026-10-10');
  check(ads.length === 2 && ads.find((a) => a.externalId === 'a1')!.metrics.conversions === 30, 'إعلانات المجموعة مع مقاييسها');
  const raw2 = (store.db.prepare("SELECT actions_json FROM insights_daily WHERE level='campaign' AND entity_external_id='c1' LIMIT 1").get() as { actions_json: string }).actions_json;
  check(raw2.includes('link_click') && raw2.includes('purchase'), 'actions الخام محفوظة للشفافية');
  const again = await meta.sync(linked.id, '2026-10-01', '2026-10-10');
  check(again.status === 'ok' && (store.db.prepare('SELECT COUNT(*) c FROM insights_daily').get() as { c: number }).c === 60 && (store.db.prepare('SELECT COUNT(*) c FROM campaigns').get() as { c: number }).c === 3, 'إعادة المزامنة idempotent (لا تكرار)');
  check(meta.syncRuns(linked.id).length === 2 && meta.syncRuns()[0].status === 'ok', 'سجل المزامنة');

  // ───── أخطاء عابرة، إبطاء، حد المعدل ─────
  mock.mode = 'flaky'; mock.flakyLeft = 2;
  sleeps.length = 0;
  const r3 = await meta.sync(linked.id, '2026-10-01', '2026-10-02');
  check(r3.status === 'ok' && sleeps.length >= 2, 'أخطاء 500 العابرة تُعاد بتراجع أسّي ثم تنجح');
  mock.mode = 'heavy'; sleeps.length = 0;
  await meta.sync(linked.id, '2026-10-01', '2026-10-02');
  check(sleeps.includes(7), 'عند استخدام ≥90% يُبطَّأ العميل تلقائياً');
  mock.mode = 'rate';
  await rejects(() => meta.sync(linked.id, '2026-10-01', '2026-10-02'), 'خطأ حد المعدل يُعرض بالعربية', /حد الطلبات/);
  const rl = meta.listConnections()[0];
  check(rl.rateLimitedUntil === NOW0 + 300_000 && meta.syncRuns(linked.id)[0].status === 'error', 'تُحفظ مهلة الانتظار وتُسجَّل المحاولة كخطأ');
  mock.mode = 'ok'; mock.reqs.length = 0;
  await rejects(() => meta.sync(linked.id, '2026-10-01', '2026-10-02'), 'أثناء المهلة لا تُرسل طلبات أصلاً', /حد الطلبات/);
  check(mock.reqs.length === 0, 'لا أي طلب شبكة أثناء مهلة حد المعدل');
  nowMs += 301_000;
  check((await meta.sync(linked.id, '2026-10-01', '2026-10-02')).status === 'ok', 'بعد انتهاء المهلة تعود المزامنة');

  // ───── انتهاء الرمز ─────
  mock.mode = 'expired';
  await rejects(() => meta.sync(linked.id, '2026-10-01', '2026-10-02'), 'رمز منتهٍ من Meta (190/463)', /أعد ربط/);
  check(meta.listConnections()[0].status === 'expired' && svc.listAds()[0].connectionStatus === 'error' && listIntegrations(store.db, nowMs)[0].status === 'expired', 'الاتصال «منتهي» والحساب الإعلاني «خطأ» والتكامل «expired»');
  mock.mode = 'ok';
  await rejects(() => meta.sync(linked.id, '2026-10-01', '2026-10-02'), 'بعد التعليم لا مزامنة حتى إعادة الربط', /انتهت صلاحية/);
  const conn2 = await meta.connect();
  check(conn2.id === conn.id && conn2.status === 'active' && svc.listAds()[0].connectionStatus === 'connected', 'إعادة الربط تُحيي نفس الاتصال والحسابات');
  nowMs = NOW0 + 61 * 86400000;
  check(meta.listConnections()[0].status === 'expired', 'انتهاء الرمز بالوقت يُكتشف قبل أي طلب');
  await rejects(() => meta.discover(conn.id), 'اكتشاف بعد انتهاء الوقت مرفوض محلياً', /انتهت صلاحية/);
  nowMs = NOW0 + 1000;
  await meta.connect();

  // ───── فصل الاتصال وفكّ الربط ─────
  meta.disconnect(conn.id);
  check(meta.listConnections()[0].status === 'revoked' && svc.listAds()[0].connectionStatus === 'not_connected' && (store.db.prepare('SELECT token_enc FROM meta_connections').get() as { token_enc: string | null }).token_enc === null, 'الفصل يحذف الرمز ويجعل الحساب «غير متصل»');
  await rejects(() => meta.sync(linked.id, '2026-10-01', '2026-10-02'), 'لا مزامنة بعد الفصل', /مفصول/);
  check(meta.campaigns({ since: '2026-10-01', until: '2026-10-10', page: 1, pageSize: 25 }).total === 3, 'البيانات المخزّنة تبقى للاطلاع بعد الفصل');
  meta.unlink(linked.id);
  check((store.db.prepare('SELECT COUNT(*) c FROM campaigns').get() as { c: number }).c === 0 && (store.db.prepare('SELECT COUNT(*) c FROM insights_daily').get() as { c: number }).c === 0, 'فكّ الربط يحذف البيانات المخزّنة محلياً');

  // ───── التدقيق ─────
  const ev = JSON.stringify(audit.list(500));
  check(ev.includes('meta.connect') && ev.includes('meta.sync') && ev.includes('meta.disconnect') && !ev.includes(TOKEN) && !ev.includes(APP_SECRET), 'سجل التدقيق يغطي العمليات بلا أسرار');

  // ───── WhatsApp / TikTok ─────
  check(providers.whatsappStatus().hasToken === false && listIntegrations(store.db)[2].status === 'not_configured', 'واتساب: غير مُعدّ');
  await rejects(() => providers.saveWhatsApp('1234567890', '9876543210'), 'رمز واتساب مطلوب أول مرة', /رمز الوصول/);
  await providers.saveWhatsApp('1234567890', '9876543210', 'WRONG_TOKEN_abcdefghijklmnop');
  check(listIntegrations(store.db)[2].status === 'configured', 'واتساب: مُعدّ فقط (لم يُتحقق)');
  await rejects(() => providers.verifyWhatsApp(), 'رمز واتساب خاطئ يُرفض', /انتهت صلاحية|رمز/);
  check(listIntegrations(store.db)[2].status === 'error', 'واتساب: خطأ بعد فشل التحقق (لا اتصال مدّعى)');
  await providers.saveWhatsApp('1234567890', '9876543210', mock.waToken);
  const wa = await providers.verifyWhatsApp();
  check(wa.verifiedName === 'متجري' && wa.qualityRating === 'GREEN' && wa.verifiedAt !== null && listIntegrations(store.db)[2].status === 'connected' && !JSON.stringify(wa).includes(mock.waToken), 'واتساب: «متصل» بعد تحقق حقيقي، والرمز لا يظهر');
  providers.clearWhatsApp();
  check(listIntegrations(store.db)[2].status === 'not_configured', 'مسح إعدادات واتساب');
  const tk = await providers.saveTikTok('7123456789', 'tiktok-secret-value');
  check(tk.implemented === false && tk.hasSecret && listIntegrations(store.db)[1].status === 'configured' && !JSON.stringify(tk).includes('tiktok-secret-value'), 'تيك توك: «مُعدّ» فقط، التفويض غير منفّذ، والسر لا يظهر');
  check(listIntegrations(store.db).every((i) => i.status !== 'connected'), 'لا تكامل «متصل» بلا تفويض صالح');

  server.close();
  store.close();
});
