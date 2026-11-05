import { AsyncLocalStorage } from 'node:async_hooks';
import { Agent } from '@mastra/core/agent';

/**
 * v1 `MastraModelConfig` requires the `id` field of `OpenAICompatibleConfig` to
 * be a `${string}/${string}` template literal. The runtime accepts any
 * `provider/model` string passed by the API; the type is widened at the call
 * site through this helper to keep the static API ergonomic without a
 * per-model cast.
 */
export function toAgentModelConfig(modelId: string, apiKey: string) {
  return {
    id: modelId,
    apiKey,
  } as never;
}

/** Mastra / AI SDK `providerOptions`, keyed by provider id. */
export type ModelProviderOptions = Record<string, Record<string, unknown>>;

/**
 * Per-run model settings shared by every agent a workflow creates. The API
 * sets it once around a job with `withModelRunContext`, so the workflows and
 * tools do not have to thread it through every helper.
 */
/** Tokens one model call spent, as reported by the provider. */
export interface ModelTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/** Receives the token usage of every model call in a run (app-funded quotas). */
export interface UsageMeter {
  record(usage: ModelTokenUsage): void | Promise<void>;
}

export interface ModelRunContext {
  /** Reasoning effort, thinking… for the account's provider. Undefined = provider defaults. */
  providerOptions?: ModelProviderOptions;
  /** Counts tokens for app-funded models; undefined for the user's own keys. */
  usageMeter?: UsageMeter;
}

const modelRunContext = new AsyncLocalStorage<ModelRunContext>();

/** Run `action` with `context` applied to every agent created by `createModelAgent`. */
export function withModelRunContext<T>(context: ModelRunContext, action: () => Promise<T>) {
  return modelRunContext.run(context, action);
}

export function currentModelRunContext(): ModelRunContext {
  return modelRunContext.getStore() ?? {};
}

type GenerateOptions = Record<string, unknown> & {
  providerOptions?: ModelProviderOptions;
  structuredOutput?: Record<string, unknown>;
};

/**
 * Add the run's `providerOptions` to `generate` options (call-site values win),
 * including the separate structuring pass when `structuredOutput.model` is set.
 */
export function withRunProviderOptions(
  options: GenerateOptions | undefined,
  providerOptions: ModelProviderOptions | undefined,
): GenerateOptions | undefined {
  if (!providerOptions) return options;
  const merged: GenerateOptions = {
    ...options,
    providerOptions: mergeProviderOptions(providerOptions, options?.providerOptions),
  };
  const structured = options?.structuredOutput;
  if (structured?.model) {
    merged.structuredOutput = {
      ...structured,
      providerOptions: mergeProviderOptions(
        providerOptions,
        structured.providerOptions as ModelProviderOptions | undefined,
      ),
    };
  }
  return merged;
}

function mergeProviderOptions(
  base: ModelProviderOptions,
  override: ModelProviderOptions | undefined,
): ModelProviderOptions {
  if (!override) return base;
  const merged: ModelProviderOptions = { ...base };
  for (const [provider, value] of Object.entries(override)) {
    merged[provider] = { ...base[provider], ...value };
  }
  return merged;
}

/**
 * Token usage of a Mastra `generate` result (`totalUsage` covers every step of
 * a tool loop), or null when the provider reported none.
 */
export function readTokenUsage(result: unknown): ModelTokenUsage | null {
  if (!result || typeof result !== 'object') return null;
  const source = result as { totalUsage?: unknown; usage?: unknown };
  const usage = (source.totalUsage ?? source.usage) as
    | { inputTokens?: number; outputTokens?: number; totalTokens?: number }
    | undefined;
  if (!usage || typeof usage !== 'object') return null;
  const inputTokens = toCount(usage.inputTokens);
  const outputTokens = toCount(usage.outputTokens);
  const totalTokens = toCount(usage.totalTokens) || inputTokens + outputTokens;
  if (totalTokens === 0) return null;
  return { inputTokens, outputTokens, totalTokens };
}

function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

type AgentArgs = Omit<ConstructorParameters<typeof Agent>[0], 'model'>;

/**
 * A Mastra agent for the run's model and key whose `generate` calls carry the
 * current run's provider options and report their token usage to its meter.
 */
export function createModelAgent(modelId: string, apiKey: string, args: AgentArgs): Agent {
  const agent = new Agent({
    ...args,
    model: toAgentModelConfig(modelId, apiKey),
  } as ConstructorParameters<typeof Agent>[0]) as Agent;
  const { providerOptions, usageMeter } = currentModelRunContext();
  if (!providerOptions && !usageMeter) return agent;

  const generate = agent.generate.bind(agent);
  agent.generate = (async (messages: unknown, options?: GenerateOptions) => {
    const result = await generate(
      messages as never,
      withRunProviderOptions(options, providerOptions) as never,
    );
    const usage = usageMeter ? readTokenUsage(result) : null;
    if (usage) await usageMeter?.record(usage);
    return result;
  }) as typeof agent.generate;
  return agent;
}
