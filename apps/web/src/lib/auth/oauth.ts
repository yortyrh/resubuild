/**
 * GitHub OAuth sign-in helper for the SPA.
 *
 * Drives the Supabase PKCE flow from the browser:
 *   1. `supabase.auth.signInWithOAuth({ provider: 'github' })` returns a
 *      Supabase-hosted authorization URL.
 *   2. The browser navigates the user to GitHub.
 *   3. On success, GitHub redirects the user back to
 *      `<APP_URL>/auth/callback` with a Supabase-issued authorization code.
 *   4. The existing `/auth/callback` server route handler exchanges the
 *      code for a session and redirects the user to `/dashboard` (or the
 *      `?next=` query param if present).
 *
 * The `redirectTo` is derived from `getAppUrl()` (see
 * `apps/web/src/lib/auth/app-url.ts`), which reads `NEXT_PUBLIC_APP_URL`
 * at build time and falls back to `window.location.origin` in local dev.
 * The same helper is used by the magic-link `emailRedirectTo` (see
 * `useSendMagicLink` in `apps/web/src/lib/queries/auth-mutations.ts`).
 *
 * The helper does NOT render the button — the button is rendered by
 * `LoginForm` and `RegisterForm` when `getAuthFeatures().github_oauth` is
 * `true`. Keeping the button placement and the underlying call in
 * separate modules lets the forms gate the button without coupling to
 * the Supabase SDK directly.
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import { authCallbackUrl } from './app-url';

export const GITHUB_OAUTH_ERROR_MESSAGE = 'Sign-in failed. Please try again.';
export const GOOGLE_OAUTH_ERROR_MESSAGE = 'Sign-in failed. Please try again.';
export const LINKEDIN_OAUTH_ERROR_MESSAGE = 'Sign-in failed. Please try again.';

export interface SignInWithGitHubResult {
  /** True when the SDK handed back a provider URL and we are about to navigate. */
  navigated: boolean;
}

export interface SignInWithGoogleResult {
  /** True when the SDK handed back a provider URL and we are about to navigate. */
  navigated: boolean;
}

export interface SignInWithLinkedInResult {
  /** True when the SDK handed back a provider URL and we are about to navigate. */
  navigated: boolean;
}

/**
 * Kick off the GitHub OAuth flow. The browser is redirected to GitHub by
 * the Supabase client on success; the function resolves once that
 * navigation has been issued (or rejects on a hard SDK failure such as
 * the provider being disabled at the Supabase project).
 *
 * Callers MUST disable the button while the returned promise is in
 * flight and MUST surface a non-blocking error toast on rejection — see
 * `LoginForm` / `RegisterForm` and the `auth-github-oauth` spec.
 */
export async function signInWithGitHub(): Promise<SignInWithGitHubResult> {
  const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: authCallbackUrl() },
  });

  if (error) {
    throw new Error(error.message || GITHUB_OAUTH_ERROR_MESSAGE);
  }

  return { navigated: Boolean(data?.url) };
}

/**
 * Kick off the Google OAuth flow. The browser is redirected to Google by
 * the Supabase client on success; the function resolves once that
 * navigation has been issued (or rejects on a hard SDK failure such as
 * the provider being disabled at the Supabase project).
 *
 * Callers MUST disable the button while the returned promise is in
 * flight and MUST surface a non-blocking error toast on rejection — see
 * `LoginForm` / `RegisterForm` and the `auth-google-oauth` spec.
 */
export async function signInWithGoogle(): Promise<SignInWithGoogleResult> {
  const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authCallbackUrl() },
  });

  if (error) {
    throw new Error(error.message || GOOGLE_OAUTH_ERROR_MESSAGE);
  }

  return { navigated: Boolean(data?.url) };
}

/**
 * Kick off the LinkedIn OAuth flow. The browser is redirected to LinkedIn by
 * the Supabase client on success; the function resolves once that
 * navigation has been issued (or rejects on a hard SDK failure such as
 * the provider being disabled at the Supabase project).
 *
 * Callers MUST disable the button while the returned promise is in
 * flight and MUST surface a non-blocking error toast on rejection — see
 * `LoginForm` / `RegisterForm` and the `auth-linkedin-oauth` spec.
 */
export async function signInWithLinkedIn(): Promise<SignInWithLinkedInResult> {
  const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: { redirectTo: authCallbackUrl() },
  });

  if (error) {
    throw new Error(error.message || LINKEDIN_OAUTH_ERROR_MESSAGE);
  }

  return { navigated: Boolean(data?.url) };
}
