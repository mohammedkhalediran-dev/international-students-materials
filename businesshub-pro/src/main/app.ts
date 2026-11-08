import { app, BrowserWindow, shell, type IpcMainInvokeEvent, type WebContents } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EVENT_RUNNING } from '../shared/contract';
import { AuditLog } from './audit';
import { BrowserManager } from './browser';
import { ProviderService } from './integrations';
import { registerIpc, type IpcDeps } from './ipc';
import { MetaService, type MetaConfig } from './meta/service';
import { electronSecretBox, type SecretBox } from './secrets';
import { Services } from './services';
import { Store } from './store';

export interface AppContext {
  meta: MetaService;
  store: Store;
  svc: Services;
  browser: BrowserManager;
  mainWindow: BrowserWindow;
}

const distDir = __dirname;
const rendererDir = join(__dirname, '..', 'dist-renderer');
const devUrl = process.env.VITE_DEV_SERVER_URL;
const pageUrl = (file: string) => (devUrl ? new URL(file, devUrl).href : pathToFileURL(join(rendererDir, file)).href);

export interface StartOptions {
  dataDir: string;
  secrets?: SecretBox;
  showMainWindow?: boolean;
  dialogs?: IpcDeps['dialogs'];
  /** للاختبارات: بدل فتح المتصفح الخارجي */
  openExternal?: (url: string) => Promise<void>;
  metaConfig?: Partial<MetaConfig>;
}

export async function startApp(opts: StartOptions): Promise<AppContext> {
  const store = new Store(join(opts.dataDir, 'businesshub.sqlite'), join(opts.dataDir, 'backups'));
  const secrets = opts.secrets ?? electronSecretBox;
  const audit = new AuditLog(store);
  // نسخة تلقائية يومية (احتفاظ بآخر 7) دون تعطيل الإقلاع
  void store.autoBackup().then((p) => p && audit.log('backup.auto', 'system', null)).catch((e) => console.error('[backup.auto]', e instanceof Error ? e.message : e));
  const svc = new Services(store, secrets, audit);
  const metaConfig: Partial<MetaConfig> = { ...(process.env.META_API_VERSION ? { version: process.env.META_API_VERSION } : {}), ...opts.metaConfig };
  const meta = new MetaService({ store, secrets, audit, svc, config: metaConfig, openExternal: opts.openExternal ?? ((url) => shell.openExternal(url)) });
  const providers = new ProviderService({ store, secrets, audit, config: metaConfig });

  let mainWindow: BrowserWindow | null = null;
  const browser = new BrowserManager(svc, {
    barPreload: join(distDir, 'preload-bar.cjs'),
    loadBar: (wc: WebContents) => wc.loadURL(pageUrl('browserbar.html')),
    onChange: (ids) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(EVENT_RUNNING, ids);
    },
    audit: (event, id) => audit.log(event, 'browser_profile', id),
  });
  browser.registerAppHandlers();

  const mainIndex = pageUrl('index.html');
  registerIpc({
    svc, browser, secrets, meta, providers, dialogs: opts.dialogs,
    reloadUi: () => mainWindow?.webContents.reload(),
    isTrustedSender: (e: IpcMainInvokeEvent) =>
      !!mainWindow && e.sender === mainWindow.webContents && !!e.senderFrame && e.senderFrame.parent === null && e.senderFrame.url.startsWith(mainIndex),
  });

  mainWindow = new BrowserWindow({
    width: 1400, height: 880, minWidth: 760, minHeight: 560, show: false, title: 'BusinessHub Pro',
    backgroundColor: '#0b0f17', autoHideMenuBar: true,
    webPreferences: { preload: join(distDir, 'preload-app.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const win = mainWindow;
  // لا webviews ولا نوافذ إضافية في أي WebContents
  app.on('web-contents-created', (_e, wc) => {
    wc.on('will-attach-webview', (e) => e.preventDefault());
  });
  win.webContents.on('render-process-gone', (_e, d) => {
    console.error('[renderer-gone]', d.reason);
    if (d.reason !== 'clean-exit' && !win.isDestroyed()) win.webContents.reload();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(mainIndex)) e.preventDefault();
  });
  win.once('ready-to-show', () => {
    if (opts.showMainWindow !== false) win.show();
  });
  win.on('closed', () => {
    mainWindow = null;
    app.quit();
  });
  await win.webContents.loadURL(mainIndex);
  return { store, svc, browser, meta, mainWindow: win };
}
