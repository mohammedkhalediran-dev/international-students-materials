import { contextBridge, ipcRenderer } from 'electron';
import { CH } from '../shared/channels';
import type { Api } from '../shared/types';

const call = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);

const api: Api = {
  listProfiles: (f) => call(CH.profilesList, f),
  createProfile: (i) => call(CH.profilesCreate, i),
  updateProfile: (id, i) => call(CH.profilesUpdate, id, i),
  deleteProfile: (id) => call(CH.profilesDelete, id),
  launchProfile: (id) => call(CH.profilesLaunch, id),
  closeProfile: (id) => call(CH.profilesClose, id),
  runningProfiles: () => call(CH.profilesRunning),
  listGroups: () => call(CH.groupsList),
  createGroup: (i) => call(CH.groupsCreate, i),
  updateGroup: (id, i) => call(CH.groupsUpdate, id, i),
  deleteGroup: (id) => call(CH.groupsDelete, id),
  onRunningChanged(cb) {
    const listener = (_e: unknown, ids: string[]) => cb(ids);
    ipcRenderer.on(CH.profilesRunningChanged, listener);
    return () => ipcRenderer.removeListener(CH.profilesRunningChanged, listener);
  },
};

contextBridge.exposeInMainWorld('api', api);
