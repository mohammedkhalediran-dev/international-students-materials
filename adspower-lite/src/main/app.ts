import { app, BrowserWindow, type IpcMainInvokeEvent, type WebContents } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CH } from '../shared/channels';
import { BrowserManager } from './browser';
import { openDatabase, type DB } from './db';
import { registerIpc } from './ipc';
import { ProfileService } from './profiles';
import { electronSecretBox, type SecretBox } from './secrets';

export interface AppContext {
  db: DB;
  service: ProfileService;
  browser: BrowserManager;
  mainWindow: BrowserWindow;
}

const distDir = join(__dirname);
const rendererDir = join(__dirname, '..', 'dist-renderer');
const devUrl = process.env.VITE_DEV_SERVER_URL;

function pageUrl(file: string): string {
  return devUrl ? new URL(file, devUrl).href : pathToFileURL(join(rendererDir, file)).href;
}

async function loadPage(wc: WebContents, file: string): Promise<void> {
  await wc.loadURL(pageUrl(file));
}

export interface StartOptions {
  dbFile: string;
  secrets?: SecretBox;
  showMainWindow?: boolean;
}

/** يبني كل مكوّنات التطبيق: قاعدة البيانات، الخدمات، IPC، ونافذة لوحة التحكم. */
export async function startApp(opts: StartOptions): Promise<AppContext> {
  const db = openDatabase(opts.dbFile);
  const service = new ProfileService(db, opts.secrets ?? electronSecretBox);

  let mainWindow: BrowserWindow | null = null;
  const browser = new BrowserManager(service, {
    barPreload: join(distDir, 'preload-bar.cjs'),
    loadBar: (wc) => loadPage(wc, 'browserbar.html'),
    onChange: (ids) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(CH.profilesRunningChanged, ids);
    },
  });
  browser.registerAppHandlers();

  const mainIndex = pageUrl('index.html');
  registerIpc({
    service,
    browser,
    isTrustedSender: (e: IpcMainInvokeEvent) =>
      !!mainWindow &&
      e.sender === mainWindow.webContents &&
      !!e.senderFrame &&
      e.senderFrame.parent === null &&
      e.senderFrame.url.startsWith(mainIndex),
  });

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: 'AdsPower Lite',
    backgroundColor: '#0b0f17',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(distDir, 'preload-app.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const win = mainWindow;
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
  await loadPage(win.webContents, 'index.html');

  return { db, service, browser, mainWindow: win };
}
