import { useState, type FormEvent } from 'react';
import type { Group, Profile, ProfileInput, ProxyType } from '../../shared/types';
import { Modal } from './Modal';

interface Props {
  profile: Profile | null;
  groups: Group[];
  saving: boolean;
  onSave: (input: ProfileInput) => void;
  onClose: () => void;
}

const PROXY_TYPES: { value: ProxyType; label: string }[] = [
  { value: 'none', label: 'بدون بروكسي (اتصال مباشر)' },
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks5', label: 'SOCKS5' },
  { value: 'socks4', label: 'SOCKS4' },
];

export function ProfileModal({ profile, groups, saving, onSave, onClose }: Props) {
  const [name, setName] = useState(profile?.name ?? '');
  const [groupId, setGroupId] = useState<number | null>(profile?.groupId ?? null);
  const [startUrl, setStartUrl] = useState(profile?.startUrl ?? '');
  const [userAgent, setUserAgent] = useState(profile?.userAgent ?? '');
  const [notes, setNotes] = useState(profile?.notes ?? '');
  const [proxyType, setProxyType] = useState<ProxyType>(profile?.proxyType ?? 'none');
  const [proxyHost, setProxyHost] = useState(profile?.proxyHost ?? '');
  const [proxyPort, setProxyPort] = useState(profile?.proxyPort?.toString() ?? '');
  const [proxyUsername, setProxyUsername] = useState(profile?.proxyUsername ?? '');
  const [proxyPassword, setProxyPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);

  const hasProxy = proxyType !== 'none';
  const isSocks = proxyType === 'socks4' || proxyType === 'socks5';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      groupId,
      notes,
      startUrl,
      userAgent,
      proxyType,
      proxyHost,
      proxyPort: hasProxy && proxyPort.trim() !== '' ? Number(proxyPort) : null,
      proxyUsername,
      proxyPassword,
      clearProxyPassword: clearPassword,
    });
  };

  return (
    <Modal title={profile ? 'تعديل الملف' : 'ملف جديد'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="pf-name">اسم الملف *</label>
            <input id="pf-name" className="input" value={name} maxLength={80} autoFocus required onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="pf-group">التصنيف</label>
            <select id="pf-group" className="input" value={groupId ?? ''} onChange={(e) => setGroupId(e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">بدون تصنيف</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pf-url">رابط البداية (اختياري)</label>
          <input id="pf-url" dir="ltr" className="input text-left" placeholder="https://example.com" value={startUrl} onChange={(e) => setStartUrl(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pf-ua">وكيل المستخدم User-Agent (اختياري، الافتراضي للمتصفح إن تُرك فارغاً)</label>
          <input id="pf-ua" dir="ltr" className="input text-left" value={userAgent} maxLength={300} onChange={(e) => setUserAgent(e.target.value)} />
        </div>

        <fieldset className="space-y-3 rounded-xl border border-slate-800 p-4">
          <legend className="px-2 text-xs font-semibold text-slate-400">البروكسي</legend>
          <div>
            <label className="label" htmlFor="pf-ptype">النوع</label>
            <select id="pf-ptype" className="input" value={proxyType} onChange={(e) => setProxyType(e.target.value as ProxyType)}>
              {PROXY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {hasProxy && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="label" htmlFor="pf-phost">العنوان</label>
                  <input id="pf-phost" dir="ltr" className="input text-left" placeholder="proxy.example.com" value={proxyHost} required onChange={(e) => setProxyHost(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="pf-pport">المنفذ</label>
                  <input id="pf-pport" dir="ltr" className="input text-left" inputMode="numeric" placeholder="8080" value={proxyPort} required onChange={(e) => setProxyPort(e.target.value.replace(/\D/g, '').slice(0, 5))} />
                </div>
              </div>
              {isSocks ? (
                <p className="text-xs text-amber-300/90">Chromium لا يدعم اسم مستخدم وكلمة مرور مع SOCKS؛ استخدم HTTP/HTTPS إن كان بروكسيك يحتاج مصادقة.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="pf-puser">اسم المستخدم</label>
                    <input id="pf-puser" dir="ltr" autoComplete="off" className="input text-left" value={proxyUsername} onChange={(e) => setProxyUsername(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="pf-ppass">كلمة المرور</label>
                    <input id="pf-ppass" dir="ltr" type="password" autoComplete="new-password" className="input text-left" value={proxyPassword} disabled={clearPassword}
                      placeholder={profile?.hasProxyPassword ? '•••••••• (محفوظة)' : ''} onChange={(e) => setProxyPassword(e.target.value)} />
                  </div>
                  <p className="col-span-2 text-xs text-slate-500">تُحفظ كلمة المرور مشفّرة بتشفير النظام ولا تُعرض مرة أخرى.</p>
                  {profile?.hasProxyPassword && (
                    <label className="col-span-2 flex items-center gap-2 text-xs text-slate-400">
                      <input type="checkbox" checked={clearPassword} onChange={(e) => setClearPassword(e.target.checked)} /> حذف كلمة المرور المحفوظة
                    </label>
                  )}
                </div>
              )}
            </>
          )}
        </fieldset>

        <div>
          <label className="label" htmlFor="pf-notes">ملاحظات</label>
          <textarea id="pf-notes" className="input min-h-[72px] resize-y" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {profile && <p className="text-xs text-slate-500">تنطبق تغييرات البروكسي ووكيل المستخدم عند التشغيل التالي للملف.</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>
        </div>
      </form>
    </Modal>
  );
}
