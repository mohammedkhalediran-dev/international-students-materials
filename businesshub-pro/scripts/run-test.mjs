import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const name = process.argv[2];
const electronPath = createRequire(import.meta.url)('electron');
const script = join('dist-electron', `test-${name}.cjs`);
const dataDir = process.env.BUSINESSHUB_DATA_DIR ?? mkdtempSync(join(tmpdir(), `bh-${name}-`));

function exec(extraEnv = {}) {
  const env = { ...process.env, BUSINESSHUB_DATA_DIR: dataDir, ...extraEnv };
  let cmd = electronPath;
  let args = [script];
  if (name === 'unit') env.ELECTRON_RUN_AS_NODE = '1'; // نفس Node المدمج في Electron (نفس ABI لـ better-sqlite3)
  else if (process.platform === 'linux') {
    args.unshift('--no-sandbox');
    if (!process.env.DISPLAY) { args = ['-a', electronPath, ...args]; cmd = 'xvfb-run'; }
  }
  return spawnSync(cmd, args, { env, stdio: 'inherit', timeout: 240_000 }).status ?? 1;
}

let code;
if (name === 'isolation') {
  // مرحلتان في عمليتين منفصلتين = إعادة تشغيل حقيقية للتطبيق بنفس مجلد البيانات
  code = exec({ ISO_PHASE: '1' });
  if (code === 0) code = exec({ ISO_PHASE: '2' });
} else code = exec();
process.exit(code);
