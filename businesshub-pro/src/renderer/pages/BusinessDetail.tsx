import { useState } from 'react';
import type { AdAccount, Platform, SocialAccount } from '../../shared/contract';
import { PLATFORMS } from '../../shared/contract';
import { useApp, useCall, useLoad } from '../ctx';
import { IconEdit, IconPlus, IconTrash } from '../components/icons';
import { AdFormModal, BusinessFormModal, ProfileFormModal, SocialFormModal } from '../components/forms';
import { ProfilesTable } from '../components/ProfilesTable';
import { Badge, Confirm, Empty, Notice, PageHeader } from '../components/ui';
import { ACCOUNT_STATUS_LABEL, CONNECTION_LABEL, PLATFORM_COLOR, PLATFORM_LABEL, PROVIDER_LABEL } from '../labels';

type Dlg =
  | { t: 'edit' } | { t: 'social'; a?: SocialAccount } | { t: 'delSocial'; a: SocialAccount }
  | { t: 'profile' } | { t: 'ad'; a?: AdAccount } | { t: 'delAd'; a: AdAccount } | null;

export function BusinessDetail({ id }: { id: string }) {
  const { go, bump, toast } = useApp();
  const call = useCall();
  const [tab, setTab] = useState<Platform>('instagram');
  const [dlg, setDlg] = useState<Dlg>(null);
  const { data: b, loading } = useLoad('businesses:get', [{ id }]);
  const { data: social } = useLoad('social:list', [{ businessId: id }]);
  const { data: profiles } = useLoad('profiles:list', [{ businessId: id }]);
  const { data: ads } = useLoad('ads:list', [{ businessId: id }]);
  const { data: campaigns } = useLoad('campaigns:list', [{ businessId: id }]);

  if (!b) {
    return <><PageHeader title={loading ? 'جارٍ التحميل…' : 'النشاط غير موجود'} actions={<button className="btn btn-ghost" onClick={() => go({ name: 'businesses' })}>رجوع</button>} /></>;
  }
  const accounts = (social ?? []).filter((s) => s.platform === tab);
  const tabProfiles = (profiles ?? []).filter((p) => (social ?? []).find((s) => s.id === p.socialAccountId)?.platform === tab);
  const done = () => { setDlg(null); bump(); };

  return (
    <>
      <PageHeader title={b.name} subtitle={`${b.category} · ${b.status === 'archived' ? 'مؤرشف' : 'نشط'}`}
        actions={<><button className="btn btn-ghost" onClick={() => setDlg({ t: 'edit' })}><IconEdit /> تعديل</button><button className="btn btn-ghost" onClick={() => go({ name: 'businesses' })}>رجوع</button></>} />
      <div className="space-y-8 p-8">
        {b.notes && <p className="text-sm text-slate-400">{b.notes}</p>}

        <section>
          <div role="tablist" className="mb-4 flex gap-1 border-b border-slate-800">
            {PLATFORMS.map((p) => {
              const n = (social ?? []).filter((s) => s.platform === p).length;
              return (
                <button key={p} role="tab" aria-selected={tab === p} onClick={() => setTab(p)} className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition ${tab === p ? 'border-indigo-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PLATFORM_COLOR[p] }} />{PLATFORM_LABEL[p]}<span className="rounded bg-slate-800 px-1.5 text-xs">{n}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">حسابات {PLATFORM_LABEL[tab]}</h2>
            <button className="btn btn-ghost" onClick={() => setDlg({ t: 'social' })}><IconPlus /> حساب</button>
          </div>
          {accounts.length === 0 ? <Empty title={`لا توجد حسابات ${PLATFORM_LABEL[tab]} لهذا النشاط.`} /> : (
            <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800" data-testid="platform-accounts">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1"><div className="truncate text-slate-100">{a.displayName}</div><div className="text-xs text-slate-500" dir="ltr">{a.usernameOrNumber ?? ''}</div></div>
                  <Badge tone={a.status === 'active' ? 'green' : 'slate'}>{ACCOUNT_STATUS_LABEL[a.status]}</Badge>
                  <button className="icon-btn" aria-label={`تعديل ${a.displayName}`} onClick={() => setDlg({ t: 'social', a })}><IconEdit /></button>
                  <button className="icon-btn hover:!text-rose-400" aria-label={`حذف ${a.displayName}`} onClick={() => setDlg({ t: 'delSocial', a })}><IconTrash /></button>
                </li>
              ))}
            </ul>
          )}
          {tabProfiles.length > 0 && <div className="mt-4"><ProfilesTable profiles={tabProfiles} showBusiness={false} /></div>}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">ملفات المتصفح للنشاط</h2>
            <button className="btn btn-ghost" onClick={() => setDlg({ t: 'profile' })}><IconPlus /> ملف متصفح</button>
          </div>
          <ProfilesTable profiles={profiles ?? []} showBusiness={false} />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">الحسابات الإعلانية</h2>
            <button className="btn btn-ghost" onClick={() => setDlg({ t: 'ad' })}><IconPlus /> حساب إعلاني</button>
          </div>
          {(ads ?? []).length === 0 ? <Empty title="لا توجد حسابات إعلانية." /> : (
            <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
              {ads!.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1"><div className="text-slate-100">{a.displayName}</div><div className="text-xs text-slate-500">{PROVIDER_LABEL[a.provider]} {a.externalId ? `· ${a.externalId}` : ''}</div></div>
                  <Badge tone="amber">{CONNECTION_LABEL[a.connectionStatus]}</Badge>
                  <button className="icon-btn" aria-label={`تعديل ${a.displayName}`} onClick={() => setDlg({ t: 'ad', a })}><IconEdit /></button>
                  <button className="icon-btn hover:!text-rose-400" aria-label={`حذف ${a.displayName}`} onClick={() => setDlg({ t: 'delAd', a })}><IconTrash /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold text-slate-200">الحملات</h2>
          {(campaigns ?? []).length === 0 ? (
            <Notice tone="indigo">لا توجد حملات مخزّنة لهذا النشاط. لا تُعرض أرقام إلا من مزامنة حقيقية مع Meta بعد ربط حساب إعلاني بهذا النشاط (صفحة التكاملات).</Notice>
          ) : <p className="text-sm text-slate-400">{campaigns!.length} حملة مخزّنة. <button className="text-indigo-300 hover:underline" onClick={() => go({ name: 'campaigns' })}>عرض التحليلات</button></p>}
        </section>
      </div>

      {dlg?.t === 'edit' && <BusinessFormModal business={b} onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.t === 'social' && <SocialFormModal account={dlg.a} businessId={id} platform={tab} onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.t === 'profile' && <ProfileFormModal businessId={id} onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.t === 'ad' && <AdFormModal ad={dlg.a} businessId={id} onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.t === 'delSocial' && (
        <Confirm title="حذف الحساب الاجتماعي" confirmLabel="حذف" onCancel={() => setDlg(null)} message={<>سيُحذف «{dlg.a.displayName}». ملفات المتصفح المرتبطة به تبقى بلا ربط.</>}
          onConfirm={async () => { const a = dlg.a; setDlg(null); if ((await call('social:delete', { id: a.id })) !== undefined) { toast('ok', 'تم الحذف.'); bump(); } }} />
      )}
      {dlg?.t === 'delAd' && (
        <Confirm title="حذف الحساب الإعلاني" confirmLabel="حذف" onCancel={() => setDlg(null)} message={<>سيُحذف «{dlg.a.displayName}» مع أي حملات مرتبطة به.</>}
          onConfirm={async () => { const a = dlg.a; setDlg(null); if ((await call('ads:delete', { id: a.id })) !== undefined) { toast('ok', 'تم الحذف.'); bump(); } }} />
      )}
    </>
  );
}
