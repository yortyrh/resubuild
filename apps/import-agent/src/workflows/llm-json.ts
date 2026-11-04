import { jsonrepair } from 'jsonrepair';

/** Thrown when an LLM response cannot be turned into a JSON object. */
export class LlmJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmJsonError';
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new LlmJsonError('LLM did not return a JSON object');
  }
  return value as Record<string, unknown>;
}

/**
 * Recursively drops `null` values. Providers with strict structured outputs
 * return `null` for optional fields they leave empty; JSON Resume expects the
 * key to be absent instead.
 */
export function stripNulls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== null).map((item) => stripNulls(item)) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== null) out[key] = stripNulls(item);
    }
    return out as T;
  }
  return value;
}

/**
 * Extracts the JSON object from an LLM reply and parses it.
 *
 * Tolerates prose or code fences around the object and repairs common defects
 * (missing or trailing commas, comments, single quotes, unescaped characters,
 * output truncated by the token limit — unclosed strings/arrays/objects are
 * closed). Throws {@link LlmJsonError} when nothing usable remains.
 */
export function parseLlmJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  if (start === -1) {
    throw new LlmJsonError('LLM did not return JSON');
  }

  const fromStart = trimmed.slice(start);
  const end = fromStart.lastIndexOf('}');
  const bounded = end === -1 ? null : fromStart.slice(0, end + 1);

  if (bounded) {
    try {
      return stripNulls(asObject(JSON.parse(bounded)));
    } catch {
      // fall through to repair
    }
  }

  // Repair the whole tail first (handles truncation: the last `}` may belong
  // to an inner object), then the bounded slice (handles trailing prose).
  let lastError: unknown;
  for (const candidate of [fromStart, bounded]) {
    if (!candidate) continue;
    try {
      return stripNulls(asObject(JSON.parse(jsonrepair(candidate))));
    } catch (error) {
      lastError = error;
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new LlmJsonError(`LLM returned malformed JSON: ${reason}`);
}

/** Upper bound for draft replies; a JSON Resume never needs more than this. */
export const MAX_DRAFT_OUTPUT_TOKENS = 32_768;

/**
 * `modelSettings` for JSON drafts: the model's own output limit (capped), so
 * long CVs are not cut off by a small provider default. Empty when unknown.
 */
export function draftModelSettings(maxOutputTokens?: number): Record<string, unknown> {
  if (!maxOutputTokens || !Number.isFinite(maxOutputTokens) || maxOutputTokens <= 0) {
    return {};
  }
  return {
    modelSettings: {
      maxOutputTokens: Math.min(Math.floor(maxOutputTokens), MAX_DRAFT_OUTPUT_TOKENS),
    },
  };
}

/** The subset of the Mastra `Agent` this module needs (keeps it testable). */
export interface JsonAgent {
  generate(
    prompt: string,
    options?: Record<string, unknown>,
  ): Promise<{ text?: string; object?: unknown; finishReason?: string }>;
}

export interface GenerateJsonOptions {
  /** Zod (or JSON) schema for native structured output. Omit for free-form JSON. */
  schema?: unknown;
  /** Extra `agent.generate` options (maxSteps, modelSettings…). */
  generateOptions?: Record<string, unknown>;
  /**
   * Structured-output options merged into `structuredOutput` (e.g. `model` for
   * a separate structuring pass after a tool loop).
   */
  structuredOutputOptions?: Record<string, unknown>;
  /** Tool-less agent for the last-resort "fix your JSON" call (defaults to `agent`). */
  fixAgent?: JsonAgent;
}

const FIX_PROMPT = (reason: string, raw: string) =>
  `The text below was meant to be a single JSON object but it is not valid JSON (${reason}).\n` +
  'Return only the corrected, complete JSON object — no commentary, no code fences. ' +
  'Keep every value; close any unfinished strings, arrays or objects.\n\n' +
  raw;

/**
 * Asks the agent for a JSON object, as robustly as the provider allows:
 *
 * 1. Native structured output against `schema` (Mastra `structuredOutput`,
 *    prompt injection when the provider has no native support). If the
 *    provider rejects the structured request outright, retry once without it.
 * 2. If that yields no valid object, parse/repair the raw reply text.
 * 3. If the text is beyond repair, ask the model once to fix its own JSON.
 */
export async function generateJson(
  agent: JsonAgent,
  prompt: string,
  options: GenerateJsonOptions = {},
): Promise<Record<string, unknown>> {
  const { schema, generateOptions = {}, structuredOutputOptions = {}, fixAgent = agent } = options;

  let response: Awaited<ReturnType<JsonAgent['generate']>>;
  if (schema) {
    try {
      response = await agent.generate(prompt, {
        ...generateOptions,
        structuredOutput: {
          schema,
          errorStrategy: 'warn',
          jsonPromptInjection: 'auto',
          ...structuredOutputOptions,
        },
      });
    } catch {
      // e.g. the provider does not accept this schema / response format.
      response = await agent.generate(prompt, generateOptions);
    }
  } else {
    response = await agent.generate(prompt, generateOptions);
  }

  if (response.object && typeof response.object === 'object' && !Array.isArray(response.object)) {
    return stripNulls(response.object as Record<string, unknown>);
  }

  const raw = response.text ?? '';
  try {
    return parseLlmJson(raw);
  } catch (error) {
    if (!raw.includes('{')) throw error;
    const reason = error instanceof Error ? error.message : String(error);
    const { maxSteps: _maxSteps, ...singleStep } = generateOptions;
    const fixed = await fixAgent.generate(FIX_PROMPT(reason, raw), singleStep);
    return parseLlmJson(fixed.text ?? '');
  }
}
