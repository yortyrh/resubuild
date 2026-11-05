import {
  type DiscoveredProfileCandidate,
  mergeProfilesIntoDraft,
} from '../merge-discovered-profiles';
import {
  buildSearchContextFromDraft,
  extractExistingProfileNetworks,
  MAX_DISCOVERY_QUERIES,
  MAX_RESULTS_PER_QUERY,
  parseHttpsProfileUrl,
  SOCIAL_PROFILE_PLATFORMS,
  type SocialProfilePlatform,
} from '../social-profile-platforms';

export interface DiscoverSocialProfilesInput {
  draft: Record<string, unknown>;
  /** Web search (the deployment's provider pool). Discovery is skipped without it. */
  search?: SocialSearchFn;
  /**
   * Original source text (e.g. PDF or image transcription). When provided,
   * discovered candidates whose username does not appear in the source are
   * rejected as they likely belong to a different person.
   */
  sourceText?: string;
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

export type SocialSearchFn = (query: string, maxResults: number) => Promise<SocialSearchHit[]>;

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

function buildSourceMatcher(
  sourceText: string | undefined,
): ((username: string) => boolean) | null {
  if (!sourceText?.trim()) return null;
  const lower = sourceText.toLowerCase();
  return (username: string) => {
    const candidate = username.toLowerCase();
    if (!candidate) return false;
    // Build a regex that matches the username as a contiguous word-like run
    // in the source text. We allow optional trailing dot/dash because
    // pdf-parse sometimes concatenates a username with the next punctuation
    // (e.g. "yorty.dev"), but we never accept a *loose* prefix match — that
    // is the bug that surfaced in production (e.g. "jane" matching
    // "jane-doe" and pulling in a different person).
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[^a-z0-9_])${escaped}([._-]|$)`, 'i');
    return pattern.test(lower);
  };
}

export async function discoverSocialProfilesTool(
  input: DiscoverSocialProfilesInput,
): Promise<DiscoverSocialProfilesResult> {
  const searchFn = input.search;
  if (!searchFn) {
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

  const sourceMatcher = buildSourceMatcher(input.sourceText);
  const discovered: DiscoveredProfileCandidate[] = [];

  for (const platform of platformsToSearch) {
    try {
      const query = platform.buildQuery(context);
      const hits = await searchFn(query, MAX_RESULTS_PER_QUERY);

      for (const hit of hits) {
        const candidate = acceptPlatformUrl(platform, hit.url);
        if (!candidate) continue;
        if (sourceMatcher && (!candidate.username || !sourceMatcher(candidate.username))) {
          continue;
        }
        discovered.push(candidate);
        break;
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
