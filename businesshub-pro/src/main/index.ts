import { app, dialog } from 'electron';
import { startApp } from './app';

if (process.env.BUSINESSHUB_DATA_DIR) app.setPath('userData', process.env.BUSINESSHUB_DATA_DIR);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(async () => {
    try {
      await startApp({ dataDir: app.getPath('userData') });
    } catch (e) {
      dialog.showErrorBox('BusinessHub Pro', `تعذّر بدء البرنامج:\n${e instanceof Error ? e.message : String(e)}`);
      app.exit(1);
    }
  });
  app.on('window-all-closed', () => app.quit());
}
