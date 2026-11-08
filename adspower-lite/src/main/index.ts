import { app, dialog } from 'electron';
import { join } from 'node:path';
import { startApp } from './app';

if (process.env.ADSLITE_USER_DATA) app.setPath('userData', process.env.ADSLITE_USER_DATA);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(async () => {
    try {
      await startApp({ dbFile: join(app.getPath('userData'), 'adspower-lite.sqlite') });
    } catch (e) {
      dialog.showErrorBox('AdsPower Lite', `تعذّر بدء البرنامج:\n${e instanceof Error ? e.message : String(e)}`);
      app.exit(1);
    }
  });
  app.on('window-all-closed', () => app.quit());
}
