import { app, dialog } from 'electron';
import { startApp, type AppContext } from './app';

if (process.env.BUSINESSHUB_DATA_DIR) app.setPath('userData', process.env.BUSINESSHUB_DATA_DIR);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let ctx: AppContext | null = null;
  app.on('second-instance', () => {
    const w = ctx?.mainWindow;
    if (w && !w.isDestroyed()) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  process.on('uncaughtException', (e) => console.error('[uncaught]', e instanceof Error ? e.message : e));
  process.on('unhandledRejection', (e) => console.error('[unhandled]', e instanceof Error ? e.message : e));
  app.whenReady().then(async () => {
    try {
      ctx = await startApp({ dataDir: app.getPath('userData') });
    } catch (e) {
      dialog.showErrorBox('BusinessHub Pro', `تعذّر بدء البرنامج:\n${e instanceof Error ? e.message : String(e)}`);
      app.exit(1);
    }
  });
  app.on('window-all-closed', () => app.quit());
}
