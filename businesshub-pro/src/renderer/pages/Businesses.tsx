import { useMemo, useState } from 'react';
import type { Business } from '../../shared/contract';
import { useApp, useCall, useLoad } from '../ctx';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '../components/icons';
import { BusinessFormModal } from '../components/forms';
import { Badge, Confirm, Empty, PageHeader, Skeleton } from '../components/ui';
import { PLATFORM_COLOR, PLATFORM_LABEL } from '../labels';

type Dlg = { t: 'form'; b?: Business } | { t: 'delete'; b: Business } | null;

export function Businesses() {
  const { go, bump, toast } = useApp();
  const call = useCall();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [category, setCategory] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [dlg, setDlg] = useState<Dlg>(null);
  const { data: list } = useLoad('businesses:list', [{ query, status, category: category || undefined }]);
  const { data: all } = useLoad('businesses:list', [{ status: 'all' }]);
  const categories = useMemo(() => [...new Set((all ?? []).map((b) => b.category))].sort(), [all]);

  const archive = async (b: Business) => {
    if (await call('businesses:setStatus', { id: b.id, status: b.status === 'active' ? 'archived' : 'active' })) {
      toast('ok', b.status === 'active' ? 'تمت أرشفة النشاط.' : 'أُعيد تفعيل النشاط.');
      bump();
    }
  };
  const actions = (b: Business) => (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button className="icon-btn" aria-label={`تعديل ${b.name}`} title="تعديل" onClick={() => setDlg({ t: 'form', b })}><IconEdit /></button>
      {b.status === 'active' ? (
        <button className="btn btn-ghost px-2.5 py-1 text-xs" aria-label={`أرشفة ${b.name}`} onClick={() => archive(b)}>أرشفة</button>
      ) : (
        <>
          <button className="btn btn-ghost px-2.5 py-1 text-xs" aria-label={`إلغاء أرشفة ${b.name}`} onClick={() => archive(b)}>إلغاء الأرشفة</button>
          <button className="icon-btn hover:!text-rose-400" aria-label={`حذف نهائي ${b.name}`} title="حذف نهائي" onClick={() => setDlg({ t: 'delete', b })}><IconTrash /></button>
        </>
      )}
    </div>
  );

  return (
    <>
      <PageHeader title="الأنشطة" subtitle={`${list?.length ?? 0} نشاط`} actions={<button className="btn btn-primary" onClick={() => setDlg({ t: 'form' })}><IconPlus /> نشاط جديد</button>} />
      <div className="space-y-5 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-500"><IconSearch /></span>
            <input className="input ps-10" placeholder="ابحث بالاسم أو الفئة أو الملاحظات" aria-label="بحث" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="input w-40" aria-label="الحالة" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="active">النشطة</option><option value="archived">المؤرشفة</option><option value="all">الكل</option>
          </select>
          <select className="input w-44" aria-label="الفئة" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">كل الفئات</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="ms-auto flex gap-1 rounded-lg bg-slate-900 p-1">
            {(['grid', 'list'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`rounded-md px-3 py-1 text-xs ${view === v ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{v === 'grid' ? 'شبكة' : 'قائمة'}</button>
            ))}
          </div>
        </div>

        {!list ? <Skeleton rows={6} /> : list.length === 0 ? (
          <Empty title={query || category || status !== 'active' ? 'لا توجد أنشطة مطابقة.' : 'لا توجد أنشطة بعد.'} action={!query && !category ? <button className="btn btn-primary" onClick={() => setDlg({ t: 'form' })}><IconPlus /> أنشئ أول نشاط</button> : undefined} />
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="businesses-grid">
            {list.map((b) => (
              <div key={b.id} role="button" tabIndex={0} data-business={b.name} onClick={() => go({ name: 'business', id: b.id })} onKeyDown={(e) => e.key === 'Enter' && go({ name: 'business', id: b.id })}
                className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-indigo-500/50">
                <div className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: b.color }} /><span className="truncate font-semibold text-slate-100">{b.name}</span>{b.status === 'archived' && <Badge tone="amber">مؤرشف</Badge>}</div>
                <div className="mt-1 text-xs text-slate-500">{b.category}</div>
                <div className="mt-3 flex flex-wrap gap-2">{(Object.keys(b.platformCounts) as (keyof typeof b.platformCounts)[]).map((pl) => <span key={pl} title={PLATFORM_LABEL[pl]} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] ${b.platformCounts[pl] ? "bg-slate-800 text-slate-200" : "bg-slate-900 text-slate-600"}`}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.platformCounts[pl] ? PLATFORM_COLOR[pl] : "#334155" }} />{b.platformCounts[pl]}</span>)}</div>
                <div className="mt-3 flex gap-4 text-xs text-slate-400"><span>{b.socialCount} حساب</span><span>{b.profileCount} ملف متصفح</span><span>{b.adCount} إعلاني</span></div>
                <div className="mt-4 border-t border-slate-800 pt-3">{actions(b)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm" data-testid="businesses-list">
              <thead className="bg-slate-900 text-xs text-slate-400"><tr><th className="px-4 py-3 text-start font-medium">النشاط</th><th className="px-4 py-3 text-start font-medium">الفئة</th><th className="px-4 py-3 text-start font-medium">الحسابات</th><th className="px-4 py-3 text-start font-medium">الملفات</th><th className="px-4 py-3 text-start font-medium">الحالة</th><th className="px-4 py-3 text-start font-medium">إجراءات</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {list.map((b) => (
                  <tr key={b.id} data-business={b.name} className="cursor-pointer hover:bg-slate-900/60" onClick={() => go({ name: 'business', id: b.id })}>
                    <td className="px-4 py-3"><span className="me-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />{b.name}</td>
                    <td className="px-4 py-3 text-slate-400">{b.category}</td><td className="px-4 py-3">{b.socialCount}</td><td className="px-4 py-3">{b.profileCount}</td>
                    <td className="px-4 py-3">{b.status === 'active' ? <Badge tone="green">نشط</Badge> : <Badge tone="amber">مؤرشف</Badge>}</td>
                    <td className="px-4 py-3">{actions(b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dlg?.t === 'form' && <BusinessFormModal business={dlg.b} onClose={() => setDlg(null)} onDone={() => { setDlg(null); bump(); }} />}
      {dlg?.t === 'delete' && (
        <Confirm title="حذف نهائي (لا رجعة فيه)" confirmLabel="حذف نهائي وكل بياناته" typeToConfirm={dlg.b.name} onCancel={() => setDlg(null)}
          message={<div className="space-y-2"><p>سيُحذف «{dlg.b.name}» <b>مع كل ما يتبعه</b>:</p><ul className="list-disc ps-5 text-slate-400"><li>{dlg.b.socialCount} حساب اجتماعي</li><li>{dlg.b.profileCount} ملف متصفح مع كل بيانات جلساتها (كوكيز وتخزين)</li><li>{dlg.b.adCount} حساب إعلاني وحملاتها</li></ul><p className="text-xs text-slate-500">البروكسيات المشتركة وسجل التدقيق لا تُحذف. لا يمكن التراجع؛ النشاط مؤرشف الآن؛ يمكنك الاكتفاء بإبقائه مؤرشفاً.</p></div>}
          onConfirm={async (typed) => { const b = dlg.b; setDlg(null); if (await call('businesses:delete', { id: b.id, confirmName: typed })) { toast('ok', 'تم حذف النشاط وما يتبعه.'); bump(); } }} />
      )}
    </>
  );
}
