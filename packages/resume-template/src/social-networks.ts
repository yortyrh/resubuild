/** Canonical keys for supported social networks. */
export type SocialNetworkKey =
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'github'
  | 'reddit'
  | 'discord'
  | 'x'
  | 'dribbble'
  | 'behance'
  | 'pinterest';

/** Prioritized labels shown in editor combobox and used for display. */
export const SOCIAL_NETWORK_SUGGESTIONS: readonly string[] = [
  'LinkedIn',
  'Facebook',
  'Instagram',
  'GitHub',
  'Reddit',
  'Discord',
  'X',
  'Twitter',
  'Dribbble',
  'Behance',
  'Pinterest',
] as const;

const CANONICAL_LABELS: Record<SocialNetworkKey, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  github: 'GitHub',
  reddit: 'Reddit',
  discord: 'Discord',
  x: 'X',
  dribbble: 'Dribbble',
  behance: 'Behance',
  pinterest: 'Pinterest',
};

/** Lowercase alias → canonical key (includes common variants). */
const NETWORK_ALIASES: Record<string, SocialNetworkKey> = {
  linkedin: 'linkedin',
  facebook: 'facebook',
  instagram: 'instagram',
  github: 'github',
  reddit: 'reddit',
  discord: 'discord',
  x: 'x',
  twitter: 'x',
  'x.com': 'x',
  dribbble: 'dribbble',
  behance: 'behance',
  pinterest: 'pinterest',
};

/**
 * Maps a raw network string to a canonical key, or null if unrecognized.
 * Matching is case-insensitive and trims whitespace.
 */
export function normalizeSocialNetworkKey(raw: string | undefined | null): SocialNetworkKey | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized) return null;
  return NETWORK_ALIASES[normalized] ?? null;
}

/** Display label for a canonical key. */
export function socialNetworkLabel(key: SocialNetworkKey): string {
  return CANONICAL_LABELS[key];
}

/** All suggestion options: prioritized first, then any canonical labels not in the list. */
export interface ProfileUrlFields {
  network?: string | null;
  username?: string | null;
  url?: string | null;
}

function trimUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  return trimmed || null;
}

function normalizeExplicitUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function cleanUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '');
}

/** Username may already be a host or path (e.g. linkedin.com/in/user). */
function urlFromUsernameValue(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return normalizeExplicitUrl(trimmed);
  }
  const hasHost =
    /^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}/i.test(trimmed) ||
    (trimmed.includes('/') && /\.[a-z]{2,}/i.test(trimmed));
  if (hasHost) {
    return normalizeExplicitUrl(trimmed);
  }
  return null;
}

const PROFILE_URL_BUILDERS: Record<SocialNetworkKey, (username: string) => string | null> = {
  github: (username) => `https://github.com/${encodeURIComponent(username)}`,
  linkedin: (username) => {
    const slug = username.replace(/^in\//i, '').replace(/^\/+/, '');
    return slug ? `https://www.linkedin.com/in/${encodeURIComponent(slug)}` : null;
  },
  facebook: (username) => `https://www.facebook.com/${encodeURIComponent(username)}`,
  instagram: (username) => `https://www.instagram.com/${encodeURIComponent(username)}`,
  reddit: (username) => {
    const slug = username.replace(/^u\//i, '').replace(/^\/+/, '');
    return slug ? `https://www.reddit.com/user/${encodeURIComponent(slug)}` : null;
  },
  discord: () => null,
  x: (username) => `https://x.com/${encodeURIComponent(username)}`,
  dribbble: (username) => `https://dribbble.com/${encodeURIComponent(username)}`,
  behance: (username) => `https://www.behance.net/${encodeURIComponent(username)}`,
  pinterest: (username) => `https://www.pinterest.com/${encodeURIComponent(username)}/`,
};

/**
 * Resolves a profile link from stored url and/or username + network.
 * Known networks use platform URL patterns when url is omitted.
 */
export function resolveProfileUrl(profile: ProfileUrlFields): string | null {
  const explicit = trimUrl(profile.url);
  if (explicit) {
    return normalizeExplicitUrl(explicit);
  }

  const username = profile.username ? cleanUsername(profile.username) : '';
  if (!username) {
    return null;
  }

  const fromUsername = urlFromUsernameValue(username);
  if (fromUsername) {
    return fromUsername;
  }

  const key = normalizeSocialNetworkKey(profile.network);
  if (key) {
    return PROFILE_URL_BUILDERS[key](username);
  }

  return null;
}

/** Whether a profile row should appear in headers (network plus url or username). */
export function isProfileVisible(profile: ProfileUrlFields): boolean {
  if (!profile.network?.trim()) {
    return false;
  }
  return Boolean(trimUrl(profile.url) || profile.username?.trim());
}

export function allSocialNetworkOptions(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of SOCIAL_NETWORK_SUGGESTIONS) {
    if (!seen.has(label)) {
      seen.add(label);
      result.push(label);
    }
  }
  for (const label of Object.values(CANONICAL_LABELS)) {
    if (!seen.has(label)) {
      seen.add(label);
      result.push(label);
    }
  }
  return result.sort((a, b) => a.localeCompare(b, 'en'));
}
