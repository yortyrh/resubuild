import { describe, expect, it } from 'vitest';
import catalog from '../catalog.json';
import {
  getProviderApiKeyLabel,
  type ImportModelCatalog,
  InvalidImportModelError,
  InvalidMastraModelIdError,
  listCatalogModelsForProvider,
  listCatalogProviders,
  parseMastraModelId,
  resolveProviderId,
  validateImportModelId,
} from './index';

const testCatalog = catalog as ImportModelCatalog;

describe('parseMastraModelId', () => {
  it('parses provider/model form', () => {
    expect(parseMastraModelId('openai/gpt-4o-mini')).toEqual({
      gateway: null,
      provider: 'openai',
      model: 'gpt-4o-mini',
      fullId: 'openai/gpt-4o-mini',
    });
  });

  it('parses gateway/provider/model form', () => {
    expect(parseMastraModelId('openrouter/google/gemini-2.5-flash')).toEqual({
      gateway: 'openrouter',
      provider: 'google',
      model: 'gemini-2.5-flash',
      fullId: 'openrouter/google/gemini-2.5-flash',
    });
  });

  it('rejects malformed ids', () => {
    expect(() => parseMastraModelId('gpt-4o-mini')).toThrow(InvalidMastraModelIdError);
    expect(() => parseMastraModelId('openai/')).toThrow(/Mastra form/);
    expect(() => parseMastraModelId('')).toThrow(/required/);
  });
});

describe('validateImportModelId', () => {
  it('accepts catalog models', () => {
    const parsed = validateImportModelId('openai/gpt-4o-mini', testCatalog);
    expect(parsed.fullId).toBe('openai/gpt-4o-mini');
  });

  it('rejects unknown providers', () => {
    expect(() => validateImportModelId('groq/llama-3', testCatalog)).toThrow(
      InvalidImportModelError,
    );
  });

  it('rejects models outside catalog', () => {
    expect(() => validateImportModelId('openai/nonexistent-model-xyz', testCatalog)).toThrow(
      /not supported/,
    );
  });
});

describe('catalog helpers', () => {
  it('lists providers with api key labels', () => {
    const providers = listCatalogProviders(testCatalog);
    const ids = providers.map((entry) => entry.id);
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
    expect(ids).toContain('google');
    expect(ids).toContain('openrouter');
    expect(getProviderApiKeyLabel('openai', testCatalog)).toBe('OpenAI API key');
  });

  it('lists models for a provider', () => {
    const models = listCatalogModelsForProvider('google', testCatalog);
    expect(models.some((entry) => entry.id === 'google/gemini-2.5-flash')).toBe(true);
  });

  it('resolves provider id from gateway form', () => {
    const parsed = parseMastraModelId('openrouter/google/gemini-2.5-flash');
    expect(resolveProviderId(parsed)).toBe('openrouter');
  });
});
