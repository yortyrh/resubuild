## MODIFIED Requirements

### Requirement: Auth capability feature flags SHALL be resolved client-side from `NEXT_PUBLIC_*` env vars

Optional sign-in flows (forgot password, email verification, passwordless magic link / OTP, GitHub OAuth, Google OAuth) MUST be gated by **client-side `NEXT_PUBLIC_*` env vars** resolved at build time by `apps/web/src/lib/auth/features.ts`. The SPA SHALL NOT add a server round-trip or layout shift to read the flag value at request time. The flag SHALL be interpreted as a strict boolean — only the literal string `true` enables the flow; anything else (including the empty string, `1`, `yes`, `TRUE`) is treated as `false`, and a missing var defaults to `false`. Flipping a flag requires a web redeploy to take effect in production.

`NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` is the mirror of the build-time gate for the "Continue with GitHub" button on `/login` and `/register`. The button is render-gated by this flag; the actual provider liveness is configured by the `[auth.external.github]` block in `supabase/config.toml` (consuming `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_SECRET` from `supabase/.env`). The two are independent — a misconfigured GitHub app never silently leaks failed OAuth attempts to the UI. See `auth-github-oauth` for the end-to-end flow.

`NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` is the mirror of the build-time gate for the "Continue with Google" button on `/login` and `/register`. The button is render-gated by this flag; the actual provider liveness is configured by the `[auth.external.google]` block in `supabase/config.toml` (consuming `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_SECRET` from `supabase/.env`). The two are independent — a misconfigured Google app never silently leaks failed OAuth attempts to the UI. See `auth-google-oauth` for the end-to-end flow.

#### Scenario: Build-time flag is read with no request-time round-trip

- **WHEN** a user visits `/login` or `/register`
- **THEN** the SPA SHALL resolve `getAuthFeatures().github_oauth` and `getAuthFeatures().google_oauth` from `process.env.NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` and `process.env.NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` respectively at build time
- **AND** SHALL NOT issue a separate `GET` to the API to read the flag

#### Scenario: Non-`true` values disable the flow

- **WHEN** `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` is unset, the empty string, `1`, `yes`, `TRUE`, or any value other than the literal string `true`
- **THEN** the SPA SHALL treat the flag as `false`
- **AND** the "Continue with GitHub" button SHALL NOT render on `/login` or `/register`

#### Scenario: Non-`true` values disable the Google flow

- **WHEN** `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` is unset, the empty string, `1`, `yes`, `TRUE`, or any value other than the literal string `true`
- **THEN** the SPA SHALL treat the flag as `false`
- **AND** the "Continue with Google" button SHALL NOT render on `/login` or `/register`
- **AND** `supabase/config.toml` SHALL NOT configure `[auth.external.google]` (or it SHALL be present but disabled) and the API SHALL NOT expose `GET /auth/google` or `POST /auth/google/callback` (these respond `404 Not Found`)
