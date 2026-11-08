import { useState, type FormEvent, type ReactNode } from 'react';
import type { Integration, MetaConnection } from '../../shared/contract';
import { rawCall, useApp, useCall, useLoad } from '../ctx';
import { Badge, Confirm, Empty, Notice, PageHeader } from '../components/ui';
import { formatDate, INTEGRATION_LABEL, INTEGRATION_TONE } from '../labels';

function Card({ title, integ, children }: { title: string; integ?: Integration; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">{title}</h2>
        {integ && <Badge tone={INTEGRATION_TONE[integ.status]}>{INTEGRATION_LABEL[integ.status]}</Badge>}
      </div>
      {integ && <p className="mb-3 text-xs text-slate-400">{integ.detail}</p>}
      {children}
    </section>
  );
}

function Requirements({ integ }: { integ?: Integration }) {
  if (!integ) return null;
  return (
    <details className="mt-3 text-xs text-slate-400">
      <summary className="cursor-pointer text-slate-300">المتطلبات والإعداد</summary>
      <p className="mt-2 leading-relaxed">{integ.description}</p>
      <ul className="mt-2 list-disc space-y-1 ps-5">{integ.requires.map((r) => <li key={r}>{r}</li>)}</ul>
    </details>
  );
}

const connTone = { active: 'green', expired: 'rose', revoked: 'slate', error: 'rose' } as const;
const connLabel = { active: 'نشط', expired: 'منتهي', revoked: 'مفصول', error: 'خطأ' } as const;

export function Integrations() {
  const { bump, toast, version } = useApp();
  const call = useCall();
  const { data: integs } = useLoad('integrations:list', []);
  const { data: meta } = useLoad('meta:status', []);
  const { data: accounts } = useLoad('meta:accounts', []);
  const { data: businesses } = useLoad('businesses:list', [{ status: 'active' }]);
  const { data: tiktok } = useLoad('tiktok:status', []);
  const { data: wa } = useLoad('whatsapp:status', []);
  const { data: info } = useLoad('settings:info', []);
  const [appId, setAppId] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ t: 'disc'; c: MetaConnection } | { t: 'unlink'; id: string; name: string } | { t: 'clear' } | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [tk, setTk] = useState({ appId: '', secret: '' });
  const [w, setW] = useState({ waba: '', phone: '', token: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  void version;

  const guard = async (key: string, fn: () => Promise<string | null>) => {
    setBusy(key);
    setErr((e) => ({ ...e, [key]: '' }));
    const msg = await fn();
    setBusy(null);
    if (msg) setErr((e) => ({ ...e, [key]: msg }));
    bump();
  };
  const iMeta = integs?.find((i) => i.id === 'meta_marketing');
  const iTk = integs?.find((i) => i.id === 'tiktok_marketing');
  const iWa = integs?.find((i) => i.id === 'whatsapp_business');
  const noEnc = info && !info.encryptionAvailable;

  const saveMeta = (e: FormEvent) => {
    e.preventDefault();
    void guard('meta-save', async () => {
      const r = await rawCall('meta:saveCredentials', { appId, appSecret: secret || undefined });
      if (!r.ok) return r.error;
      setSecret('');
      toast('ok', 'تم حفظ بيانات التطبيق (السر مشفّر).');
      return null;
    });
  };

  return (
    <>
      <PageHeader title="التكاملات" subtitle="الحالات حقيقية: لا يظهر «متصل» إلا بعد تفويض أو تحقق ناجح" />
      <div className="space-y-6 p-8">
        {noEnc && <Notice>تشفير النظام غير متاح على هذا الجهاز، لذلك لن يُحفظ أي سر أو رمز وصول (لا نخزّن أسراراً كنص صريح).</Notice>}

        {/* ───────── Meta ───────── */}
        <Card title="Meta Marketing API (فيسبوك وإنستغرام) — قراءة فقط" integ={iMeta}>
          <form onSubmit={saveMeta} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="label" htmlFor="meta-appid">معرّف التطبيق (App ID)</label>
              <input id="meta-appid" dir="ltr" className="input text-left" value={appId || meta?.appId || ''} onChange={(e) => setAppId(e.target.value)} placeholder="1234567890" />
            </div>
            <div>
              <label className="label" htmlFor="meta-secret">سر التطبيق (App Secret)</label>
              <input id="meta-secret" dir="ltr" type="password" autoComplete="new-password" className="input text-left" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={meta?.hasSecret ? '•••••••• (محفوظ)' : ''} />
            </div>
            <div className="flex items-end gap-2">
              <button className="btn btn-primary" type="submit" disabled={busy === 'meta-save' || !(appId || meta?.appId)} data-testid="meta-save">حفظ</button>
              {meta?.configured && <button type="button" className="btn btn-ghost" onClick={() => setConfirm({ t: 'clear' })}>مسح</button>}
            </div>
          </form>
          {err['meta-save'] && <p role="alert" className="mt-2 text-sm text-rose-300">{err['meta-save']}</p>}
          <p className="mt-2 text-xs text-slate-500" dir="ltr">Redirect URI: {meta?.redirectUri} · API {meta?.apiVersion}</p>
          <p className="text-xs text-slate-500">الصلاحيات المطلوبة: {meta?.scopes.join('، ')} — للقراءة فقط؛ لا يُنشئ البرنامج ولا يعدّل حملات أو ميزانيات.</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {meta?.connecting ? (
              <>
                <span className="text-sm text-amber-300">بانتظار إكمال تسجيل الدخول في المتصفح…</span>
                <button className="btn btn-ghost" onClick={() => void call('meta:cancelConnect')}>إلغاء</button>
              </>
            ) : (
              <button className="btn btn-primary" disabled={!meta?.configured || busy === 'connect'} data-testid="meta-connect"
                onClick={() => void guard('connect', async () => {
                  const p = rawCall('meta:connect');
                  bump();
                  const r = await p;
                  if (!r.ok) return r.error;
                  toast('ok', `تم الربط بحساب ${r.data.fbUserName ?? ''}.`);
                  return null;
                })}>تسجيل الدخول عبر Meta</button>
            )}
            {err.connect && <span role="alert" className="text-sm text-rose-300">{err.connect}</span>}
          </div>
          <Requirements integ={iMeta} />

          <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-200">الاتصالات</h3>
          {(meta?.connections ?? []).length === 0 ? <Empty title="لا توجد اتصالات Meta." /> : (
            <ul className="space-y-2" data-testid="meta-connections">
              {meta!.connections.map((c) => (
                <li key={c.id} className="rounded-lg border border-slate-800 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-100">{c.fbUserName ?? c.fbUserId}</span>
                    <Badge tone={connTone[c.status]}>{connLabel[c.status]}</Badge>
                    <span className="text-xs text-slate-500">ينتهي الرمز: {formatDate(c.tokenExpiresAt)}</span>
                    <span className="text-xs text-slate-500">{c.adAccountCount} حساب إعلاني</span>
                    <div className="ms-auto flex gap-1">
                      <button className="btn btn-ghost px-3 py-1 text-xs" disabled={c.status !== 'active' || busy === `d-${c.id}`} onClick={() => void guard(`d-${c.id}`, async () => { const r = await rawCall('meta:discover', { connectionId: c.id }); if (!r.ok) return r.error; toast('ok', `تم اكتشاف ${r.data.length} حساباً إعلانياً.`); return null; })}>اكتشاف الحسابات الإعلانية</button>
                      {c.status !== 'revoked' && <button className="btn btn-ghost px-3 py-1 text-xs" onClick={() => setConfirm({ t: 'disc', c })}>فصل</button>}
                    </div>
                  </div>
                  {c.lastError && <p className="mt-1 text-xs text-rose-300">آخر خطأ: {c.lastError}</p>}
                  {c.rateLimitedUntil && c.rateLimitedUntil > Date.now() && <p className="mt-1 text-xs text-amber-300">حد الطلبات مفعّل حتى {formatDate(c.rateLimitedUntil)}</p>}
                  {err[`d-${c.id}`] && <p role="alert" className="mt-1 text-xs text-rose-300">{err[`d-${c.id}`]}</p>}
                </li>
              ))}
            </ul>
          )}

          <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-200">الحسابات الإعلانية المكتشفة وربطها بالأنشطة</h3>
          {(accounts ?? []).length === 0 ? <Empty title="لم تُكتشف حسابات بعد." hint="سجّل الدخول ثم اضغط «اكتشاف الحسابات الإعلانية»." /> : (
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-sm" data-testid="meta-accounts">
                <thead className="bg-slate-900 text-xs text-slate-400"><tr><th className="px-3 py-2 text-start font-medium">الحساب</th><th className="px-3 py-2 text-start font-medium">العملة</th><th className="px-3 py-2 text-start font-medium">النشاط المرتبط</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {accounts!.map((a) => (
                    <tr key={a.externalId}>
                      <td className="px-3 py-2"><div className="text-slate-100">{a.name}</div><div className="text-xs text-slate-500" dir="ltr">{a.externalId}{a.metaBusinessName ? ` · ${a.metaBusinessName}` : ''}</div></td>
                      <td className="px-3 py-2 text-xs text-slate-400">{a.currency ?? '—'}</td>
                      <td className="px-3 py-2">
                        {a.linkedBusinessId ? (
                          <div className="flex items-center gap-2"><Badge tone="green">{a.linkedBusinessName}</Badge><button className="btn btn-ghost px-2.5 py-1 text-xs" onClick={() => setConfirm({ t: 'unlink', id: a.linkedAdAccountId!, name: a.name })}>فكّ الربط</button></div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select className="input w-48 py-1" aria-label={`نشاط ${a.name}`} value={pick[a.externalId] ?? ''} onChange={(e) => setPick((p) => ({ ...p, [a.externalId]: e.target.value }))}>
                              <option value="">اختر النشاط…</option>{(businesses ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <button className="btn btn-primary px-3 py-1 text-xs" disabled={!pick[a.externalId]} onClick={() => void guard(`l-${a.externalId}`, async () => { const r = await rawCall('meta:link', { externalId: a.externalId, businessId: pick[a.externalId] }); if (!r.ok) return r.error; toast('ok', 'تم ربط الحساب بالنشاط.'); return null; })}>ربط</button>
                          </div>
                        )}
                        {err[`l-${a.externalId}`] && <p role="alert" className="mt-1 text-xs text-rose-300">{err[`l-${a.externalId}`]}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ───────── TikTok ───────── */}
        <Card title="TikTok Marketing API" integ={iTk}>
          <Notice tone="indigo">التفويض الكامل وقراءة الحملات غير منفّذين بعد في هذا الإصدار؛ هذه البنية تحفظ الإعدادات فقط، ولن تظهر الحالة «متصل».</Notice>
          <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void guard('tk', async () => { const r = await rawCall('tiktok:saveConfig', { appId: tk.appId || tiktok?.appId || '', appSecret: tk.secret || undefined }); if (!r.ok) return r.error; setTk({ appId: '', secret: '' }); toast('ok', 'تم حفظ إعدادات TikTok.'); return null; }); }}>
            <div><label className="label" htmlFor="tk-id">App ID</label><input id="tk-id" dir="ltr" className="input text-left" value={tk.appId || tiktok?.appId || ''} onChange={(e) => setTk({ ...tk, appId: e.target.value })} /></div>
            <div><label className="label" htmlFor="tk-secret">App Secret</label><input id="tk-secret" dir="ltr" type="password" autoComplete="new-password" className="input text-left" value={tk.secret} placeholder={tiktok?.hasSecret ? '•••••••• (محفوظ)' : ''} onChange={(e) => setTk({ ...tk, secret: e.target.value })} /></div>
            <div className="flex items-end"><button className="btn btn-ghost" type="submit" disabled={busy === 'tk'}>حفظ الإعدادات</button></div>
          </form>
          {err.tk && <p role="alert" className="mt-2 text-sm text-rose-300">{err.tk}</p>}
          {tiktok && <p className="mt-2 text-xs text-slate-500" dir="ltr">Redirect URL (للتسجيل في TikTok): {tiktok.redirectUri}</p>}
          <Requirements integ={iTk} />
        </Card>

        {/* ───────── WhatsApp ───────── */}
        <Card title="WhatsApp Business Cloud API" integ={iWa}>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); void guard('wa', async () => { const r = await rawCall('whatsapp:saveConfig', { wabaId: w.waba || wa?.wabaId || '', phoneNumberId: w.phone || wa?.phoneNumberId || '', accessToken: w.token || undefined }); if (!r.ok) return r.error; setW({ waba: '', phone: '', token: '' }); toast('ok', 'تم حفظ الإعدادات. اضغط «تحقق» للتأكد من الرقم.'); return null; }); }}>
            <div><label className="label" htmlFor="wa-waba">WABA ID</label><input id="wa-waba" dir="ltr" className="input text-left" value={w.waba || wa?.wabaId || ''} onChange={(e) => setW({ ...w, waba: e.target.value })} /></div>
            <div><label className="label" htmlFor="wa-phone">Phone Number ID</label><input id="wa-phone" dir="ltr" className="input text-left" value={w.phone || wa?.phoneNumberId || ''} onChange={(e) => setW({ ...w, phone: e.target.value })} /></div>
            <div><label className="label" htmlFor="wa-token">رمز الوصول</label><input id="wa-token" dir="ltr" type="password" autoComplete="new-password" className="input text-left" value={w.token} placeholder={wa?.hasToken ? '•••••••• (محفوظ)' : ''} onChange={(e) => setW({ ...w, token: e.target.value })} /></div>
            <div className="flex items-end gap-2">
              <button className="btn btn-ghost" type="submit" disabled={busy === 'wa'}>حفظ</button>
              <button className="btn btn-primary" type="button" disabled={!wa?.hasToken || busy === 'wa-verify'} onClick={() => void guard('wa-verify', async () => { const r = await rawCall('whatsapp:verify'); if (!r.ok) return r.error; toast('ok', `تم التحقق: ${r.data.verifiedName ?? ''}`); return null; })}>تحقق</button>
            </div>
          </form>
          {err.wa && <p role="alert" className="mt-2 text-sm text-rose-300">{err.wa}</p>}
          {err['wa-verify'] && <p role="alert" className="mt-2 text-sm text-rose-300">{err['wa-verify']}</p>}
          {wa?.verifiedAt && <p className="mt-2 text-xs text-slate-400">{wa.verifiedName} · {wa.displayPhone} · الجودة: {wa.qualityRating ?? '—'} · تم التحقق {formatDate(wa.verifiedAt)}</p>}
          <Requirements integ={iWa} />
        </Card>
      </div>

      {confirm?.t === 'disc' && <Confirm title="فصل اتصال Meta" confirmLabel="فصل" onCancel={() => setConfirm(null)} message="سيُحذف رمز الوصول المحفوظ وتصبح الحسابات الإعلانية «غير متصلة». البيانات المخزّنة سابقاً تبقى للاطلاع." onConfirm={() => { const c = confirm.c; setConfirm(null); void call('meta:disconnect', { id: c.id }).then(() => { toast('ok', 'تم الفصل.'); bump(); }); }} />}
      {confirm?.t === 'unlink' && <Confirm title="فكّ ربط الحساب الإعلاني" confirmLabel="فكّ الربط وحذف البيانات المحلية" onCancel={() => setConfirm(null)} message={`سيُحذف «${confirm.name}» من النشاط مع حملاته وإحصاءاته المخزّنة محلياً. لا يتأثر أي شيء في Meta.`} onConfirm={() => { const id = confirm.id; setConfirm(null); void call('meta:unlink', { adAccountId: id }).then(() => { toast('ok', 'تم فكّ الربط.'); bump(); }); }} />}
      {confirm?.t === 'clear' && <Confirm title="مسح بيانات تطبيق Meta" confirmLabel="مسح" onCancel={() => setConfirm(null)} message="سيُحذف App ID وSecret المحفوظان. الاتصالات القائمة تبقى حتى تفصلها." onConfirm={() => { setConfirm(null); void call('meta:clearCredentials').then(() => { toast('ok', 'تم المسح.'); bump(); }); }} />}
    </>
  );
}
