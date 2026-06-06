import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildImportModelCatalog,
  loadFallbackImportModelCatalog,
  type MastraModelGateway,
  type ModelsDevRegistry,
} from '@resubuild/import-models';
import { ImportModelsCatalogService } from './import-models-catalog.service';

const miniRegistry: ModelsDevRegistry = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    env: ['OPENAI_API_KEY'],
    models: {
      'gpt-4o-mini': {
        id: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        tool_call: true,
        modalities: { output: ['text'] },
      },
    },
  },
};

const stubGateway: MastraModelGateway = {
  name: 'stub',
  fetchProviders: async () => ({
    openai: {
      name: 'OpenAI',
      apiKeyEnvVar: 'OPENAI_API_KEY',
      models: ['gpt-4o-mini'],
      docUrl: 'https://platform.openai.com',
      gateway: 'stub',
    },
  }),
};

describe('ImportModelsCatalogService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  function createService(catalogSource?: string) {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'IMPORT_MODELS_CATALOG_SOURCE') {
          return catalogSource;
        }
        return undefined;
      }),
    };
    const service = new ImportModelsCatalogService(configService as unknown as ConfigService);
    service.setGateway(stubGateway);
    return service;
  }

  it('loads catalog via the Mastra gateway on refresh', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => miniRegistry,
    });

    const service = createService();
    await service.refreshCatalog('manual');

    const catalog = service.getCatalog();
    expect(catalog.providers[0].id).toBe('openai');
    expect(service.getStatus().source).toBe('mastra-gateway');
  });

  it('uses static fallback when IMPORT_MODELS_CATALOG_SOURCE=static', async () => {
    const service = createService('static');
    await service.refreshCatalog('manual');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.getStatus().source).toBe('fallback');
    expect(service.getCatalog().providers.length).toBeGreaterThan(0);
  });

  it('falls back to bundled catalog when the gateway fetch fails on first load', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, statusText: 'Unavailable' });

    const service = createService();
    await service.refreshCatalog('startup');

    expect(service.getStatus().source).toBe('fallback');
    expect(service.getCatalog()).toEqual(loadFallbackImportModelCatalog());
  });

  it('keeps previous catalog when a scheduled refresh fails', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => miniRegistry,
      })
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' });

    const service = createService();
    await service.refreshCatalog('startup');
    const before = service.getCatalog();

    await service.refreshCatalog('scheduled');

    expect(service.getCatalog()).toBe(before);
    expect(service.getStatus().lastRefreshError).toContain('Failed to fetch model metadata');
  });

  it('buildImportModelCatalog matches service expectations', () => {
    const built = buildImportModelCatalog(miniRegistry);
    expect(built.providers[0].models[0].id).toBe('openai/gpt-4o-mini');
  });

  it('throws when catalog is not loaded yet', () => {
    const service = createService();
    expect(() => service.getCatalog()).toThrow(ServiceUnavailableException);
  });

  it('loads catalog on module init', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => miniRegistry,
    });

    const service = createService();
    await service.onModuleInit();

    expect(service.getCatalog().providers[0].id).toBe('openai');
  });

  it('skips scheduled refresh when static catalog is configured', async () => {
    const service = createService('static');
    await service.refreshCatalog('startup');
    fetchMock.mockClear();

    await service.scheduledRefresh();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.getStatus().source).toBe('fallback');
  });

  it('records non-Error failures from the gateway fetch', async () => {
    fetchMock.mockRejectedValue('network down');

    const service = createService();
    await service.refreshCatalog('startup');

    expect(service.getStatus().source).toBe('fallback');
    expect(service.getStatus().lastRefreshError).toBe('network down');
  });

  it('reports zero counts before catalog is loaded', () => {
    const service = createService();

    expect(service.getStatus()).toMatchObject({
      providerCount: 0,
      modelCount: 0,
      lastRefreshedAt: null,
    });
  });
});
