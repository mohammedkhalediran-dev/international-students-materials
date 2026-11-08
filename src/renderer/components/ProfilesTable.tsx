import { useState } from 'react';
import type { BrowserProfile } from '../../shared/contract';
import { useApp, useCall } from '../ctx';
import { formatDate } from '../labels';
import { IconEdit, IconPlay, IconStop, IconTrash } from './icons';
import { ProfileFormModal } from './forms';
import { Confirm, Empty, FormModal } from './ui';

type Dlg = { t: 'edit'; p: BrowserProfile } | { t: 'delete'; p: BrowserProfile } | { t: 'url'; p: BrowserProfile } | null;

export function ProfilesTable({ profiles, showBusiness = true, emptyAction }: { profiles: BrowserProfile[]; showBusiness?: boolean; emptyAction?: React.ReactNode }) {
  const { running, bump, toast } = useApp();
  const call = useCall();
  const [dlg, setDlg] = useState<Dlg>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    await fn();
    setBusy(null);
  };

  if (profiles.length === 0) return <Empty title="لا توجد ملفات متصفح." hint="كل ملف يملك جلسة مستقلة ودائمة (كوكيز وتخزين محلي منفصل)." action={emptyAction} />;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm" data-testid="profiles-table">
          <thead className="bg-slate-900 text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 text-start font-medium">الملف</th>
              {showBusiness && <th className="px-4 py-3 text-start font-medium">النشاط</th>}
              <th className="px-4 py-3 text-start font-medium">الحساب</th>
              <th className="px-4 py-3 text-start font-medium">البروكسي</th>
              <th className="px-4 py-3 text-start font-medium">آخر فتح</th>
              <th className="px-4 py-3 text-start font-medium">الحالة</th>
              <th className="px-4 py-3 text-start font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {profiles.map((p) => {
              const on = running.has(p.id);
              return (
                <tr key={p.id} data-profile={p.name} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-slate-100">{p.name}<div className="text-xs font-normal text-slate-500" dir="ltr">{p.homeUrl ?? ''}</div></td>
                  {showBusiness && <td className="px-4 py-3 text-slate-300">{p.businessName}</td>}
                  <td className="px-4 py-3 text-xs text-slate-400">{p.socialLabel ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{p.proxyName ?? 'مباشر'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatDate(p.lastOpenedAt)}</td>
                  <td className="px-4 py-3">
                    <span data-status={on ? 'running' : 'stopped'} className={`inline-flex items-center gap-1.5 text-xs ${on ? 'text-emerald-300' : 'text-slate-500'}`}>
                      <span className={`h-2 w-2 rounded-full ${on ? 'bg-emerald-400' : 'bg-slate-600'}`} />{on ? 'يعمل' : 'متوقف'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {on ? (
                        <button className="btn btn-stop px-3 py-1.5" disabled={busy === p.id} aria-label={`إغلاق ${p.name}`} onClick={() => act(p.id, () => call('profiles:close', { id: p.id }))}><IconStop /> إغلاق</button>
                      ) : (
                        <button className="btn btn-start px-3 py-1.5" disabled={busy === p.id} aria-label={`تشغيل ${p.name}`} onClick={() => act(p.id, () => call('profiles:launch', { id: p.id }))}><IconPlay /> تشغيل</button>
                      )}
                      <button className="btn btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setDlg({ t: 'url', p })} aria-label={`فتح رابط في ${p.name}`}>فتح رابط</button>
                      <button className="btn btn-ghost px-2.5 py-1.5 text-xs" onClick={() => act(p.id, async () => { if (await call('profiles:duplicate', { id: p.id })) { toast('ok', 'تم نسخ البيانات الوصفية فقط (جلسة جديدة فارغة بلا كوكيز).'); bump(); } })} aria-label={`نسخ ${p.name}`}>نسخ</button>
                      <button className="icon-btn" title="تعديل" aria-label={`تعديل ${p.name}`} onClick={() => setDlg({ t: 'edit', p })}><IconEdit /></button>
                      <button className="icon-btn hover:!text-rose-400" title="حذف" aria-label={`حذف ${p.name}`} onClick={() => setDlg({ t: 'delete', p })}><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dlg?.t === 'edit' && <ProfileFormModal profile={dlg.p} onClose={() => setDlg(null)} onDone={() => { setDlg(null); bump(); }} />}
      {dlg?.t === 'delete' && (
        <Confirm title="حذف ملف المتصفح" confirmLabel="حذف نهائي" onCancel={() => setDlg(null)}
          message={<>سيُحذف الملف «{dlg.p.name}» نهائياً مع <b>كل بيانات جلسته</b> (الكوكيز والتخزين المحلي والكاش). لا يمكن التراجع.</>}
          onConfirm={async () => { const p = dlg.p; setDlg(null); if ((await call('profiles:delete', { id: p.id })) !== undefined) { toast('ok', 'تم حذف الملف وبيانات جلسته.'); bump(); } }} />
      )}
      {dlg?.t === 'url' && (
        <FormModal title={`فتح رابط في «${dlg.p.name}»`} submitLabel="فتح" onClose={() => setDlg(null)}
          fields={[{ key: 'url', label: 'الرابط (http أو https)', ltr: true, required: true, placeholder: 'https://…' }]} initial={{ url: '' }}
          onSubmit={async (v) => {
            const r = await window.api.call('profiles:openUrl', { id: dlg.p.id, url: v.url });
            if (!r.ok) return r.error;
            setDlg(null);
            return null;
          }} />
      )}
    </>
  );
}
