// Offline, dependency-free verification. Run from the project root.
const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
process.chdir(path.join(__dirname, '..'));
const suites = ['suite-storage-runtime.cjs', 'backup-runtime.cjs', 'storage-guard-runtime.cjs', 'suite-search-runtime.cjs', 'mask-storage-runtime.cjs', 'anki_scheduler_check.cjs', 'recovery-regression.cjs', 'recovery-restore-invariants.cjs', 'ink-regression.cjs', 'responsive-audit.cjs', 'mask-safety-check.cjs', 'mask_quiz_link_check.cjs', 'suite-notes-safety-check.cjs', 'suite-import-atomic-check.cjs', 'test-recovery-static.js', 'data_check.js', 'text-cards-check.cjs', 'release-audit.cjs', 'baseline-preservation.cjs', 'auth_api_check.mjs', 'admin_api_check.mjs', 'push_check.mjs', 'sw_notify_check.cjs', 'middleware_check.mjs', 'upload_api_check.mjs', 'kv_adapter_check.mjs'];
for (const suite of suites) {
  const args = suite.endsWith('-runtime.cjs') ? ['--test', 'tests/' + suite] : ['tests/' + suite];
  const run = spawnSync(process.execPath, args, {stdio: 'inherit'});
  if (run.status !== 0) process.exit(run.status || 1);
}
let scripts = 0;
for (const filename of fs.readdirSync('site/js').filter(n => n.endsWith('.js'))) {
  const run = spawnSync(process.execPath, ['--check', 'site/js/' + filename], {encoding: 'utf8'});
  if (run.status !== 0) { console.error(filename, run.stderr); process.exit(1); }
  scripts++;
}
const html = fs.readFileSync('site/pdf-notes.html', 'utf8');
let inline = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc\s*=/.test(match[1])) continue;
  new vm.Script(match[2], {filename: 'pdf-notes.html inline ' + (++inline)});
}
console.log(`PASS syntax: ${scripts} external JS files and ${inline} inline reader scripts`);
