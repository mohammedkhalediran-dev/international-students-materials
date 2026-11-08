import { useLoad } from '../ctx';
import { Badge, Empty, Notice, PageHeader } from '../components/ui';

export function Campaigns() {
  const { data: list } = useLoad('campaigns:list', [{}]);
  const { data: ints } = useLoad('integrations:list', []);
  return (
    <>
      <PageHeader title="الحملات" subtitle="للقراءة فقط · تُملأ بعد ربط مزوّد إعلانات حقيقي" />
      <div className="space-y-6 p-8">
        <Notice tone="indigo">المرحلة 1 محلية بالكامل: لا يوجد اتصال بـ Meta أو TikTok، ولذلك لا حملات ولا إنفاق ولا نتائج. لا نعرض أرقاماً مولَّدة أو تجريبية.</Notice>
        {(list ?? []).length === 0 ? <Empty title="لا توجد حملات." hint="ستظهر هنا الحملات المزامَنة من المزوّد بعد تفعيل التكامل في مرحلة لاحقة." /> : <p className="text-sm">{list!.length} حملة</p>}
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {(ints ?? []).map((i) => (
            <li key={i.id} className="rounded-xl border border-slate-800 p-4">
              <div className="flex items-center justify-between"><span className="font-medium text-slate-200">{i.name}</span><Badge tone="amber">غير متصل</Badge></div>
              <p className="mt-2 text-xs text-slate-500">يتطلب: {i.requires.join('، ')}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
