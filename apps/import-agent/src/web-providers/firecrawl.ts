import {
  EXTRACT_TIMEOUT_MS,
  type ProviderExtractFn,
  type ProviderSearchFn,
  SEARCH_TIMEOUT_MS,
  throwProviderHttpError,
} from './types';

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev';

type FirecrawlSearchResult = { url?: string; title?: string; description?: string };

export const firecrawlSearch: ProviderSearchFn = async (query, apiKey, maxResults) => {
  const response = await fetch(`${FIRECRAWL_API_URL}/v2/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit: maxResults }),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    await throwProviderHttpError('firecrawl', response);
  }

  // v2 groups results by source (`data.web`); v1 returned a flat `data` array.
  const body = (await response.json()) as {
    data?: { web?: FirecrawlSearchResult[] } | FirecrawlSearchResult[];
  };
  const results = Array.isArray(body.data) ? body.data : (body.data?.web ?? []);

  return results.slice(0, maxResults).map((result) => ({
    url: result.url,
    title: result.title,
    summary: result.description,
  }));
};

export const firecrawlScrape: ProviderExtractFn = async (url, apiKey) => {
  const response = await fetch(`${FIRECRAWL_API_URL}/v2/scrape`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown'] }),
    signal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
  });

  if (!response.ok) {
    await throwProviderHttpError('firecrawl', response);
  }

  const body = (await response.json()) as {
    data?: { markdown?: string };
    markdown?: string;
  };

  const markdown = body.data?.markdown ?? body.markdown;
  if (!markdown?.trim()) {
    throw new Error('Firecrawl returned no markdown content');
  }

  return { content: markdown };
};
