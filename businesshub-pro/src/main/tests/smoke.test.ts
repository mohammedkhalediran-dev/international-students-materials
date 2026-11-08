import { app } from 'electron';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startApp } from '../app';
import { check, run, testSecretBox } from './harness';

const dataDir = process.env.BUSINESSHUB_DATA_DIR ?? mkdtempSync(join(tmpdir(), 'bh-smoke-'));
app.setPath('userData', dataDir);
const shots = process.env.BH_SHOT_DIR ?? dataDir;
mkdirSync(shots, { recursive: true });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(() =>
  run('اختبار الإقلاع والواجهة الحقيقية (React + IPC + SQLite)', async () => {
    let backupPath = '';
    const ctx = await startApp({
      dataDir, secrets: testSecretBox(), showMainWindow: true,
      dialogs: { pickBackupSave: async (def) => (backupPath = def), pickRestoreOpen: async () => backupPath },
    });
    const wc = ctx.mainWindow.webContents;
    const ev = <T,>(code: string) => wc.executeJavaScript(code) as Promise<T>;
    const until = async (fn: () => Promise<boolean>, what: string, ms = 15000) => {
      const t = Date.now();
      while (Date.now() - t < ms) { if (await fn()) return; await wait(100); }
      throw new Error('انتهت المهلة: ' + what);
    };
    const J = JSON.stringify;
    const click = (sel: string) => ev<boolean>(`(() => { const e = document.querySelector(${J(sel)}); if (!e) return false; e.click(); return true; })()`);
    const clickText = (text: string, scope = 'button') => ev<boolean>(`(() => { const e = [...document.querySelectorAll(${J(scope)})].find(b => b.textContent.trim().includes(${J(text)}) && !b.disabled); if (!e) return false; e.click(); return true; })()`);
    const type = (sel: string, v: string) => ev(`(() => { const e = document.querySelector(${J(sel)}); const proto = e.tagName === 'SELECT' ? HTMLSelectElement.prototype : e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, ${J(v)}); e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`);
    const text = (sel: string) => ev<string>(`document.querySelector(${J(sel)})?.textContent ?? ''`);
    const nav = async (name: string) => { await click(`[data-nav=${name}]`); await wait(300); };
    const shot = async (name: string) => { await wait(400); writeFileSync(join(shots, name), (await wc.capturePage()).toPNG()); };
    const noDialog = () => ev<boolean>(`!document.querySelector('[role=dialog]')`);

    await until(() => ev<boolean>(`!!document.querySelector('[data-testid=count-businesses]')`), 'تحميل لوحة النظرة العامة');

    // ───── الأمان والبنية ─────
    check((await ev<string>('document.documentElement.dir')) === 'rtl' && (await ev<string>('document.documentElement.lang')) === 'ar', 'الواجهة عربية RTL');
    check((await ev<string>('typeof window.require + typeof window.process + typeof window.Buffer')) === 'undefinedundefinedundefined', 'لا require/process/Buffer في الواجهة');
    check((await ev<string>('Object.keys(window.api).sort().join()')) === 'call,onRunningChanged', 'واجهة preload ضيقة (call + onRunningChanged فقط)');
    const bad = await ev<{ ok: boolean; error?: string }>(`window.api.call('shell:exec', { cmd: 'calc' })`);
    check(!bad.ok, 'قناة غير مسموحة تُرفض في preload');
    const badIn = await ev<{ ok: boolean; error?: string }>(`window.api.call('businesses:create', { name: '', category: 'x', color: 'red' })`);
    check(!badIn.ok && !!badIn.error, `مدخل غير صالح يُرفض في العملية الرئيسية (${badIn.error})`);
    const badUuid = await ev<{ ok: boolean }>(`window.api.call('profiles:launch', { id: '../../etc/passwd' })`);
    check(!badUuid.ok, 'معرّف غير UUID يُرفض');
    const html = readFileSync(join(__dirname, '..', 'dist-renderer', 'index.html'), 'utf8');
    check(html.includes('Content-Security-Policy') && html.includes("script-src 'self'"), 'سياسة CSP صارمة في صفحة البناء');
    check(wc.getURL().includes('dist-renderer/index.html') || wc.getURL().includes('index.html'), 'تحميل واجهة البناء النهائي');

    // ───── نظرة عامة فارغة: لا أرقام وهمية ─────
    check((await text('[data-testid=count-businesses]')) === '0' && (await text('[data-testid=count-social]')) === '0' && (await text('[data-testid=count-campaigns]')) === '0', 'القاعدة الفارغة تعرض أصفاراً حقيقية');
    check((await ev<number>(`document.querySelectorAll('[data-testid=integrations] li').length`)) === 3 && (await text('[data-testid=integrations]')).split('غير مُعدّ').length === 4, 'ثلاثة تكاملات كلها «غير مُعدّ» (لا اتصال مدّعى)');

    // ───── بيانات تجريبية (اختيارية) عبر الإعدادات ─────
    await nav('settings');
    check(await click('[data-testid=btn-seed]'), 'زر البيانات التجريبية موجود');
    await until(() => ev<boolean>(`!!document.querySelector('[data-testid=confirm-yes]')`), 'تأكيد الإضافة');
    await click('[data-testid=confirm-yes]');
    await until(async () => ctx.svc.overview().counts.businesses === 30, 'إضافة 30 نشاطاً');
    check(ctx.svc.overview().counts.socialAccounts === 120, '30 نشاطاً و120 حساباً اجتماعياً عبر الواجهة');
    await nav('overview');
    await until(async () => (await text('[data-testid=count-businesses]')) === '30', 'تحديث العدّاد');
    check((await text('[data-testid=count-social]')) === '120', 'النظرة العامة تعرض 30 و120 من SQLite');
    await shot('overview.png');

    // ───── الأنشطة: بحث، تصفية، إنشاء، أرشفة ─────
    await nav('businesses');
    await until(async () => (await ev<number>(`document.querySelectorAll('[data-business]').length`)) === 30, '30 بطاقة');
    await type('input[aria-label="بحث"]', 'نشاط 7');
    await until(async () => (await ev<number>(`document.querySelectorAll('[data-business]').length`)) === 1, 'نتيجة بحث واحدة');
    check(true, 'البحث في الأنشطة يعمل');
    await type('input[aria-label="بحث"]', '');
    await type('select[aria-label="الفئة"]', 'مطاعم');
    await until(async () => (await ev<number>(`document.querySelectorAll('[data-business]').length`)) === 5, 'تصفية الفئة');
    check(true, 'تصفية الفئة تعمل');
    await type('select[aria-label="الفئة"]', '');
    await clickText('قائمة');
    await until(() => ev<boolean>(`!!document.querySelector('[data-testid=businesses-list]')`), 'عرض القائمة');
    check(true, 'التبديل بين الشبكة والقائمة');
    await clickText('شبكة');

    await clickText('نشاط جديد');
    await until(() => ev<boolean>(`!!document.querySelector('#f-name')`), 'نموذج النشاط');
    await click('[data-testid=form-submit]');
    await wait(300);
    check(ctx.svc.listBusinesses({ status: 'all', query: 'متجر القهوة' }).length === 0, 'نموذج فارغ لا ينشئ شيئاً');
    await type('#f-name', 'متجر القهوة');
    await type('#f-category', 'مطاعم');
    await click('[data-testid=form-submit]');
    await until(async () => ctx.svc.listBusinesses({ status: 'all', query: 'متجر القهوة' }).length === 1, 'إنشاء نشاط من الواجهة');
    await until(noDialog, 'إغلاق النموذج');
    check(true, 'إنشاء نشاط من الواجهة وتخزينه في SQLite');

    await clickText('نشاط جديد');
    await until(() => ev<boolean>(`!!document.querySelector('#f-name')`), 'نموذج مكرر');
    await type('#f-name', 'متجر القهوة'); await type('#f-category', 'x');
    await click('[data-testid=form-submit]');
    await until(() => ev<boolean>(`!!document.querySelector('[data-testid=form-error]')`), 'رسالة تكرار');
    check((await text('[data-testid=form-error]')).includes('بنفس الاسم'), 'الواجهة تعرض خطأ تكرار الاسم');
    await clickText('إلغاء');
    await until(noDialog, 'إغلاق');

    // أرشفة
    await type('input[aria-label="بحث"]', 'متجر القهوة');
    await until(async () => (await ev<number>(`document.querySelectorAll('[data-business]').length`)) === 1, 'ظهور المتجر');
    await clickText('أرشفة');
    await until(async () => ctx.svc.listBusinesses({ status: 'archived' }).length === 1, 'أرشفة');
    await type('select[aria-label="الحالة"]', 'archived');
    await until(async () => (await ev<number>(`document.querySelectorAll('[data-business]').length`)) === 1, 'ظهور في المؤرشفة');
    check(true, 'الأرشفة والتصفية حسب الحالة');
    await clickText('إلغاء الأرشفة');
    await until(async () => ctx.svc.listBusinesses({ status: 'archived' }).length === 0, 'إلغاء الأرشفة');
    await type('select[aria-label="الحالة"]', 'active');

    // ───── حذف مدمّر بتأكيد كتابي ─────
    await until(async () => (await ev<number>(`document.querySelectorAll('[data-business]').length`)) === 1, 'بطاقة المتجر');
    check(!(await click('button[aria-label="حذف نهائي متجر القهوة"]')), 'لا زر حذف نهائي لنشاط نشط (الأرشفة هي الافتراضي)');
    await click('button[aria-label="أرشفة متجر القهوة"]');
    await until(async () => ctx.svc.listBusinesses({ status: 'archived' }).length === 1, 'أرشفة قبل الحذف');
    await type('select[aria-label="الحالة"]', 'archived');
    await until(() => ev<boolean>(`!!document.querySelector('button[aria-label="حذف نهائي متجر القهوة"]')`), 'ظهور زر الحذف النهائي في المؤرشفة');
    await click('button[aria-label="حذف نهائي متجر القهوة"]');
    await until(() => ev<boolean>(`!!document.querySelector('#confirm-typed')`), 'حوار تأكيد الحذف');
    check(await ev<boolean>(`document.querySelector('[data-testid=confirm-yes]').disabled`), 'زر الحذف معطّل قبل كتابة الاسم');
    await type('#confirm-typed', 'خطأ');
    check(await ev<boolean>(`document.querySelector('[data-testid=confirm-yes]').disabled`), 'يبقى معطّلاً مع اسم خاطئ');
    await type('#confirm-typed', 'متجر القهوة');
    await click('[data-testid=confirm-yes]');
    await until(async () => ctx.svc.listBusinesses({ status: 'all', query: 'متجر القهوة' }).length === 0, 'حذف النشاط');
    check(true, 'الحذف يتطلب كتابة اسم النشاط حرفياً');
    await type('select[aria-label="الحالة"]', 'active');

    // ───── تفاصيل النشاط: تبويبات المنصات + ملف متصفح + تشغيل/إغلاق ─────
    await type('input[aria-label="بحث"]', 'نشاط 1');
    await wait(500);
    await click('[data-business="[تجريبي] نشاط 1"]');
    await until(() => ev<boolean>(`!!document.querySelector('[role=tablist]')`), 'صفحة التفاصيل');
    check((await ev<number>(`document.querySelectorAll('[role=tab]').length`)) === 4, 'أربعة تبويبات للمنصات');
    await clickText('فيسبوك', '[role=tab]');
    await until(async () => (await text('[data-testid=platform-accounts]')).includes('facebook'), 'حسابات فيسبوك');
    check((await ev<number>(`document.querySelectorAll('[data-testid=platform-accounts] li').length`)) === 1, 'تبويب فيسبوك يعرض حسابه فقط');
    check((await ev<string>(`document.body.innerText`)).includes('لا توجد حملات'), 'قسم الحملات يوضح عدم وجود حملات/اتصال');
    await shot('business-detail.png');

    const biz = ctx.svc.listBusinesses({ status: 'active', query: 'نشاط 1' }).find((b) => b.name === '[تجريبي] نشاط 1')!;
    await clickText('ملف متصفح', 'button');
    await until(() => ev<boolean>(`!!document.querySelector('#f-name')`), 'نموذج الملف');
    await type('#f-name', 'ملف واجهة');
    await click('[data-testid=form-submit]');
    await until(async () => ctx.svc.listProfiles({ businessId: biz.id }).length === 1, 'إنشاء ملف من الواجهة');
    await until(noDialog, 'إغلاق');
    await click('button[aria-label="تشغيل ملف واجهة"]');
    await until(async () => ctx.browser.runningIds().length === 1, 'نافذة الملف');
    await until(() => ev<boolean>(`document.querySelector('tr[data-profile="ملف واجهة"] [data-status]')?.dataset.status === 'running'`), 'عرض «يعمل»');
    check(ctx.svc.listProfiles({ businessId: biz.id })[0].lastOpenedAt !== null, 'زر التشغيل فتح نافذة حقيقية وسجّل آخر فتح');
    await click('button[aria-label="إغلاق ملف واجهة"]');
    await until(async () => ctx.browser.runningIds().length === 0, 'إغلاق');
    await until(() => ev<boolean>(`document.querySelector('tr[data-profile="ملف واجهة"] [data-status]')?.dataset.status === 'stopped'`), 'عرض «متوقف»');
    check(true, 'زر الإغلاق أغلق النافذة وحُدّثت الحالة');
    await click('button[aria-label="نسخ ملف واجهة"]');
    await until(async () => ctx.svc.listProfiles({ businessId: biz.id }).length === 2, 'نسخ الملف');
    check(ctx.svc.listProfiles({ businessId: biz.id }).some((p) => p.name.includes('نسخة')), 'نسخ الملف ينسخ البيانات الوصفية فقط');

    // ───── صفحات أخرى ─────
    for (const [n, marker] of [['social', 'social-table'], ['profiles', 'profiles-table'], ['reports', 'report-category']] as const) {
      await nav(n);
      await until(() => ev<boolean>(`!!document.querySelector('[data-testid=${marker}]')`), `صفحة ${n}`);
    }
    check(true, 'صفحات الحسابات والملفات والتقارير تُرسم ببيانات SQLite');
    await shot('profiles.png');
    await nav('ads');
    await clickText('ربط مزوّد');
    await until(() => ev<boolean>(`!!document.querySelector('#meta-appid')`), 'فتح التكاملات');
    check(true, 'زر «ربط مزوّد» ينقل إلى صفحة التكاملات');
    await nav('campaigns');
    check((await ev<string>('document.body.innerText')).includes('لا توجد حسابات إعلانية مربوطة عبر Meta'), 'صفحة الحملات: لا حملات مختلقة، وتوجيه للربط');

    // ───── نسخ احتياطي واستعادة عبر الواجهة ─────
    await nav('settings');
    const countBefore = ctx.svc.overview().counts.businesses;
    await click('[data-testid=btn-backup]');
    await until(async () => backupPath !== '' && (await import('node:fs')).existsSync(backupPath), 'ملف النسخة');
    check(true, 'نسخة احتياطية أُنشئت وفُحصت');
    ctx.svc.createBusiness({ name: 'بعد النسخة', category: 'x', color: '#222222', notes: null });
    await click('[data-testid=btn-restore]');
    await until(() => ev<boolean>(`!!document.querySelector('[data-testid=confirm-yes]')`), 'تأكيد الاستعادة');
    await click('[data-testid=confirm-yes]');
    await until(async () => ctx.svc.listBusinesses({ status: 'all', query: 'بعد النسخة' }).length === 0, 'الاستعادة');
    check(ctx.svc.overview().counts.businesses === countBefore, 'الاستعادة عبر الواجهة أعادت الحالة');
    await wait(1500);
    await until(() => ev<boolean>(`!!document.querySelector('[data-testid=count-businesses]') || !!document.querySelector('h1')`), 'إعادة تحميل الواجهة');
    await shot('settings.png');

    // ───── حذف البيانات التجريبية ─────
    await nav('settings');
    await click('[data-testid=btn-unseed]');
    await until(() => ev<boolean>(`!!document.querySelector('[data-testid=confirm-yes]')`), 'تأكيد');
    await click('[data-testid=confirm-yes]');
    await until(async () => ctx.svc.overview().counts.businesses === 0, 'حذف التجريبية');
    check(ctx.svc.overview().counts.socialAccounts === 0 && ctx.svc.overview().counts.profiles === 0, 'حذف التجريبية أزال حساباتها وملفاتها');
    ctx.store.close();
  }),
);
