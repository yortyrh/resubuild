import { describe, expect, it, vi } from 'vitest';
import { createWebProviderPool } from '../web-providers/web-provider-pool';
import { fetchHtmlTool } from './fetch-html.tool';
import { webLookupTool } from './web-lookup.tool';
import { buildWebsiteImportTools } from './website-import-tools';

describe('fetchHtmlTool', () => {
  it('rejects non-HTTPS URLs', async () => {
    await expect(fetchHtmlTool({ url: 'http://example.com' })).rejects.toThrow(/HTTPS/);
  });
});

describe('webLookupTool', () => {
  it('skips when no search is available', async () => {
    await expect(webLookupTool({ query: 'Acme Corp' })).resolves.toEqual({ skipped: true });
  });

  it('returns the first search hit', async () => {
    const search = vi.fn().mockResolvedValue([{ url: 'https://acme.example', summary: 'Acme' }]);
    await expect(webLookupTool({ query: 'Acme Corp', search })).resolves.toEqual({
      skipped: false,
      url: 'https://acme.example',
      summary: 'Acme',
    });
    expect(search).toHaveBeenCalledWith('Acme Corp', 1);
  });
});

describe('buildWebsiteImportTools', () => {
  it('exposes markdown extraction and web lookup when both are configured', () => {
    const tools = buildWebsiteImportTools({
      webProviders: createWebProviderPool({ firecrawl: 'fc-key', brave: 'brave-key' }),
    });
    expect(Object.keys(tools).sort()).toEqual(['extract_page_markdown', 'web_lookup']);
  });

  it('falls back to HTML fetch when only search is configured', () => {
    const tools = buildWebsiteImportTools({
      webProviders: createWebProviderPool({ brave: 'brave-key' }),
    });
    expect(Object.keys(tools).sort()).toEqual(['fetch_page_html', 'web_lookup']);
  });

  it('exposes HTML fetch when no provider is configured', () => {
    expect(Object.keys(buildWebsiteImportTools({}))).toEqual(['fetch_page_html']);
    expect(
      Object.keys(buildWebsiteImportTools({ webProviders: createWebProviderPool({}) })),
    ).toEqual(['fetch_page_html']);
  });
});
