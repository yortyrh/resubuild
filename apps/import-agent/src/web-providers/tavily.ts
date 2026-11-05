import {
  EXTRACT_TIMEOUT_MS,
  type ProviderExtractFn,
  type ProviderSearchFn,
  SEARCH_TIMEOUT_MS,
  throwProviderHttpError,
} from './types';

export const tavilySearch: ProviderSearchFn = async (query, apiKey, maxResults) => {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, max_results: maxResults }),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    await throwProviderHttpError('tavily', response);
  }

  const body = (await response.json()) as {
    results?: Array<{ url?: string; title?: string; content?: string }>;
  };

  return (body.results ?? []).map((result) => ({
    url: result.url,
    title: result.title,
    summary: result.content,
  }));
};

export const tavilyExtract: ProviderExtractFn = async (url, apiKey) => {
  const response = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      urls: [url],
      format: 'markdown',
      extract_depth: 'advanced',
    }),
    signal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
  });

  if (!response.ok) {
    await throwProviderHttpError('tavily', response);
  }

  const body = (await response.json()) as {
    results?: Array<{ url?: string; raw_content?: string }>;
    failed_results?: Array<{ url?: string; error?: string }>;
  };

  const content = body.results?.[0]?.raw_content?.trim();
  if (!content) {
    const failed = body.failed_results?.[0];
    throw new Error(failed?.error ?? 'Tavily returned no content for this URL');
  }

  return { content };
};
