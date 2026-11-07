/**
 * Public origin for the SPA, used to build redirect URLs handed to the API
 * (OAuth return, password reset `redirectTo`). The same build can be served
 * from several origins, so in a browser this is always the origin the user is
 * on (REQ-AUTH-011); the API only honours it when it is an allowed origin.
 *
 * `NEXT_PUBLIC_APP_URL` is only a build-time fallback for where there is no
 * browser origin (server rendering). There the caller MUST pass the request's
 * public origin via `requestOrigin` (typically `request.nextUrl.origin`) when
 * the env var is unset. In Docker / reverse-proxy setups, the request origin
 * seen by the Next.js server is often the internal container address (e.g.
 * `http://localhost:8080`), so setting NEXT_PUBLIC_APP_URL takes precedence
 * over it.
 */
export function getAppUrl(requestOrigin?: string): string {
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
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
