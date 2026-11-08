import { app } from 'electron';
import { createServer as createHttp, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProfileInput } from '../../shared/types';
import { BrowserManager } from '../browser';
import { openDatabase } from '../db';
import { ProfileService } from '../profiles';
import { parseProfileInput } from '../validate';
import { check, run, testSecretBox } from './harness';

if (process.env.ADSLITE_USER_DATA) app.setPath('userData', process.env.ADSLITE_USER_DATA);

const base: ProfileInput = { name: '', groupId: null, notes: '', startUrl: '', userAgent: '', proxyType: 'none', proxyHost: '', proxyPort: null, proxyUsername: '' };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean | Promise<boolean>, what: string, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) { if (await fn()) return; await wait(100); }
  throw new Error('انتهت المهلة: ' + what);
}

app.on('window-all-closed', () => undefined); // الاختبار بلا لوحة تحكم
app.whenReady().then(() =>
  run('عزل الجلسات بين ملفين + بروكسي بمصادقة + User-Agent', async () => {
    // خادم ويب محلي: يعرض User-Agent المستلم
    const web = createHttp((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><title>t</title><body>ua:${req.headers['user-agent']}</body>`);
    });
    await new Promise<void>((r) => web.listen(0, '127.0.0.1', r));
    const origin = `http://127.0.0.1:${(web.address() as AddressInfo).port}/`;

    // بروكسي HTTP محلي حقيقي يطلب مصادقة Basic (407)
    const seen: string[] = [];
    const proxy = createHttp((req: IncomingMessage, res: ServerResponse) => {
      const auth = req.headers['proxy-authorization'];
      seen.push(auth ? 'auth' : 'noauth');
      const expected = 'Basic ' + Buffer.from('proxyuser:p@ss-w0rd').toString('base64');
      if (auth !== expected) {
        res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="t"', 'Content-Type': 'text/plain' });
        res.end('auth required');
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><title>p</title><body>via-proxy:${req.url}</body>`);
    });
    await new Promise<void>((r) => proxy.listen(0, '127.0.0.1', r));
    const proxyPort = (proxy.address() as AddressInfo).port;

    const dir = mkdtempSync(join(tmpdir(), 'adslite-iso-'));
    const service = new ProfileService(openDatabase(join(dir, 'iso.sqlite')), testSecretBox());
    const browser = new BrowserManager(service, {
      barPreload: join(__dirname, 'preload-bar.cjs'),
      loadBar: (wc) => wc.loadURL('about:blank'),
      onChange: () => undefined,
    });
    browser.registerAppHandlers();

    const A = await service.create(parseProfileInput({ ...base, name: 'A', startUrl: origin, userAgent: 'AdsLiteTest/A' }));
    const B = await service.create(parseProfileInput({ ...base, name: 'B', startUrl: origin, userAgent: 'AdsLiteTest/B' }));
    const C = await service.create(parseProfileInput({ ...base, name: 'C', startUrl: origin }));

    await browser.launch(A.id);
    await browser.launch(B.id);
    const wa = browser.contentsOf(A.id)!;
    const wb = browser.contentsOf(B.id)!;
    check(!!wa && !!wb && wa !== wb, 'نافذتان مستقلتان تعملان معاً');
    check(browser.runningIds().length === 2, 'مدير التشغيل يعرف الملفين');
    await until(() => !wa.isLoading() && !wb.isLoading() && wa.getURL() === origin && wb.getURL() === origin, 'تحميل الصفحتين');
    check(wa.session !== wb.session, 'جلستان (Session) مختلفتان');
    check(wa.session.storagePath !== wb.session.storagePath && String(wa.session.storagePath).includes(A.id), 'كل ملف له مجلد تخزين دائم خاص');

    const ev = <T,>(wc: Electron.WebContents, code: string) => wc.executeJavaScript(code) as Promise<T>;
    check((await ev<string>(wa, 'document.body.textContent')) === 'ua:AdsLiteTest/A', 'User-Agent الملف A مطبّق');
    check((await ev<string>(wb, 'document.body.textContent')) === 'ua:AdsLiteTest/B', 'User-Agent الملف B مطبّق');

    // كتابة بيانات في A فقط
    await ev(wa, `document.cookie='sid=secret-A; max-age=3600; path=/'; localStorage.setItem('k','value-A'); sessionStorage.setItem('s','x'); indexedDB.open('db-A',1); 1`);
    check((await ev<string>(wa, 'document.cookie')) === 'sid=secret-A', 'A يرى كوكيزه');
    check((await ev<string>(wa, `localStorage.getItem('k')`)) === 'value-A', 'A يرى تخزينه المحلي');
    check((await ev<string>(wb, 'document.cookie')) === '', 'B لا يرى كوكيز A');
    check((await ev<string | null>(wb, `localStorage.getItem('k')`)) === null, 'B لا يرى localStorage الخاص بـ A');
    check((await ev<number>(wb, `indexedDB.databases().then(d => d.length)`)) === 0, 'B لا يرى قواعد IndexedDB الخاصة بـ A');

    // كتابة قيمة مختلفة في B ثم التأكد من عدم التداخل
    await ev(wb, `document.cookie='sid=secret-B; max-age=3600; path=/'; localStorage.setItem('k','value-B'); 1`);
    check((await ev<string>(wa, 'document.cookie')) === 'sid=secret-A' && (await ev<string>(wa, `localStorage.getItem('k')`)) === 'value-A', 'قيم A لم تتأثر بالكتابة في B');
    const cookiesA = await wa.session.cookies.get({});
    const cookiesB = await wb.session.cookies.get({});
    check(cookiesA.length === 1 && cookiesA[0].value === 'secret-A' && cookiesB.length === 1 && cookiesB[0].value === 'secret-B', 'مخزن الكوكيز لكل جلسة منفصل');

    // ملف ثالث لم يُلمس: يجب أن يكون نظيفاً تماماً
    await browser.launch(C.id);
    const wc = browser.contentsOf(C.id)!;
    await until(() => !wc.isLoading() && wc.getURL() === origin, 'تحميل C');
    check((await ev<string>(wc, 'document.cookie')) === '' && (await ev<string | null>(wc, `localStorage.getItem('k')`)) === null, 'ملف ثالث نظيف بالكامل');
    browser.close(C.id);

    // الاستمرارية: إغلاق A ثم إعادة تشغيله يحتفظ بالبيانات (جلسة دائمة)
    await wa.session.cookies.flushStore();
    browser.close(A.id);
    await until(() => !browser.isRunning(A.id), 'إغلاق A');
    check(browser.isRunning(B.id), 'إغلاق A لا يغلق B');
    await browser.launch(A.id);
    const wa2 = browser.contentsOf(A.id)!;
    await until(() => !wa2.isLoading() && wa2.getURL() === origin, 'إعادة تحميل A');
    check((await ev<string>(wa2, 'document.cookie')) === 'sid=secret-A' && (await ev<string>(wa2, `localStorage.getItem('k')`)) === 'value-A', 'A يحتفظ ببياناته بعد الإغلاق وإعادة التشغيل');
    check((await ev<string>(wb, 'document.cookie')) === 'sid=secret-B', 'B ما زال يحتفظ ببياناته');

    // أمر الإغلاق عبر المدير + حذف الجلسة
    console.log('  .. wipe A'); await browser.wipeSession(A.id);
    await until(() => !browser.isRunning(A.id), 'wipe يغلق A');
    const fresh = await service.create(parseProfileInput({ ...base, name: 'D', startUrl: origin }));
    browser.close(B.id);
    await until(() => browser.runningIds().length === 0, 'إغلاق B');
    void fresh;

    // بروكسي بمصادقة: كلمة المرور مخزّنة مشفّرة وتُرسل فقط عبر حدث login
    const P = await service.create(parseProfileInput({ ...base, name: 'P', startUrl: 'http://proxied.test/page', proxyType: 'http', proxyHost: '127.0.0.1', proxyPort: proxyPort, proxyUsername: 'proxyuser', proxyPassword: 'p@ss-w0rd' }));
    console.log('  .. launch P'); await browser.launch(P.id);
    const wp = browser.contentsOf(P.id)!;
    await until(async () => !wp.isLoading() && (await wp.executeJavaScript('document.body.textContent')).startsWith('via-proxy:'), 'الصفحة عبر البروكسي');
    check((await wp.executeJavaScript('document.body.textContent')) === 'via-proxy:http://proxied.test/page', 'الطلب مرّ عبر البروكسي المضبوط للملف');
    check(seen.includes('noauth') && seen.includes('auth'), 'تحدّي 407 ثم إعادة المحاولة بالاعتماد المخزّن');
    browser.close(P.id);

    // اعتماد خاطئ: لا حلقة لا نهائية
    const bad = await service.create(parseProfileInput({ ...base, name: 'Bad', startUrl: 'http://proxied.test/x', proxyType: 'http', proxyHost: '127.0.0.1', proxyPort, proxyUsername: 'proxyuser', proxyPassword: 'wrong' }));
    seen.length = 0;
    await browser.launch(bad.id);
    await wait(3000);
    check(seen.length <= 8, `اعتماد خاطئ: توقفت المحاولات (${seen.length} طلبات)`);
    browser.close(bad.id);
    await until(() => browser.runningIds().length === 0, 'إغلاق الكل');

    web.close();
    proxy.close();
  }),
);
