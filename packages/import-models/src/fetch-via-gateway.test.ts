import { describe, expect, it, vi } from 'vitest';
import { fetchImportModelRegistryViaGateway, type MastraModelGateway } from './fetch-via-gateway';
import type { ModelsDevRegistry } from './models-dev';

const RAW_REGISTRY: ModelsDevRegistry = {
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
        modalities: { output: ['text'] },
      },
      'text-embedding-3-small': {
        id: 'text-embedding-3-small',
        name: 'Embedding',
        modalities: { output: ['text'] },
      },
      'unsupported-model': {
        id: 'unsupported-model',
        name: 'Unsupported',
        modalities: { output: ['text'] },
      },
    },
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    env: ['ANTHROPIC_API_KEY'],
    models: {
      'claude-3-5-sonnet': {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        modalities: { output: ['text'] },
      },
    },
  },
  unknown: {
    id: 'unknown',
    name: 'Unknown',
    env: ['UNKNOWN_API_KEY'],
    models: {
      'gpt-x': { id: 'gpt-x', name: 'X', modalities: { output: ['text'] } },
    },
  },
};

const stubFetch = (payload: unknown, ok = true, status = 200, statusText = 'OK') =>
  vi.fn(async () => ({
    ok,
    status,
    statusText,
    json: async () => payload,
  })) as unknown as typeof fetch;

const gatewayAccepting: MastraModelGateway = {
  name: 'stub',
  fetchProviders: async () => ({
    openai: {
      name: 'OpenAI',
      apiKeyEnvVar: 'OPENAI_API_KEY',
      models: ['gpt-4o-mini', 'text-embedding-3-small'],
      docUrl: 'https://platform.openai.com',
      gateway: 'stub',
    },
    anthropic: {
      name: 'Anthropic',
      apiKeyEnvVar: 'ANTHROPIC_API_KEY',
      models: ['claude-3-5-sonnet'],
      docUrl: 'https://docs.anthropic.com',
      gateway: 'stub',
    },
  }),
};

describe('fetchImportModelRegistryViaGateway', () => {
  it('keeps only providers the gateway accepted', async () => {
    const fetchImpl = stubFetch(RAW_REGISTRY);
    const result = await fetchImportModelRegistryViaGateway({
      fetchImpl,
      gateway: gatewayAccepting,
    });

    expect(Object.keys(result).sort()).toEqual(['anthropic', 'openai']);
  });

  it('keeps only the models the gateway accepted, dropping unlisted ones', async () => {
    const fetchImpl = stubFetch(RAW_REGISTRY);
    const result = await fetchImportModelRegistryViaGateway({
      fetchImpl,
      gateway: gatewayAccepting,
    });

    expect(Object.keys(result.openai.models ?? {}).sort()).toEqual([
      'gpt-4o-mini',
      'text-embedding-3-small',
    ]);
    expect(result.openai.models?.['unsupported-model']).toBeUndefined();
  });

  it('overrides the raw env array with the gateway apiKeyEnvVar', async () => {
    const fetchImpl = stubFetch(RAW_REGISTRY);
    const result = await fetchImportModelRegistryViaGateway({
      fetchImpl,
      gateway: {
        name: 'stub',
        fetchProviders: async () => ({
          openai: {
            name: 'OpenAI',
            apiKeyEnvVar: ['PRIMARY_KEY', 'FALLBACK_KEY'],
            models: ['gpt-4o-mini'],
            gateway: 'stub',
          },
        }),
      },
    });

    expect(result.openai.env).toEqual(['PRIMARY_KEY', 'FALLBACK_KEY']);
  });

  it('falls back to the raw env array when the gateway exposes no apiKeyEnvVar', async () => {
    const fetchImpl = stubFetch(RAW_REGISTRY);
    const result = await fetchImportModelRegistryViaGateway({
      fetchImpl,
      gateway: {
        name: 'stub',
        fetchProviders: async () => ({
          openai: {
            name: 'OpenAI',
            apiKeyEnvVar: '',
            models: ['gpt-4o-mini'],
            gateway: 'stub',
          },
        }),
      },
    });

    expect(result.openai.env).toEqual(['OPENAI_API_KEY']);
  });

  it('throws a clear error when the metadata fetch fails', async () => {
    const fetchImpl = stubFetch(null, false, 503, 'Unavailable');
    await expect(
      fetchImportModelRegistryViaGateway({
        fetchImpl,
        gateway: gatewayAccepting,
      }),
    ).rejects.toThrow(/Failed to fetch model metadata from .* 503 Unavailable/);
  });

  it('skips providers accepted by the gateway that are missing from the raw registry', async () => {
    const fetchImpl = stubFetch(RAW_REGISTRY);
    const result = await fetchImportModelRegistryViaGateway({
      fetchImpl,
      gateway: {
        name: 'stub',
        fetchProviders: async () => ({
          openai: {
            name: 'OpenAI',
            apiKeyEnvVar: 'OPENAI_API_KEY',
            models: ['gpt-4o-mini'],
            gateway: 'stub',
          },
          // Present in the gateway, absent in the raw registry
          ghost: {
            name: 'Ghost',
            apiKeyEnvVar: 'GHOST_KEY',
            models: ['g-1'],
            gateway: 'stub',
          },
        }),
      },
    });

    expect(Object.keys(result)).toEqual(['openai']);
  });

  it('honors a custom apiUrl override', async () => {
    const fetchImpl = stubFetch(RAW_REGISTRY);
    await fetchImportModelRegistryViaGateway({
      apiUrl: 'https://custom.example/registry.json',
      fetchImpl,
      gateway: gatewayAccepting,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://custom.example/registry.json');
  });
});
