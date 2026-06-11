## Why

Resumind currently offers only email/password authentication on the SPA. The `remove-social-oauth` change (2026-06-10) explicitly disabled GitHub and Google social login. This change re-introduces a single social-login option — **GitHub OAuth via Supabase Auth, driven from the SPA using `supabase-js`** — to give prospective users a faster sign-up path that mirrors the GitHub-centric developer audience Resumind targets. The implementation is a fresh design that uses Supabase's recommended client-side PKCE flow and does **not** revert the prior server-side Nest OAuth work; it replaces that approach with a cleaner client-issued flow that avoids the cookie/CORS coupling the prior change was designed to eliminate.

## What Changes

- Add a "Continue with GitHub" button to the SPA on `/login` and `/register` that calls `supabase.auth.signInWithOAuth({ provider: 'github' })`.
- Add a `/auth/callback` route in the web app that calls `supabase.auth.exchangeCodeForSession(code)` to complete the PKCE flow and then redirects to the post-login destination.
- Configure GitHub as a Supabase Auth provider in `supabase/config.toml` (`[auth.external.github]` with `enabled = true`, `client_id` and `secret` from env, and an allowlist of redirect URLs).
- Document the required env vars (`GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_SECRET` for self-hosted Supabase; nothing additional needed for Supabase Cloud other than enabling the provider in the dashboard) in `apps/web/.env.example` and `supabase/.env.example`.
- Amend the `authentication` spec: replace the "GitHub and Google OAuth MUST NOT be supported" requirement with one that permits and constrains GitHub OAuth as defined in the new `auth-github-oauth` spec, and explicitly retain that Google OAuth remains unsupported.
- Add e2e coverage for the happy-path redirect and the callback completing a session.
- Add a `signInWithGitHub()` method to the web app's auth client wrapper to centralize provider selection and `redirectTo` configuration.

## Capabilities

### New Capabilities

- `auth-github-oauth`: Defines the GitHub OAuth sign-in flow on the SPA — provider configuration, PKCE redirect handling, callback exchange, error states, and the contract with the existing `authentication` Bearer-token guard.

### Modified Capabilities

- `authentication`: Replace the "GitHub and Google OAuth MUST NOT be supported" requirement with one that permits GitHub OAuth (per the new `auth-github-oauth` spec) and keeps Google OAuth unsupported. No other requirements change.

## Impact

- `apps/web`: New `signInWithGitHub()` helper, two button placements (login + register pages), new `/auth/callback` route, and route in `AuthCallback` to call `supabase.auth.exchangeCodeForSession`. No changes to Bearer-token handling or `src/lib/api.ts`.
- `supabase/config.toml`: New `[auth.external.github]` block. Local stack and CI need a stubbed `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_SECRET` so `supabase start` and e2e tests do not fail.
- `apps/api`: No code changes. The existing Supabase-issued JWT guard already accepts any Supabase-issued access token regardless of provider, so the server is provider-agnostic.
- Docs: `apps/web/.env.example`, `supabase/.env.example`, and the `authentication` spec delta capture the new env vars and provider config.
- E2E: `apps/web/e2e/` gains a GitHub OAuth flow test that mocks the Supabase OAuth redirect by setting a session directly (the real GitHub round-trip cannot run headless) and asserts the callback page consumes the code and lands on the post-login destination.
