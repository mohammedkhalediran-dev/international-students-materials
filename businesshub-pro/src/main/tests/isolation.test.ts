import { app, session } from 'electron';
import { createServer as createHttp } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { BusinessInput, ProfileInput, ProxyInput } from '../../shared/contract';
import { AuditLog } from '../audit';
import { BrowserManager, sessionPartition } from '../browser';
import { Services } from '../services';
import { Store } from '../store';
import { check, run, testSecretBox } from './harness';

/**
 * المرحلة 1: ينشئ نشاطاً وثلاثة ملفات، يكتب بيانات في A وB فقط، ويتحقق من العزل، ثم تنتهي العملية.
 * المرحلة 2 (عملية جديدة = إعادة تشغيل): يتحقق أن البيانات والجلسات باقية، وأن C ما زال نظيفاً.
 * ملاحظة: سر البروكسي في هذا الاختبار يستخدم صندوق AES تجريبياً بمفتاح عشوائي لكل عملية، لذلك اختبار البروكسي بالمصادقة في المرحلة 1 فقط.
 */
const phase = process.env.ISO_PHASE ?? '1';
const dataDir = process.env.BUSINESSHUB_DATA_DIR!;
app.setPath('userData', dataDir);
app.on('window-all-closed', () => undefined);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean | Promise<boolean>, what: string, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) { if (await fn()) return; await wait(100); }
  throw new Error('انتهت المهلة: ' + what);
}
const ev = <T,>(wc: Electron.WebContents, code: string) => wc.executeJavaScript(code) as Promise<T>;

// منفذ ثابت عبر المرحلتين: localStorage مرتبط بالأصل (origin) فيجب أن يبقى نفسه بعد إعادة التشغيل.
const WEB_PORT = 47631;

app.whenReady().then(() =>
  run(`عزل الجلسات — المرحلة ${phase}`, async () => {
    const web = createHttp((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><title>t</title><body>ok ${req.url}</body>`);
    });
    await new Promise<void>((r) => web.listen(WEB_PORT, '127.0.0.1', r));
    const origin = `http://127.0.0.1:${WEB_PORT}/`;

    const store = new Store(join(dataDir, 'businesshub.sqlite'), join(dataDir, 'backups'));
    const svc = new Services(store, testSecretBox(), new AuditLog(store));
    const browser = new BrowserManager(svc, { barPreload: join(__dirname, 'preload-bar.cjs'), loadBar: (wc) => wc.loadURL('about:blank'), onChange: () => undefined });
    browser.registerAppHandlers();

    let ids: { A: string; B: string; C: string };
    if (phase === '1') {
      const b = svc.createBusiness(BusinessInput.parse({ name: 'اختبار العزل', category: 'اختبار', color: '#123456' }));
      const mk = (name: string) => svc.createProfile(ProfileInput.parse({ businessId: b.id, name, homeUrl: origin })).id;
      ids = { A: mk('A'), B: mk('B'), C: mk('C') };
    } else {
      const list = svc.listProfiles({});
      const byName = (n: string) => list.find((p) => p.name === n)!.id;
      ids = { A: byName('A'), B: byName('B'), C: byName('C') };
      check(list.length === 3, 'بقيت بيانات الملفات الوصفية بعد إعادة التشغيل');
    }
    const open = async (id: string) => {
      await browser.launch(id);
      const wc = browser.contentsOf(id)!;
      await until(() => !wc.isLoading() && wc.getURL() === origin, 'تحميل الصفحة');
      return wc;
    };

    if (phase === '1') {
      const wa = await open(ids.A);
      const wb = await open(ids.B);
      check(wa !== wb && browser.runningIds().length === 2, 'نافذتان مستقلتان تعملان معاً');
      check(wa.session !== wb.session, 'جلستان مختلفتان');
      const pa = svc.getProfile(ids.A)!;
      check(String(wa.session.storagePath).includes(pa.partitionId), 'مجلد تخزين دائم خاص بـ partitionId الملف');
      check(svc.getProfile(ids.A)!.lastOpenedAt !== null, 'تسجيل آخر فتح');

      await ev(wa, `document.cookie='sid=secret-A; max-age=86400; path=/'; localStorage.setItem('k','value-A'); 1`);
      check((await ev<string>(wa, 'document.cookie')) === 'sid=secret-A', 'A يرى كوكيزه');
      check((await ev<string>(wb, 'document.cookie')) === '' && (await ev<string | null>(wb, `localStorage.getItem('k')`)) === null, 'B لا يرى كوكيز/تخزين A');
      await ev(wb, `document.cookie='sid=secret-B; max-age=86400; path=/'; localStorage.setItem('k','value-B'); 1`);
      check((await ev<string>(wa, 'document.cookie')) === 'sid=secret-A' && (await ev<string>(wa, `localStorage.getItem('k')`)) === 'value-A', 'الكتابة في B لم تؤثر على A');
      const [ca, cb] = [await wa.session.cookies.get({}), await wb.session.cookies.get({})];
      check(ca.length === 1 && ca[0].value === 'secret-A' && cb.length === 1 && cb[0].value === 'secret-B', 'مخزن الكوكيز منفصل لكل جلسة');

      const wc = await open(ids.C);
      check((await ev<string>(wc, 'document.cookie')) === '' && (await ev<string | null>(wc, `localStorage.getItem('k')`)) === null, 'ملف ثالث نظيف');
      browser.close(ids.C);
      await until(() => !browser.isRunning(ids.C), 'إغلاق C');

      // فتح رابط خارجي داخل ملف محدد
      await browser.openUrlIn(ids.A, `${origin}external`);
      await until(() => wa.getURL().endsWith('/external'), 'فتح رابط داخل A');
      check(wa.getURL().endsWith('/external'), 'فتح رابط خارجي داخل الملف المحدد');
      let rejected = false;
      try { await browser.openUrlIn(ids.A, 'file:///etc/passwd'); } catch { rejected = true; }
      check(rejected, 'رفض فتح رابط file:');

      // إغلاق/إعادة تشغيل داخل نفس العملية
      await wa.session.cookies.flushStore();
      browser.close(ids.A);
      await until(() => !browser.isRunning(ids.A), 'إغلاق A');
      check(browser.isRunning(ids.B), 'إغلاق A لا يغلق B');
      const wa2 = await open(ids.A);
      check((await ev<string>(wa2, 'document.cookie')) === 'sid=secret-A', 'A يحتفظ ببياناته بعد إغلاقه وإعادة فتحه');

      // بروكسي حقيقي بمصادقة 407
      const seen: string[] = [];
      const proxy = createHttp((req, res) => {
        const auth = req.headers['proxy-authorization'];
        seen.push(auth ? 'auth' : 'noauth');
        if (auth !== 'Basic ' + Buffer.from('proxyuser:p@ss-w0rd').toString('base64')) { res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="t"' }); res.end('x'); return; }
        res.setHeader('Content-Type', 'text/html'); res.end(`<!doctype html><body>via-proxy:${req.url}</body>`);
      });
      await new Promise<void>((r) => proxy.listen(0, '127.0.0.1', r));
      const pport = (proxy.address() as AddressInfo).port;
      const biz = svc.listBusinesses({ status: 'all' })[0];
      const px = await svc.createProxy(ProxyInput.parse({ name: 'محلي', scheme: 'http', host: '127.0.0.1', port: pport, username: 'proxyuser', password: 'p@ss-w0rd' }));
      const P = svc.createProfile(ProfileInput.parse({ businessId: biz.id, name: 'P', homeUrl: 'http://proxied.test/page', proxyId: px.id }));
      await browser.launch(P.id);
      const wp = browser.contentsOf(P.id)!;
      await until(async () => !wp.isLoading() && (await ev<string>(wp, 'document.body.textContent')).startsWith('via-proxy:'), 'الصفحة عبر البروكسي');
      check((await ev<string>(wp, 'document.body.textContent')) === 'via-proxy:http://proxied.test/page', 'الطلب مرّ عبر البروكسي المخصص للملف');
      check(seen.includes('noauth') && seen.includes('auth'), 'تحدّي 407 ثم المصادقة بالسر المخزّن مشفّراً');
      browser.close(P.id);
      await until(() => !browser.isRunning(P.id), 'إغلاق P');
      svc.deleteProfile(P.id);
      svc.deleteProxy(px.id);
      proxy.close();

      // بيانات سيتحقق منها بعد إعادة التشغيل
      await wb.session.cookies.flushStore();
      await wb.session.flushStorageData();
      await wa2.session.flushStorageData();
      browser.closeAll();
      await until(() => browser.runningIds().length === 0, 'إغلاق الكل');
      await wait(500);
    } else {
      check(browser.runningIds().length === 0, 'لا نوافذ مفتوحة عند الإقلاع (لا تُستعاد تلقائياً)');
      const wa = await open(ids.A);
      const wb = await open(ids.B);
      check((await ev<string>(wa, 'document.cookie')) === 'sid=secret-A' && (await ev<string>(wa, `localStorage.getItem('k')`)) === 'value-A', 'بعد إعادة تشغيل التطبيق: جلسة A (كوكيز + localStorage) باقية');
      check((await ev<string>(wb, 'document.cookie')) === 'sid=secret-B' && (await ev<string>(wb, `localStorage.getItem('k')`)) === 'value-B', 'بعد إعادة تشغيل التطبيق: جلسة B باقية ومنفصلة');
      const wc = await open(ids.C);
      check((await ev<string>(wc, 'document.cookie')) === '' && (await ev<string | null>(wc, `localStorage.getItem('k')`)) === null, 'جلسة C ما زالت نظيفة');
      check(wa.session !== wb.session && session.fromPartition(sessionPartition(svc.getProfile(ids.A)!.partitionId)) === wa.session, 'نفس partitionId يعيد نفس الجلسة');

      // حذف الملف يمسح بياناته فعلاً
      const profA = svc.getProfile(ids.A)!;
      await browser.wipeSession(profA);
      svc.deleteProfile(ids.A);
      await until(() => !browser.isRunning(ids.A), 'إغلاق A بعد المسح');
      const again = svc.createProfile(ProfileInput.parse({ businessId: profA.businessId, name: 'A2', homeUrl: origin }));
      const wa3 = await open(again.id);
      check((await ev<string>(wa3, 'document.cookie')) === '', 'ملف جديد لا يرث بيانات الملف المحذوف');
      const leftover = await session.fromPartition(sessionPartition(profA.partitionId)).cookies.get({});
      check(leftover.length === 0, 'حذف الملف مسح كوكيز جلسته');
      browser.closeAll();
      await until(() => browser.runningIds().length === 0, 'إغلاق الكل');
    }
    web.close();
    store.close();
  }),
);
