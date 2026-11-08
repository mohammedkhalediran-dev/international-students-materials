import { useState, type FormEvent } from 'react';
import type { Group, GroupInput } from '../../shared/types';
import { IconEdit, IconTrash } from './icons';
import { Modal } from './Modal';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#84cc16'];

interface Props {
  groups: Group[];
  onCreate: (input: GroupInput) => Promise<boolean>;
  onUpdate: (id: number, input: GroupInput) => Promise<boolean>;
  onDelete: (g: Group) => void;
  onClose: () => void;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="اللون">
      {COLORS.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-slate-900 transition ${value === c ? 'ring-2 ring-slate-200' : ''}`} style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}

export function GroupsModal({ groups, onCreate, onUpdate, onDelete, onClose }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLORS[0]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await onCreate({ name, color })) setName('');
  };
  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (editId !== null && (await onUpdate(editId, { name: editName, color: editColor }))) setEditId(null);
  };

  return (
    <Modal title="إدارة التصنيفات" onClose={onClose}>
      <form onSubmit={add} className="mb-5 space-y-3 rounded-xl border border-slate-800 p-3">
        <label className="label" htmlFor="grp-name">تصنيف جديد</label>
        <input id="grp-name" className="input" maxLength={40} placeholder="مثال: متاجر" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex items-center justify-between">
          <ColorPicker value={color} onChange={setColor} />
          <button className="btn btn-primary" type="submit" disabled={!name.trim()}>إضافة</button>
        </div>
      </form>
      {groups.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">لا توجد تصنيفات بعد.</p>
      ) : (
        <ul className="space-y-1.5">
          {groups.map((g) => (
            <li key={g.id} className="rounded-lg bg-slate-800/50 px-3 py-2">
              {editId === g.id ? (
                <form onSubmit={saveEdit} className="space-y-2">
                  <input className="input" aria-label="اسم التصنيف" maxLength={40} value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} />
                  <div className="flex items-center justify-between">
                    <ColorPicker value={editColor} onChange={setEditColor} />
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-ghost" onClick={() => setEditId(null)}>إلغاء</button>
                      <button type="submit" className="btn btn-primary" disabled={!editName.trim()}>حفظ</button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="flex-1 truncate text-sm">{g.name}</span>
                  <span className="text-xs text-slate-500">{g.profileCount} ملف</span>
                  <button className="icon-btn" aria-label={`تعديل ${g.name}`} onClick={() => { setEditId(g.id); setEditName(g.name); setEditColor(g.color); }}><IconEdit /></button>
                  <button className="icon-btn hover:!text-rose-400" aria-label={`حذف ${g.name}`} onClick={() => onDelete(g)}><IconTrash /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
