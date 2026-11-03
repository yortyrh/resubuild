/**
 * Client-only resolver for the auth feature flags surfaced to the SPA.
 *
 * The flags (forgot-password, email-verification, passwordless, github-oauth,
 * google-oauth) live as `NEXT_PUBLIC_*` env vars on the web bundle. They are
 * inlined by the Next.js bundler at build time, so the SPA can render the right
 * auth controls without an `/auth/features` round-trip on every navigation.
 *
 * Every flag mirrors `apps/api/.env`: `forgot_password`, `email_verification`
 * and `passwordless` copy `AUTH_FORGOT_PASSWORD_ENABLED`,
 * `AUTH_EMAIL_VERIFICATION_ENABLED` and `AUTH_PASSWORDLESS_ENABLED`; the
 * `*_oauth` flags are on when the API has that provider's client id and
 * secret. The API enforces the flags (disabled flows are not served);
 * `pnpm setup:env` and `pnpm setup:env:prod` derive the web values from the
 * API values so they stay in sync.
 *
 * Parsing rules (consistent with the legacy API Zod schema in
 * `apps/api/src/auth/config/auth.config.ts`): only the literal string
 * `"true"` is truthy. Any other value — `"false"`, `"maybe"`, `""`,
 * `undefined` — coerces to `false`.
 */

export interface AuthFeatures {
  forgot_password: boolean;
  email_verification: boolean;
  passwordless: boolean;
  github_oauth: boolean;
  google_oauth: boolean;
  linkedin_oauth: boolean;
}

function readBooleanFlag(envVar: string | undefined): boolean {
  return envVar === 'true';
}

/**
 * Resolve the deployment's auth capabilities from `process.env`. Pure,
 * synchronous, no I/O. Safe to call from both server components and
 * client components — the values are inlined at build time so the
 * resulting object is identical on the server and in the browser.
 */
export function getAuthFeatures(): AuthFeatures {
  return {
    forgot_password: readBooleanFlag(process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED),
    email_verification: readBooleanFlag(process.env.NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED),
    passwordless: readBooleanFlag(process.env.NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED),
    github_oauth: readBooleanFlag(process.env.NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED),
    google_oauth: readBooleanFlag(process.env.NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED),
    linkedin_oauth: readBooleanFlag(process.env.NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED),
  };
}
