/** Local Mailpit inbox from docker-compose.dev.yml (`pnpm setup:env` writes the URL). */
export const DEV_MAILPIT_URL = devMailpitUrl();

/** Current Mailpit URL (re-read so tests can stub the env). */
export function devMailpitUrl(): string {
  return process.env.NEXT_PUBLIC_DEV_MAILPIT_URL || 'http://127.0.0.1:54424';
}

/**
 * Show the in-app Mailpit hint only during local development against the
 * local mail catcher — never in production builds.
 * Suppressed when `?hide-dev-banner=1` is present in the URL (used in feature recordings).
 */
export function isDevMailpitHintVisible(): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  const url = devMailpitUrl();
  if (!url.includes('127.0.0.1') && !url.includes('localhost')) {
    return false;
  }

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('hide-dev-banner') === '1') {
      return false;
    }
  }

  return true;
}
