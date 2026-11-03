/**
 * OAuth sign-in for the SPA (GitHub, Google, LinkedIn).
 *
 * The flow runs on the API origin so Better Auth's OAuth state cookie is
 * first-party:
 *   1. The browser navigates to `${API}/auth/oauth/:provider?redirect=…`.
 *   2. The API redirects to the provider; the provider calls back to
 *      `${API}/api/auth/callback/:provider` (Better Auth).
 *   3. The API trades the new session for a one-time code and redirects to
 *      `${APP}/auth/callback?code=…&redirect=…`.
 *   4. `/auth/callback` exchanges the code for the bearer token
 *      (`POST /auth/oauth/exchange`) and continues to `redirect`.
 *
 * The buttons are rendered by `LoginForm` / `RegisterForm` when the matching
 * `NEXT_PUBLIC_AUTH_*_OAUTH_ENABLED` flag is on.
 */

import { API_URL } from './client';

export const GITHUB_OAUTH_ERROR_MESSAGE = 'Sign-in failed. Please try again.';
export const GOOGLE_OAUTH_ERROR_MESSAGE = 'Sign-in failed. Please try again.';
export const LINKEDIN_OAUTH_ERROR_MESSAGE = 'Sign-in failed. Please try again.';

export type OAuthProvider = 'github' | 'google' | 'linkedin';

export interface OAuthSignInResult {
  /** True once the browser navigation to the provider has been issued. */
  navigated: boolean;
}
export type SignInWithGitHubResult = OAuthSignInResult;
export type SignInWithGoogleResult = OAuthSignInResult;
export type SignInWithLinkedInResult = OAuthSignInResult;

/** URL that starts the provider flow on the API. */
export function oauthStartUrl(provider: OAuthProvider, redirect = '/dashboard'): string {
  const url = new URL(`/auth/oauth/${provider}`, API_URL);
  url.searchParams.set('redirect', redirect);
  return url.toString();
}

function startOAuth(provider: OAuthProvider): Promise<OAuthSignInResult> {
  window.location.assign(oauthStartUrl(provider));
  return Promise.resolve({ navigated: true });
}

export function signInWithGitHub(): Promise<SignInWithGitHubResult> {
  return startOAuth('github');
}

export function signInWithGoogle(): Promise<SignInWithGoogleResult> {
  return startOAuth('google');
}

export function signInWithLinkedIn(): Promise<SignInWithLinkedInResult> {
  return startOAuth('linkedin');
}
