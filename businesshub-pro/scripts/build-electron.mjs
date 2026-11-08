import { build } from 'esbuild';

const common = { bundle: true, platform: 'node', format: 'cjs', target: 'node22', sourcemap: true, external: ['electron', 'better-sqlite3'], logLevel: 'info' };

await build({
  ...common,
  entryPoints: {
    main: 'src/main/index.ts',
    'preload-app': 'src/preload/app.ts',
    'preload-bar': 'src/preload/bar.ts',
    'test-unit': 'src/main/tests/unit.test.ts',
    'test-isolation': 'src/main/tests/isolation.test.ts',
    'test-smoke': 'src/main/tests/smoke.test.ts',
  },
  outdir: 'dist-electron',
  outExtension: { '.js': '.cjs' },
});
