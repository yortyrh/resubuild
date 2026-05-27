import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockParseMediaId = vi.fn();

vi.mock('@/lib/auth-session', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('token'),
}));

vi.mock('@/lib/api', () => ({
  parseMediaIdFromImageUrl: (url: string | undefined) => mockParseMediaId(url),
}));

import { resolveImportedResumeData } from './import-cv-media';

const mediaResult = {
  id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
  url: 'http://localhost:3001/media/aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
  contentType: 'image/png',
};

function mockFetchByPath(handlers: Record<string, () => Promise<Response>>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      for (const [suffix, handler] of Object.entries(handlers)) {
        if (path.endsWith(suffix)) {
          return handler();
        }
      }
      throw new Error(`Unexpected fetch: ${path}`);
    }),
  );
}

describe('resolveImportedResumeData', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mockParseMediaId.mockReturnValue(null);
  });

  it('omits basics.image when URL import fails and Gravatar is not requested', async () => {
    mockFetchByPath({
      '/media/import-url': async () =>
        ({ status: 404, ok: false, json: async () => ({}) }) as Response,
    });

    const result = await resolveImportedResumeData({
      basics: {
        name: 'Jane',
        email: 'jane@example.com',
        image: 'https://example.com/missing.png',
      },
    });

    expect(result.basics).toEqual({ name: 'Jane', email: 'jane@example.com' });
    expect(result.basics).not.toHaveProperty('image');
  });

  it('imports Gravatar only when useGravatar is true', async () => {
    mockFetchByPath({
      '/media/import-url': async () =>
        ({ status: 404, ok: false, json: async () => ({}) }) as Response,
      '/media/import-gravatar': async () =>
        ({
          status: 200,
          ok: true,
          json: async () => mediaResult,
        }) as Response,
    });

    const result = await resolveImportedResumeData(
      {
        basics: {
          name: 'Jane',
          email: 'jane@example.com',
          image: 'https://example.com/missing.png',
        },
      },
      { useGravatar: true },
    );

    expect(result.basics).toMatchObject({
      email: 'jane@example.com',
      image: mediaResult.url,
    });
  });

  it('prefers a successful resume image URL over Gravatar', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith('/media/import-url')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            ...mediaResult,
            url: 'http://localhost:3001/media/imported-from-url',
          }),
        } as Response;
      }
      throw new Error('Gravatar should not be requested');
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await resolveImportedResumeData(
      {
        basics: {
          name: 'Jane',
          email: 'jane@example.com',
          image: 'https://cdn.example.com/photo.png',
        },
      },
      { useGravatar: true },
    );

    expect(result.basics).toMatchObject({
      image: 'http://localhost:3001/media/imported-from-url',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps owned media URLs unchanged', async () => {
    mockParseMediaId.mockReturnValue('aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const data = {
      basics: {
        name: 'Jane',
        email: 'jane@example.com',
        image: 'http://localhost:3001/media/aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      },
    };

    const result = await resolveImportedResumeData(data, { useGravatar: true });

    expect(result).toStrictEqual(data);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
