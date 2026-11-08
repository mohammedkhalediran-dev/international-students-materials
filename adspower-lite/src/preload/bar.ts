import { contextBridge, ipcRenderer } from 'electron';
import { CH } from '../shared/channels';
import type { BarApi, BarState } from '../shared/types';

const api: BarApi = {
  send: (command) => ipcRenderer.send(CH.barCommand, command),
  ready: () => ipcRenderer.send(CH.barReady),
  onState(cb) {
    const listener = (_e: unknown, s: BarState) => cb(s);
    ipcRenderer.on(CH.barState, listener);
    return () => ipcRenderer.removeListener(CH.barState, listener);
  },
};

contextBridge.exposeInMainWorld('bar', api);
