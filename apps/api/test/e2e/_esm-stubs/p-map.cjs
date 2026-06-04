/**
 * CJS stub for `p-map` (ESM-only as of v7+).
 *
 * The e2e suite never actually exercises `p-map`'s concurrency semantics
 * (it is only imported transitively by `@mastra/core` during AppModule
 * boot), so this stub preserves the call signature while running the mapper
 * sequentially and in-order. Sufficient for test module loading.
 */
'use strict';

async function pMap(input, mapper, options) {
  const list = Array.isArray(input) ? input : Array.from(input);
  const concurrency =
    options && Number.isFinite(options.concurrency) ? options.concurrency : Infinity;

  if (concurrency === 1) {
    const out = [];
    for (let i = 0; i < list.length; i += 1) {
      out.push(await mapper(list[i], i));
    }
    return out;
  }

  // Generic concurrent execution. For tests, the call sites use very small
  // arrays (often length 0 or 1), so the cost is negligible.
  const results = new Array(list.length);
  let nextIndex = 0;
  const worker = async () => {
    while (true) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= list.length) return;
      results[i] = await mapper(list[i], i);
    }
  };
  const limit = Math.max(1, Math.min(concurrency, list.length || 1));
  const workers = [];
  for (let i = 0; i < limit; i += 1) workers.push(worker());
  await Promise.all(workers);
  return results;
}

module.exports = pMap;
module.exports.default = pMap;
