export {
  apiKeyLabelFromEnvVar,
  assertImportModelCatalog,
  buildImportModelCatalog,
  PROVIDER_ORDER,
  pickApiKeyEnvVar,
} from './build-catalog';
export { loadFallbackImportModelCatalog } from './fallback-catalog';
export { type FetchFn, fetchModelsDevRegistry } from './fetch-models-dev';
export {
  MODELS_DEV_API_URL,
  type ModelsDevModel,
  type ModelsDevProvider,
  type ModelsDevRegistry,
} from './models-dev';

export interface ImportModelEntry {
  id: string;
  displayName: string;
  recommendedForPdfImport?: boolean;
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
  }));
}

export function listCatalogModelsForProvider(providerId: string, catalog: ImportModelCatalog) {
  const provider = catalog.providers.find((entry) => entry.id === providerId);
  if (!provider) {
    return [];
  }

  return provider.models.map(({ id, displayName, recommendedForPdfImport }) => ({
    id,
    displayName,
    recommendedForPdfImport: recommendedForPdfImport ?? false,
  }));
}
