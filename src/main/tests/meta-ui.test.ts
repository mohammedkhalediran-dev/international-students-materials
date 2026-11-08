import { app } from 'electron';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startApp } from '../app';
import { check, run, testSecretBox } from './harness';
import { APP_ID, APP_SECRET, mock, server } from './mock-meta';

const dataDir = mkdtempSync(join(tmpdir(), 'bh-metaui-'));
app.setPath('userData', dataDir);
const shots = process.env.BH_SHOT_DIR ?? dataDir;
mkdirSync(shots, { recursive: true });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(() =>
  run('واجهة Meta الكاملة: ربط، اكتشاف، ربط بنشاط، مزامنة، تحليلات (خادم Meta وهمي محلي)', async () => {
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const ctx = await startApp({
      dataDir, secrets: testSecretBox(), showMainWindow: true,
      metaConfig: { graphBase: base, dialogBase: base, redirectPort: 0, version: 'v24.0' },
      openExternal: async (url) => { const u = new URL(url); void fetch(`${u.searchParams.get('redirect_uri')}?code=GOODCODE&state=${u.searchParams.get('state')}`); },
    });
    const wc = ctx.mainWindow.webContents;
    const ev = <T,>(code: string) => wc.executeJavaScript(code) as Promise<T>;
    const J = JSON.stringify;
    const until = async (fn: () => Promise<boolean>, what: string, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return; await wait(100); } throw new Error('انتهت المهلة: ' + what); };
    const click = (sel: string) => ev<boolean>(`(() => { const e = document.querySelector(${J(sel)}); if (!e || e.disabled) return false; e.click(); return true; })()`);
    const clickText = (text: string, scope = 'button') => ev<boolean>(`(() => { const e = [...document.querySelectorAll(${J(scope)})].find(b => b.textContent.trim().includes(${J(text)}) && !b.disabled); if (!e) return false; e.click(); return true; })()`);
    const type = (sel: string, v: string) => ev(`(() => { const e = document.querySelector(${J(sel)}); const proto = e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, ${J(v)}); e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`);
    const has = (sel: string) => ev<boolean>(`!!document.querySelector(${J(sel)})`);
    const body = () => ev<string>('document.body.innerText');
    const text = (sel: string) => ev<string>(`document.querySelector(${J(sel)})?.innerText ?? ''`);
    const nav = async (n: string) => { await click(`[data-nav=${n}]`); await wait(300); };
    const shot = async (n: string) => { await wait(500); writeFileSync(join(shots, n), (await wc.capturePage()).toPNG()); };

    await until(() => has('[data-nav=integrations]'), 'تحميل');
    ctx.svc.createBusiness({ name: 'متجر ميتا', category: 'متاجر', color: '#336699', notes: null });

    // ───── الحملات قبل أي ربط ─────
    await nav('campaigns');
    check((await body()).includes('لا توجد حسابات إعلانية مربوطة عبر Meta'), 'الحملات بلا ربط: رسالة صريحة بلا أرقام');
    check(!(await has('[data-testid=campaigns-table]')) && !(await has('[data-testid=totals]')), 'لا جدول ولا إجماليات بلا بيانات حقيقية');

    // ───── التكاملات ─────
    await nav('integrations');
    await until(() => has('#meta-appid'), 'صفحة التكاملات');
    check((await body()).includes('غير مُعدّ'), 'الحالة الابتدائية: غير مُعدّ');
    check(await ev<boolean>(`document.querySelector('[data-testid=meta-connect]').disabled`), 'زر تسجيل الدخول معطّل قبل حفظ بيانات التطبيق');
    await type('#meta-appid', APP_ID);
    await type('#meta-secret', APP_SECRET);
    await click('[data-testid=meta-save]');
    await until(async () => ctx.meta.status().configured, 'حفظ بيانات التطبيق');
    await until(async () => !(await ev<string>(`document.querySelector('#meta-secret').value`)), 'تفريغ حقل السر');
    check(true, 'حقل السر يُفرَّغ بعد الحفظ');
    await until(async () => !(await ev<boolean>(`document.querySelector('[data-testid=meta-connect]').disabled`)), 'تفعيل زر الربط');
    await click('[data-testid=meta-connect]');
    await until(() => has('[data-testid=meta-connections] li'), 'ظهور الاتصال');
    check((await body()).includes('مستخدم الاختبار') && (await body()).includes('نشط'), 'الاتصال ظاهر ونشط بعد OAuth');
    check((await body()).includes('متصل') && ctx.meta.listConnections().length === 1, 'حالة التكامل «متصل» بعد تفويض صالح');

    await clickText('اكتشاف الحسابات الإعلانية');
    await until(async () => (await ev<number>(`document.querySelectorAll('[data-testid=meta-accounts] tbody tr').length`)) === 3, 'اكتشاف 3 حسابات');
    check(true, 'اكتشاف 3 حسابات إعلانية مرقّمة');
    await ev(`(() => { const s = document.querySelector('select[aria-label="نشاط حساب المتجر"]'); const o = [...s.options].find(o => o.textContent.includes('متجر ميتا')); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, o.value); s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await until(() => ev<boolean>(`!![...document.querySelectorAll('[data-testid=meta-accounts] button')].find(b => b.textContent.trim() === 'ربط' && !b.disabled)`), 'تفعيل زر الربط');
    await ev(`[...document.querySelectorAll('[data-testid=meta-accounts] button')].find(b => b.textContent.trim() === 'ربط').click()`);
    await until(async () => ctx.svc.listAds().length === 1, 'ربط الحساب');
    check(ctx.svc.listAds()[0].connectionStatus === 'connected' && ctx.svc.listAds()[0].businessName === 'متجر ميتا', 'الحساب الإعلاني رُبط بالنشاط الصحيح');
    await shot('integrations.png');

    // ───── الحملات: مزامنة وعرض ─────
    await nav('campaigns');
    await until(() => has('#c-since'), 'صفحة الحملات');
    check((await body()).includes('لم تتم أي مزامنة بعد') && (await body()).includes('لا توجد حملات مخزّنة'), 'بعد الربط وقبل المزامنة: لا أرقام ولا حملات');
    await type('#c-since', '2026-10-01');
    await type('#c-until', '2026-10-10');
    await click('[data-testid=btn-sync]');
    await until(() => has('[data-testid=campaigns-table]'), 'جدول الحملات بعد المزامنة');
    check((await ev<number>(`document.querySelectorAll('[data-campaign]').length`)) === 3, 'ثلاث حملات حقيقية من الخادم');
    const row = await ev<string>(`document.querySelector('[data-campaign="حملة المبيعات"]').innerText`);
    check(row.includes('500') && row.includes('5.00%'), 'صف حملة المبيعات: 500 نقرة وCTR 5.00%');
    const tot = await ev<string>(`document.querySelector('[data-testid=totals]').innerText`);
    check(tot.includes('USD') && tot.includes('30'), 'الإجماليات حسب العملة (USD) مع 30 تحويلاً');
    check((await text('[data-testid=last-sync]')).includes('ناجحة'), 'آخر مزامنة: ناجحة');
    const split = await text('[data-testid=platform-split]');
    check(split.includes('فيسبوك') && split.includes('إنستغرام') && split.includes('87.00') && split.includes('58.00'), 'بطاقة الإنفاق حسب المنصة: فيسبوك 87 وإنستغرام 58');
    await ev(`document.querySelector('[data-campaign="حملة المبيعات"] button').click()`);
    await until(async () => (await body()).includes('مجموعة 1'), 'مجموعات الحملة');
    await clickText('مجموعة 1');
    await until(async () => (await body()).includes('إعلان 1'), 'إعلانات المجموعة');
    check(true, 'التنقل حملة ← مجموعة ← إعلان');
    await shot('campaigns.png');
    await type('#c-q', 'الوعي');
    await until(async () => (await ev<number>(`document.querySelectorAll('[data-campaign]').length`)) === 1, 'بحث');
    check(true, 'البحث بين الحملات يعمل');
    await type('#c-q', '');
    await type('#c-until', '2026-10-05');
    await wait(500);

    // ───── خطأ من Meta يُعرض بوضوح ─────
    mock.mode = 'rate';
    await click('[data-testid=btn-sync]');
    await until(async () => (await body()).includes('حد الطلبات'), 'رسالة حد المعدل');
    check(true, 'خطأ حد المعدل يظهر للمستخدم بالعربية');
    mock.mode = 'ok';

    // ───── انتهاء الرمز ─────
    ctx.svc.store.db.prepare('UPDATE meta_connections SET rate_limited_until=NULL').run();
    mock.mode = 'expired';
    await click('[data-testid=btn-sync]');
    await until(async () => ctx.meta.listConnections()[0].status === 'expired', 'تعليم الرمز منتهياً');
    await nav('integrations');
    await until(async () => (await body()).includes('منتهي الصلاحية') || (await body()).includes('منتهي'), 'عرض الانتهاء');
    check((await body()).includes('أعد الربط') || (await body()).includes('منتهي'), 'واجهة التكاملات تعرض انتهاء الصلاحية');
    mock.mode = 'ok';
    await nav('ads');
    check((await body()).includes('خطأ'), 'الحساب الإعلاني يعرض حالة «خطأ» بعد انتهاء الرمز');
    await shot('ads-expired.png');

    server.close();
    ctx.store.close();
  }),
);
