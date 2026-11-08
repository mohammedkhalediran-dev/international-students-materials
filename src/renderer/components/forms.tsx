import type { AdAccount, Business, BrowserProfile, Platform, Proxy, SocialAccount } from '../../shared/contract';
import { ACCOUNT_STATUSES, AD_PROVIDERS, PLATFORMS, PROXY_SCHEMES } from '../../shared/contract';
import { ACCOUNT_STATUS_LABEL, PLATFORM_LABEL, PROVIDER_LABEL } from '../labels';
import { rawCall, useApp, useLoad } from '../ctx';
import { FormModal, Notice, type Field } from './ui';

interface Done { onDone: () => void; onClose: () => void }
const sel = (items: { value: string; label: string }[]) => () => items;
const bizOptions = (bs: Business[] | undefined) => (bs ?? []).filter((b) => b.status === 'active').map((b) => ({ value: b.id, label: b.name }));

export function BusinessFormModal({ business, onDone, onClose }: Done & { business?: Business }) {
  const { toast } = useApp();
  const fields: Field[] = [
    { key: 'name', label: 'اسم النشاط', required: true },
    { key: 'category', label: 'الفئة', required: true, placeholder: 'مثال: مطاعم' },
    { key: 'color', label: 'اللون', type: 'color' },
    { key: 'notes', label: 'ملاحظات', type: 'textarea' },
  ];
  return (
    <FormModal
      title={business ? 'تعديل النشاط' : 'نشاط جديد'} fields={fields} onClose={onClose}
      initial={{ name: business?.name ?? '', category: business?.category ?? '', color: business?.color ?? '#6366f1', notes: business?.notes ?? '' }}
      onSubmit={async (v) => {
        const r = business ? await rawCall('businesses:update', { id: business.id, data: v as never }) : await rawCall('businesses:create', v as never);
        if (!r.ok) return r.error;
        toast('ok', business ? 'تم حفظ النشاط.' : 'تم إنشاء النشاط.');
        onDone();
        return null;
      }}
    />
  );
}

export function SocialFormModal({ account, businessId, platform, onDone, onClose }: Done & { account?: SocialAccount; businessId?: string; platform?: Platform }) {
  const { toast } = useApp();
  const { data: businesses } = useLoad('businesses:list', [{ status: 'active' }]);
  const fields: Field[] = [
    { key: 'businessId', label: 'النشاط', type: 'select', required: true, options: sel(bizOptions(businesses)), disabled: () => !!businessId && !account },
    { key: 'platform', label: 'المنصة', type: 'select', options: sel(PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABEL[p] }))) },
    { key: 'displayName', label: 'الاسم الظاهر', required: true },
    { key: 'usernameOrNumber', label: 'اسم المستخدم أو الرقم', ltr: true, hint: 'لا تُدخل أبداً كلمة مرور الحساب؛ البرنامج لا يخزّنها.' },
    { key: 'url', label: 'رابط الحساب', ltr: true, placeholder: 'https://…' },
    { key: 'status', label: 'الحالة', type: 'select', options: sel(ACCOUNT_STATUSES.map((s) => ({ value: s, label: ACCOUNT_STATUS_LABEL[s] }))) },
  ];
  if (!businesses) return null;
  return (
    <FormModal
      title={account ? 'تعديل الحساب' : 'حساب اجتماعي جديد'} fields={fields} onClose={onClose}
      initial={{ businessId: account?.businessId ?? businessId ?? bizOptions(businesses)[0]?.value ?? '', platform: account?.platform ?? platform ?? 'instagram', displayName: account?.displayName ?? '', usernameOrNumber: account?.usernameOrNumber ?? '', url: account?.url ?? '', status: account?.status ?? 'active' }}
      onSubmit={async (v) => {
        const r = account ? await rawCall('social:update', { id: account.id, data: v as never }) : await rawCall('social:create', v as never);
        if (!r.ok) return r.error;
        toast('ok', 'تم الحفظ.');
        onDone();
        return null;
      }}
    />
  );
}

export function AdFormModal({ ad, businessId, onDone, onClose }: Done & { ad?: AdAccount; businessId?: string }) {
  const { toast } = useApp();
  const { data: businesses } = useLoad('businesses:list', [{ status: 'active' }]);
  const fields: Field[] = [
    { key: 'businessId', label: 'النشاط', type: 'select', required: true, options: sel(bizOptions(businesses)), disabled: () => !!businessId && !ad },
    { key: 'provider', label: 'المزوّد', type: 'select', options: sel(AD_PROVIDERS.map((p) => ({ value: p, label: PROVIDER_LABEL[p] }))) },
    { key: 'displayName', label: 'الاسم الظاهر', required: true },
    { key: 'externalId', label: 'معرّف الحساب الإعلاني (اختياري)', ltr: true },
  ];
  if (!businesses) return null;
  return (
    <FormModal
      title={ad ? 'تعديل الحساب الإعلاني' : 'حساب إعلاني جديد'} fields={fields} onClose={onClose}
      initial={{ businessId: ad?.businessId ?? businessId ?? bizOptions(businesses)[0]?.value ?? '', provider: ad?.provider ?? 'meta', displayName: ad?.displayName ?? '', externalId: ad?.externalId ?? '' }}
      footerNote={<Notice tone="indigo">يُسجَّل الحساب هنا كسجل محلي فقط، وحالته «غير متصل». لا يوجد ربط فعلي بـ Meta أو TikTok في المرحلة 1.</Notice>}
      onSubmit={async (v) => {
        const r = ad ? await rawCall('ads:update', { id: ad.id, data: v as never }) : await rawCall('ads:create', v as never);
        if (!r.ok) return r.error;
        toast('ok', 'تم الحفظ.');
        onDone();
        return null;
      }}
    />
  );
}

export function ProxyFormModal({ proxy, onDone, onClose }: Done & { proxy?: Proxy }) {
  const { toast } = useApp();
  const { data: info } = useLoad('settings:info', []);
  if (!info) return null;
  const fields: Field[] = [
    { key: 'name', label: 'اسم البروكسي', required: true },
    { key: 'scheme', label: 'النوع', type: 'select', options: sel(PROXY_SCHEMES.map((s) => ({ value: s, label: s.toUpperCase() }))) },
    { key: 'host', label: 'العنوان', required: true, ltr: true },
    { key: 'port', label: 'المنفذ', required: true, type: 'number', ltr: true },
    { key: 'username', label: 'اسم المستخدم (اختياري)', ltr: true, hidden: (v) => v.scheme === 'socks5' },
    { key: 'password', label: 'كلمة المرور (اختياري)', type: 'password', ltr: true, hidden: (v) => v.scheme === 'socks5', disabled: (v) => v.clearPassword === '1', placeholder: proxy?.hasSecret ? '•••••••• (محفوظة)' : '' },
    { key: 'clearPassword', label: 'حذف كلمة المرور المحفوظة', type: 'select', hidden: (v) => v.scheme === 'socks5' || !proxy?.hasSecret, options: sel([{ value: '', label: 'لا، أبقِها' }, { value: '1', label: 'نعم، احذفها' }]) },
  ];
  return (
    <FormModal
      title={proxy ? 'تعديل البروكسي' : 'بروكسي جديد'} fields={fields} onClose={onClose}
      initial={{ name: proxy?.name ?? '', scheme: proxy?.scheme ?? 'http', host: proxy?.host ?? '', port: proxy?.port?.toString() ?? '', username: proxy?.username ?? '', password: '', clearPassword: '' }}
      footerNote={
        <>
          <Notice tone="indigo">SOCKS5 مدعوم بدون مصادقة فقط، لأن Chromium لا يدعم اسم مستخدم وكلمة مرور مع SOCKS. للمصادقة استخدم HTTP/HTTPS.</Notice>
          {info.encryptionAvailable ? (
            <p className="text-xs text-slate-500">تُحفظ كلمة المرور مشفّرة بتشفير النظام ({info.encryptionBackend}) في جدول منفصل ولا تُعرض مجدداً.</p>
          ) : (
            <Notice>تشفير النظام غير متاح هنا، لذلك لن يُحفظ أي سر (كلمة مرور). يمكنك استخدام بروكسي بلا كلمة مرور فقط.</Notice>
          )}
        </>
      }
      onSubmit={async (v) => {
        const data = { name: v.name, scheme: v.scheme, host: v.host, port: v.port ? Number(v.port) : 0, username: v.username, password: v.password || undefined, clearPassword: v.clearPassword === '1' } as never;
        const r = proxy ? await rawCall('proxies:update', { id: proxy.id, data }) : await rawCall('proxies:create', data);
        if (!r.ok) return r.error;
        toast('ok', 'تم حفظ البروكسي.');
        onDone();
        return null;
      }}
    />
  );
}

export function ProfileFormModal({ profile, businessId, socialAccountId, onDone, onClose }: Done & { profile?: BrowserProfile; businessId?: string; socialAccountId?: string }) {
  const { toast } = useApp();
  const { data: businesses } = useLoad('businesses:list', [{ status: 'active' }]);
  const { data: social } = useLoad('social:list', [{}]);
  const { data: proxies } = useLoad('proxies:list', []);
  if (!businesses || !social || !proxies) return null;
  const fields: Field[] = [
    { key: 'businessId', label: 'النشاط', type: 'select', required: true, options: sel(bizOptions(businesses)), disabled: () => !!profile || !!businessId },
    { key: 'name', label: 'اسم الملف', required: true },
    { key: 'socialAccountId', label: 'الحساب الاجتماعي (اختياري)', type: 'select', options: (v) => [{ value: '', label: 'بدون ربط' }, ...social.filter((s) => s.businessId === v.businessId).map((s) => ({ value: s.id, label: `${PLATFORM_LABEL[s.platform]} · ${s.displayName}` }))] },
    { key: 'homeUrl', label: 'الصفحة الرئيسية (اختياري)', ltr: true, placeholder: 'https://www.instagram.com' },
    { key: 'proxyId', label: 'البروكسي (اختياري)', type: 'select', options: sel([{ value: '', label: 'اتصال مباشر' }, ...proxies.map((p) => ({ value: p.id, label: `${p.name} (${p.scheme}://${p.host}:${p.port})` }))]) },
  ];
  return (
    <FormModal
      title={profile ? 'تعديل ملف المتصفح' : 'ملف متصفح جديد'} fields={fields} onClose={onClose}
      initial={{ businessId: profile?.businessId ?? businessId ?? bizOptions(businesses)[0]?.value ?? '', name: profile?.name ?? '', socialAccountId: profile?.socialAccountId ?? socialAccountId ?? '', homeUrl: profile?.homeUrl ?? '', proxyId: profile?.proxyId ?? '' }}
      footerNote={<p className="text-xs text-slate-500">لكل ملف جلسة مستقلة ودائمة (كوكيز وتخزين محلي). هذا عزل بين الجلسات وليس ضماناً لإخفاء البصمة أو تجاوز كشف المنصات. تنطبق تغييرات البروكسي عند التشغيل التالي.</p>}
      onSubmit={async (v) => {
        const data = { businessId: v.businessId, socialAccountId: v.socialAccountId || null, name: v.name, homeUrl: v.homeUrl, proxyId: v.proxyId || null } as never;
        const r = profile ? await rawCall('profiles:update', { id: profile.id, data }) : await rawCall('profiles:create', data);
        if (!r.ok) return r.error;
        toast('ok', 'تم حفظ الملف.');
        onDone();
        return null;
      }}
    />
  );
}
