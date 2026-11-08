import { useState } from 'react';
import type { Proxy } from '../../shared/contract';
import { useApp, useCall, useLoad } from '../ctx';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '../components/icons';
import { ProfileFormModal, ProxyFormModal } from '../components/forms';
import { ProfilesTable } from '../components/ProfilesTable';
import { Badge, Confirm, Empty, PageHeader } from '../components/ui';

export function BrowserProfiles() {
  const { bump, toast, running } = useApp();
  const call = useCall();
  const [tab, setTab] = useState<'profiles' | 'proxies'>('profiles');
  const [query, setQuery] = useState('');
  const [dlg, setDlg] = useState<{ t: 'profile' } | { t: 'proxy'; p?: Proxy } | { t: 'delProxy'; p: Proxy } | null>(null);
  const { data: profiles } = useLoad('profiles:list', [{ query }]);
  const { data: proxies } = useLoad('proxies:list', []);

  return (
    <>
      <PageHeader title="ملفات المتصفح" subtitle={`${profiles?.length ?? 0} ملف · ${running.size} قيد التشغيل`}
        actions={tab === 'profiles' ? <button className="btn btn-primary" onClick={() => setDlg({ t: 'profile' })}><IconPlus /> ملف جديد</button> : <button className="btn btn-primary" onClick={() => setDlg({ t: 'proxy' })}><IconPlus /> بروكسي جديد</button>} />
      <div className="space-y-5 p-8">
        <div role="tablist" className="flex gap-1 border-b border-slate-800">
          {([['profiles', 'الملفات'], ['proxies', 'البروكسيات']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`border-b-2 px-4 py-2.5 text-sm ${tab === k ? 'border-indigo-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>{l}</button>
          ))}
        </div>
        {tab === 'profiles' ? (
          <>
            <div className="relative w-72"><span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-500"><IconSearch /></span>
              <input className="input ps-10" placeholder="ابحث بالملف أو النشاط أو الرابط" aria-label="بحث" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            <ProfilesTable profiles={profiles ?? []} emptyAction={!query ? <button className="btn btn-primary" onClick={() => setDlg({ t: 'profile' })}><IconPlus /> أنشئ ملفاً</button> : undefined} />
          </>
        ) : !proxies || proxies.length === 0 ? (
          <Empty title="لا توجد بروكسيات." hint="البروكسي اختياري. يمكن ربط نفس البروكسي بعدة ملفات؛ كلمة المرور تُحفظ مشفّرة في جدول منفصل." action={<button className="btn btn-primary" onClick={() => setDlg({ t: 'proxy' })}><IconPlus /> بروكسي جديد</button>} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm" data-testid="proxies-table">
              <thead className="bg-slate-900 text-xs text-slate-400"><tr><th className="px-4 py-3 text-start font-medium">الاسم</th><th className="px-4 py-3 text-start font-medium">العنوان</th><th className="px-4 py-3 text-start font-medium">المصادقة</th><th className="px-4 py-3 text-start font-medium">الملفات</th><th className="px-4 py-3 text-start font-medium">إجراءات</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {proxies.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/60">
                    <td className="px-4 py-3 text-slate-100">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400" dir="ltr"><span className="block text-start">{p.scheme}://{p.host}:{p.port}</span></td>
                    <td className="px-4 py-3">{p.username || p.hasSecret ? <Badge tone="indigo">{p.username ?? ''}{p.hasSecret ? ' · سر مشفّر' : ''}</Badge> : <span className="text-xs text-slate-500">بلا</span>}</td>
                    <td className="px-4 py-3">{p.profileCount}</td>
                    <td className="px-4 py-3"><div className="flex gap-1"><button className="icon-btn" aria-label={`تعديل ${p.name}`} onClick={() => setDlg({ t: 'proxy', p })}><IconEdit /></button><button className="icon-btn hover:!text-rose-400" aria-label={`حذف ${p.name}`} onClick={() => setDlg({ t: 'delProxy', p })}><IconTrash /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {dlg?.t === 'profile' && <ProfileFormModal onClose={() => setDlg(null)} onDone={() => { setDlg(null); bump(); }} />}
      {dlg?.t === 'proxy' && <ProxyFormModal proxy={dlg.p} onClose={() => setDlg(null)} onDone={() => { setDlg(null); bump(); }} />}
      {dlg?.t === 'delProxy' && (
        <Confirm title="حذف البروكسي" confirmLabel="حذف" onCancel={() => setDlg(null)} message={<>سيُحذف «{dlg.p.name}» وسرّه المشفّر. {dlg.p.profileCount} ملف مرتبط به سيصبح اتصاله مباشراً.</>}
          onConfirm={async () => { const p = dlg.p; setDlg(null); if ((await call('proxies:delete', { id: p.id })) !== undefined) { toast('ok', 'تم حذف البروكسي.'); bump(); } }} />
      )}
    </>
  );
}
