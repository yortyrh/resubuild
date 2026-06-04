/**
 * CJS stub for `tokenx` (ESM-only as of v1+).
 *
 * `@mastra/core` transitively imports `tokenx` for token estimation during
 * AI model invocations. The e2e suite never runs an actual inference call
 * (the Supabase-backed tests fail at the auth layer, and the MCP transport
 * gate tests do not invoke a model), so this stub preserves the call
 * surface without performing the real heuristic estimation.
 */
'use strict';

function estimateTokenCount(text) {
  if (typeof text !== 'string' || text.length === 0) return 0;
  // Crude ~4 chars/token heuristic — only used as a fallback when the
  // real `tokenx` package would have been invoked.
  return Math.ceil(text.length / 4);
}

function isWithinTokenLimit(text, tokenLimit, options) {
  return estimateTokenCount(text, options) <= tokenLimit;
}

module.exports = {
  estimateTokenCount,
  isWithinTokenLimit,
  approximateTokenSize: estimateTokenCount,
};
