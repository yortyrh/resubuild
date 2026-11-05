/**
 * User-selectable model options (reasoning effort, thinking, verbosity, service
 * tier…) per provider, and their mapping to Mastra / AI SDK `providerOptions`.
 *
 * Every option is optional: an unset option is never sent, so the provider's
 * own default applies. Values mirror the AI SDK provider option schemas bundled
 * in `@mastra/core` (`dist/_types/@ai-sdk_*`). Whether a given model accepts a
 * value (e.g. `xhigh`) is left to the provider: the API probes the key with
 * the options on save, so an unsupported combination is rejected there.
 */

export type ModelOptionValue = string | number;
export type ModelOptions = Record<string, ModelOptionValue>;

interface ModelOptionFieldBase {
  key: string;
  label: string;
  description: string;
  /** Only meaningful for reasoning models (catalog `reasoning: true`). */
  reasoningOnly: boolean;
  /** Shown/accepted only when another option has one of these values. */
  dependsOn?: { key: string; values: string[] };
}

export interface ModelOptionEnumField extends ModelOptionFieldBase {
  kind: 'enum';
  values: string[];
}

export interface ModelOptionIntegerField extends ModelOptionFieldBase {
  kind: 'integer';
  min: number;
  max: number;
}

export type ModelOptionField = ModelOptionEnumField | ModelOptionIntegerField;

export class InvalidModelOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidModelOptionsError';
  }
}

const reasoningEffort = (values: string[], description: string): ModelOptionEnumField => ({
  key: 'reasoningEffort',
  label: 'Reasoning effort',
  description,
  kind: 'enum',
  values,
  reasoningOnly: true,
});

const reasoningSummary: ModelOptionEnumField = {
  key: 'reasoningSummary',
  label: 'Reasoning summary',
  description: 'How much of the model’s reasoning is summarized in the response.',
  kind: 'enum',
  values: ['auto', 'concise', 'detailed'],
  reasoningOnly: true,
};

export const MODEL_OPTIONS_BY_PROVIDER: Record<string, ModelOptionField[]> = {
  openai: [
    reasoningEffort(
      ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
      'How long the model thinks before answering. Higher is slower, uses more tokens and is usually more accurate.',
    ),
    reasoningSummary,
    {
      key: 'textVerbosity',
      label: 'Verbosity',
      description: 'Length and detail of the written answer (GPT-5 family).',
      kind: 'enum',
      values: ['low', 'medium', 'high'],
      reasoningOnly: true,
    },
    {
      key: 'serviceTier',
      label: 'Service tier',
      description:
        'Processing tier. Flex is cheaper but slower; priority is faster and costs more.',
      kind: 'enum',
      values: ['auto', 'default', 'flex', 'priority'],
      reasoningOnly: false,
    },
  ],
  anthropic: [
    {
      key: 'thinking',
      label: 'Extended thinking',
      description:
        'Adaptive lets the model decide when and how much to think; enabled always thinks up to the budget.',
      kind: 'enum',
      values: ['adaptive', 'enabled', 'disabled'],
      reasoningOnly: true,
    },
    {
      key: 'budgetTokens',
      label: 'Thinking budget (tokens)',
      description: 'Maximum tokens the model may spend thinking.',
      kind: 'integer',
      min: 1024,
      max: 128_000,
      reasoningOnly: true,
      dependsOn: { key: 'thinking', values: ['enabled'] },
    },
    {
      key: 'effort',
      label: 'Effort',
      description:
        'How much effort the model puts into the answer. Lower is faster and cheaper; higher is more thorough.',
      kind: 'enum',
      values: ['low', 'medium', 'high', 'xhigh', 'max'],
      reasoningOnly: true,
    },
    {
      key: 'speed',
      label: 'Speed',
      description: 'Fast mode, on models that support it (higher price per token).',
      kind: 'enum',
      values: ['standard', 'fast'],
      reasoningOnly: false,
    },
  ],
  google: [
    {
      key: 'thinkingLevel',
      label: 'Thinking level',
      description: 'How much the model thinks before answering (Gemini 3 and later).',
      kind: 'enum',
      values: ['minimal', 'low', 'medium', 'high'],
      reasoningOnly: true,
    },
    {
      key: 'thinkingBudget',
      label: 'Thinking budget (tokens)',
      description: 'Token budget for thinking (Gemini 2.5). 0 turns thinking off, -1 is dynamic.',
      kind: 'integer',
      min: -1,
      max: 32_768,
      reasoningOnly: true,
    },
    {
      key: 'serviceTier',
      label: 'Service tier',
      description:
        'Processing tier. Flex is cheaper but slower; priority is faster and costs more.',
      kind: 'enum',
      values: ['standard', 'flex', 'priority'],
      reasoningOnly: false,
    },
  ],
  xai: [
    reasoningEffort(
      ['none', 'low', 'medium', 'high', 'xhigh'],
      'How long the model thinks before answering.',
    ),
    reasoningSummary,
  ],
  deepseek: [
    {
      key: 'thinking',
      label: 'Thinking',
      description: 'Turn thinking mode on or off.',
      kind: 'enum',
      values: ['enabled', 'disabled'],
      reasoningOnly: true,
    },
    reasoningEffort(['low', 'high', 'max'], 'Thinking strength (DeepSeek V4 reasoning models).'),
  ],
  groq: [
    reasoningEffort(
      ['none', 'default', 'low', 'medium', 'high'],
      'How long the model thinks before answering.',
    ),
  ],
  openrouter: [
    reasoningEffort(
      ['minimal', 'low', 'medium', 'high'],
      'Reasoning effort, translated by OpenRouter for the underlying model.',
    ),
  ],
};

/** Option fields the provider accepts (empty when it has none). */
export function getModelOptionFields(providerId: string): ModelOptionField[] {
  return MODEL_OPTIONS_BY_PROVIDER[providerId] ?? [];
}

function isFieldActive(field: ModelOptionField, options: ModelOptions): boolean {
  if (!field.dependsOn) return true;
  const value = options[field.dependsOn.key];
  return typeof value === 'string' && field.dependsOn.values.includes(value);
}

/**
 * Validate stored options for `providerId` and return a normalized copy
 * (unknown keys and empty values rejected, inactive dependent fields dropped).
 */
export function validateModelOptions(providerId: string, options: unknown): ModelOptions {
  if (options === undefined || options === null) return {};
  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new InvalidModelOptionsError('Model options must be an object');
  }

  const fields = getModelOptionFields(providerId);
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const normalized: ModelOptions = {};

  for (const [key, value] of Object.entries(options as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue;
    const field = byKey.get(key);
    if (!field) {
      throw new InvalidModelOptionsError(`Option "${key}" is not supported for ${providerId}`);
    }
    if (field.kind === 'enum') {
      if (typeof value !== 'string' || !field.values.includes(value)) {
        throw new InvalidModelOptionsError(
          `${field.label} must be one of: ${field.values.join(', ')}`,
        );
      }
      normalized[key] = value;
    } else {
      const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
      if (
        typeof number !== 'number' ||
        !Number.isInteger(number) ||
        number < field.min ||
        number > field.max
      ) {
        throw new InvalidModelOptionsError(
          `${field.label} must be a whole number between ${field.min} and ${field.max}`,
        );
      }
      normalized[key] = number;
    }
  }

  for (const field of fields) {
    if (field.key in normalized && !isFieldActive(field, normalized)) {
      delete normalized[field.key];
    }
  }

  return normalized;
}

/** Mastra / AI SDK `providerOptions` for these options, or undefined when none apply. */
export function toProviderOptions(
  providerId: string,
  options: ModelOptions | null | undefined,
): Record<string, Record<string, unknown>> | undefined {
  if (!options || Object.keys(options).length === 0) return undefined;
  const o = options;
  let payload: Record<string, unknown>;

  switch (providerId) {
    case 'anthropic': {
      payload = pick(o, ['effort', 'speed']);
      if (o.thinking === 'enabled') {
        payload.thinking = {
          type: 'enabled',
          ...(o.budgetTokens !== undefined ? { budgetTokens: o.budgetTokens } : {}),
        };
      } else if (o.thinking !== undefined) {
        payload.thinking = { type: o.thinking };
      }
      break;
    }
    case 'google': {
      payload = pick(o, ['serviceTier']);
      const thinkingConfig = pick(o, ['thinkingLevel', 'thinkingBudget']);
      if (Object.keys(thinkingConfig).length > 0) payload.thinkingConfig = thinkingConfig;
      break;
    }
    case 'deepseek': {
      payload = pick(o, ['reasoningEffort']);
      if (o.thinking !== undefined) payload.thinking = { type: o.thinking };
      break;
    }
    case 'openrouter': {
      payload = o.reasoningEffort !== undefined ? { reasoning: { effort: o.reasoningEffort } } : {};
      break;
    }
    case 'openai':
    case 'xai':
    case 'groq': {
      payload = pick(
        o,
        getModelOptionFields(providerId).map((field) => field.key),
      );
      break;
    }
    default:
      return undefined;
  }

  return Object.keys(payload).length > 0 ? { [providerId]: payload } : undefined;
}

function pick(options: ModelOptions, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (options[key] !== undefined) out[key] = options[key];
  }
  return out;
}

/** Short human summary of the set options, e.g. ["Reasoning effort: high"]. */
export function describeModelOptions(providerId: string, options: ModelOptions): string[] {
  return getModelOptionFields(providerId)
    .filter((field) => options[field.key] !== undefined)
    .map((field) => `${field.label}: ${options[field.key]}`);
}
