import { describe, expect, it, vi } from 'vitest';
import { fetchHtmlTool } from './fetch-html.tool';
import { firecrawlScrapeTool } from './firecrawl-scrape.tool';
import { tavilyExtractTool } from './tavily-extract.tool';
import { buildWebsiteImportTools } from './website-import-tools';

describe('fetchHtmlTool', () => {
  it('rejects non-HTTPS URLs', async () => {
    await expect(fetchHtmlTool({ url: 'http://example.com' })).rejects.toThrow(/HTTPS/);
  });
});

describe('firecrawlScrapeTool', () => {
  it('returns markdown from scrape API', async () => {
    const scrapeFn = vi.fn().mockResolvedValue({ markdown: '# CV\nJane' });
    const result = await firecrawlScrapeTool(
      { url: 'https://example.com/cv', apiKey: 'fc-test' },
      scrapeFn,
    );
    expect(result.format).toBe('markdown');
    expect(result.content).toContain('Jane');
  });
});

describe('tavilyExtractTool', () => {
  it('returns markdown from extract API', async () => {
    const extractFn = vi.fn().mockResolvedValue({ content: '# CV\nJane' });
    const result = await tavilyExtractTool(
      { url: 'https://example.com/cv', apiKey: 'tvly-test' },
      extractFn,
    );
    expect(result.format).toBe('markdown');
    expect(result.content).toContain('Jane');
  });
});

describe('buildWebsiteImportTools', () => {
  it('exposes only Firecrawl when configured', () => {
    const tools = buildWebsiteImportTools({
      scrapeProvider: 'firecrawl',
      scrapeApiKey: 'fc-key',
    });
    expect(Object.keys(tools)).toEqual(['scrape_page_markdown']);
  });

  it('exposes only Tavily extract when configured', () => {
    const tools = buildWebsiteImportTools({
      scrapeProvider: 'tavily',
      scrapeApiKey: 'tvly-key',
      searchApiKey: 'tvly-key',
    });
    expect(Object.keys(tools).sort()).toEqual(['extract_page_markdown', 'web_lookup']);
  });

  it('exposes HTML fetch when no provider is configured', () => {
    const tools = buildWebsiteImportTools({});
    expect(Object.keys(tools)).toEqual(['fetch_page_html']);
  });
});
