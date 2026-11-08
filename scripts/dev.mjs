// تطوير: خادم Vite + بناء العملية الرئيسية + تشغيل Electron مع VITE_DEV_SERVER_URL
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import { createRequire } from 'node:module';

const electron = createRequire(import.meta.url)('electron');
const server = await createServer({ configFile: 'vite.config.ts' });
await server.listen();
const url = server.resolvedUrls.local[0];
await new Promise((resolve, reject) => spawn(process.execPath, ['scripts/build-electron.mjs'], { stdio: 'inherit' }).on('exit', (c) => (c === 0 ? resolve() : reject(new Error('build failed')))));
const args = ['.'];
if (process.platform === 'linux') args.unshift('--no-sandbox');
const child = spawn(electron, args, { stdio: 'inherit', env: { ...process.env, VITE_DEV_SERVER_URL: url } });
child.on('exit', async () => { await server.close(); process.exit(0); });
