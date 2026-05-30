import { validateScrapeUrl } from '../utils/validate-scrape-url';

export interface FirecrawlScrapeInput {
  url: string;
  apiKey: string;
}

export interface FirecrawlScrapeResult {
  url: string;
  format: 'markdown';
  content: string;
}

export type FirecrawlScrapeFn = (url: string, apiKey: string) => Promise<{ markdown: string }>;

const defaultScrape: FirecrawlScrapeFn = async (url, apiKey) => {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Firecrawl scrape failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    );
  }

  const body = (await response.json()) as {
    success?: boolean;
    data?: { markdown?: string };
    markdown?: string;
  };

  const markdown = body.data?.markdown ?? body.markdown;
  if (!markdown?.trim()) {
    throw new Error('Firecrawl returned no markdown content');
  }

  return { markdown };
};

export async function firecrawlScrapeTool(
  input: FirecrawlScrapeInput,
  scrapeFn: FirecrawlScrapeFn = defaultScrape,
): Promise<FirecrawlScrapeResult> {
  const url = validateScrapeUrl(input.url);
  const { markdown } = await scrapeFn(url.toString(), input.apiKey);

  return {
    url: url.toString(),
    format: 'markdown',
    content: markdown,
  };
}
