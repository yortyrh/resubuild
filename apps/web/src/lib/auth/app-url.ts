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
 *
 * On the server, the caller MUST pass the request's public origin via
 * `requestOrigin` (typically `request.nextUrl.origin`). In Docker /
 * reverse-proxy setups, the request origin seen by the Next.js server
 * is often the internal container address (e.g. `http://localhost:8080`)
 * — not the public-facing origin. Setting NEXT_PUBLIC_APP_URL at build
 * time overrides that and pins every redirect to the public URL.
 */
export function getAppUrl(requestOrigin?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (requestOrigin) {
    return requestOrigin.replace(/\/+$/, '');
  }
  return '';
}

export function authCallbackUrl(requestOrigin?: string): string {
  return `${getAppUrl(requestOrigin)}/auth/callback`;
}

export function resetPasswordCallbackUrl(requestOrigin?: string): string {
  return `${getAppUrl(requestOrigin)}/reset-password`;
}
