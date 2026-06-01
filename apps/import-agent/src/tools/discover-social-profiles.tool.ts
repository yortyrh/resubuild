import { type DiscoveredProfileCandidate, mergeProfilesIntoDraft } from '../merge-discovered-profiles';
import {
  buildSearchContextFromDraft,
  DISCOVERY_SEARCH_TIMEOUT_MS,
  extractExistingProfileNetworks,
  MAX_DISCOVERY_QUERIES,
  MAX_RESULTS_PER_QUERY,
  parseHttpsProfileUrl,
  SOCIAL_PROFILE_PLATFORMS,
  type SocialProfilePlatform,
} from '../social-profile-platforms';

export interface DiscoverSocialProfilesInput {
  draft: Record<string, unknown>;
  searchApiKey?: string;
}

export interface DiscoverSocialProfilesResult {
  skipped: boolean;
  draft: Record<string, unknown>;
  discoveredProfilesCount: number;
}

export interface SocialSearchHit {
  url?: string;
  summary?: string;
}

export type SocialSearchFn = (
  query: string,
  apiKey: string,
  maxResults: number,
) => Promise<SocialSearchHit[]>;

const defaultSearch: SocialSearchFn = async (query, apiKey, maxResults) => {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
    }),
    signal: AbortSignal.timeout(DISCOVERY_SEARCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Web search failed (${response.status})`);
  }

  const body = (await response.json()) as {
    results?: Array<{ url?: string; content?: string }>;
  };

  return (body.results ?? []).map((result) => ({
    url: result.url,
    summary: result.content,
  }));
};

function acceptPlatformUrl(
  platform: SocialProfilePlatform,
  rawUrl: string | undefined,
): DiscoveredProfileCandidate | null {
  const parsed = parseHttpsProfileUrl(rawUrl);
  if (!parsed || !platform.isValidProfileUrl(parsed)) {
    return null;
  }

  const username = platform.deriveUsername(parsed);
  return {
    network: platform.network,
    url: parsed.toString(),
    ...(username ? { username } : {}),
  };
}

export async function discoverSocialProfilesTool(
  input: DiscoverSocialProfilesInput,
  searchFn: SocialSearchFn = defaultSearch,
): Promise<DiscoverSocialProfilesResult> {
  if (!input.searchApiKey?.trim()) {
    return { skipped: true, draft: input.draft, discoveredProfilesCount: 0 };
  }

  const context = buildSearchContextFromDraft(input.draft);
  if (!context) {
    return { skipped: true, draft: input.draft, discoveredProfilesCount: 0 };
  }

  const existingNetworks = extractExistingProfileNetworks(input.draft);
  const platformsToSearch = SOCIAL_PROFILE_PLATFORMS.filter(
    (platform) => !existingNetworks.has(platform.key),
  ).slice(0, MAX_DISCOVERY_QUERIES);

  if (platformsToSearch.length === 0) {
    return { skipped: true, draft: input.draft, discoveredProfilesCount: 0 };
  }

  const discovered: DiscoveredProfileCandidate[] = [];

  for (const platform of platformsToSearch) {
    try {
      const hits = await searchFn(
        platform.buildQuery(context),
        input.searchApiKey,
        MAX_RESULTS_PER_QUERY,
      );

      for (const hit of hits) {
        const candidate = acceptPlatformUrl(platform, hit.url);
        if (candidate) {
          discovered.push(candidate);
          break;
        }
      }
    } catch {
      // Discovery errors are non-fatal; continue with other platforms.
    }
  }

  const { draft, addedCount } = mergeProfilesIntoDraft(input.draft, discovered);

  return {
    skipped: false,
    draft,
    discoveredProfilesCount: addedCount,
  };
}
