import { createContext, useCallback, useContext, useEffect, useState, type DependencyList } from 'react';
import type { Channel, Outputs, Result } from '../shared/contract';
import { inputs } from '../shared/contract';
import type { z } from 'zod';

export type Page =
  | { name: 'overview' | 'businesses' | 'social' | 'profiles' | 'ads' | 'campaigns' | 'integrations' | 'reports' | 'settings' }
  | { name: 'business'; id: string };

export interface AppCtx {
  toast: (kind: 'ok' | 'err', text: string) => void;
  go: (p: Page) => void;
  running: Set<string>;
  /** يزيد عند أي تعديل ليعيد كل صفحة تحميل بياناتها */
  version: number;
  bump: () => void;
}

export const Ctx = createContext<AppCtx>(null as unknown as AppCtx);
export const useApp = () => useContext(Ctx);

type Args<K extends Channel> = z.input<(typeof inputs)[K]> extends undefined ? [] : [z.input<(typeof inputs)[K]>];

/** استدعاء IPC مع عرض رسالة الخطأ تلقائياً؛ يعيد البيانات أو undefined. */
export function useCall() {
  const { toast } = useApp();
  return useCallback(
    async <K extends Channel>(channel: K, ...args: Args<K>): Promise<Outputs[K] | undefined> => {
      const r = (await (window.api.call as (c: string, p?: unknown) => Promise<Result<Outputs[K]>>)(channel, args[0])) as Result<Outputs[K]>;
      if (r.ok) return r.data;
      toast('err', r.error);
      return undefined;
    },
    [toast],
  );
}

/** بدون عرض toast: يعيد النتيجة كاملة (للنماذج التي تعرض الخطأ داخلها). */
export function rawCall<K extends Channel>(channel: K, ...args: Args<K>): Promise<Result<Outputs[K]>> {
  return (window.api.call as (c: string, p?: unknown) => Promise<Result<Outputs[K]>>)(channel, args[0]);
}

/** يحمّل بيانات ويعيد التحميل عند تغيّر version أو الاعتماديات. */
export function useLoad<K extends Channel>(channel: K, args: Args<K>, deps: DependencyList = []) {
  const { version } = useApp();
  const call = useCall();
  const [data, setData] = useState<Outputs[K] | undefined>();
  const [loading, setLoading] = useState(true);
  const argKey = JSON.stringify(args);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (call as (c: K, ...a: unknown[]) => Promise<Outputs[K] | undefined>)(channel, ...(args as unknown[])).then((d) => {
      if (!alive) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, argKey, version, call, ...deps]);
  return { data, loading };
}
