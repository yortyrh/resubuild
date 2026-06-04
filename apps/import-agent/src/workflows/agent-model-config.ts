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
