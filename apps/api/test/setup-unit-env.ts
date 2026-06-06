/**
 * Jest setup for `@resubuild/api` unit tests.
 *
 * 1. Pin the import-models catalog to the bundled `catalog.json` so
 *    `modelsDevGateway` does not try to reach the network in tests.
 * 2. Stub ESM-only packages that `@mastra/core@1.38.0` and its
 *    transitive dependencies (e.g. `tokenx`, `p-map`, `pdf-parse@2`,
 *    `marked@18`, ...) pull in. The compiled CJS output of the
 *    workspace packages does `require(...)` against them, which
 *    Jest 30's CJS runtime cannot satisfy from their ESM `.mjs`/`.esm.js`
 *    entry points. The mocks here provide the minimum surface that
 *    `@mastra/core/agent` (and its tool/stream runners) actually
 *    exercise during the api spec suite.
 */
process.env.IMPORT_MODELS_CATALOG_SOURCE = 'static';

// `jest.mock` is hoisted to the top of the file by jest, so these
// declarations take effect before any `import` statement.
jest.mock('tokenx', () => ({}), { virtual: true });
jest.mock('p-map', () => ({ default: async () => undefined }), { virtual: true });
jest.mock('@mastra/schema-compat', () => ({}), { virtual: true });
