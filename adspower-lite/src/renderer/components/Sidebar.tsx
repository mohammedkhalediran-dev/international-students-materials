import type { Group } from '../../shared/types';
import { IconFolder, IconLayers, IconShield } from './icons';

export type GroupSelection = 'all' | 'none' | number;

interface Props {
  groups: Group[];
  total: number;
  ungrouped: number;
  selected: GroupSelection;
  onSelect: (g: GroupSelection) => void;
  onManage: () => void;
}

function Item({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: React.ReactNode; count: number }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-indigo-600/20 text-indigo-200' : 'text-slate-300 hover:bg-slate-800'}`}
    >
      {children}
      <span className="ms-auto rounded-md bg-slate-800 px-1.5 py-0.5 text-xs tabular-nums text-slate-400">{count}</span>
    </button>
  );
}

export function Sidebar({ groups, total, ungrouped, selected, onSelect, onManage }: Props) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-e border-slate-800 bg-slate-900/60">
      <div className="flex items-center gap-2.5 px-5 py-5 text-indigo-300">
        <IconShield />
        <div>
          <div className="text-base font-bold leading-tight text-slate-100">AdsPower Lite</div>
          <div className="text-[11px] text-slate-500">مدير ملفات المتصفح</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3" aria-label="التصنيفات">
        <div className="px-3 pb-1 pt-2 text-[11px] font-semibold tracking-wide text-slate-500">التصنيفات</div>
        <Item active={selected === 'all'} onClick={() => onSelect('all')} count={total}>
          <IconLayers /> كل الملفات
        </Item>
        {groups.map((g) => (
          <Item key={g.id} active={selected === g.id} onClick={() => onSelect(g.id)} count={g.profileCount}>
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
            <span className="truncate">{g.name}</span>
          </Item>
        ))}
        <Item active={selected === 'none'} onClick={() => onSelect('none')} count={ungrouped}>
          <IconFolder /> بدون تصنيف
        </Item>
      </nav>
      <div className="border-t border-slate-800 p-3">
        <button className="btn btn-ghost w-full" onClick={onManage}>إدارة التصنيفات</button>
      </div>
    </aside>
  );
}
