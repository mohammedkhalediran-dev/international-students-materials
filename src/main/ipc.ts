import { app, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { BAR_COMMAND, BAR_READY, CHANNELS, inputs, type BarCommand, type Channel, type Outputs, type Result } from '../shared/contract';
import type { BrowserManager } from './browser';
import { AppError } from './errors';
import { listIntegrations, type ProviderService } from './integrations';
import type { MetaService } from './meta/service';
import type { SecretBox } from './secrets';
import { Services } from './services';

export interface IpcDeps {
  svc: Services;
  browser: BrowserManager;
  secrets: SecretBox;
  meta: MetaService;
  providers: ProviderService;
  isTrustedSender: (e: IpcMainInvokeEvent) => boolean;
  /** يعيد تحميل واجهة لوحة التحكم بعد الاستعادة */
  reloadUi: () => void;
  /** اختياري للاختبارات: بدل مربعات الحوار */
  dialogs?: { pickBackupSave?: (def: string) => Promise<string | null>; pickRestoreOpen?: () => Promise<string | null> };
}

type Handler<K extends Channel> = (input: z.output<(typeof inputs)[K]>) => Outputs[K] | Promise<Outputs[K]>;

export type Handlers = { [K in Channel]: Handler<K> };

/** رسالة تحقق Zod → عربية مختصرة */
function zodMessage(e: z.ZodError): string {
  const first = e.issues[0];
  return first?.message && !/^Invalid|Expected|Required/i.test(first.message) ? first.message : 'بيانات غير صالحة.';
}

export function buildHandlers(d: IpcDeps): Handlers {
  const { svc, browser, meta, providers } = d;
  return {
    'overview:get': () => svc.overview(),
    'businesses:list': (i) => svc.listBusinesses(i),
    'businesses:get': (i) => svc.getBusiness(i.id),
    'businesses:create': (i) => svc.createBusiness(i),
    'businesses:update': (i) => svc.updateBusiness(i.id, i.data),
    'businesses:setStatus': (i) => svc.setBusinessStatus(i.id, i.status),
    'businesses:delete': async (i) => {
      const profiles = svc.listProfiles({ businessId: i.id });
      const res = svc.deleteBusiness(i.id, i.confirmName); // يتحقق من التأكيد أولاً
      for (const p of profiles) await browser.wipeSession(p);
      return res;
    },
    'social:list': (i) => svc.listSocial(i),
    'social:create': (i) => svc.createSocial(i),
    'social:update': (i) => svc.updateSocial(i.id, i.data),
    'social:delete': (i) => { svc.deleteSocial(i.id); return null; },
    'profiles:list': (i) => svc.listProfiles(i),
    'profiles:create': (i) => svc.createProfile(i),
    'profiles:update': (i) => svc.updateProfile(i.id, i.data),
    'profiles:delete': async (i) => {
      const p = svc.getProfile(i.id);
      if (p) await browser.wipeSession(p);
      svc.deleteProfile(i.id);
      return null;
    },
    'profiles:duplicate': (i) => svc.duplicateProfile(i.id),
    'profiles:launch': async (i) => {
      await browser.launch(i.id);
      return null;
    },
    'profiles:close': (i) => {
      browser.close(i.id);
      return null;
    },
    'profiles:openUrl': async (i) => {
      await browser.openUrlIn(i.id, i.url);
      return null;
    },
    'profiles:running': () => browser.runningIds(),
    'proxies:list': () => svc.listProxies(),
    'proxies:create': (i) => svc.createProxy(i),
    'proxies:update': (i) => svc.updateProxy(i.id, i.data),
    'proxies:delete': (i) => { svc.deleteProxy(i.id); return null; },
    'ads:list': (i) => svc.listAds(i.businessId),
    'ads:create': (i) => svc.createAd(i),
    'ads:update': (i) => svc.updateAd(i.id, i.data),
    'ads:delete': (i) => { svc.deleteAd(i.id); return null; },
    'campaigns:list': (i) => svc.listCampaigns(i.businessId),
    'integrations:list': () => listIntegrations(svc.store.db),
    'meta:status': () => meta.status(),
    'meta:saveCredentials': (i) => meta.saveCredentials(i.appId, i.appSecret),
    'meta:clearCredentials': () => { meta.clearCredentials(); return null; },
    'meta:connect': () => meta.connect(),
    'meta:cancelConnect': () => { meta.cancelConnect(); return null; },
    'meta:disconnect': (i) => { meta.disconnect(i.id); return null; },
    'meta:discover': (i) => meta.discover(i.connectionId),
    'meta:accounts': () => meta.discovered(),
    'meta:link': (i) => meta.link(i.externalId, i.businessId),
    'meta:unlink': (i) => { meta.unlink(i.adAccountId); return null; },
    'meta:sync': (i) => meta.sync(i.adAccountId, i.since, i.until),
    'analytics:campaigns': (i) => meta.campaigns(i),
    'analytics:adsets': (i) => meta.adSets(i.campaignId, i.since, i.until),
    'analytics:ads': (i) => meta.adsOf(i.adSetId, i.since, i.until),
    'analytics:syncRuns': (i) => meta.syncRuns(i.adAccountId),
    'analytics:platforms': (i) => meta.platforms(i),
    'tiktok:status': () => providers.tiktokStatus(),
    'tiktok:saveConfig': (i) => providers.saveTikTok(i.appId, i.appSecret),
    'whatsapp:status': () => providers.whatsappStatus(),
    'whatsapp:saveConfig': (i) => providers.saveWhatsApp(i.wabaId, i.phoneNumberId, i.accessToken),
    'whatsapp:verify': () => providers.verifyWhatsApp(),
    'whatsapp:clear': () => { providers.clearWhatsApp(); return null; },
    'reports:summary': () => svc.reports(),
    'settings:info': async () => {
      const enc = await d.secrets.available();
      return {
        appVersion: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome, platform: process.platform,
        dataDir: app.getPath('userData'), dbPath: svc.store.file, dbSizeBytes: svc.store.sizeBytes(), schemaVersion: svc.store.schemaVersion(),
        backupsDir: svc.store.backupsDir, encryptionAvailable: enc.available, encryptionBackend: enc.backend,
      };
    },
    'settings:backup': async () => {
      const def = svc.store.defaultBackupPath();
      const dest = d.dialogs?.pickBackupSave ? await d.dialogs.pickBackupSave(def) : (await dialog.showSaveDialog({ title: 'حفظ نسخة احتياطية', defaultPath: def, filters: [{ name: 'SQLite', extensions: ['sqlite'] }] })).filePath ?? null;
      if (!dest) return null;
      const sizeBytes = await svc.store.backupTo(dest);
      svc.audit.log('backup.create', 'system', null, { sizeBytes });
      return { path: dest, sizeBytes };
    },
    'settings:restore': async () => {
      const src = d.dialogs?.pickRestoreOpen ? await d.dialogs.pickRestoreOpen() : (await dialog.showOpenDialog({ title: 'استعادة نسخة احتياطية', properties: ['openFile'], filters: [{ name: 'SQLite', extensions: ['sqlite', 'db'] }] })).filePaths[0] ?? null;
      if (!src) return { restored: false, reason: 'تم الإلغاء' };
      browser.closeAll();
      const { preRestoreBackup } = await svc.store.restoreFrom(src);
      svc.audit.log('backup.restore', 'system', null, { preRestoreBackup });
      d.reloadUi();
      return { restored: true, preRestoreBackup };
    },
    'settings:seedSample': () => svc.seedSample(),
    'settings:removeSample': async () => {
      const ids = svc.sampleProfileIds();
      for (const id of ids) {
        const p = svc.getProfile(id);
        if (p) await browser.wipeSession(p);
      }
      return svc.removeSample();
    },
    'audit:list': (i) => svc.audit.list(i.limit),
  };
}

/** يسجّل كل القنوات المسموحة فقط؛ كل مدخل يُتحقق منه بـ Zod قبل الوصول للمنطق. */
export function registerIpc(deps: IpcDeps, handlers: Handlers = buildHandlers(deps)): void {
  for (const channel of CHANNELS) {
    ipcMain.handle(channel, async (e, raw): Promise<Result<unknown>> => {
      if (!deps.isTrustedSender(e)) return { ok: false, error: 'مصدر غير موثوق.' };
      const parsed = inputs[channel].safeParse(raw);
      if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
      try {
        const out = await (handlers[channel] as (i: unknown) => unknown)(parsed.data);
        return { ok: true, data: out ?? null };
      } catch (err) {
        if (err instanceof AppError) return { ok: false, error: err.message };
        console.error(`[ipc:${channel}]`, err instanceof Error ? err.message : err);
        return { ok: false, error: 'حدث خطأ غير متوقع.' };
      }
    });
  }
  ipcMain.on(BAR_COMMAND, (e, command: BarCommand) => {
    if (!deps.browser.isBarSender(e.sender) || typeof command !== 'object' || command === null) return;
    deps.browser.handleBarCommand(e.sender, command);
  });
  ipcMain.on(BAR_READY, (e) => {
    if (deps.browser.isBarSender(e.sender)) deps.browser.sendInitialState(e.sender);
  });
}

export { Services };
