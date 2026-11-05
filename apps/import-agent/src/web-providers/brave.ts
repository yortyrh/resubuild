import {
  type ProviderSearchFn,
  SEARCH_TIMEOUT_MS,
  type SearchHit,
  throwProviderHttpError,
} from './types';

/** Brave Search web results (`/res/v1/web/search`). Brave caps `count` at 20. */
export const braveSearch: ProviderSearchFn = async (query, apiKey, maxResults) => {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(Math.min(Math.max(maxResults, 1), 20)));

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey,
    },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    await throwProviderHttpError('brave', response);
  }

  const body = (await response.json()) as {
    web?: { results?: Array<{ url?: string; title?: string; description?: string }> };
  };

  return (body.web?.results ?? []).slice(0, maxResults).map(
    (result): SearchHit => ({
      url: result.url,
      title: result.title,
      summary: result.description,
    }),
  );
};
