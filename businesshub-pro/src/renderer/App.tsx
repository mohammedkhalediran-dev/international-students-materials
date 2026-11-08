import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ctx, rawCall, type Page } from './ctx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IconShield } from './components/icons';
import { Toasts, type Toast } from './components/Toasts';
import { AdAccounts } from './pages/AdAccounts';
import { BrowserProfiles } from './pages/BrowserProfiles';
import { BusinessDetail } from './pages/BusinessDetail';
import { Businesses } from './pages/Businesses';
import { Campaigns } from './pages/Campaigns';
import { Integrations } from './pages/Integrations';
import { Overview } from './pages/Overview';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { SocialAccounts } from './pages/SocialAccounts';

const NAV: { name: Exclude<Page['name'], 'business'>; label: string }[] = [
  { name: 'overview', label: 'نظرة عامة' },
  { name: 'businesses', label: 'الأنشطة' },
  { name: 'social', label: 'الحسابات الاجتماعية' },
  { name: 'profiles', label: 'ملفات المتصفح' },
  { name: 'ads', label: 'الحسابات الإعلانية' },
  { name: 'campaigns', label: 'الحملات والتحليلات' },
  { name: 'integrations', label: 'التكاملات' },
  { name: 'reports', label: 'التقارير' },
  { name: 'settings', label: 'الإعدادات' },
];

export function App() {
  const [page, setPage] = useState<Page>({ name: 'overview' });
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const tid = useRef(0);

  const toast = useCallback((kind: 'ok' | 'err', text: string) => {
    const id = ++tid.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    rawCall('profiles:running').then((r) => r.ok && setRunning(new Set(r.data)));
    return window.api.onRunningChanged((ids) => {
      setRunning(new Set(ids));
      setVersion((v) => v + 1);
    });
  }, []);

  const go = useCallback((p: Page) => { setPage(p); setNavOpen(false); }, []);
  const value = useMemo(() => ({ toast, go, running, version, bump }), [toast, go, running, version, bump]);
  const active = page.name === 'business' ? 'businesses' : page.name;

  return (
    <Ctx.Provider value={value}>
      <div className="flex h-full">
        {navOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />}
        <aside className={`fixed inset-y-0 start-0 z-30 flex w-64 shrink-0 flex-col border-e border-slate-800 bg-slate-900 transition-transform lg:static lg:z-auto lg:translate-x-0 lg:bg-slate-900/60 ${navOpen ? 'translate-x-0' : 'max-lg:translate-x-full'}`}>
          <div className="flex items-center gap-2.5 px-5 py-5 text-indigo-300">
            <IconShield />
            <div><div className="text-base font-bold leading-tight text-slate-100">BusinessHub Pro</div><div className="text-[11px] text-slate-500">المرحلة 1 · محلي بالكامل</div></div>
          </div>
          <nav className="flex-1 space-y-1 px-3" aria-label="القائمة الرئيسية">
            {NAV.map((n) => (
              <button key={n.name} onClick={() => go({ name: n.name })} aria-current={active === n.name ? 'page' : undefined} data-nav={n.name}
                className={`flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition ${active === n.name ? 'bg-indigo-600/20 text-indigo-200' : 'text-slate-300 hover:bg-slate-800'}`}>{n.label}</button>
            ))}
          </nav>
          <div className="border-t border-slate-800 px-5 py-3 text-[11px] text-slate-500">{running.size > 0 ? `${running.size} ملف قيد التشغيل` : 'لا ملفات قيد التشغيل'}</div>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2.5 lg:hidden">
            <button className="icon-btn" aria-label="فتح القائمة" aria-expanded={navOpen} onClick={() => setNavOpen(true)}><span className="text-lg leading-none">☰</span></button>
            <span className="text-sm font-semibold text-slate-200">BusinessHub Pro</span>
          </div>
          <ErrorBoundary key={page.name + (page.name === 'business' ? page.id : '')} scope={page.name}>
            {page.name === 'overview' && <Overview />}
            {page.name === 'businesses' && <Businesses />}
            {page.name === 'business' && <BusinessDetail id={page.id} />}
            {page.name === 'social' && <SocialAccounts />}
            {page.name === 'profiles' && <BrowserProfiles />}
            {page.name === 'ads' && <AdAccounts />}
            {page.name === 'campaigns' && <Campaigns />}
            {page.name === 'integrations' && <Integrations />}
            {page.name === 'reports' && <Reports />}
            {page.name === 'settings' && <Settings />}
          </ErrorBoundary>
        </main>
      </div>
      <Toasts items={toasts} />
    </Ctx.Provider>
  );
}
