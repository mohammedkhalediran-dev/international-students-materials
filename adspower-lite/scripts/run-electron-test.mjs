import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const name = process.argv[2];
const electronPath = createRequire(import.meta.url)('electron');
const script = join('dist-electron', `test-${name}.cjs`);
const userData = mkdtempSync(join(tmpdir(), `adslite-${name}-`));

const env = { ...process.env, ADSLITE_USER_DATA: userData, ELECTRON_ENABLE_LOGGING: '' };
let cmd = electronPath;
let args = [script];

if (name === 'db') {
  env.ELECTRON_RUN_AS_NODE = '1'; // Node بنفس إصدار Electron، بلا نوافذ
} else {
  if (process.platform === 'linux') {
    args.unshift('--no-sandbox'); // الحاوية تعمل كـ root
    if (!process.env.DISPLAY) {
      args = [electronPath, ...args];
      cmd = 'xvfb-run';
      args.unshift('-a');
    }
  }
}
const r = spawnSync(cmd, args, { env, stdio: 'inherit', timeout: 180_000 });
process.exit(r.status ?? 1);
