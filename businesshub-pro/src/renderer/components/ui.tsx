import { useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from './Modal';

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'rose' | 'indigo' }) {
  const t = { slate: 'bg-slate-800 text-slate-300', green: 'bg-emerald-950 text-emerald-300', amber: 'bg-amber-950 text-amber-300', rose: 'bg-rose-950 text-rose-300', indigo: 'bg-indigo-950 text-indigo-300' }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${t}`}>{children}</span>;
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="جارٍ التحميل">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-900" />)}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-800 px-6 py-14 text-center">
      <p className="text-slate-300">{title}</p>
      {hint && <p className="max-w-md text-xs leading-relaxed text-slate-500">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-8 py-5">
      <div className="me-auto">
        <h1 className="text-xl font-bold text-slate-100">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Notice({ tone = 'amber', children }: { tone?: 'amber' | 'indigo'; children: ReactNode }) {
  const t = tone === 'amber' ? 'border-amber-800/60 bg-amber-950/30 text-amber-200' : 'border-indigo-800/60 bg-indigo-950/30 text-indigo-200';
  return <div className={`rounded-lg border px-4 py-3 text-xs leading-relaxed ${t}`}>{children}</div>;
}

interface ConfirmProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  /** إن وُجد: يجب كتابته حرفياً لتفعيل الزر (للحذف المدمّر) */
  typeToConfirm?: string;
  busy?: boolean;
  onConfirm: (typed: string) => void;
  onCancel: () => void;
}
export function Confirm({ title, message, confirmLabel, typeToConfirm, busy, onConfirm, onCancel }: ConfirmProps) {
  const [typed, setTyped] = useState('');
  const ok = !typeToConfirm || typed.trim() === typeToConfirm;
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="mb-4 text-sm leading-relaxed text-slate-300">{message}</div>
      {typeToConfirm && (
        <div className="mb-4">
          <label className="label" htmlFor="confirm-typed">اكتب «{typeToConfirm}» للتأكيد</label>
          <input id="confirm-typed" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
        <button className="btn btn-danger" disabled={!ok || busy} onClick={() => onConfirm(typed)} data-testid="confirm-yes">{confirmLabel}</button>
      </div>
    </Modal>
  );
}

// ───────── نموذج عام ─────────
export type Values = Record<string, string>;
export interface Field {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'color' | 'password' | 'number';
  options?: (v: Values) => { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  hidden?: (v: Values) => boolean;
  ltr?: boolean;
  placeholder?: string;
  disabled?: (v: Values) => boolean;
}
interface FormProps {
  title: string;
  fields: Field[];
  initial: Values;
  submitLabel?: string;
  /** يعيد نص الخطأ أو null عند النجاح */
  onSubmit: (v: Values) => Promise<string | null>;
  onClose: () => void;
  footerNote?: ReactNode;
}
export function FormModal({ title, fields, initial, submitLabel = 'حفظ', onSubmit, onClose, footerNote }: FormProps) {
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const err = await onSubmit(values);
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {fields.filter((f) => !f.hidden?.(values)).map((f) => {
          const id = `f-${f.key}`;
          const common = { id, value: values[f.key] ?? '', required: f.required, disabled: f.disabled?.(values) };
          return (
            <div key={f.key}>
              <label className="label" htmlFor={id}>{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'select' ? (
                <select className="input" {...common} onChange={(e) => set(f.key, e.target.value)}>
                  {(f.options?.(values) ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea className="input min-h-[72px] resize-y" {...common} onChange={(e) => set(f.key, e.target.value)} />
              ) : f.type === 'color' ? (
                <input type="color" className="h-9 w-16 cursor-pointer rounded border border-slate-700 bg-slate-950" {...common} onChange={(e) => set(f.key, e.target.value)} />
              ) : (
                <input
                  className={`input ${f.ltr ? 'text-left' : ''}`} dir={f.ltr ? 'ltr' : undefined} placeholder={f.placeholder}
                  type={f.type === 'password' ? 'password' : 'text'} inputMode={f.type === 'number' ? 'numeric' : undefined}
                  autoComplete={f.type === 'password' ? 'new-password' : 'off'} {...common}
                  onChange={(e) => set(f.key, f.type === 'number' ? e.target.value.replace(/\D/g, '').slice(0, 5) : e.target.value)}
                />
              )}
              {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
            </div>
          );
        })}
        {footerNote}
        {error && <p role="alert" className="rounded-lg bg-rose-950/60 px-3 py-2 text-sm text-rose-300" data-testid="form-error">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="btn btn-primary" disabled={saving} data-testid="form-submit">{saving ? 'جارٍ الحفظ…' : submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}
