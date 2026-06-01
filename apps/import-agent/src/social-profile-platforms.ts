/** Canonical keys aligned with resume-template header icons. */
export type SocialNetworkKey =
  | 'linkedin'
  | 'github'
  | 'x'
  | 'instagram'
  | 'facebook'
  | 'dribbble'
  | 'behance';

export interface SocialProfilePlatform {
  key: SocialNetworkKey;
  network: string;
  buildQuery: (ctx: SocialProfileSearchContext) => string;
  isValidProfileUrl: (url: URL) => boolean;
  deriveUsername: (url: URL) => string | undefined;
}

export interface SocialProfileSearchContext {
  name: string;
  company?: string;
  email?: string;
  location?: string;
}

/** Platforms targeted during import discovery (aligned with template header icons). */
export const SOCIAL_PROFILE_PLATFORMS: readonly SocialProfilePlatform[] = [
  {
    key: 'linkedin',
    network: 'LinkedIn',
    buildQuery: ({ name, company }) => [name, company, 'LinkedIn'].filter(Boolean).join(' '),
    isValidProfileUrl: (url) =>
      /(^|\.)linkedin\.com$/i.test(url.hostname) && /\/in\//i.test(url.pathname),
    deriveUsername: (url) => {
      const match = url.pathname.match(/\/in\/([^/?#]+)/i);
      return match?.[1]?.replace(/\/$/, '');
    },
  },
  {
    key: 'github',
    network: 'GitHub',
    buildQuery: ({ name }) => `${name} GitHub`,
    isValidProfileUrl: (url) =>
      /(^|\.)github\.com$/i.test(url.hostname) &&
      !/^\/orgs?\//i.test(url.pathname) &&
      /^\/[^/?#]+\/?$/i.test(url.pathname),
    deriveUsername: (url) => {
      const segment = url.pathname.split('/').filter(Boolean)[0];
      return segment && !['orgs', 'org', 'settings', 'marketplace'].includes(segment.toLowerCase())
        ? segment
        : undefined;
    },
  },
  {
    key: 'x',
    network: 'X',
    buildQuery: ({ name }) => `${name} Twitter OR X profile`,
    isValidProfileUrl: (url) =>
      (/(^|\.)x\.com$/i.test(url.hostname) || /(^|\.)twitter\.com$/i.test(url.hostname)) &&
      /^\/[^/?#]+\/?$/i.test(url.pathname) &&
      !/^\/(home|search|i|intent|hashtag)\/?$/i.test(url.pathname),
    deriveUsername: (url) => url.pathname.split('/').filter(Boolean)[0],
  },
  {
    key: 'instagram',
    network: 'Instagram',
    buildQuery: ({ name }) => `${name} Instagram`,
    isValidProfileUrl: (url) =>
      /(^|\.)instagram\.com$/i.test(url.hostname) &&
      /^\/[^/?#]+\/?$/i.test(url.pathname) &&
      !/^\/(p|reel|stories|explore)\/?$/i.test(url.pathname),
    deriveUsername: (url) => url.pathname.split('/').filter(Boolean)[0],
  },
  {
    key: 'facebook',
    network: 'Facebook',
    buildQuery: ({ name }) => `${name} Facebook`,
    isValidProfileUrl: (url) =>
      /(^|\.)facebook\.com$/i.test(url.hostname) &&
      /^\/[^/?#]+\/?$/i.test(url.pathname) &&
      !/^\/(groups|events|watch|marketplace|photo\.php)\/?$/i.test(url.pathname),
    deriveUsername: (url) => url.pathname.split('/').filter(Boolean)[0],
  },
  {
    key: 'dribbble',
    network: 'Dribbble',
    buildQuery: ({ name }) => `${name} Dribbble`,
    isValidProfileUrl: (url) =>
      /(^|\.)dribbble\.com$/i.test(url.hostname) && /^\/[^/?#]+\/?$/i.test(url.pathname),
    deriveUsername: (url) => url.pathname.split('/').filter(Boolean)[0],
  },
  {
    key: 'behance',
    network: 'Behance',
    buildQuery: ({ name }) => `${name} Behance`,
    isValidProfileUrl: (url) =>
      /(^|\.)behance\.net$/i.test(url.hostname) && /^\/[^/?#]+\/?$/i.test(url.pathname),
    deriveUsername: (url) => url.pathname.split('/').filter(Boolean)[0],
  },
] as const;

export const MAX_DISCOVERY_QUERIES = 5;
export const MAX_RESULTS_PER_QUERY = 3;
export const DISCOVERY_SEARCH_TIMEOUT_MS = 8_000;

const NETWORK_ALIASES: Record<string, SocialNetworkKey> = {
  linkedin: 'linkedin',
  github: 'github',
  x: 'x',
  twitter: 'x',
  'x.com': 'x',
  instagram: 'instagram',
  facebook: 'facebook',
  dribbble: 'dribbble',
  behance: 'behance',
};

export function normalizeProfileNetwork(raw: string | undefined | null): SocialNetworkKey | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized) return null;
  return NETWORK_ALIASES[normalized] ?? null;
}

export function parseHttpsProfileUrl(raw: string | undefined): URL | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export function buildSearchContextFromDraft(
  draft: Record<string, unknown>,
): SocialProfileSearchContext | null {
  const basics =
    draft.basics && typeof draft.basics === 'object'
      ? (draft.basics as Record<string, unknown>)
      : null;
  const name = typeof basics?.name === 'string' ? basics.name.trim() : '';
  if (!name) return null;

  const email = typeof basics?.email === 'string' ? basics.email.trim() : undefined;
  const location =
    basics?.location && typeof basics.location === 'object'
      ? [
          (basics.location as { city?: string }).city,
          (basics.location as { region?: string }).region,
          (basics.location as { countryCode?: string }).countryCode,
        ]
          .filter((part): part is string => Boolean(part))
          .join(', ')
      : undefined;

  const work = Array.isArray(draft.work) ? draft.work : [];
  const firstWork = work[0] && typeof work[0] === 'object' ? (work[0] as { name?: string }) : null;
  const company = typeof firstWork?.name === 'string' ? firstWork.name.trim() : undefined;

  return { name, company, email, location: location || undefined };
}

export function extractExistingProfileNetworks(
  draft: Record<string, unknown>,
): Set<SocialNetworkKey> {
  const basics =
    draft.basics && typeof draft.basics === 'object'
      ? (draft.basics as { profiles?: unknown })
      : null;
  const profiles = Array.isArray(basics?.profiles) ? basics.profiles : [];
  const keys = new Set<SocialNetworkKey>();

  for (const entry of profiles) {
    if (!entry || typeof entry !== 'object') continue;
    const network = (entry as { network?: string }).network;
    const key = normalizeProfileNetwork(network);
    if (key) keys.add(key);
  }

  return keys;
}
