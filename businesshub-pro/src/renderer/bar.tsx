import { StrictMode, useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import type { BarState } from '../shared/contract';
import { IconBack, IconClose, IconForward, IconReload } from './components/icons';
import './styles.css';

const EMPTY: BarState = { profileName: '', url: '', title: '', canGoBack: false, canGoForward: false, loading: false };

function Bar() {
  const [state, setState] = useState<BarState>(EMPTY);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const off = window.bar.onState(setState);
    window.bar.ready();
    return off;
  }, []);

  useEffect(() => {
    if (!editing) setText(state.url === 'about:blank' ? '' : state.url);
  }, [state.url, editing]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    window.bar.send({ cmd: 'navigate', url: text });
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <div className="flex h-full items-center gap-2 border-b border-slate-800 bg-slate-900 px-3">
      <span className="max-w-[180px] truncate rounded-md bg-indigo-600/20 px-2.5 py-1 text-xs font-semibold text-indigo-300" title={state.profileName}>
        {state.profileName || '...'}
      </span>
      <button className="icon-btn" disabled={!state.canGoBack} onClick={() => window.bar.send({ cmd: 'back' })} title="رجوع" aria-label="رجوع"><IconBack /></button>
      <button className="icon-btn" disabled={!state.canGoForward} onClick={() => window.bar.send({ cmd: 'forward' })} title="تقدّم" aria-label="تقدّم"><IconForward /></button>
      <button className="icon-btn" onClick={() => window.bar.send({ cmd: state.loading ? 'stop' : 'reload' })} title={state.loading ? 'إيقاف' : 'إعادة تحميل'} aria-label={state.loading ? 'إيقاف' : 'إعادة تحميل'}>
        {state.loading ? <IconClose /> : <IconReload />}
      </button>
      <form className="flex-1" onSubmit={submit}>
        <input
          dir="ltr"
          className="input h-8 py-1 text-left"
          value={text}
          placeholder="اكتب رابطاً أو كلمات للبحث"
          spellCheck={false}
          onFocus={(e) => { setEditing(true); e.currentTarget.select(); }}
          onBlur={() => setEditing(false)}
          onChange={(e) => setText(e.target.value)}
          aria-label="شريط العنوان"
        />
      </form>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bar />
  </StrictMode>,
);
