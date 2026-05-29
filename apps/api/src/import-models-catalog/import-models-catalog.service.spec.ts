import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildImportModelCatalog,
  loadFallbackImportModelCatalog,
  type ModelsDevRegistry,
} from '@resumind/import-models';
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

describe('ImportModelsCatalogService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  function createService(catalogSource?: string, modelsDevUrl?: string) {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'IMPORT_MODELS_CATALOG_SOURCE') {
          return catalogSource;
        }
        if (key === 'MODELS_DEV_API_URL') {
          return modelsDevUrl;
        }
        return undefined;
      }),
    };
    return new ImportModelsCatalogService(configService as unknown as ConfigService);
  }

  it('loads catalog from models.dev on refresh', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => miniRegistry,
    });

    const service = createService();
    await service.refreshCatalog('manual');

    const catalog = service.getCatalog();
    expect(catalog.providers[0].id).toBe('openai');
    expect(service.getStatus().source).toBe('models.dev');
  });

  it('uses static fallback when IMPORT_MODELS_CATALOG_SOURCE=static', async () => {
    const service = createService('static');
    await service.refreshCatalog('manual');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.getStatus().source).toBe('fallback');
    expect(service.getCatalog().providers.length).toBeGreaterThan(0);
  });

  it('falls back to bundled catalog when models.dev fails on first load', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, statusText: 'Unavailable' });

    const service = createService();
    await service.refreshCatalog('startup');

    expect(service.getStatus().source).toBe('fallback');
    expect(service.getCatalog()).toEqual(loadFallbackImportModelCatalog());
  });

  it('keeps previous catalog when scheduled refresh fails', async () => {
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
    expect(service.getStatus().lastRefreshError).toContain('models.dev API failed');
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

  it('uses configured models.dev API URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => miniRegistry,
    });

    const service = createService(undefined, 'https://custom.example/registry.json');
    await service.refreshCatalog('manual');

    expect(fetchMock).toHaveBeenCalledWith('https://custom.example/registry.json');
  });

  it('skips scheduled refresh when static catalog is configured', async () => {
    const service = createService('static');
    await service.refreshCatalog('startup');
    fetchMock.mockClear();

    await service.scheduledRefresh();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.getStatus().source).toBe('fallback');
  });
});
