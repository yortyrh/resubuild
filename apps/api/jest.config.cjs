const path = require('node:path');
// `marked@18` ships only an ESM build. The compiled CJS in
// `@resumind/resume-template/dist/render-markdown-field.js` does
// `require("marked")`, which under Jest 30 raises
// `SyntaxError: Unexpected token 'export'`. Resolve the UMD file directly
// (it isn't exposed via `exports`) and redirect `marked` to it.
const markedPkg = require.resolve('marked/package.json');
const markedUmdPath = path.join(path.dirname(markedPkg), 'lib/marked.umd.js');

const { jsWithTs: tsjPreset } = require('ts-jest/presets');

/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts', 'mjs'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  // Use `ts-jest/presets/js-with-ts` for `.ts`/`.js`, and `babel-jest`
  // for `.mjs` files. The latter is required because `@mastra/core@1.38.0`
  // transitively pulls in several ESM-only packages whose `.mjs` entry
  // (e.g. `tokenx/dist/index.mjs`) uses bare `export { ... }` syntax
  // that `ts-jest` does not handle in `.mjs` mode; `babel-jest` will
  // rewrite the `export` statement to CJS for the Jest CJS runtime.
  transform: {
    ...tsjPreset.transform,
    '^.+\\.mjs$': 'babel-jest',
  },
  // `@mastra/core@1.38.0` and many of its transitive dependencies
  // (`tokenx`, `p-map`, `p-retry`, `execa`, `dotenv`, `hono`, `croner`,
  // `marked@18`, `pdf-parse@2`, ...) ship only as ESM in their current
  // versions, while the compiled `dist/<...>.js` of our workspace
  // packages does `require(...)` against them. Transforming them all is
  // the only way for Jest 30's CJS runtime to consume those requires.
  transformIgnorePatterns: ['/node_modules/(?!(.+)/)'],
  moduleNameMapper: {
    '^marked$': markedUmdPath,
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/main.ts',
    '!**/*.module.ts',
    '!**/dto/**',
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 86,
      functions: 90,
      lines: 90,
    },
  },
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/../test/setup-unit-env.ts'],
};
