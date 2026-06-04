/**
 * Discover Mastra-supported providers and models through Mastra's own registry,
 * then enrich them with model metadata from models.dev for filtering and scoring.
 *
 * Why this layer exists
 * ---------------------
 * `@mastra/core` ships a `MastraModelGateway` abstraction. Its built-in
 * `ModelsDevGateway` knows which providers/models Mastra considers runnable
 * (OpenAI-compatible, has an installed package, or has a configured `api` + `env`).
 * In `@mastra/core@1.38.0` that gateway class is part of the package's public
 * exports from `@mastra/core/llm` (see `MastraModelGateway` and `ModelsDevGateway`).
 * We wrap the v1 built-in `ModelsDevGateway` in a small structural sub-view so
 * callers can swap in a different provider source (e.g. a Netlify gateway, a
 * custom registry) without touching the catalog builder. The local interface
 * only declares `fetchProviders()` so test stubs do not need to implement the
 * full v1 gateway surface (`buildUrl`, `getApiKey`, `resolveLanguageModel`).
 *
 * The `ProviderConfig` entries only carry model IDs as strings — they do not expose
 * the model metadata (modalities, `tool_call`, `reasoning`) our catalog builder
 * needs to filter non-chat models and pick a recommended PDF import model. We
 * therefore do a single `fetch()` of the upstream models.dev JSON and intersect
 * it with the gateway-accepted provider IDs.
 */
import { MastraModelGateway as MastraModelGatewayClass, ModelsDevGateway, type ProviderConfig } from '@mastra/core/llm';
import { MODELS_DEV_API_URL, type ModelsDevProvider, type ModelsDevRegistry } from './models-dev';

export type FetchFn = typeof fetch;

/**
 * Minimal structural sub-view of the v1 `MastraModelGateway` class. We only
 * declare the `fetchProviders()` method the workspace actually uses so test
 * stubs that return a hand-rolled `Record<string, ProviderConfig>` keep
 * satisfying it without implementing the full v1 class surface
 * (`buildUrl`, `getApiKey`, `resolveLanguageModel`).
 *
 * The local name `MastraModelGateway` is kept for backward compatibility with
 * the workspace's existing call sites and tests, which import it as a
 * structural type. The v1 public class is exposed as `MastraModelGatewayClass`.
 */
export interface MastraModelGateway {
  readonly name: string;
  readonly prefix?: string;
  fetchProviders(): Promise<Record<string, ProviderConfig>>;
}

/** Re-export of the v1 `MastraModelGateway` public class. */
export { MastraModelGatewayClass };

/**
 * The default gateway implementation: a thin wrapper around the v1
 * `ModelsDevGateway` shipped by `@mastra/core/llm`, which returns the same
 * curated provider/model set `PROVIDER_REGISTRY` exposed in v0.20. The wrapper
 * exists so the import-models package keeps a stable local injection contract
 * (the `MastraModelGateway` type above) while the underlying implementation is
 * now the v1 public class.
 */
export const modelsDevGateway: MastraModelGateway = {
  name: 'models.dev',
  fetchProviders: async (): Promise<Record<string, ProviderConfig>> => {
    return new ModelsDevGateway().fetchProviders();
  },
};

export interface FetchImportModelRegistryOptions {
  /** Optional override for the upstream models.dev URL (used to fetch model metadata). */
  apiUrl?: string;
  /** Optional fetch implementation (useful for tests). */
  fetchImpl?: FetchFn;
  /**
   * Optional gateway instance. Defaults to the bundled `modelsDevGateway` (which
   * proxies `PROVIDER_REGISTRY` from `@mastra/core`). Injectable so tests can
   * supply a stub gateway that returns a fixed `ProviderConfig` map, and so a
   * future Netlify/custom gateway can be plugged in without code changes.
   */
  gateway?: MastraModelGateway;
}

const normalizeEnvVars = (apiKeyEnvVar: ProviderConfig['apiKeyEnvVar']): string[] => {
  if (Array.isArray(apiKeyEnvVar)) {
    return apiKeyEnvVar.filter((value): value is string => Boolean(value));
  }
  return apiKeyEnvVar ? [apiKeyEnvVar] : [];
};

/**
 * Fetch the Mastra-aligned import model registry by:
 *   1. Asking the `MastraModelGateway` which providers/models it supports.
 *   2. Fetching the upstream models.dev JSON to retrieve model metadata.
 *   3. Returning only the providers the gateway accepted, with the gateway's
 *      `apiKeyEnvVar` overriding the raw `env` array when present.
 */
export async function fetchImportModelRegistryViaGateway(
  options: FetchImportModelRegistryOptions = {},
): Promise<ModelsDevRegistry> {
  const { apiUrl = MODELS_DEV_API_URL, fetchImpl = fetch, gateway = modelsDevGateway } = options;

  const accepted: Record<string, ProviderConfig> = await gateway.fetchProviders();

  const response = await fetchImpl(apiUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch model metadata from ${apiUrl}: ${response.status} ${response.statusText}`,
    );
  }
  const raw = (await response.json()) as ModelsDevRegistry;

  const filtered: ModelsDevRegistry = {};
  for (const [providerId, providerConfig] of Object.entries(accepted)) {
    const rawProvider = raw[providerId];
    if (!rawProvider) {
      continue;
    }
    const acceptedModelIds = new Set(providerConfig.models);
    const rawModels = rawProvider.models ?? {};
    const acceptedModels: ModelsDevProvider['models'] = {};
    for (const [modelKey, model] of Object.entries(rawModels)) {
      if (acceptedModelIds.has(modelKey)) {
        acceptedModels[modelKey] = model;
      }
    }

    const envFromGateway = normalizeEnvVars(providerConfig.apiKeyEnvVar);
    const env = envFromGateway.length > 0 ? envFromGateway : rawProvider.env;

    filtered[providerId] = {
      ...rawProvider,
      ...(env ? { env } : {}),
      models: acceptedModels,
    };
  }

  return filtered;
}
