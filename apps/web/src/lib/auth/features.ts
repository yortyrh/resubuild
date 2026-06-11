/**
 * Client-only resolver for the auth feature flags surfaced to the SPA.
 *
 * The flags (forgot-password, email-verification, passwordless, github-oauth,
 * google-oauth) live as `NEXT_PUBLIC_*` env vars on the web bundle. They are
 * inlined by the Next.js bundler at build time, so the SPA can render the right
 * auth controls without an `/auth/features` round-trip on every navigation.
 *
 * The `forgot_password`, `email_verification`, and `passwordless` values mirror
 * the operator-controlled env vars in `apps/api/.env` (`AUTH_FORGOT_PASSWORD_ENABLED`,
 * `AUTH_EMAIL_VERIFICATION_ENABLED`, `AUTH_PASSWORDLESS_ENABLED`). The
 * `github_oauth` and `google_oauth` flags are web-only because the SPA's
 * "Continue with GitHub" and "Continue with Google" buttons are build-time
 * render decisions — the Supabase-side `[auth.external.github]` and
 * `[auth.external.google]` blocks in `supabase/config.toml` are the actual
 * provider gates. The operator is responsible for keeping the API flags in sync
 * with their web mirrors; `scripts/setup-local-env.sh` and
 * `scripts/setup-prod-env.mjs` copy the API values into the web mirror keys.
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
  };
}
