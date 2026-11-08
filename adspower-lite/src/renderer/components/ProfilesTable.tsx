import type { Group, Profile } from '../../shared/types';
import { IconEdit, IconPlay, IconStop, IconTrash } from './icons';

interface Props {
  profiles: Profile[];
  groups: Group[];
  running: Set<string>;
  busy: Set<string>;
  onLaunch: (p: Profile) => void;
  onClose: (p: Profile) => void;
  onEdit: (p: Profile) => void;
  onDelete: (p: Profile) => void;
}

const dateFmt = new Intl.DateTimeFormat('ar-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });

function proxyLabel(p: Profile): string {
  return p.proxyType === 'none' ? 'بدون بروكسي' : `${p.proxyType}://${p.proxyHost}:${p.proxyPort}`;
}

export function ProfilesTable({ profiles, groups, running, busy, onLaunch, onClose, onEdit, onDelete }: Props) {
  const groupOf = (id: number | null) => groups.find((g) => g.id === id);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <table className="w-full text-sm" data-testid="profiles-table">
        <thead className="bg-slate-900 text-xs text-slate-400">
          <tr className="text-start">
            <th className="w-12 px-4 py-3 text-start font-medium">#</th>
            <th className="px-4 py-3 text-start font-medium">الاسم</th>
            <th className="px-4 py-3 text-start font-medium">التصنيف</th>
            <th className="px-4 py-3 text-start font-medium">البروكسي</th>
            <th className="px-4 py-3 text-start font-medium">آخر تشغيل</th>
            <th className="px-4 py-3 text-start font-medium">الحالة</th>
            <th className="px-4 py-3 text-start font-medium">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {profiles.map((p, i) => {
            const g = groupOf(p.groupId);
            const isRunning = running.has(p.id);
            const isBusy = busy.has(p.id);
            return (
              <tr key={p.id} data-profile={p.name} className="transition hover:bg-slate-800/40">
                <td className="px-4 py-3 tabular-nums text-slate-500">{i + 1}</td>
                <td className="max-w-[260px] px-4 py-3">
                  <div className="truncate font-medium text-slate-100" title={p.name}>{p.name}</div>
                  {p.notes && <div className="truncate text-xs text-slate-500" title={p.notes}>{p.notes}</div>}
                </td>
                <td className="px-4 py-3">
                  {g ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2 py-0.5 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                      {g.name}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400" dir="ltr"><span className="block text-start">{proxyLabel(p)}</span></td>
                <td className="px-4 py-3 text-xs text-slate-400">{p.lastOpenedAt ? dateFmt.format(p.lastOpenedAt) : 'لم يُشغَّل بعد'}</td>
                <td className="px-4 py-3">
                  <span data-status={isRunning ? 'running' : 'stopped'} className={`inline-flex items-center gap-1.5 text-xs ${isRunning ? 'text-emerald-300' : 'text-slate-500'}`}>
                    <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    {isRunning ? 'يعمل' : 'متوقف'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {isRunning ? (
                      <button className="btn btn-stop px-3 py-1.5" disabled={isBusy} onClick={() => onClose(p)} aria-label={`إغلاق ${p.name}`}><IconStop /> إغلاق</button>
                    ) : (
                      <button className="btn btn-start px-3 py-1.5" disabled={isBusy} onClick={() => onLaunch(p)} aria-label={`تشغيل ${p.name}`}><IconPlay /> تشغيل</button>
                    )}
                    <button className="icon-btn" onClick={() => onEdit(p)} title="تعديل" aria-label={`تعديل ${p.name}`}><IconEdit /></button>
                    <button className="icon-btn hover:!text-rose-400" onClick={() => onDelete(p)} title="حذف" aria-label={`حذف ${p.name}`}><IconTrash /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
