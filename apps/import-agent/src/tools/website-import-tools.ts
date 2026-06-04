import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { fetchHtmlTool } from './fetch-html.tool';
import { firecrawlScrapeTool } from './firecrawl-scrape.tool';
import { tavilyExtractTool } from './tavily-extract.tool';
import { webLookupTool } from './web-lookup.tool';

export type WebScrapeProvider = 'firecrawl' | 'tavily';

export interface WebsiteImportToolsConfig {
  /** User-selected page extraction provider; when unset, raw HTML fetch is available. */
  scrapeProvider?: WebScrapeProvider | null;
  scrapeApiKey?: string;
  /** Tavily (or server) search key for web lookup / navigation hints. */
  searchApiKey?: string;
}

export function buildWebsiteImportTools(config: WebsiteImportToolsConfig) {
  const tools: Record<string, ReturnType<typeof createTool>> = {};

  if (config.scrapeProvider === 'firecrawl' && config.scrapeApiKey?.trim()) {
    tools.scrape_page_markdown = createTool({
      id: 'scrape_page_markdown',
      description:
        'Fetch a public HTTPS page as clean markdown using Firecrawl. Use for resume/CV pages.',
      inputSchema: z.object({
        url: z.string().url().describe('HTTPS URL of the page to scrape'),
      }),
      execute: async (inputData) => {
        const result = await firecrawlScrapeTool({
          url: inputData.url,
          apiKey: config.scrapeApiKey!,
        });
        return {
          url: result.url,
          format: result.format,
          content: result.content,
        };
      },
    });
  } else if (config.scrapeProvider === 'tavily' && config.scrapeApiKey?.trim()) {
    tools.extract_page_markdown = createTool({
      id: 'extract_page_markdown',
      description:
        'Extract clean markdown from a public HTTPS page using Tavily. Use for resume/CV pages.',
      inputSchema: z.object({
        url: z.string().url().describe('HTTPS URL of the page to extract'),
      }),
      execute: async (inputData) => {
        const result = await tavilyExtractTool({
          url: inputData.url,
          apiKey: config.scrapeApiKey!,
        });
        return {
          url: result.url,
          format: result.format,
          content: result.content,
        };
      },
    });
  } else {
    tools.fetch_page_html = createTool({
      id: 'fetch_page_html',
      description:
        'Fetch a public HTTPS page as HTML (no third-party scraper configured). Use for resume/CV pages.',
      inputSchema: z.object({
        url: z.string().url().describe('HTTPS URL of the page to fetch'),
      }),
      execute: async (inputData) => {
        const result = await fetchHtmlTool({ url: inputData.url });
        return {
          url: result.url,
          format: result.format,
          content: result.content,
          truncated: result.truncated,
        };
      },
    });
  }

  if (config.searchApiKey?.trim()) {
    tools.web_lookup = createTool({
      id: 'web_lookup',
      description:
        'Search the web for company, school, or profile context when resume details are ambiguous.',
      inputSchema: z.object({
        query: z.string().min(1).describe('Search query'),
      }),
      execute: async (inputData) => {
        const result = await webLookupTool({
          query: inputData.query,
          searchApiKey: config.searchApiKey,
        });
        return result;
      },
    });
  }

  return tools;
}
