import { BRAND_ICON_PATHS } from '../brand-icon-paths';
import type { SocialNetworkKey } from '../social-networks';
import { normalizeSocialNetworkKey } from '../social-networks';

const ICON_CLASS = 'h-3.5 w-3.5 shrink-0 inline-block';

function svgIcon(path: string, viewBox = '0 0 24 24'): string {
  return `<svg class="${ICON_CLASS}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function brandSvg(path: string): string {
  return `<svg class="${ICON_CLASS}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;
}

export function iconMapPin(): string {
  return svgIcon(
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  );
}

export function iconMail(): string {
  return svgIcon(
    '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
  );
}

export function iconPhone(): string {
  return svgIcon(
    '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',
  );
}

export function iconLink(): string {
  return svgIcon(
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  );
}

/** Lucide Share2 — fallback for unrecognized social networks. */
export function iconShareFallback(): string {
  return svgIcon(
    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  );
}

const BRAND_ICONS: Record<SocialNetworkKey, () => string> = {
  linkedin: () => brandSvg(BRAND_ICON_PATHS.linkedin),
  facebook: () => brandSvg(BRAND_ICON_PATHS.facebook),
  instagram: () => brandSvg(BRAND_ICON_PATHS.instagram),
  github: () => brandSvg(BRAND_ICON_PATHS.github),
  reddit: () => brandSvg(BRAND_ICON_PATHS.reddit),
  discord: () => brandSvg(BRAND_ICON_PATHS.discord),
  x: () => brandSvg(BRAND_ICON_PATHS.x),
  dribbble: () => brandSvg(BRAND_ICON_PATHS.dribbble),
  behance: () => brandSvg(BRAND_ICON_PATHS.behance),
  pinterest: () => brandSvg(BRAND_ICON_PATHS.pinterest),
};

export function iconForSocialNetwork(network: string | undefined | null): string {
  const key = normalizeSocialNetworkKey(network);
  if (key) return BRAND_ICONS[key]();
  return iconShareFallback();
}

export const TEMPLATE_URL_LINK_CLASS =
  'underline decoration-neutral-400 underline-offset-2 hover:text-neutral-600 print:text-inherit';
