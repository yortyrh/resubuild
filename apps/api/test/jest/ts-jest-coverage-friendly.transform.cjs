/**
 * ts-jest wrapper that keeps transpile-only compilation fast without skewing
 * branch coverage.
 *
 * `tsconfig.jest.json` enables `isolatedModules`, so ts-jest transpiles each
 * file on its own (no type-checking; `pnpm typecheck` covers that). Full
 * type-checking per spec made the API suite take ~7 min instead of ~1.5 min.
 *
 * Without a type checker, TypeScript cannot tell whether a constructor or
 * property type is a value, so `emitDecoratorMetadata` emits a guard per
 * decorated type:
 *
 *   typeof (_a = typeof foo_1.Foo !== "undefined" && foo_1.Foo) === "function" ? _a : Object
 *
 * Istanbul counts each guard as two branches, one of which never runs. They are
 * compiler output, not application logic, so mark them `istanbul ignore next`.
 * Only columns on the generated metadata line shift; line mappings are intact.
 */
const crypto = require('node:crypto');
const tsJest = require('ts-jest').default;

const METADATA_GUARD =
  /typeof \((_[\w$]+) = typeof ([\w$.]+) !== "undefined" && \2\) === "function" \? \1 : Object/g;

function ignoreMetadataGuards(result) {
  const code = typeof result === 'string' ? result : result.code;
  const patched = code.replace(METADATA_GUARD, (guard) => `/* istanbul ignore next */ ${guard}`);
  return typeof result === 'string' ? patched : { ...result, code: patched };
}

module.exports = {
  createTransformer(config) {
    const inner = tsJest.createTransformer(config);
    return {
      canInstrument: false,
      process(sourceText, sourcePath, options) {
        return ignoreMetadataGuards(inner.process(sourceText, sourcePath, options));
      },
      async processAsync(sourceText, sourcePath, options) {
        return ignoreMetadataGuards(await inner.processAsync(sourceText, sourcePath, options));
      },
      getCacheKey(sourceText, sourcePath, options) {
        return crypto
          .createHash('sha1')
          .update('ts-jest-coverage-friendly-v1')
          .update(inner.getCacheKey(sourceText, sourcePath, options))
          .digest('hex');
      },
    };
  },
};
