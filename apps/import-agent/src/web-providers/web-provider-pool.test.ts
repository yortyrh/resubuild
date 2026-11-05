import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderHttpError } from './types';
import { createWebProviderPool, NoWebProviderAvailableError } from './web-provider-pool';

function searchFns() {
  return {
    brave: vi.fn(async () => [{ url: 'https://brave.example' }]),
    tavily: vi.fn(async () => [{ url: 'https://tavily.example' }]),
    firecrawl: vi.fn(async () => [{ url: 'https://firecrawl.example' }]),
  };
}

const ALL_KEYS = { brave: 'b-key', tavily: 't-key', firecrawl: 'f-key' };

describe('createWebProviderPool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('only uses providers that have a key', () => {
    const pool = createWebProviderPool({ tavily: 't-key', brave: '  ' });
    expect(pool.searchProviders).toEqual(['tavily']);
    expect(pool.extractProviders).toEqual(['tavily']);
    expect(createWebProviderPool({ brave: 'b' }).hasExtract).toBe(false);
    expect(createWebProviderPool({}).hasSearch).toBe(false);
  });

  it('rotates search calls round-robin across providers', async () => {
    const fns = searchFns();
    const pool = createWebProviderPool(ALL_KEYS, { searchFns: fns });

    const served = [];
    for (let i = 0; i < 4; i += 1) {
      const [hit] = await pool.search('jane', 3);
      served.push(hit?.url);
    }

    expect(served).toEqual([
      'https://brave.example',
      'https://tavily.example',
      'https://firecrawl.example',
      'https://brave.example',
    ]);
    expect(fns.brave).toHaveBeenCalledWith('jane', 'b-key', 3);
  });

  it('falls back to the next provider when one fails', async () => {
    const fns = searchFns();
    fns.brave.mockRejectedValueOnce(new Error('boom'));
    const warn = vi.fn();
    const pool = createWebProviderPool(ALL_KEYS, { searchFns: fns, logger: { warn } });

    await expect(pool.search('jane', 1)).resolves.toEqual([{ url: 'https://tavily.example' }]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('brave failed'));
  });

  it('puts a provider out of credit on cooldown until it expires', async () => {
    let now = 0;
    const fns = searchFns();
    fns.brave.mockRejectedValue(new ProviderHttpError('brave', 402));
    const pool = createWebProviderPool(ALL_KEYS, {
      searchFns: fns,
      now: () => now,
      cooldownMs: 1000,
    });

    await pool.search('a', 1); // brave fails (402) → tavily
    await pool.search('b', 1); // tavily
    await pool.search('c', 1); // firecrawl
    await pool.search('d', 1); // brave skipped → tavily
    expect(fns.brave).toHaveBeenCalledTimes(1);

    now = 1001;
    for (const query of ['e', 'f', 'g']) {
      await pool.search(query, 1); // one full rotation: brave is back
    }
    expect(fns.brave).toHaveBeenCalledTimes(2);
  });

  it('throws the last error when every provider fails', async () => {
    const fns = searchFns();
    fns.brave.mockRejectedValue(new Error('brave down'));
    fns.tavily.mockRejectedValue(new Error('tavily down'));
    fns.firecrawl.mockRejectedValue(new Error('firecrawl down'));
    const pool = createWebProviderPool(ALL_KEYS, { searchFns: fns });

    await expect(pool.search('jane', 1)).rejects.toThrow('firecrawl down');
  });

  it('throws NoWebProviderAvailableError when nothing is usable', async () => {
    const pool = createWebProviderPool({});
    await expect(pool.search('jane', 1)).rejects.toBeInstanceOf(NoWebProviderAvailableError);
    await expect(pool.extract('https://example.com')).rejects.toBeInstanceOf(
      NoWebProviderAvailableError,
    );
  });

  it('extracts markdown with rotation and validates the URL first', async () => {
    const firecrawl = vi.fn(async () => ({ content: '# From Firecrawl' }));
    const tavily = vi.fn(async () => ({ content: '# From Tavily' }));
    const pool = createWebProviderPool(ALL_KEYS, { extractFns: { firecrawl, tavily } });

    await expect(pool.extract('https://example.com/cv')).resolves.toEqual({
      url: 'https://example.com/cv',
      format: 'markdown',
      content: '# From Firecrawl',
    });
    await expect(pool.extract('https://example.com/cv')).resolves.toMatchObject({
      content: '# From Tavily',
    });
    await expect(pool.extract('http://example.com/cv')).rejects.toThrow(/HTTPS/);
    expect(firecrawl).toHaveBeenCalledTimes(1);
  });

  it('calls each provider API with its key and maps the results', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (url.startsWith('https://api.search.brave.com')) {
        return Response.json({
          web: { results: [{ url: 'https://b.example', description: 'B' }] },
        });
      }
      if (url === 'https://api.tavily.com/search') {
        return Response.json({ results: [{ url: 'https://t.example', content: 'T' }] });
      }
      if (url === 'https://api.firecrawl.dev/v2/search') {
        return Response.json({ data: { web: [{ url: 'https://f.example', description: 'F' }] } });
      }
      if (url === 'https://api.firecrawl.dev/v2/scrape') {
        return Response.json({ data: { markdown: '# Firecrawl page' } });
      }
      if (url === 'https://api.tavily.com/extract') {
        return Response.json({ results: [{ raw_content: '# Tavily page' }] });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const pool = createWebProviderPool(ALL_KEYS);
    const hits = [
      ...(await pool.search('q', 2)),
      ...(await pool.search('q', 2)),
      ...(await pool.search('q', 2)),
    ];
    expect(hits).toEqual([
      { url: 'https://b.example', title: undefined, summary: 'B' },
      { url: 'https://t.example', title: undefined, summary: 'T' },
      { url: 'https://f.example', title: undefined, summary: 'F' },
    ]);
    expect((await pool.extract('https://example.com')).content).toBe('# Firecrawl page');
    expect((await pool.extract('https://example.com')).content).toBe('# Tavily page');

    const braveCall = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(braveCall[0].toString()).toContain('q=q');
    expect(braveCall[1].headers).toMatchObject({ 'X-Subscription-Token': 'b-key' });
  });

  it('reports non-2xx replies as ProviderHttpError and cools the provider down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('usage limit exceeded', { status: 432 })),
    );
    const pool = createWebProviderPool({ tavily: 't-key' });

    const error = await pool.search('q', 1).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ProviderHttpError);
    expect(error).toMatchObject({ provider: 'tavily', status: 432 });
    await expect(pool.search('q', 1)).rejects.toBeInstanceOf(NoWebProviderAvailableError);
  });
});
