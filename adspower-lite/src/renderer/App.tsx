import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Group, GroupInput, Profile, ProfileInput, Result } from '../shared/types';
import { ConfirmDialog } from './components/ConfirmDialog';
import { GroupsModal } from './components/GroupsModal';
import { IconPlus, IconSearch } from './components/icons';
import { ProfileModal } from './components/ProfileModal';
import { ProfilesTable } from './components/ProfilesTable';
import { Sidebar, type GroupSelection } from './components/Sidebar';
import { Toasts, type Toast } from './components/Toasts';

type Dialog =
  | { type: 'profile'; profile: Profile | null }
  | { type: 'groups' }
  | { type: 'delete-profile'; profile: Profile }
  | { type: 'delete-group'; group: Group }
  | null;

export function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allCount, setAllCount] = useState(0);
  const [ungrouped, setUngrouped] = useState(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<GroupSelection>('all');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  /** يعرض رسالة الخطأ القادمة من العملية الرئيسية ويعيد البيانات عند النجاح. */
  const unwrap = useCallback(
    <T,>(r: Result<T>): T | undefined => {
      if (r.ok) return r.data;
      toast('err', r.error);
      return undefined;
    },
    [toast],
  );

  const refresh = useCallback(async () => {
    const [g, all, list] = await Promise.all([
      window.api.listGroups(),
      window.api.listProfiles({ query: '', group: 'all' }),
      window.api.listProfiles({ query: debounced, group: selected }),
    ]);
    const groupsData = unwrap(g);
    const allData = unwrap(all);
    const listData = unwrap(list);
    if (groupsData) setGroups(groupsData);
    if (allData) {
      setAllCount(allData.length);
      setUngrouped(allData.filter((p) => p.groupId === null).length);
    }
    if (listData) setProfiles(listData);
    setLoaded(true);
  }, [debounced, selected, unwrap]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    window.api.runningProfiles().then((r) => {
      const ids = unwrap(r);
      if (ids) setRunning(new Set(ids));
    });
    return window.api.onRunningChanged((ids) => {
      setRunning(new Set(ids));
      void refresh(); // آخر تشغيل يتغير
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusy((b) => new Set(b).add(id));
    try {
      await fn();
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(id);
        return n;
      });
    }
  };

  const launch = (p: Profile) =>
    withBusy(p.id, async () => {
      unwrap(await window.api.launchProfile(p.id));
    });
  const close = (p: Profile) =>
    withBusy(p.id, async () => {
      unwrap(await window.api.closeProfile(p.id));
    });

  const saveProfile = async (input: ProfileInput) => {
    if (dialog?.type !== 'profile') return;
    setSaving(true);
    const editing = dialog.profile;
    const r = editing ? await window.api.updateProfile(editing.id, input) : await window.api.createProfile(input);
    setSaving(false);
    if (unwrap(r)) {
      toast('ok', editing ? 'تم حفظ التعديلات.' : 'تم إنشاء الملف.');
      setDialog(null);
      await refresh();
    }
  };

  const confirmDeleteProfile = async () => {
    if (dialog?.type !== 'delete-profile') return;
    const p = dialog.profile;
    setSaving(true);
    const r = await window.api.deleteProfile(p.id);
    setSaving(false);
    if (r.ok) {
      toast('ok', `تم حذف «${p.name}» وبيانات جلسته.`);
      setDialog(null);
      await refresh();
    } else toast('err', r.error);
  };

  const createGroup = async (input: GroupInput) => {
    const ok = !!unwrap(await window.api.createGroup(input));
    if (ok) await refresh();
    return ok;
  };
  const updateGroup = async (id: number, input: GroupInput) => {
    const ok = !!unwrap(await window.api.updateGroup(id, input));
    if (ok) await refresh();
    return ok;
  };
  const confirmDeleteGroup = async () => {
    if (dialog?.type !== 'delete-group') return;
    const g = dialog.group;
    const r = await window.api.deleteGroup(g.id);
    if (r.ok) {
      if (selected === g.id) setSelected('all');
      setDialog({ type: 'groups' });
      await refresh();
    } else toast('err', r.error);
  };

  const title = useMemo(() => {
    if (selected === 'all') return 'كل الملفات';
    if (selected === 'none') return 'بدون تصنيف';
    return groups.find((g) => g.id === selected)?.name ?? 'الملفات';
  }, [selected, groups]);

  return (
    <div className="flex h-full">
      <Sidebar groups={groups} total={allCount} ungrouped={ungrouped} selected={selected} onSelect={setSelected} onManage={() => setDialog({ type: 'groups' })} />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-800 px-6 py-4">
          <div className="me-auto">
            <h1 className="text-lg font-bold text-slate-100">{title}</h1>
            <p className="text-xs text-slate-500">{profiles.length} ملف · {running.size} قيد التشغيل</p>
          </div>
          <div className="relative w-72">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-500"><IconSearch /></span>
            <input className="input ps-10" placeholder="ابحث بالاسم أو الملاحظات أو البروكسي" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="بحث" />
          </div>
          <button className="btn btn-primary" onClick={() => setDialog({ type: 'profile', profile: null })}><IconPlus /> ملف جديد</button>
        </header>
        <section className="flex-1 overflow-y-auto p-6">
          {!loaded ? null : profiles.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-slate-300">{debounced || selected !== 'all' ? 'لا توجد ملفات مطابقة.' : 'لا توجد ملفات متصفح بعد.'}</p>
              {!debounced && selected === 'all' && <button className="btn btn-primary" onClick={() => setDialog({ type: 'profile', profile: null })}><IconPlus /> أنشئ أول ملف</button>}
            </div>
          ) : (
            <ProfilesTable profiles={profiles} groups={groups} running={running} busy={busy} onLaunch={launch} onClose={close}
              onEdit={(p) => setDialog({ type: 'profile', profile: p })} onDelete={(p) => setDialog({ type: 'delete-profile', profile: p })} />
          )}
        </section>
      </main>

      {dialog?.type === 'profile' && <ProfileModal profile={dialog.profile} groups={groups} saving={saving} onSave={saveProfile} onClose={() => setDialog(null)} />}
      {dialog?.type === 'groups' && <GroupsModal groups={groups} onCreate={createGroup} onUpdate={updateGroup} onDelete={(g) => setDialog({ type: 'delete-group', group: g })} onClose={() => setDialog(null)} />}
      {dialog?.type === 'delete-profile' && (
        <ConfirmDialog title="حذف الملف" message={`سيُحذف «${dialog.profile.name}» نهائياً مع كل بيانات جلسته (الكوكيز والتخزين المحلي). لا يمكن التراجع.`} confirmLabel="حذف نهائي" busy={saving} onConfirm={confirmDeleteProfile} onCancel={() => setDialog(null)} />
      )}
      {dialog?.type === 'delete-group' && (
        <ConfirmDialog title="حذف التصنيف" message={`سيُحذف التصنيف «${dialog.group.name}». الملفات داخله لن تُحذف وستصبح بلا تصنيف.`} confirmLabel="حذف التصنيف" onConfirm={confirmDeleteGroup} onCancel={() => setDialog({ type: 'groups' })} />
      )}
      <Toasts items={toasts} />
    </div>
  );
}
