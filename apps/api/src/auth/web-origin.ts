/** Reduce a value to its http(s) origin (scheme, lower-case host, port), or null. */
function toOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * Pick the web origin to send the user back to (REQ-AUTH-011).
 *
 * Returns the requested origin, normalized, when it exactly matches (scheme,
 * host and port) an entry of `allowed`; otherwise `fallback`, verbatim. Never
 * returns an origin outside `allowed` unless it is the fallback.
 */
export function resolveWebOrigin(
  requested: unknown,
  allowed: readonly string[],
  fallback: string,
): string {
  const origin = toOrigin(requested);
  if (origin === null) return fallback;
  return allowed.some((entry) => toOrigin(entry) === origin) ? origin : fallback;
}

/** Resolve the web origin from the `Origin` header of a triggering request, if any. */
export function resolveRequestWebOrigin(
  request: Request | null | undefined,
  allowed: readonly string[],
  fallback: string,
): string {
  return resolveWebOrigin(request?.headers?.get('origin'), allowed, fallback);
}
