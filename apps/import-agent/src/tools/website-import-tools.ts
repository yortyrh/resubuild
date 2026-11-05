import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { WebProviderPool } from '../web-providers/web-provider-pool';
import { fetchHtmlTool } from './fetch-html.tool';
import { webLookupTool } from './web-lookup.tool';

export interface WebsiteImportToolsConfig {
  /**
   * Deployment-wide web providers. With an extract provider the agent gets
   * clean markdown (Firecrawl / Tavily, rotated); otherwise raw HTML fetch.
   * With a search provider it also gets `web_lookup`.
   */
  webProviders?: WebProviderPool;
}

export function buildWebsiteImportTools(config: WebsiteImportToolsConfig) {
  const tools: Record<string, ReturnType<typeof createTool>> = {};
  const pool = config.webProviders;

  if (pool?.hasExtract) {
    tools.extract_page_markdown = createTool({
      id: 'extract_page_markdown',
      description: 'Extract clean markdown from a public HTTPS page. Use for resume/CV pages.',
      inputSchema: z.object({
        url: z.string().url().describe('HTTPS URL of the page to extract'),
      }),
      execute: async (inputData) => {
        const result = await pool.extract(inputData.url);
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
        'Fetch a public HTTPS page as HTML (no page extraction provider configured). Use for resume/CV pages.',
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

  if (pool?.hasSearch) {
    tools.web_lookup = createTool({
      id: 'web_lookup',
      description:
        'Search the web for company, school, or profile context when resume details are ambiguous.',
      inputSchema: z.object({
        query: z.string().min(1).describe('Search query'),
      }),
      execute: async (inputData) => {
        return webLookupTool({ query: inputData.query, search: pool.search });
      },
    });
  }

  return tools;
}
