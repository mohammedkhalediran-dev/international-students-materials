import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS, EVENT_RUNNING, type Api } from '../shared/contract';

const allowed = new Set<string>(CHANNELS);

// قائمة بيضاء ضيقة: لا يمكن للواجهة استدعاء قناة غير معرّفة في العقد.
const api: Api = {
  call: ((channel: string, payload?: unknown) => {
    if (!allowed.has(channel)) return Promise.resolve({ ok: false, error: 'قناة غير مسموحة.' });
    return ipcRenderer.invoke(channel, payload);
  }) as Api['call'],
  onRunningChanged(cb) {
    const listener = (_e: unknown, ids: string[]) => cb(ids);
    ipcRenderer.on(EVENT_RUNNING, listener);
    return () => ipcRenderer.removeListener(EVENT_RUNNING, listener);
  },
};
contextBridge.exposeInMainWorld('api', api);
