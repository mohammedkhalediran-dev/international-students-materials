import { useApp, useLoad } from '../ctx';
import { Badge, Empty, PageHeader } from '../components/ui';
import { formatDate } from '../labels';

function Stat({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums text-slate-100" data-testid={testId}>{value}</div>
    </div>
  );
}

export function Overview() {
  const { go } = useApp();
  const { data, loading } = useLoad('overview:get', []);
  if (!data) return <PageHeader title="نظرة عامة" subtitle={loading ? 'جارٍ التحميل…' : ''} />;
  const c = data.counts;
  return (
    <>
      <PageHeader title="نظرة عامة" subtitle="أرقام حقيقية من قاعدة البيانات المحلية" />
      <div className="space-y-8 p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
          <Stat label="الأنشطة" value={c.businesses} testId="count-businesses" />
          <Stat label="الحسابات الاجتماعية" value={c.socialAccounts} testId="count-social" />
          <Stat label="ملفات المتصفح" value={c.profiles} testId="count-profiles" />
          <Stat label="الحسابات الإعلانية" value={c.adAccounts} testId="count-ads" />
          <Stat label="الحملات" value={c.campaigns} testId="count-campaigns" />
          <Stat label="البروكسيات" value={c.proxies} testId="count-proxies" />
          <Stat label="أنشطة مؤرشفة" value={c.archivedBusinesses} testId="count-archived" />
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">الأنشطة</h2>
            <button className="text-xs text-indigo-300 hover:underline" onClick={() => go({ name: 'businesses' })}>عرض الكل</button>
          </div>
          {data.businesses.length === 0 ? (
            <Empty title="لا توجد أنشطة بعد." hint="أنشئ أول نشاط من صفحة الأنشطة، أو أضف بيانات تجريبية من الإعدادات." action={<button className="btn btn-primary" onClick={() => go({ name: 'businesses' })}>إلى الأنشطة</button>} />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {data.businesses.map((b) => (
                <button key={b.id} onClick={() => go({ name: 'business', id: b.id })} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-start transition hover:border-indigo-500/50">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: b.color }} /><span className="truncate font-medium text-slate-100">{b.name}</span></div>
                  <div className="mt-1 text-xs text-slate-500">{b.category}</div>
                  <div className="mt-3 flex gap-3 text-xs text-slate-400"><span>{b.socialCount} حساب</span><span>{b.profileCount} ملف</span><span>{b.adCount} إعلاني</span></div>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <section>
            <h2 className="mb-3 font-semibold text-slate-200">آخر الملفات فتحاً</h2>
            {data.recentProfiles.length === 0 ? (
              <Empty title="لم يُفتح أي ملف بعد." />
            ) : (
              <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
                {data.recentProfiles.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm"><span>{p.businessName} · {p.name}</span><span className="text-xs text-slate-500">{formatDate(p.lastOpenedAt)}</span></li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-3 font-semibold text-slate-200">حالة التكاملات</h2>
            <ul className="space-y-2" data-testid="integrations">
              {data.integrations.map((i) => (
                <li key={i.id} className="rounded-xl border border-slate-800 p-4">
                  <div className="flex items-center justify-between"><span className="font-medium text-slate-200">{i.name}</span><Badge tone="amber">غير متصل</Badge></div>
                  <p className="mt-1 text-xs text-slate-500">{i.description}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
