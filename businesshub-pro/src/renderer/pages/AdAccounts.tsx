import { useState } from 'react';
import type { AdAccount } from '../../shared/contract';
import { useApp, useCall, useLoad } from '../ctx';
import { IconEdit, IconPlus, IconTrash } from '../components/icons';
import { AdFormModal } from '../components/forms';
import { Badge, Confirm, Empty, Notice, PageHeader } from '../components/ui';
import { CONNECTION_LABEL, PROVIDER_LABEL } from '../labels';

export function AdAccounts() {
  const { bump, toast } = useApp();
  const call = useCall();
  const [dlg, setDlg] = useState<{ t: 'form'; a?: AdAccount } | { t: 'del'; a: AdAccount } | null>(null);
  const { data: list } = useLoad('ads:list', [{}]);
  return (
    <>
      <PageHeader title="الحسابات الإعلانية" subtitle={`${list?.length ?? 0} حساب`} actions={<><button className="btn btn-ghost" disabled title="ربط المزوّدين غير متاح في المرحلة 1">ربط مزوّد (غير متاح)</button><button className="btn btn-primary" onClick={() => setDlg({ t: 'form' })}><IconPlus /> حساب جديد</button></>} />
      <div className="space-y-5 p-8">
        <Notice tone="indigo">هذه سجلات محلية يدوية. لا يوجد ربط فعلي بـ Meta أو TikTok في المرحلة 1، فكل الحسابات «غير متصل» ولا تُعرض أرقام إنفاق.</Notice>
        {!list ? null : list.length === 0 ? <Empty title="لا توجد حسابات إعلانية." /> : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm" data-testid="ads-table">
              <thead className="bg-slate-900 text-xs text-slate-400"><tr><th className="px-4 py-3 text-start font-medium">الحساب</th><th className="px-4 py-3 text-start font-medium">النشاط</th><th className="px-4 py-3 text-start font-medium">المزوّد</th><th className="px-4 py-3 text-start font-medium">المعرّف</th><th className="px-4 py-3 text-start font-medium">الاتصال</th><th className="px-4 py-3 text-start font-medium">إجراءات</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/60">
                    <td className="px-4 py-3 text-slate-100">{a.displayName}</td><td className="px-4 py-3 text-slate-400">{a.businessName}</td>
                    <td className="px-4 py-3 text-xs">{PROVIDER_LABEL[a.provider]}</td><td className="px-4 py-3 text-xs text-slate-400" dir="ltr"><span className="block text-start">{a.externalId ?? '—'}</span></td>
                    <td className="px-4 py-3"><Badge tone="amber">{CONNECTION_LABEL[a.connectionStatus]}</Badge></td>
                    <td className="px-4 py-3"><div className="flex gap-1"><button className="icon-btn" aria-label={`تعديل ${a.displayName}`} onClick={() => setDlg({ t: 'form', a })}><IconEdit /></button><button className="icon-btn hover:!text-rose-400" aria-label={`حذف ${a.displayName}`} onClick={() => setDlg({ t: 'del', a })}><IconTrash /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {dlg?.t === 'form' && <AdFormModal ad={dlg.a} onClose={() => setDlg(null)} onDone={() => { setDlg(null); bump(); }} />}
      {dlg?.t === 'del' && (
        <Confirm title="حذف الحساب الإعلاني" confirmLabel="حذف" onCancel={() => setDlg(null)} message={<>سيُحذف «{dlg.a.displayName}» مع أي حملات مرتبطة به.</>}
          onConfirm={async () => { const a = dlg.a; setDlg(null); if ((await call('ads:delete', { id: a.id })) !== undefined) { toast('ok', 'تم الحذف.'); bump(); } }} />
      )}
    </>
  );
}
