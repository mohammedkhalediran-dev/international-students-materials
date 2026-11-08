import { useState } from 'react';
import { useApp, useCall, useLoad } from '../ctx';
import { Badge, Confirm, Notice, PageHeader } from '../components/ui';
import { formatBytes, formatDate } from '../labels';

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return <div className="flex justify-between gap-6 py-2 text-sm"><span className="text-slate-400">{k}</span><span className={`truncate text-slate-200 ${mono ? 'font-mono text-xs' : ''}`} dir={mono ? 'ltr' : undefined} title={v}>{v}</span></div>;
}

export function Settings() {
  const { bump, toast } = useApp();
  const call = useCall();
  const { data: info } = useLoad('settings:info', []);
  const { data: audit } = useLoad('audit:list', [{ limit: 40 }]);
  const [dlg, setDlg] = useState<'restore' | 'seed' | 'unseed' | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => { setBusy(true); await fn(); setBusy(false); };

  return (
    <>
      <PageHeader title="الإعدادات" subtitle="البيانات والنسخ الاحتياطي والأمان" />
      <div className="space-y-6 p-8">
        {info && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-2 font-semibold text-slate-200">معلومات التطبيق</h2>
            <div className="divide-y divide-slate-800">
              <Row k="الإصدار" v={info.appVersion} /><Row k="Electron / Chromium" v={`${info.electron} / ${info.chrome}`} mono />
              <Row k="مجلد بيانات التطبيق" v={info.dataDir} mono /><Row k="ملف قاعدة البيانات" v={info.dbPath} mono />
              <Row k="حجم القاعدة / إصدار المخطط" v={`${formatBytes(info.dbSizeBytes)} / v${info.schemaVersion}`} />
            </div>
          </section>
        )}

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-1 font-semibold text-slate-200">النسخ الاحتياطي والاستعادة</h2>
          <p className="mb-4 text-xs text-slate-500">تُفحص سلامة كل نسخة (integrity_check) عند إنشائها وقبل استعادتها. قبل أي استعادة تُحفظ نسخة تلقائية من الحالة الحالية في: {info?.backupsDir}</p>
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy} data-testid="btn-backup" onClick={() => run(async () => { const r = await call('settings:backup'); if (r) toast('ok', `تم إنشاء النسخة (${formatBytes(r.sizeBytes)}) وفحص سلامتها.`); else if (r === null) toast('ok', 'تم الإلغاء.'); bump(); })}>إنشاء نسخة احتياطية</button>
            <button className="btn btn-ghost" disabled={busy} data-testid="btn-restore" onClick={() => setDlg('restore')}>استعادة من نسخة…</button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-2 font-semibold text-slate-200">حماية الأسرار</h2>
          {info && (info.encryptionAvailable ? (
            <p className="text-sm text-slate-300"><Badge tone="green">مفعّل</Badge> كلمات مرور البروكسي تُشفَّر بتشفير النظام ({info.encryptionBackend}) وتُخزَّن في جدول منفصل. لا تصل أبداً للواجهة ولا تُسجَّل.</p>
          ) : (
            <Notice>تشفير النظام غير متاح على هذا الجهاز ({info.encryptionBackend}). لذلك <b>لن يحفظ البرنامج أي كلمة مرور بروكسي</b> بدل تخزينها كنص صريح.</Notice>
          ))}
          <ul className="mt-3 list-disc space-y-1 ps-5 text-xs leading-relaxed text-slate-500">
            <li>لا يخزّن البرنامج كلمات مرور حسابات المنصات إطلاقاً؛ تسجّل الدخول داخل نافذة الملف.</li>
            <li>عزل الجلسات (كوكيز وتخزين منفصل لكل ملف) ليس ضماناً لإخفاء البصمة ولا لتجاوز كشف المنصات.</li>
            <li>مصادقة SOCKS5 بالاسم وكلمة المرور غير مدعومة في Chromium؛ مدعوم HTTP/HTTPS بمصادقة.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-1 font-semibold text-slate-200">بيانات تجريبية <Badge tone="amber">اختياري</Badge></h2>
          <p className="mb-4 text-xs text-slate-500">يضيف 30 نشاطاً و120 حساباً اجتماعياً بأسماء تبدأ بـ «[تجريبي]» لتجربة الواجهة. يمكن حذفها كلها لاحقاً بزر واحد.</p>
          <div className="flex gap-2"><button className="btn btn-ghost" disabled={busy} data-testid="btn-seed" onClick={() => setDlg('seed')}>إضافة بيانات تجريبية</button><button className="btn btn-ghost" disabled={busy} data-testid="btn-unseed" onClick={() => setDlg('unseed')}>حذف البيانات التجريبية</button></div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-3 font-semibold text-slate-200">سجل التدقيق (آخر 40 حدثاً)</h2>
          {(audit ?? []).length === 0 ? <p className="text-sm text-slate-500">لا أحداث بعد.</p> : (
            <div className="max-h-72 overflow-y-auto"><table className="w-full text-xs" data-testid="audit-table"><tbody className="divide-y divide-slate-800">
              {audit!.map((e) => <tr key={e.id}><td className="py-1.5 text-slate-500">{formatDate(e.timestamp)}</td><td className="py-1.5 font-mono text-slate-300" dir="ltr">{e.eventType}</td><td className="py-1.5 text-slate-500" dir="ltr">{Object.entries(e.metadata).map(([k, v]) => `${k}=${String(v)}`).join(' ')}</td></tr>)}
            </tbody></table></div>
          )}
        </section>
      </div>

      {dlg === 'restore' && (
        <Confirm title="استعادة نسخة احتياطية" confirmLabel="اختيار ملف والاستعادة" onCancel={() => setDlg(null)}
          message={<>ستُستبدل بياناتك الحالية بمحتوى النسخة المختارة بعد فحص سلامتها. تُحفظ نسخة تلقائية من الحالة الحالية قبل الاستبدال. تُغلق نوافذ ملفات المتصفح المفتوحة. (بيانات جلسات المتصفح — الكوكيز — ليست جزءاً من النسخة.)</>}
          onConfirm={() => { setDlg(null); void run(async () => { const r = await call('settings:restore'); if (r?.restored) toast('ok', `تمت الاستعادة. نسخة الحالة السابقة: ${r.preRestoreBackup}`); else if (r) toast('err', r.reason ?? 'لم تتم الاستعادة'); bump(); }); }} />
      )}
      {dlg === 'seed' && <Confirm title="إضافة بيانات تجريبية" confirmLabel="إضافة" onCancel={() => setDlg(null)} message="ستُضاف 30 نشاطاً و120 حساباً بأسماء تبدأ بـ «[تجريبي]». هل تريد المتابعة؟" onConfirm={() => { setDlg(null); void run(async () => { const r = await call('settings:seedSample'); if (r) toast('ok', `أُضيف ${r.businesses} نشاطاً و${r.socialAccounts} حساباً.`); bump(); }); }} />}
      {dlg === 'unseed' && <Confirm title="حذف البيانات التجريبية" confirmLabel="حذف" onCancel={() => setDlg(null)} message="سيُحذف كل نشاط يبدأ اسمه بـ «[تجريبي]» مع حساباته وملفاته. بياناتك الحقيقية لا تُمس." onConfirm={() => { setDlg(null); void run(async () => { const r = await call('settings:removeSample'); if (r) toast('ok', `حُذف ${r.removed} نشاطاً تجريبياً.`); bump(); }); }} />}
    </>
  );
}
