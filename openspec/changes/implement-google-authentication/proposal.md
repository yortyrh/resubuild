## Why

Resumind currently offers email/password and GitHub OAuth on the SPA. The `add-github-login` change (2026-06-11) reintroduced GitHub as a single opt-in social-login option; the earlier `remove-social-oauth` change (2026-06-10) had explicitly disabled both GitHub and Google social login for release 1, and `web-application` currently asserts that "the SPA SHALL NOT render a 'Continue with Google' button" and that `supabase/config.toml` SHALL NOT configure `[auth.external.google]`. This change adds a second opt-in social-login option — **Google OAuth via Supabase Auth, driven from the SPA using `supabase-js`** — to give prospective users a faster sign-up path with the dominant consumer identity provider, mirroring the build-time-flagged model the GitHub flow already uses.

## What Changes

- Add a "Continue with Google" button to the SPA on `/login` and `/register` that calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- Reuse the existing `/auth/callback` route handler (`apps/web/src/app/auth/callback/route.ts`) to complete the Google PKCE flow via `supabase.auth.exchangeCodeForSession(code)`. No new callback route.
- Add a `signInWithGoogle()` helper alongside the existing `signInWithGitHub()` in `apps/web/src/lib/auth/oauth.ts`.
- Add `google_oauth: boolean` to the `AuthFeatures` shape, resolved at build time from `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` (strict-`true` parsing matching the other four flags).
- Configure Google as a Supabase Auth provider in `supabase/config.toml` (`[auth.external.google]` with `enabled = true` and `client_id` / `secret` from env, reusing the existing `<APP_URL>/auth/callback` redirect URL).
- Add stub `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_SECRET` to `supabase/.env` via the local-env composer (mirroring the GitHub stub pattern).
- Update `scripts/lib/local-env-composer.mjs` to declare the new SPA mirror key in `WEB_OPERATOR_CONTROLLED_KEYS` and the two new Supabase-side stubs in `SUPABASE_OPERATOR_CONTROLLED_KEYS`.
- Update `scripts/lib/env-prod-schema.mjs` to declare `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` in the `Web` group of the production manifest.
- Amend the `authentication` spec: permit Google OAuth under the new `auth-google-oauth` spec (and keep GitHub permitted per `auth-github-oauth`).
- Amend the `web-application` spec: drop the "no Google sign-in button" scenarios and replace them with a build-time-flag-gated equivalent parallel to the existing GitHub scenario.
- Amend the `auth-feature-flags` spec: document the new `google_oauth` field on `AuthFeatures` and the `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` env var.

## Capabilities

### New Capabilities

- `auth-google-oauth`: Defines the Google OAuth sign-in flow on the SPA — provider configuration, PKCE redirect handling, callback exchange, error states, and the contract with the existing `authentication` Bearer-token guard. Mirrors the `auth-github-oauth` spec exactly, swapping the provider id and the env-var names.

### Modified Capabilities

- `web-application`: Modify the "Auth capability feature flags SHALL be resolved client-side from `NEXT_PUBLIC_*` env vars" requirement to add Google OAuth alongside GitHub OAuth, and replace the "Login page has no Google sign-in button" scenario with the build-time-flag-gated mirror of the GitHub scenario.

### New Capabilities (in existing spec)

- `auth-feature-flags`: ADD a new requirement for the `google_oauth` field on the `AuthFeatures` shape and the `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` env var, parallel to the existing forgot-password / email-verification / passwordless requirements.

## Impact

- `apps/web`: New `signInWithGoogle()` helper, a new `ContinueWithGoogleButton` component, two button placements (login + register pages), feature-flag plumbing, and a unit test beside the helper. No changes to the `/auth/callback` route handler, Bearer-token handling, or `src/lib/api.ts`.
- `supabase/config.toml`: New `[auth.external.google]` block alongside the existing `[auth.external.github]`. Local stack and CI need stubbed `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_SECRET` so `supabase start` and e2e tests do not fail.
- `scripts/lib/local-env-composer.mjs`: Extend `WEB_OPERATOR_CONTROLLED_KEYS` (add `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED`) and `SUPABASE_OPERATOR_CONTROLLED_KEYS` (add `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_SECRET`).
- `scripts/lib/env-prod-schema.mjs`: Declare the new SPA mirror key in the `Web` group of the production manifest, with help text pointing operators to `apps/web/src/lib/auth/features.ts`.
- `apps/web/.env.example` and `supabase/.env.example`: Document the new env vars (operator-tunable, off by default).
- `apps/api`: No code changes. The existing Supabase-issued JWT guard already accepts any Supabase-issued access token regardless of provider, so the API is provider-agnostic.
- E2E: No new test framework introduced. The design's intent — button visibility on `/login` and `/register`, and callback code consumption — is fully covered by unit tests in the colocated `*.test.tsx` files.
