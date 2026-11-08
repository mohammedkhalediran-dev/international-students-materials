import { useState } from 'react';
import type { Platform, SocialAccount } from '../../shared/contract';
import { PLATFORMS } from '../../shared/contract';
import { useApp, useCall, useLoad } from '../ctx';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '../components/icons';
import { SocialFormModal } from '../components/forms';
import { Badge, Confirm, Empty, PageHeader } from '../components/ui';
import { ACCOUNT_STATUS_LABEL, PLATFORM_COLOR, PLATFORM_LABEL } from '../labels';

export function SocialAccounts() {
  const { bump, toast } = useApp();
  const call = useCall();
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [businessId, setBusinessId] = useState('');
  const [dlg, setDlg] = useState<{ t: 'form'; a?: SocialAccount } | { t: 'del'; a: SocialAccount } | null>(null);
  const { data: list } = useLoad('social:list', [{ query, platform: platform || undefined, businessId: businessId || undefined }]);
  const { data: businesses } = useLoad('businesses:list', [{ status: 'all' }]);

  return (
    <>
      <PageHeader title="الحسابات الاجتماعية" subtitle={`${list?.length ?? 0} حساب · لا تُخزَّن كلمات مرور المنصات أبداً`} actions={<button className="btn btn-primary" onClick={() => setDlg({ t: 'form' })}><IconPlus /> حساب جديد</button>} />
      <div className="space-y-5 p-8">
        <div className="flex flex-wrap gap-3">
          <div className="relative w-72"><span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-500"><IconSearch /></span>
            <input className="input ps-10" placeholder="ابحث بالاسم أو المعرّف" aria-label="بحث" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <select className="input w-44" aria-label="المنصة" value={platform} onChange={(e) => setPlatform(e.target.value as Platform | '')}><option value="">كل المنصات</option>{PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}</select>
          <select className="input w-52" aria-label="النشاط" value={businessId} onChange={(e) => setBusinessId(e.target.value)}><option value="">كل الأنشطة</option>{(businesses ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        </div>
        {!list ? null : list.length === 0 ? <Empty title="لا توجد حسابات مطابقة." hint="أضف حساباً يدوياً؛ هذا سجل محلي ولا يتصل بالمنصة." /> : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm" data-testid="social-table">
              <thead className="bg-slate-900 text-xs text-slate-400"><tr><th className="px-4 py-3 text-start font-medium">الحساب</th><th className="px-4 py-3 text-start font-medium">المنصة</th><th className="px-4 py-3 text-start font-medium">النشاط</th><th className="px-4 py-3 text-start font-medium">المعرّف / الرقم</th><th className="px-4 py-3 text-start font-medium">الحالة</th><th className="px-4 py-3 text-start font-medium">إجراءات</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/60">
                    <td className="px-4 py-3 text-slate-100">{a.displayName}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PLATFORM_COLOR[a.platform] }} />{PLATFORM_LABEL[a.platform]}</span></td>
                    <td className="px-4 py-3 text-slate-400">{a.businessName}</td>
                    <td className="px-4 py-3 text-xs text-slate-400" dir="ltr"><span className="block text-start">{a.usernameOrNumber ?? '—'}</span></td>
                    <td className="px-4 py-3"><Badge tone={a.status === 'active' ? 'green' : 'slate'}>{ACCOUNT_STATUS_LABEL[a.status]}</Badge></td>
                    <td className="px-4 py-3"><div className="flex gap-1"><button className="icon-btn" aria-label={`تعديل ${a.displayName}`} onClick={() => setDlg({ t: 'form', a })}><IconEdit /></button><button className="icon-btn hover:!text-rose-400" aria-label={`حذف ${a.displayName}`} onClick={() => setDlg({ t: 'del', a })}><IconTrash /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {dlg?.t === 'form' && <SocialFormModal account={dlg.a} onClose={() => setDlg(null)} onDone={() => { setDlg(null); bump(); }} />}
      {dlg?.t === 'del' && (
        <Confirm title="حذف الحساب" confirmLabel="حذف" onCancel={() => setDlg(null)} message={<>سيُحذف «{dlg.a.displayName}». ملفات المتصفح المرتبطة به تبقى بلا ربط.</>}
          onConfirm={async () => { const a = dlg.a; setDlg(null); if ((await call('social:delete', { id: a.id })) !== undefined) { toast('ok', 'تم الحذف.'); bump(); } }} />
      )}
    </>
  );
}
