/** Local Mailpit inbox used by `supabase start` when `[inbucket] enabled = true`. */
export const DEV_MAILPIT_URL = process.env.NEXT_PUBLIC_DEV_MAILPIT_URL ?? 'http://127.0.0.1:54324';

/**
 * Show the in-app Mailpit hint only during local development against the
 * local Supabase stack — never in production builds or cloud Supabase dev.
 * Suppressed when `?hide-dev-banner=1` is present in the URL (used in feature recordings).
 */
export function isDevMailpitHintVisible(): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (!supabaseUrl.includes('127.0.0.1') && !supabaseUrl.includes('localhost')) {
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
