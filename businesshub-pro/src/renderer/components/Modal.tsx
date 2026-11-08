import { useEffect, type ReactNode } from 'react';
import { IconClose } from './icons';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-full w-full flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق"><IconClose /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
