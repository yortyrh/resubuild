import { describe, expect, it } from 'vitest';
import { buildImportModelCatalog } from './build-catalog';
import { getModelMaxOutputTokens } from './index';
import type { ModelsDevRegistry } from './models-dev';

const miniRegistry: ModelsDevRegistry = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    doc: 'https://platform.openai.com',
    env: ['OPENAI_API_KEY'],
    models: {
      'gpt-4o-mini': {
        id: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        tool_call: true,
        reasoning: false,
        modalities: { output: ['text'] },
        limit: { context: 128000, output: 16384 },
      },
      'gpt-no-limit': {
        id: 'gpt-no-limit',
        name: 'GPT without limit metadata',
        reasoning: true,
        modalities: { output: ['text'] },
        limit: { output: 0 },
      },
      'text-embedding-3-small': {
        id: 'text-embedding-3-small',
        name: 'Embedding',
        modalities: { output: ['text'] },
      },
    },
  },
  unknown: {
    id: 'unknown',
    name: 'Unknown',
    env: ['UNKNOWN_API_KEY'],
    models: {
      'only-tts': {
        id: 'only-tts',
        name: 'TTS',
        modalities: { output: ['audio'] },
      },
    },
  },
};

describe('buildImportModelCatalog', () => {
  it('includes chat-capable models and marks a PDF import default', () => {
    const catalog = buildImportModelCatalog(miniRegistry);
    expect(catalog.providers).toHaveLength(1);
    expect(catalog.providers[0].id).toBe('openai');
    expect(catalog.providers[0].models).toHaveLength(2);
    expect(catalog.providers[0].models).toContainEqual(
      expect.objectContaining({
        id: 'openai/gpt-4o-mini',
        recommendedForPdfImport: true,
      }),
    );
  });

  it('keeps the provider output-token limit when models.dev reports one', () => {
    const catalog = buildImportModelCatalog(miniRegistry);
    const byId = Object.fromEntries(catalog.providers[0].models.map((m) => [m.id, m]));
    expect(byId['openai/gpt-4o-mini'].maxOutputTokens).toBe(16384);
    expect(byId['openai/gpt-no-limit']).not.toHaveProperty('maxOutputTokens');
    expect(getModelMaxOutputTokens(catalog, 'openai/gpt-4o-mini')).toBe(16384);
    expect(getModelMaxOutputTokens(catalog, 'openai/missing')).toBeUndefined();
  });

  it('keeps the models.dev reasoning flag', () => {
    const catalog = buildImportModelCatalog(miniRegistry);
    const byId = Object.fromEntries(catalog.providers[0].models.map((m) => [m.id, m]));
    expect(byId['openai/gpt-no-limit'].reasoning).toBe(true);
    expect(byId['openai/gpt-4o-mini']).not.toHaveProperty('reasoning');
  });

  it('skips providers with no chat models', () => {
    const catalog = buildImportModelCatalog({ unknown: miniRegistry.unknown });
    expect(catalog.providers).toHaveLength(0);
  });
});
