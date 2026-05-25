const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Normalizes a raw URL string for safe navigation.
 * - Returns `null` for empty, whitespace-only, or unsafe-scheme inputs.
 * - Passes through `mailto:` and `tel:` unchanged.
 * - Prepends `https://` when no recognized scheme is present.
 */
export function normalizeResumeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (!SAFE_SCHEMES.includes(url.protocol)) return null;
    return trimmed;
  } catch {
    // No valid scheme — treat as bare hostname and prepend https://
    const withScheme = `https://${trimmed}`;
    try {
      const url = new URL(withScheme);
      if (url.protocol !== 'https:') return null;
      return withScheme;
    } catch {
      return null;
    }
  }
}

interface ExternalLinkProps {
  href: string | undefined | null;
  children?: React.ReactNode;
  className?: string;
}

export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  const normalized = normalizeResumeUrl(href);
  if (!normalized) return null;

  const label = children ?? href?.trim();

  return (
    <a
      href={normalized}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? 'text-sm break-all underline-offset-2 hover:underline'}
      title={normalized}
    >
      {label}
    </a>
  );
}
