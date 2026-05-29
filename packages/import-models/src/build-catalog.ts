import type { ImportModelCatalog, ImportModelEntry, ImportProviderEntry } from './index';
import type { ModelsDevModel, ModelsDevRegistry } from './models-dev';

/** Providers listed first in UI (matches Mastra docs prominence). */
export const PROVIDER_ORDER = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'groq',
  'mistral',
  'xai',
  'openrouter',
] as const;

const ENV_PREFERENCE: Record<string, string> = {
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
};

const API_KEY_LABEL_OVERRIDES: Record<string, string> = {
  OPENAI_API_KEY: 'OpenAI API key',
  ANTHROPIC_API_KEY: 'Anthropic API key',
  GOOGLE_GENERATIVE_AI_API_KEY: 'Google API key',
  GOOGLE_API_KEY: 'Google API key',
  GEMINI_API_KEY: 'Gemini API key',
  OPENROUTER_API_KEY: 'OpenRouter API key',
  GROQ_API_KEY: 'Groq API key',
  DEEPSEEK_API_KEY: 'DeepSeek API key',
  XAI_API_KEY: 'xAI API key',
};

const NON_CHAT_MODEL_PATTERN =
  /(?:^|\/)(?:text-embedding|embedding|whisper|tts|dall-e|gpt-image|chatgpt-image|imagen|flux|stable-diffusion)/i;

const SEGMENT_PATTERN = /^[a-z0-9@~.+][a-z0-9._:@+()v-]*$/i;

type ModelBuildRow = ImportModelEntry & { _meta: ModelsDevModel };

function isValidMastraSegments(segments: string[]): boolean {
  return segments.length >= 2 && segments.every((segment) => SEGMENT_PATTERN.test(segment));
}

export function pickApiKeyEnvVar(providerId: string, envVars?: string[]): string {
  if (!envVars?.length) {
    return `${providerId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`;
  }
  const preferred = ENV_PREFERENCE[providerId];
  if (preferred && envVars.includes(preferred)) {
    return preferred;
  }
  return envVars[0];
}

export function apiKeyLabelFromEnvVar(envVar: string): string {
  if (API_KEY_LABEL_OVERRIDES[envVar]) {
    return API_KEY_LABEL_OVERRIDES[envVar];
  }
  const base = envVar
    .replace(/_API_KEY$/, '')
    .replace(/_/g, ' ')
    .toLowerCase();
  const titled = base.replace(/\b\w/g, (char) => char.toUpperCase());
  return `${titled} API key`;
}

function providerDisplayName(name: string, doc?: string): string {
  let host: string | null = null;
  if (doc) {
    try {
      host = new URL(doc).hostname.replace(/^www\./, '');
    } catch {
      host = null;
    }
  }
  const hint = host ? `API key from ${host}` : 'bring your own API key';
  return `${name} (BYOK — ${hint})`;
}

function isChatCapableModel(model: ModelsDevModel): boolean {
  const outputs = model.modalities?.output;
  if (!Array.isArray(outputs) || !outputs.includes('text')) {
    return false;
  }
  return !NON_CHAT_MODEL_PATTERN.test(model.id);
}

function scorePdfImportCandidate(model: ModelsDevModel): number {
  const id = model.id.toLowerCase();
  const name = (model.name ?? model.id).toLowerCase();
  let score = 0;
  if (model.tool_call) score += 2;
  if (!model.reasoning) score += 1;
  if (id === 'gpt-4o-mini' || id.endsWith('/gpt-4o-mini')) score += 8;
  if (id.includes('gemini-2.5-flash') && !id.includes('image') && !id.includes('tts')) {
    score += 8;
  }
  if (id.includes('claude-haiku') || id.includes('claude-sonnet-4-6')) score += 6;
  if (
    /(flash|mini|haiku|nano|lite|fast)/.test(id) ||
    /(flash|mini|haiku|nano|lite|fast)/.test(name)
  ) {
    score += 4;
  }
  if (/(opus|pro|o1|o3|o4|deep-research|codex|image|tts)/.test(id)) {
    score -= 2;
  }
  return score;
}

function buildModelEntry(
  providerId: string,
  modelKey: string,
  model: ModelsDevModel,
): ModelBuildRow | null {
  const fullId = `${providerId}/${modelKey}`;
  const segments = fullId.split('/').filter(Boolean);
  if (!isValidMastraSegments(segments)) {
    return null;
  }

  return {
    id: fullId,
    displayName: model.name ?? modelKey,
    _meta: model,
  };
}

function markRecommendedForPdfImport(models: ModelBuildRow[]): ImportModelEntry[] {
  if (models.length === 0) {
    return [];
  }

  const ranked = [...models].sort(
    (a, b) => scorePdfImportCandidate(b._meta) - scorePdfImportCandidate(a._meta),
  );
  const bestId = ranked[0].id;

  return models.map(({ _meta, ...entry }) => ({
    ...entry,
    ...(entry.id === bestId ? { recommendedForPdfImport: true as const } : {}),
  }));
}

function sortProviders(a: ImportProviderEntry, b: ImportProviderEntry): number {
  const aIndex = PROVIDER_ORDER.indexOf(a.id as (typeof PROVIDER_ORDER)[number]);
  const bIndex = PROVIDER_ORDER.indexOf(b.id as (typeof PROVIDER_ORDER)[number]);
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }
  return a.displayName.localeCompare(b.displayName);
}

/** Build a Mastra-aligned catalog from a models.dev registry payload. */
export function buildImportModelCatalog(modelsDev: ModelsDevRegistry): ImportModelCatalog {
  const providers: ImportProviderEntry[] = [];

  for (const [providerId, provider] of Object.entries(modelsDev)) {
    const rawModels = provider.models ?? {};
    const modelEntries: ModelBuildRow[] = [];

    for (const [modelKey, model] of Object.entries(rawModels)) {
      if (!isChatCapableModel(model)) {
        continue;
      }
      const entry = buildModelEntry(providerId, modelKey, model);
      if (entry) {
        modelEntries.push(entry);
      }
    }

    if (modelEntries.length === 0) {
      continue;
    }

    modelEntries.sort((a, b) => a.displayName.localeCompare(b.displayName));
    const models = markRecommendedForPdfImport(modelEntries);
    const apiKeyEnvVar = pickApiKeyEnvVar(providerId, provider.env);

    providers.push({
      id: providerId,
      displayName: providerDisplayName(provider.name ?? providerId, provider.doc),
      apiKeyEnvVar,
      apiKeyLabel: apiKeyLabelFromEnvVar(apiKeyEnvVar),
      models,
    });
  }

  providers.sort(sortProviders);

  return { version: 1, providers };
}

export function assertImportModelCatalog(catalog: ImportModelCatalog): void {
  if (!Array.isArray(catalog.providers) || catalog.providers.length === 0) {
    throw new Error('Import model catalog must include at least one provider');
  }

  const providerIds = new Set<string>();

  for (const provider of catalog.providers) {
    if (!provider.id || !provider.apiKeyLabel || !Array.isArray(provider.models)) {
      throw new Error(`Invalid provider entry: ${JSON.stringify(provider)}`);
    }
    if (providerIds.has(provider.id)) {
      throw new Error(`Duplicate provider id: ${provider.id}`);
    }
    providerIds.add(provider.id);

    const modelIds = new Set<string>();
    for (const model of provider.models) {
      if (!model.id || !model.displayName) {
        throw new Error(`Invalid model entry under ${provider.id}`);
      }
      if (modelIds.has(model.id)) {
        throw new Error(`Duplicate model id: ${model.id}`);
      }
      modelIds.add(model.id);

      const segments = model.id.split('/').filter(Boolean);
      if (!isValidMastraSegments(segments)) {
        throw new Error(`Model id has invalid segments: ${model.id}`);
      }
    }
  }
}
