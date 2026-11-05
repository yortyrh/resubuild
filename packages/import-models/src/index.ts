export {
  apiKeyLabelFromEnvVar,
  assertImportModelCatalog,
  buildImportModelCatalog,
  PROVIDER_ORDER,
  pickApiKeyEnvVar,
} from './build-catalog';
export { loadFallbackImportModelCatalog } from './fallback-catalog';
export { fetchModelsDevRegistry } from './fetch-models-dev';
export {
  type FetchFn,
  type FetchImportModelRegistryOptions,
  fetchImportModelRegistryViaGateway,
  type MastraModelGateway,
  modelsDevGateway,
} from './fetch-via-gateway';
export {
  describeModelOptions,
  getModelOptionFields,
  InvalidModelOptionsError,
  MODEL_OPTIONS_BY_PROVIDER,
  type ModelOptionEnumField,
  type ModelOptionField,
  type ModelOptionIntegerField,
  type ModelOptions,
  type ModelOptionValue,
  toProviderOptions,
  validateModelOptions,
} from './model-options';
export {
  MODELS_DEV_API_URL,
  type ModelsDevModel,
  type ModelsDevProvider,
  type ModelsDevRegistry,
} from './models-dev';

import { getModelOptionFields } from './model-options';

export interface ImportModelEntry {
  id: string;
  displayName: string;
  recommendedForPdfImport?: boolean;
  /** Model can reason/think before answering (models.dev `reasoning`). */
  reasoning?: boolean;
  /** Provider limit on generated tokens per reply (models.dev `limit.output`), when known. */
  maxOutputTokens?: number;
}

export interface ImportProviderEntry {
  id: string;
  displayName: string;
  apiKeyEnvVar: string;
  apiKeyLabel: string;
  models: ImportModelEntry[];
}

export interface ImportModelCatalog {
  version: number;
  providers: ImportProviderEntry[];
}

export interface ParsedMastraModelId {
  gateway: string | null;
  provider: string;
  model: string;
  fullId: string;
}

export class InvalidMastraModelIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMastraModelIdError';
  }
}

export class InvalidImportModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidImportModelError';
  }
}

/** Parse Mastra model ids: `provider/model` or `gateway/provider/model`. */
export function parseMastraModelId(modelId: string): ParsedMastraModelId {
  const trimmed = modelId.trim();
  if (!trimmed) {
    throw new InvalidMastraModelIdError('Model id is required');
  }

  const segments = trimmed.split('/').filter(Boolean);
  if (segments.length < 2 || segments.length > 3) {
    throw new InvalidMastraModelIdError(
      'Model id must use Mastra form provider/model or gateway/provider/model',
    );
  }

  if (segments.some((segment) => !/^[a-z0-9@~.+][a-z0-9._:@+()v-]*$/i.test(segment))) {
    throw new InvalidMastraModelIdError('Model id contains invalid segments');
  }

  if (segments.length === 2) {
    const [provider, model] = segments;
    return { gateway: null, provider, model, fullId: `${provider}/${model}` };
  }

  const [gateway, provider, model] = segments;
  return { gateway, provider, model, fullId: `${gateway}/${provider}/${model}` };
}

export function resolveProviderId(parsed: ParsedMastraModelId): string {
  return parsed.gateway ?? parsed.provider;
}

export function validateImportModelId(
  modelId: string,
  catalog: ImportModelCatalog,
): ParsedMastraModelId {
  const parsed = parseMastraModelId(modelId);
  const providerId = resolveProviderId(parsed);
  const provider = catalog.providers.find((entry) => entry.id === providerId);

  if (!provider) {
    throw new InvalidImportModelError(`Provider "${providerId}" is not supported for PDF import`);
  }

  const allowed = provider.models.some((entry) => entry.id === parsed.fullId);
  if (!allowed) {
    throw new InvalidImportModelError(`Model "${parsed.fullId}" is not supported for PDF import`);
  }

  return parsed;
}

export function getProviderApiKeyLabel(
  providerId: string,
  catalog: ImportModelCatalog,
): string | null {
  return catalog.providers.find((entry) => entry.id === providerId)?.apiKeyLabel ?? null;
}

export function listCatalogProviders(catalog: ImportModelCatalog) {
  return catalog.providers.map(({ id, displayName, apiKeyEnvVar, apiKeyLabel }) => ({
    id,
    displayName,
    apiKeyEnvVar,
    apiKeyLabel,
    modelOptions: getModelOptionFields(id),
  }));
}

export function listCatalogModelsForProvider(providerId: string, catalog: ImportModelCatalog) {
  const provider = catalog.providers.find((entry) => entry.id === providerId);
  if (!provider) {
    return [];
  }

  return provider.models.map(({ id, displayName, recommendedForPdfImport, reasoning }) => ({
    id,
    displayName,
    recommendedForPdfImport: recommendedForPdfImport ?? false,
    reasoning: reasoning ?? false,
  }));
}

/** Output-token limit of `modelId` in the catalog, or undefined when unknown. */
export function getModelMaxOutputTokens(
  catalog: ImportModelCatalog,
  modelId: string,
): number | undefined {
  for (const provider of catalog.providers) {
    const model = provider.models.find((entry) => entry.id === modelId);
    if (model) return model.maxOutputTokens;
  }
  return undefined;
}

/** Provider and model entries for `modelId`, or null when not in the catalog. */
export function findCatalogModel(
  catalog: ImportModelCatalog,
  modelId: string,
): { provider: ImportProviderEntry; model: ImportModelEntry } | null {
  for (const provider of catalog.providers) {
    const model = provider.models.find((entry) => entry.id === modelId);
    if (model) return { provider, model };
  }
  return null;
}

/** Provider name without the catalog's "(BYOK — …)" hint, e.g. "OpenAI". */
export function shortProviderName(displayName: string): string {
  return displayName.replace(/\s*\(BYOK[^)]*\)\s*$/, '').trim() || displayName;
}

export interface ModelDisplayNames {
  /** e.g. "Anthropic" */
  providerDisplayName: string;
  /** e.g. "Claude Opus 4.5" */
  modelDisplayName: string;
  /** `label` when set, otherwise "Provider · Model". */
  displayName: string;
}

/** Provider and model names for `modelId` (raw id segments when it is not in the catalog). */
export function modelDisplayNames(
  catalog: ImportModelCatalog,
  modelId: string,
  label?: string | null,
): ModelDisplayNames {
  const found = findCatalogModel(catalog, modelId);
  let providerDisplayName: string;
  let modelDisplayName: string;
  if (found) {
    providerDisplayName = shortProviderName(found.provider.displayName);
    modelDisplayName = found.model.displayName;
  } else {
    const slash = modelId.indexOf('/');
    providerDisplayName = slash > 0 ? modelId.slice(0, slash) : modelId;
    modelDisplayName = slash > 0 ? modelId.slice(slash + 1) : modelId;
  }
  return {
    providerDisplayName,
    modelDisplayName,
    displayName: label?.trim() || `${providerDisplayName} · ${modelDisplayName}`,
  };
}
