import { build } from 'esbuild';

const common = { bundle: true, platform: 'node', format: 'cjs', target: 'node22', sourcemap: true, external: ['electron'], logLevel: 'info' };

await build({
  ...common,
  entryPoints: {
    main: 'src/main/index.ts',
    'preload-app': 'src/preload/app.ts',
    'preload-bar': 'src/preload/bar.ts',
    'test-db': 'src/main/tests/db.test.ts',
    'test-isolation': 'src/main/tests/isolation.test.ts',
    'test-ui': 'src/main/tests/ui.test.ts',
  },
  outdir: 'dist-electron',
  outExtension: { '.js': '.cjs' },
});
