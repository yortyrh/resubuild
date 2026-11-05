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
export interface ModelRunContext {
  /** Reasoning effort, thinking… for the account's provider. Undefined = provider defaults. */
  providerOptions?: ModelProviderOptions;
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

type AgentArgs = Omit<ConstructorParameters<typeof Agent>[0], 'model'>;

/**
 * A Mastra agent for the user's model and key whose `generate` calls carry the
 * current run's provider options.
 */
export function createModelAgent(modelId: string, apiKey: string, args: AgentArgs): Agent {
  const agent = new Agent({
    ...args,
    model: toAgentModelConfig(modelId, apiKey),
  } as ConstructorParameters<typeof Agent>[0]) as Agent;
  const { providerOptions } = currentModelRunContext();
  if (!providerOptions) return agent;

  const generate = agent.generate.bind(agent);
  agent.generate = ((messages: unknown, options?: GenerateOptions) =>
    generate(
      messages as never,
      withRunProviderOptions(options, providerOptions) as never,
    )) as typeof agent.generate;
  return agent;
}
