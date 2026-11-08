import { useLoad } from '../ctx';
import { Empty, Notice, PageHeader } from '../components/ui';
import { PLATFORM_LABEL, PROVIDER_LABEL } from '../labels';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="mb-3 text-sm font-semibold text-slate-200">{title}</h2>{children}</section>;
}

export function Reports() {
  const { data: r } = useLoad('reports:summary', []);
  if (!r) return <PageHeader title="التقارير" />;
  const total = r.byCategory.reduce((a, c) => a + c.count, 0);
  return (
    <>
      <PageHeader title="التقارير" subtitle="ملخصات محسوبة من بياناتك المحلية فقط" />
      <div className="space-y-6 p-8">
        <Notice tone="indigo">تقارير الإنفاق والأداء الإعلاني غير متاحة في المرحلة 1 لأنها تحتاج ربط مزوّد حقيقي.</Notice>
        {total === 0 && r.byPlatform.every((p) => p.count === 0) ? <Empty title="لا بيانات للتقرير بعد." /> : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card title="الأنشطة النشطة حسب الفئة">
              <ul className="space-y-1.5 text-sm" data-testid="report-category">{r.byCategory.map((c) => <li key={c.category} className="flex justify-between"><span>{c.category}</span><span className="tabular-nums text-slate-400">{c.count}</span></li>)}</ul>
            </Card>
            <Card title="الحسابات الاجتماعية حسب المنصة">
              <ul className="space-y-1.5 text-sm" data-testid="report-platform">{r.byPlatform.map((p) => <li key={p.platform} className="flex justify-between"><span>{PLATFORM_LABEL[p.platform]}</span><span className="tabular-nums text-slate-400">{p.count}</span></li>)}</ul>
            </Card>
            <Card title="الحسابات الإعلانية حسب المزوّد">
              {r.byProvider.length === 0 ? <p className="text-sm text-slate-500">لا توجد.</p> : <ul className="space-y-1.5 text-sm">{r.byProvider.map((p) => <li key={p.provider} className="flex justify-between"><span>{PROVIDER_LABEL[p.provider]}</span><span className="tabular-nums text-slate-400">{p.count}</span></li>)}</ul>}
            </Card>
            <Card title="ملاحظات تشغيلية">
              <ul className="space-y-1.5 text-sm text-slate-300"><li>ملفات متصفح بلا بروكسي: <b data-testid="report-noproxy">{r.profilesWithoutProxy}</b></li><li>أنشطة نشطة بلا أي حساب اجتماعي: <b>{r.businessesWithoutAccounts}</b></li></ul>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
