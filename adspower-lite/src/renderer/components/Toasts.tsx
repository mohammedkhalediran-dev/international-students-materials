export interface Toast {
  id: number;
  kind: 'ok' | 'err';
  text: string;
}

export function Toasts({ items }: { items: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 start-4 z-50 flex flex-col gap-2" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} role="status" className={`rounded-lg px-4 py-2.5 text-sm shadow-lg ring-1 ${t.kind === 'ok' ? 'bg-emerald-950 text-emerald-200 ring-emerald-700' : 'bg-rose-950 text-rose-200 ring-rose-700'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
