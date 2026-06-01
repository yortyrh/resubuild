import {
  normalizeProfileNetwork,
  parseHttpsProfileUrl,
  type SocialNetworkKey,
} from './social-profile-platforms';

export interface JsonResumeProfile {
  network: string;
  username?: string;
  url: string;
}

export interface DiscoveredProfileCandidate {
  network: string;
  url: string;
  username?: string;
}

function normalizeUrlForDedupe(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.protocol}//${parsed.hostname}${path}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function existingNetworks(profiles: JsonResumeProfile[]): Set<SocialNetworkKey> {
  const keys = new Set<SocialNetworkKey>();
  for (const profile of profiles) {
    const key = normalizeProfileNetwork(profile.network);
    if (key) keys.add(key);
  }
  return keys;
}

function existingUrls(profiles: JsonResumeProfile[]): Set<string> {
  const urls = new Set<string>();
  for (const profile of profiles) {
    const url = parseHttpsProfileUrl(profile.url);
    if (url) urls.add(normalizeUrlForDedupe(url.toString()));
  }
  return urls;
}

function deriveUsernameFromUrl(url: string, network: string): string | undefined {
  try {
    const parsed = new URL(url);
    const key = normalizeProfileNetwork(network);
    if (!key) return parsed.pathname.split('/').filter(Boolean)[0];

    if (key === 'linkedin') {
      const match = parsed.pathname.match(/\/in\/([^/?#]+)/i);
      return match?.[1]?.replace(/\/$/, '');
    }

    const segment = parsed.pathname.split('/').filter(Boolean)[0];
    return segment || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Merges discovered profiles into existing basics.profiles without overwriting
 * networks or URLs already present in the draft.
 */
export function mergeDiscoveredProfiles(
  existing: JsonResumeProfile[],
  discovered: DiscoveredProfileCandidate[],
): { profiles: JsonResumeProfile[]; addedCount: number } {
  const result = [...existing];
  const presentNetworks = existingNetworks(result);
  const presentUrls = existingUrls(result);
  let addedCount = 0;

  for (const candidate of discovered) {
    const parsed = parseHttpsProfileUrl(candidate.url);
    if (!parsed) continue;

    const networkKey = normalizeProfileNetwork(candidate.network);
    if (!networkKey) continue;
    if (presentNetworks.has(networkKey)) continue;

    const normalizedUrl = normalizeUrlForDedupe(parsed.toString());
    if (presentUrls.has(normalizedUrl)) continue;

    const username =
      candidate.username?.trim() || deriveUsernameFromUrl(parsed.toString(), candidate.network);
    const entry: JsonResumeProfile = {
      network: candidate.network,
      url: parsed.toString(),
      ...(username ? { username } : {}),
    };

    result.push(entry);
    presentNetworks.add(networkKey);
    presentUrls.add(normalizedUrl);
    addedCount += 1;
  }

  return { profiles: result, addedCount };
}

export function mergeProfilesIntoDraft(
  draft: Record<string, unknown>,
  discovered: DiscoveredProfileCandidate[],
): { draft: Record<string, unknown>; addedCount: number } {
  const basics =
    draft.basics && typeof draft.basics === 'object'
      ? ({ ...(draft.basics as Record<string, unknown>) } as Record<string, unknown>)
      : {};

  const existingRaw = Array.isArray(basics.profiles) ? basics.profiles : [];
  const existing: JsonResumeProfile[] = existingRaw
    .filter((entry): entry is Record<string, unknown> =>
      Boolean(entry && typeof entry === 'object'),
    )
    .map((entry) => ({
      network: String(entry.network ?? ''),
      url: String(entry.url ?? ''),
      ...(typeof entry.username === 'string' ? { username: entry.username } : {}),
    }))
    .filter((entry) => entry.network && entry.url);

  const { profiles, addedCount } = mergeDiscoveredProfiles(existing, discovered);

  return {
    draft: {
      ...draft,
      basics: {
        ...basics,
        profiles,
      },
    },
    addedCount,
  };
}
