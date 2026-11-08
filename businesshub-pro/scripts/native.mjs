// postinstall: ينزّل better-sqlite3 المبني مسبقاً لإصدار Electron المثبّت، أو يبنيه من المصدر كخيار أخير.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
let electronVersion;
try { electronVersion = require('electron/package.json').version; } catch { process.exit(0); }
const dir = dirname(require.resolve('better-sqlite3/package.json'));
const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });

let r = run('npx', ['--yes', 'prebuild-install', '-r', 'electron', '-t', electronVersion], dir);
if (r.status !== 0) {
  console.warn('[native] لا يوجد ملف جاهز؛ المحاولة بالبناء من المصدر (يحتاج أدوات البناء واتصالاً بـ electronjs.org)');
  r = run('npx', ['--yes', '@electron/rebuild', '-f', '-w', 'better-sqlite3'], process.cwd());
}
process.exit(r.status ?? 1);
