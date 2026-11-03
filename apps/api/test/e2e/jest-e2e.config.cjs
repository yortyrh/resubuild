/** @type {import('jest').Config} */
// Several deps of @mastra/core 1.x (marked@18, p-map@7, tokenx, ...) now
// ship ESM-only. Jest 30 still uses the CJS VM by default; the e2e suite
// does not need to *execute* the ESM modules' behaviour — it only needs
// the AppModule to boot — so we let ts-jest handle our source files and
// use `moduleNameMapper` to redirect ESM-only third-party imports to
// small CJS shims / UMD bundles that jest can load under CJS. Shims live
// in `apps/api/test/e2e/_esm-stubs/`. New ESM-only deps should be added
// here as the dep tree evolves.
const path = require('node:path');
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
  moduleFileExtensions: ['js', 'json', 'ts', 'mjs', 'cjs'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      { tsconfig: path.join(__dirname, '..', '..', 'tsconfig.jest.json') },
    ],
    // ESM-only packages (better-auth and its deps ship .mjs) → CommonJS.
    '^.+\\.mjs$': [
      'babel-jest',
      { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] },
    ],
    // @react-email/render uses dynamic import(); see ../jest/dynamic-import-to-require.transform.cjs.
    '@react-email[\\/]render[\\/].+\\.cjs$': path.join(
      __dirname,
      '..',
      'jest',
      'dynamic-import-to-require.transform.cjs',
    ),
  },
  // Transform ESM-only dependencies too (same rule as the unit-test config),
  // except the Testcontainers stack loaded by globalSetup, which is plain CJS
  // and breaks when re-transpiled (undici uses class fields + super).
  transformIgnorePatterns: [
    '/node_modules/(?!(.+)/)',
    '/node_modules/\\.pnpm/(undici|testcontainers|@testcontainers\\+[^/]+|dockerode|docker-modem|docker-compose|ssh2|tar-fs|tar-stream|properties-reader|archiver)@',
  ],
  moduleNameMapper: {
    '^marked$': markedUmd,
    '^p-map$': path.join(stubsDir, 'p-map.cjs'),
    '^tokenx$': path.join(stubsDir, 'tokenx.cjs'),
  },
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',
  testTimeout: 60_000,
  // Container start-up + migrations + seed run in globalSetup.
  slowTestThreshold: 30,
  maxWorkers: 1,
};
