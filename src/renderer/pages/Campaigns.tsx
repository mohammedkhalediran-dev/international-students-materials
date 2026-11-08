import { Fragment, useMemo, useState } from 'react';
import type { AdRow, AdSetRow, Metrics } from '../../shared/contract';
import { rawCall, useApp, useCall, useLoad } from '../ctx';
import { Badge, Empty, Notice, PageHeader, Skeleton } from '../components/ui';
import { formatDate } from '../labels';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
const nf = new Intl.NumberFormat('ar-u-nu-latn');
const money = (v: number, cur: string | null) => { try { return new Intl.NumberFormat('en-US', cur && cur.length === 3 ? { style: 'currency', currency: cur } : { maximumFractionDigits: 2 }).format(v); } catch { return `${v.toFixed(2)} ${cur ?? ''}`; } };
const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(2)}%`);
const PLATFORM_NAME: Record<string, string> = { facebook: 'فيسبوك', instagram: 'إنستغرام', audience_network: 'Audience Network', messenger: 'ماسنجر', whatsapp: 'واتساب', unknown: 'غير محدد' };
const STATUS_TONE = (s: string) => (s === 'ACTIVE' ? 'green' : s === 'PAUSED' ? 'amber' : 'slate') as 'green' | 'amber' | 'slate';

function MetricCells({ m, cur }: { m: Metrics; cur: string | null }) {
  return (
    <>
      <td className="px-3 py-2.5 tabular-nums">{money(m.spend, cur)}</td>
      <td className="px-3 py-2.5 tabular-nums">{nf.format(m.impressions)}</td>
      <td className="px-3 py-2.5 tabular-nums">{nf.format(m.clicks)}</td>
      <td className="px-3 py-2.5 tabular-nums">{pct(m.ctr)}</td>
      <td className="px-3 py-2.5 tabular-nums">{m.cpc === null ? '—' : money(m.cpc, cur)}</td>
      <td className="px-3 py-2.5 tabular-nums">{nf.format(m.conversions)}</td>
    </>
  );
}

function AdsList({ adSetId, since, until, cur }: { adSetId: string; since: string; until: string; cur: string | null }) {
  const { data: ads } = useLoad('analytics:ads', [{ adSetId, since, until }]);
  return (
    <>
      {(ads ?? []).map((a: AdRow) => (
        <tr key={a.id} className="bg-slate-950/60 text-xs text-slate-300">
          <td className="py-1.5 ps-16 pe-3">{a.name}</td>
          <td className="px-3 py-1.5"><Badge tone={STATUS_TONE(a.status)}>{a.status}</Badge></td>
          <MetricCells m={a.metrics} cur={cur} />
        </tr>
      ))}
    </>
  );
}

function Drill({ campaignId, since, until, cur }: { campaignId: string; since: string; until: string; cur: string | null }) {
  const { data: sets } = useLoad('analytics:adsets', [{ campaignId, since, until }]);
  const [open, setOpen] = useState<string | null>(null);
  if (!sets) return <tr><td colSpan={8} className="px-6 py-3 text-xs text-slate-500">جارٍ التحميل…</td></tr>;
  if (sets.length === 0) return <tr><td colSpan={8} className="px-6 py-3 text-xs text-slate-500">لا مجموعات إعلانية مخزّنة لهذه الحملة.</td></tr>;
  return (
    <>
      {sets.map((s: AdSetRow) => (
        <Fragment key={s.id}>
          <tr className="bg-slate-900/80 text-xs">
            <td className="py-2 ps-10 pe-3"><button className="text-indigo-300 hover:underline" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>{open === s.id ? '▾' : '◂'} {s.name}</button><div className="text-[11px] text-slate-500">{s.optimizationGoal ?? ''} {s.dailyBudget !== null ? `· ميزانية يومية ${money(s.dailyBudget, cur)}` : ''}</div></td>
            <td className="px-3 py-2"><Badge tone={STATUS_TONE(s.status)}>{s.status}</Badge></td>
            <MetricCells m={s.metrics} cur={cur} />
          </tr>
          {open === s.id && <AdsList adSetId={s.id} since={since} until={until} cur={cur} />}
        </Fragment>
      ))}
    </>
  );
}

export function Campaigns() {
  const { go, bump, toast } = useApp();
  const call = useCall();
  const [since, setSince] = useState(daysAgo(29));
  const [until, setUntil] = useState(daysAgo(0));
  const [adAccountId, setAdAccountId] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const rangeOk = since <= until;

  const { data: ads } = useLoad('ads:list', [{}]);
  const metaAds = useMemo(() => (ads ?? []).filter((a) => a.provider === 'meta' && a.connectionId), [ads]);
  const args = { since, until, adAccountId: adAccountId || undefined, query: query || undefined, status: status || undefined, page, pageSize };
  const { data: result, loading } = useLoad('analytics:campaigns', [args], [rangeOk]);
  const { data: split } = useLoad('analytics:platforms', [{ adAccountId: adAccountId || undefined, since, until }], [rangeOk]);
  const { data: runs } = useLoad('analytics:syncRuns', [{ adAccountId: adAccountId || undefined }]);
  const last = runs?.[0];

  const preset = (n: number) => { setSince(daysAgo(n - 1)); setUntil(daysAgo(0)); setPage(1); };
  const targets = adAccountId ? metaAds.filter((a) => a.id === adAccountId) : metaAds;
  const connectedTargets = targets.filter((a) => a.connectionStatus === 'connected');

  const sync = async () => {
    setSyncing(true);
    setSyncError('');
    let ok = 0;
    for (const a of connectedTargets) {
      const r = await rawCall('meta:sync', { adAccountId: a.id, since, until });
      if (r.ok) { ok++; if (r.data.status === 'partial') toast('err', `«${a.displayName}»: البيانات جزئية (تجاوزت حد الصفحات).`); }
      else { setSyncError(`${a.displayName}: ${r.error}`); break; }
    }
    setSyncing(false);
    if (ok > 0) toast('ok', `تمت مزامنة ${ok} حساب (قراءة فقط).`);
    bump();
  };
  void call;

  return (
    <>
      <PageHeader title="الحملات والتحليلات" subtitle="بيانات Meta الحقيقية المخزّنة محلياً — للقراءة فقط"
        actions={<button className="btn btn-primary" onClick={sync} disabled={syncing || !rangeOk || connectedTargets.length === 0} data-testid="btn-sync" title={connectedTargets.length === 0 ? 'لا حسابات متصلة للمزامنة' : ''}>{syncing ? 'جارٍ المزامنة…' : 'مزامنة الآن'}</button>} />
      <div className="space-y-5 p-8">
        {metaAds.length === 0 ? (
          <Empty title="لا توجد حسابات إعلانية مربوطة عبر Meta." hint="لن تظهر حملات أو أرقام إنفاق إلا من بيانات Meta الحقيقية بعد الربط. اربط حساب Meta ثم اكتشف الحسابات الإعلانية واربطها بنشاط."
            action={<button className="btn btn-primary" onClick={() => go({ name: 'integrations' })}>إلى صفحة التكاملات</button>} />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div><label className="label" htmlFor="c-acc">الحساب الإعلاني</label>
                <select id="c-acc" className="input w-56" value={adAccountId} onChange={(e) => { setAdAccountId(e.target.value); setPage(1); }}><option value="">كل الحسابات</option>{metaAds.map((a) => <option key={a.id} value={a.id}>{a.businessName} · {a.displayName}</option>)}</select></div>
              <div><label className="label" htmlFor="c-since">من</label><input id="c-since" type="date" className="input w-40" value={since} max={until} onChange={(e) => { setSince(e.target.value); setPage(1); }} /></div>
              <div><label className="label" htmlFor="c-until">إلى</label><input id="c-until" type="date" className="input w-40" value={until} min={since} max={daysAgo(0)} onChange={(e) => { setUntil(e.target.value); setPage(1); }} /></div>
              <div className="flex gap-1">{[7, 30, 90].map((n) => <button key={n} className="btn btn-ghost px-3 py-2 text-xs" onClick={() => preset(n)}>آخر {n} يوماً</button>)}</div>
              <div><label className="label" htmlFor="c-q">بحث</label><input id="c-q" className="input w-44" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="اسم الحملة" /></div>
              <div><label className="label" htmlFor="c-st">الحالة</label>
                <select id="c-st" className="input w-36" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">الكل</option><option value="ACTIVE">ACTIVE</option><option value="PAUSED">PAUSED</option><option value="ARCHIVED">ARCHIVED</option></select></div>
            </div>
            {!rangeOk && <Notice>تاريخ البداية بعد النهاية.</Notice>}
            {syncError && <p role="alert" className="rounded-lg bg-rose-950/60 px-3 py-2 text-sm text-rose-300">{syncError}</p>}
            {targets.some((a) => a.connectionStatus !== 'connected') && <Notice>بعض الحسابات غير متصلة (الرمز منتهٍ أو مفصول). تُعرض آخر بيانات مخزّنة؛ أعد الربط من التكاملات للمزامنة.</Notice>}
            <p className="text-xs text-slate-500" data-testid="last-sync">
              {last ? `آخر مزامنة: ${formatDate(last.finishedAt ?? last.startedAt)} — ${last.status === 'ok' ? 'ناجحة' : last.status === 'partial' ? 'جزئية' : last.status === 'error' ? `فشلت: ${last.error ?? ''}` : 'جارية'} (${last.since} → ${last.until})` : 'لم تتم أي مزامنة بعد. اضغط «مزامنة الآن» لجلب البيانات من Meta.'}
            </p>

            {result && result.totals.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="totals">
                {result.totals.map((t) => (
                  <div key={t.currency} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="mb-2 text-xs text-slate-400">الإجمالي ({t.currency})</div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><div className="text-[11px] text-slate-500">الإنفاق</div><div className="font-semibold tabular-nums">{money(t.spend, t.currency)}</div></div>
                      <div><div className="text-[11px] text-slate-500">الظهور</div><div className="font-semibold tabular-nums">{nf.format(t.impressions)}</div></div>
                      <div><div className="text-[11px] text-slate-500">النقرات</div><div className="font-semibold tabular-nums">{nf.format(t.clicks)}</div></div>
                      <div><div className="text-[11px] text-slate-500">CTR</div><div className="font-semibold tabular-nums">{pct(t.ctr)}</div></div>
                      <div><div className="text-[11px] text-slate-500">CPC</div><div className="font-semibold tabular-nums">{t.cpc === null ? '—' : money(t.cpc, t.currency)}</div></div>
                      <div><div className="text-[11px] text-slate-500">التحويلات</div><div className="font-semibold tabular-nums">{nf.format(t.conversions)}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {split && split.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4" data-testid="platform-split">
                <div className="mb-2 text-xs text-slate-400">الإنفاق حسب منصة النشر (من Meta)</div>
                <div className="flex flex-wrap gap-3">
                  {split.map((x) => (
                    <div key={x.platform + x.currency} className="min-w-40 rounded-lg bg-slate-950/60 px-3 py-2 text-sm">
                      <div className="text-xs text-slate-400">{PLATFORM_NAME[x.platform] ?? x.platform}</div>
                      <div className="font-semibold tabular-nums">{money(x.spend, x.currency)}</div>
                      <div className="text-[11px] text-slate-500">{nf.format(x.impressions)} ظهور · {nf.format(x.clicks)} نقرة · CTR {pct(x.ctr)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!result && loading ? <Skeleton rows={5} /> : !result || result.total === 0 ? (
              <Empty title={query || status ? 'لا حملات مطابقة.' : 'لا توجد حملات مخزّنة.'} hint="الأرقام تأتي من Meta فقط؛ اضغط «مزامنة الآن» بعد ربط الحساب." />
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-sm" data-testid="campaigns-table">
                    <thead className="bg-slate-900 text-xs text-slate-400"><tr>
                      {['الحملة', 'الحالة', 'الإنفاق', 'الظهور', 'النقرات', 'CTR', 'CPC', 'التحويلات'].map((h) => <th key={h} className="px-3 py-3 text-start font-medium">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {result.rows.map((c) => (
                        <Fragment key={c.id}>
                          <tr data-campaign={c.name} className="hover:bg-slate-900/60">
                            <td className="px-3 py-2.5">
                              <button className="text-start text-slate-100 hover:text-indigo-300" onClick={() => setExpanded(expanded === c.id ? null : c.id)} aria-expanded={expanded === c.id}>{expanded === c.id ? '▾' : '◂'} {c.name}</button>
                              <div className="text-[11px] text-slate-500">{c.businessName} · {c.adAccountName} · {c.objective ?? ''} {c.dailyBudget !== null ? `· ميزانية يومية ${money(c.dailyBudget, c.currency)}` : ''}</div>
                            </td>
                            <td className="px-3 py-2.5"><Badge tone={STATUS_TONE(c.effectiveStatus ?? c.status)}>{c.effectiveStatus ?? c.status}</Badge></td>
                            <MetricCells m={c.metrics} cur={c.currency} />
                          </tr>
                          {expanded === c.id && <Drill campaignId={c.id} since={since} until={until} cur={c.currency} />}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <span>{result.total} حملة · صفحة {result.page} من {Math.max(1, Math.ceil(result.total / result.pageSize))}</span>
                  <div className="flex items-center gap-2">
                    <select className="input w-24 py-1" aria-label="حجم الصفحة" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}</select>
                    <button className="btn btn-ghost px-3 py-1" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</button>
                    <button className="btn btn-ghost px-3 py-1" disabled={page * pageSize >= result.total} onClick={() => setPage(page + 1)}>التالي</button>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">الوصول (Reach) في الإجماليات مجموع يومي وقد يتجاوز الوصول الفريد. التحويلات = مجموع أنواع actions المعلنة في الشيفرة (purchase، lead، complete_registration…). المبالغ بعملة الحساب الإعلاني.</p>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
