/**
 * Jest transformer for PGlite's CommonJS build.
 *
 * `@electric-sql/pglite/dist/*.cjs` loads Node built-ins with `await import("fs")`
 * and friends. Jest's CommonJS runtime rejects dynamic `import()` unless Node runs
 * with `--experimental-vm-modules`, which in turn breaks other CJS shims in this
 * suite (e.g. the `marked` UMD mapping). Rewriting the calls to `require()` keeps
 * the suite on the plain CJS runtime. `module.require` is used because the
 * Emscripten glue declares its own `var require`, shadowing the wrapper one.
 */
const crypto = require('node:crypto');

const DYNAMIC_IMPORT = /\bimport\(\s*(["'`])([^"'`]+)\1\s*\)/g;

module.exports = {
  process(sourceText) {
    return {
      code: sourceText.replace(DYNAMIC_IMPORT, (_match, quote, specifier) => {
        return `Promise.resolve().then(() => module.require(${quote}${specifier}${quote}))`;
      }),
    };
  },
  getCacheKey(sourceText, sourcePath) {
    return crypto
      .createHash('sha1')
      .update('dynamic-import-to-require-v2')
      .update(sourcePath)
      .update(sourceText)
      .digest('hex');
  },
};
