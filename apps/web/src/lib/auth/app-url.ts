/**
 * Public origin for the SPA, used to build Supabase OAuth redirectTo
 * values and emailRedirectTo values. The same value that the
 * email-template callbacks land on, so it must be registered in
 * [auth].additional_redirect_urls in supabase/config.toml and in the
 * Supabase Cloud dashboard.
 *
 * Falls back to window.location.origin in local dev where
 * NEXT_PUBLIC_APP_URL is unset (the developer is hitting the app
 * from their own machine, so the origin the browser sees is correct).
 */
export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export function authCallbackUrl(): string {
  return `${getAppUrl()}/auth/callback`;
}

export function resetPasswordCallbackUrl(): string {
  return `${getAppUrl()}/reset-password`;
}
