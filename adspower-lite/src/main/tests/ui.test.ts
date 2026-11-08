import { app } from 'electron';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startApp } from '../app';
import { check, run, testSecretBox } from './harness';

if (process.env.ADSLITE_USER_DATA) app.setPath('userData', process.env.ADSLITE_USER_DATA);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(() =>
  run('واجهة لوحة التحكم الحقيقية (React عبر IPC)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'adslite-ui-'));
    const ctx = await startApp({ dbFile: join(dir, 'ui.sqlite'), secrets: testSecretBox(), showMainWindow: true });
    const wc = ctx.mainWindow.webContents;
    const ev = <T,>(code: string) => wc.executeJavaScript(code) as Promise<T>;
    const click = (sel: string) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
    const until = async (fn: () => Promise<boolean>, what: string) => {
      for (let i = 0; i < 100; i++) { if (await fn()) return; await wait(100); }
      throw new Error('انتهت المهلة: ' + what);
    };
    // يكتب في حقل React متحكَّم به
    const type = (sel: string, v: string) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(e.constructor.prototype, 'value').set; set.call(e, ${JSON.stringify(v)}); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const rows = () => ev<number>(`document.querySelectorAll('tbody tr').length`);

    await until(async () => (await ev<boolean>(`!!document.querySelector('h1')`)), 'تحميل الواجهة');
    check((await ev<string>('document.documentElement.dir')) === 'rtl' && (await ev<string>('document.documentElement.lang')) === 'ar', 'الواجهة عربية RTL');
    check((await ev<string>('typeof window.require + typeof window.process')) === 'undefinedundefined', 'لا require ولا process في الواجهة (nodeIntegration معطّل)');
    check((await ev<string>('typeof window.api.createProfile')) === 'function', 'واجهة IPC المكشوفة عبر contextBridge');
    check(wc.getURL().includes('index.html'), 'تحميل واجهة البناء النهائي');

    // إنشاء تصنيف من الواجهة
    await click('button.btn-ghost.w-full'); // إدارة التصنيفات
    await until(() => ev<boolean>(`!!document.querySelector('#grp-name')`), 'نافذة التصنيفات');
    await type('#grp-name', 'متاجر');
    await click('form button[type=submit]');
    await until(async () => (await ctx.service.listGroups()).length === 1, 'تصنيف في القاعدة');
    check(ctx.service.listGroups()[0].name === 'متاجر', 'تصنيف أُنشئ من الواجهة وخُزّن في SQLite');
    await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);
    await until(() => ev<boolean>(`!document.querySelector('[role=dialog]')`), 'إغلاق النافذة');

    // إنشاء ملفين من الواجهة
    for (const [name, url] of [['حساب المتجر', 'http://127.0.0.1:9/'], ['حساب الإعلانات', '']] as const) {
      await ev(`[...document.querySelectorAll('header button')].find(b => b.textContent.includes('ملف جديد')).click()`);
      await until(() => ev<boolean>(`!!document.querySelector('#pf-name')`), 'نموذج الملف');
      await type('#pf-name', name);
      if (url) await type('#pf-url', url);
      await ev(`document.querySelector('#pf-group').value = '${ctx.service.listGroups()[0].id}'; document.querySelector('#pf-group').dispatchEvent(new Event('change', {bubbles:true}))`);
      await click('[role=dialog] button[type=submit]');
      await until(async () => !(await ev<boolean>(`!!document.querySelector('[role=dialog]')`)), 'إغلاق نموذج الملف');
    }
    await until(async () => (await rows()) === 2, 'صفان في الجدول');
    check(ctx.service.list({ query: '', group: 'all' }).length === 2, 'الملفان أُنشئا في SQLite عبر IPC');

    // البحث
    await type('input[aria-label="بحث"]', 'الإعلانات');
    await until(async () => (await rows()) === 1, 'نتيجة بحث واحدة');
    check((await ev<string>(`document.querySelector('tbody tr').dataset.profile`)) === 'حساب الإعلانات', 'البحث يعمل');
    await type('input[aria-label="بحث"]', '');
    await until(async () => (await rows()) === 2, 'عودة الصفين');

    // تشغيل حقيقي من زر الواجهة
    await click('button[aria-label="تشغيل حساب المتجر"]');
    await until(async () => ctx.browser.runningIds().length === 1, 'نافذة الملف فُتحت');
    await until(() => ev<boolean>(`document.querySelector('tr[data-profile="حساب المتجر"] [data-status]').dataset.status === 'running'`), 'الواجهة تعرض "يعمل"');
    check(!!ctx.browser.contentsOf(ctx.service.list({ query: 'المتجر', group: 'all' })[0].id), 'زر التشغيل فتح BrowserWindow حقيقياً');
    check(ctx.service.list({ query: 'المتجر', group: 'all' })[0].lastOpenedAt !== null, 'تسجيل آخر تشغيل');
    await wait(500);
    const png = await wc.capturePage();
    writeFileSync(join(process.env.ADSLITE_SHOT_DIR ?? dir, 'dashboard.png'), png.toPNG());

    // إغلاق من زر الواجهة
    await click('button[aria-label="إغلاق حساب المتجر"]');
    await until(async () => ctx.browser.runningIds().length === 0, 'إغلاق النافذة');
    await until(() => ev<boolean>(`document.querySelector('tr[data-profile="حساب المتجر"] [data-status]').dataset.status === 'stopped'`), 'الواجهة تعرض "متوقف"');
    check(true, 'زر الإغلاق أغلق النافذة وحُدّثت الحالة');

    // حذف مع تأكيد
    await click('button[aria-label="حذف حساب المتجر"]');
    await until(() => ev<boolean>(`!!document.querySelector('[data-testid=confirm-yes]')`), 'نافذة تأكيد الحذف');
    await click('[data-testid=confirm-yes]');
    await until(async () => (await rows()) === 1, 'صف واحد بعد الحذف');
    check(ctx.service.list({ query: '', group: 'all' }).length === 1, 'الحذف نفّذ في SQLite');
    ctx.db.close();
  }),
);
