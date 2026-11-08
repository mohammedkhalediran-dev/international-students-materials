import { contextBridge, ipcRenderer } from 'electron';
import { BAR_COMMAND, BAR_READY, BAR_STATE, type BarApi, type BarState } from '../shared/contract';

const api: BarApi = {
  send: (c) => ipcRenderer.send(BAR_COMMAND, c),
  ready: () => ipcRenderer.send(BAR_READY),
  onState(cb) {
    const l = (_e: unknown, s: BarState) => cb(s);
    ipcRenderer.on(BAR_STATE, l);
    return () => ipcRenderer.removeListener(BAR_STATE, l);
  },
};
contextBridge.exposeInMainWorld('bar', api);
