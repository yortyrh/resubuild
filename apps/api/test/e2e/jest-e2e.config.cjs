/** @type {import('jest').Config} */
// Several deps of @mastra/core 1.x (marked@18, p-map@7, tokenx, ...) now
// ship ESM-only. Jest 30 still uses the CJS VM by default; the e2e suite
// does not need to *execute* the ESM modules' behaviour — it only needs
// the AppModule to boot — so we let ts-jest handle our source files and
// use `moduleNameMapper` to redirect ESM-only third-party imports to
// small CJS shims / UMD bundles that jest can load under CJS. Shims live
// in `apps/api/test/e2e/_esm-stubs/`. New ESM-only deps should be added
// here as the dep tree evolves.
const path = require('path');
const repoRoot = path.join(__dirname, '..', '..', '..', '..');
const stubsDir = path.join(__dirname, '_esm-stubs');
const markedUmd = path.join(
  repoRoot,
  'node_modules',
  '.pnpm',
  'marked@18.0.4',
  'node_modules',
  'marked',
  'lib',
  'marked.umd.js',
);

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^marked$': markedUmd,
    '^p-map$': path.join(stubsDir, 'p-map.cjs'),
    '^tokenx$': path.join(stubsDir, 'tokenx.cjs'),
  },
  globalSetup: '<rootDir>/global-setup.ts',
  testTimeout: 60_000,
  maxWorkers: 1,
};
