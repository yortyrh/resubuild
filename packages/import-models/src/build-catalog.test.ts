import { describe, expect, it } from 'vitest';
import { buildImportModelCatalog } from './build-catalog';
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
    expect(catalog.providers[0].models).toHaveLength(1);
    expect(catalog.providers[0].models[0]).toMatchObject({
      id: 'openai/gpt-4o-mini',
      recommendedForPdfImport: true,
    });
  });

  it('skips providers with no chat models', () => {
    const catalog = buildImportModelCatalog({ unknown: miniRegistry.unknown });
    expect(catalog.providers).toHaveLength(0);
  });
});
