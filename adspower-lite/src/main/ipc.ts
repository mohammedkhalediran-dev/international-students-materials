import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { CH } from '../shared/channels';
import type { BarCommand, ProfileFilter, Result } from '../shared/types';
import type { BrowserManager } from './browser';
import { AppError } from './errors';
import type { ProfileService } from './profiles';
import { parseGroupId, parseGroupInput, parseProfileId, parseProfileInput } from './validate';

export interface IpcDeps {
  service: ProfileService;
  browser: BrowserManager;
  /** هل المرسل هو نافذة لوحة التحكم الموثوقة (وليس صفحة ويب)؟ */
  isTrustedSender: (e: IpcMainInvokeEvent) => boolean;
}

function parseFilter(v: unknown): ProfileFilter {
  if (typeof v !== 'object' || v === null) throw new AppError('مرشّح غير صالح.');
  const o = v as Record<string, unknown>;
  const query = typeof o.query === 'string' ? o.query.slice(0, 200) : '';
  const g = o.group;
  if (g === 'all' || g === 'none') return { query, group: g };
  if (typeof g === 'number' && Number.isInteger(g) && g > 0) return { query, group: g };
  throw new AppError('مرشّح التصنيف غير صالح.');
}

export function registerIpc({ service, browser, isTrustedSender }: IpcDeps): void {
  const handle = <T>(channel: string, fn: (...args: unknown[]) => T | Promise<T>) => {
    ipcMain.handle(channel, async (e, ...args): Promise<Result<T>> => {
      if (!isTrustedSender(e)) return { ok: false, error: 'مصدر غير موثوق.' };
      try {
        return { ok: true, data: await fn(...args) };
      } catch (err) {
        if (err instanceof AppError) return { ok: false, error: err.message };
        console.error(`[ipc:${channel}]`, err);
        return { ok: false, error: 'حدث خطأ غير متوقع.' };
      }
    });
  };

  handle(CH.profilesList, (f) => service.list(parseFilter(f)));
  handle(CH.profilesCreate, (input) => service.create(parseProfileInput(input)));
  handle(CH.profilesUpdate, (id, input) => service.update(parseProfileId(id), parseProfileInput(input)));
  handle(CH.profilesDelete, async (id) => {
    const pid = parseProfileId(id);
    await browser.wipeSession(pid);
    service.remove(pid);
    return null;
  });
  handle(CH.profilesLaunch, async (id) => {
    await browser.launch(parseProfileId(id));
    return null;
  });
  handle(CH.profilesClose, (id) => {
    browser.close(parseProfileId(id));
    return null;
  });
  handle(CH.profilesRunning, () => browser.runningIds());

  handle(CH.groupsList, () => service.listGroups());
  handle(CH.groupsCreate, (input) => service.createGroup(parseGroupInput(input)));
  handle(CH.groupsUpdate, (id, input) => service.updateGroup(parseGroupId(id), parseGroupInput(input)));
  handle(CH.groupsDelete, (id) => {
    service.deleteGroup(parseGroupId(id));
    return null;
  });

  // أوامر شريط عنوان نافذة الملف (قناة منفصلة، مرسلها شريط مسجّل فقط)
  ipcMain.on(CH.barCommand, (e, command: BarCommand) => {
    if (!browser.isBarSender(e.sender) || typeof command !== 'object' || command === null) return;
    browser.handleBarCommand(e.sender, command);
  });
  ipcMain.on(CH.barReady, (e) => {
    if (browser.isBarSender(e.sender)) browser.sendInitialState(e.sender);
  });
}
