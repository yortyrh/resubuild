## Context

The current `authentication` spec (delivered by `add-github-login` on 2026-06-11) permits GitHub OAuth via Supabase Auth and references the new `auth-github-oauth` spec for the end-to-end flow. The same change explicitly retained a "no Google" rule: the `web-application` spec asserts that the SPA SHALL NOT render a "Continue with Google" button and that `supabase/config.toml` SHALL NOT configure `[auth.external.google]`. The `auth-feature-flags` spec defines a four-field `AuthFeatures` shape (`forgot_password`, `email_verification`, `passwordless`, `github_oauth`) resolved at build time from `NEXT_PUBLIC_AUTH_*` mirrors in `apps/web/.env`.

The repo already contains the substrate needed for a Google OAuth flow that mirrors the GitHub flow almost identically:

- `apps/web/src/lib/auth/oauth.ts` exports `signInWithGitHub()` and `GITHUB_OAUTH_ERROR_MESSAGE`. A new `signInWithGoogle()` and `GOOGLE_OAUTH_ERROR_MESSAGE` slot in alongside.
- `apps/web/src/components/auth/continue-with-github-button.tsx` is a self-contained client component. A new `ContinueWithGoogleButton` mirrors its structure (icon + label, disabled-while-pending, Sonner error toast) and reuses the same `Separator` divider.
- `apps/web/src/app/auth/callback/route.ts` handles Supabase-issued PKCE redirects today. The Google flow reuses this exact handler — no branching on provider.
- `[auth] additional_redirect_urls` in `supabase/config.toml` already lists `http://localhost:3000/auth/callback` — the Google redirect reuses this entry. The new `[auth.external.google]` block adds a second provider alongside `[auth.external.github]`.
- `scripts/lib/local-env-composer.mjs` already writes `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_SECRET` stubs to `supabase/.env` and `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` to `apps/web/.env`. The Google keys slot into the same sets with the same `google-oauth-stub` placeholder.
- `apps/web/src/lib/auth/features.ts` already defines the strict-`true` parsing the four existing flags use. A new `google_oauth` flag slots in alongside `github_oauth`.

## Goals / Non-Goals

**Goals:**

- Reintroduce Google OAuth as a sign-in option on the SPA, gated by a new build-time feature flag (`NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED`).
- Use the Supabase-issued PKCE flow (`supabase.auth.signInWithOAuth({ provider: 'google' })`) on the SPA — no new server-side OAuth callback, no new server-side token exchange.
- Configure Google as an external provider in `supabase/config.toml` with a clear operator override path for the `client_id` and `secret`.
- Amend the `authentication` spec to permit Google OAuth (under the new `auth-google-oauth` spec), keeping GitHub OAuth permitted per `auth-github-oauth` and not introducing any other social providers.
- Amend the `web-application` spec to drop the "no Google button" assertion and replace it with a build-time-flag-gated mirror of the existing GitHub scenario.
- Amend the `auth-feature-flags` spec to document the new `google_oauth` field.
- Keep the existing `/auth/callback` route handler as the single redirect handler for all Supabase-issued flows (magic link, GitHub, Google).

**Non-Goals:**

- Adding any other social providers (Apple, Microsoft, Facebook, Twitter/X, etc.).
- Re-introducing the prior server-side `POST /auth/google/callback` route (the prior `remove-social-oauth` change explicitly removed that pattern).
- Changing the existing Bearer-token guard in the Nest API — Supabase-issued JWTs continue to validate regardless of provider.
- Adding provider-specific account-linking UI beyond what Supabase Auth provides by default when a Google identity shares an email with an existing user.
- Changing `apps/web/src/lib/api.ts` or any other API helper — provider-agnostic.
- Changing the magic-link, OTP, or password reset flows.

## Decisions

### Decision: Drive the flow from the SPA, not the API

- **Choice:** Add a `signInWithGoogle()` helper in `apps/web/src/lib/auth/oauth.ts` that calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: \`\${APP_URL}/auth/callback\` } })`. No new route in `apps/api`.
- **Rationale:** Matches the pattern the `add-github-login` change chose for GitHub OAuth. Eliminates the cookie/CORS coupling the prior `POST /auth/google/callback` server-side implementation required (the `remove-social-oauth` change was designed to delete that exact pattern). The Bearer-token guard already accepts any Supabase-issued JWT, so the API is provider-agnostic.
- **Alternatives considered:** Server-side callback (rejected — re-introduces the coupling the prior change removed and is the very thing `remove-social-oauth` was designed to delete).

### Decision: Feature-flag the Google button at build time

- **Choice:** Add `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` to the `AuthFeatures` shape in `apps/web/src/lib/auth/features.ts`, alongside the existing four flags. The button renders only when this flag is the literal string `true`. A complementary `AUTH_GOOGLE_OAUTH_ENABLED` env var is **not** required on the API side because the API exposes no Google-specific endpoint to gate.
- **Rationale:** Consistent with the build-time-resolved pattern the `auth-feature-flags` spec mandates and that the GitHub flow already uses. Avoids the round-trip and layout shift that the previous `GET /auth/features` endpoint introduced. The provider availability is also controlled at Supabase (the `[auth.external.google]` block in `supabase/config.toml` and the provider toggle in the Supabase Cloud dashboard) — the SPA flag is purely for "do I render the button", not "is the provider actually live".
- **Alternatives considered:** Runtime fetch from a hypothetical `/auth/features` endpoint (rejected — explicitly forbidden by `auth-feature-flags`).

### Decision: Reuse the existing `/auth/callback` route handler for the Google PKCE redirect

- **Choice:** The SPA passes `redirectTo: \`\${APP_URL}/auth/callback\``to`signInWithOAuth`, and the existing route handler at `apps/web/src/app/auth/callback/route.ts`handles the code exchange via`supabase.auth.exchangeCodeForSession(code)`. No new route.
- **Rationale:** The handler already exists and already handles the Supabase-issued PKCE flow for the magic-link and GitHub paths. Adding a separate `/auth/google/callback` route would duplicate that logic and grow the `additional_redirect_urls` list in `supabase/config.toml`. The single-handler model is the model `add-github-login` settled on.
- **Alternatives considered:** Dedicated `/auth/google/callback` route (rejected — duplicates the existing exchange logic and is exactly the server-side pattern the `remove-social-oauth` change was eliminating).

### Decision: Provider config lives in `supabase/config.toml` with env-var interpolation

- **Choice:** Add `[auth.external.google]` with `enabled = true` and `client_id`, `secret` referenced via env interpolation. The `client_id` and `secret` are not committed; the operator supplies them in `supabase/.env` (or via the cloud dashboard). For the local Supabase stack, `scripts/lib/local-env-composer.mjs` adds stub `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_SECRET` values (e.g. `google-oauth-stub`) so `supabase start` does not fail.
- **Rationale:** Keeps secrets out of the committed config. The Supabase CLI's `config.toml` natively supports env interpolation (e.g. `client_id = "env(GOOGLE_OAUTH_CLIENT_ID)"`), which is the pattern the existing `[auth.email]` and `[auth.external.github]` blocks already rely on. Local-stack stubs avoid breaking the e2e flow described in `openspec/specs/e2e-testing/spec.md`.
- **Alternatives considered:** Hard-coding placeholders in `supabase/config.toml` (rejected — leaks intent and risks accidental prod use); configuring only via the Supabase Cloud dashboard with no local-stack support (rejected — breaks `supabase start` for e2e).

### Decision: First Google sign-in auto-creates the user; subsequent sign-ins reuse the identity

- **Choice:** Rely on Supabase Auth's default behaviour: a successful Google sign-in either resumes an existing user with a linked `google` identity or creates a new user with the Google email. We do not introduce a separate "link Google to existing account" UI in this change.
- **Rationale:** Supabase handles the identity linking and email-conflict resolution server-side, and the existing `email_confirmed_at` semantics still apply (a Google-derived email is pre-verified). Building a custom linking UI would duplicate Supabase's logic and conflict with the existing `/auth/check-email` page.
- **Alternatives considered:** Custom "this email already has a password account, please sign in first then link" UI (rejected — out of scope; can be added in a follow-up change if user feedback demands it).

### Decision: Keep the Google button structurally identical to the GitHub button

- **Choice:** Create `ContinueWithGoogleButton` as a separate component (not a parameterised `ContinueWithOAuthButton`) so each provider can ship its own icon, copy, and ARIA label without prop drift. The two components share the visual divider (the `Separator` + "or" label lives in the button component today; consider extracting it only if a third provider is added).
- **Rationale:** Symmetry with the existing GitHub component keeps the auth-page design language coherent and lets each provider evolve independently (e.g. Google may want different loading copy). Extracting a shared "divider" wrapper prematurely would couple providers that should stay independent.
- **Alternatives considered:** Parameterised `ContinueWithOAuthButton({ provider, icon, label })` (rejected — too much prop-drift risk for a two-provider feature; revisit if a third provider ships).

## Risks / Trade-offs

- **[Risk] Google email may collide with an existing password user → silent account takeover risk** → Mitigation: rely on Supabase's default linking policy, which surfaces an "Account already exists" error to the browser when the conflict cannot be auto-resolved; document the behaviour in the spec and add a UI affordance that routes the user to the password form on that error.
- **[Risk] Provider configuration drifts between the SPA flag and the Supabase project (button shown but provider disabled, or vice versa)** → Mitigation: document the dependency in the README; on `signInWithOAuth` failure, the existing error UI surfaces a "Provider not enabled" message and the operator can re-deploy with the correct flag.
- **[Risk] `/auth/callback` becomes a hot path for three flows (magic link, GitHub, Google) and a regression in one breaks the others** → Mitigation: keep the callback handler minimal (it already only invokes `supabase.auth.exchangeCodeForSession` and routes on `onAuthStateChange`); add a unit test that asserts the same code path handles magic-link, GitHub, and Google redirects identically.
- **[Risk] Adding a second social provider partially undoes the "release 1 minimum surface" posture the `remove-social-oauth` change established** → Mitigation: the new flow is opt-in via build-time flag (off by default in `apps/web/.env`), and the `[auth.external.google]` block is `enabled = true` in `supabase/config.toml` but the actual provider is not live until the operator supplies real `client_id` / `secret` — the default `.env` still ships without those secrets.
- **[Risk] The `apps/web/.env` file currently does not declare `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED`** → Mitigation: `scripts/lib/local-env-composer.mjs` adds the new key with default `false` to `WEB_OPERATOR_CONTROLLED_KEYS`, so first-run and re-run behaviour match the existing four flags.
- **[Risk] Google OAuth scopes broaden to include profile/email by default and may include offline access on Supabase's hosted provider** → Mitigation: the design calls `signInWithOAuth({ provider: 'google' })` with no explicit `scopes` option, so the provider default applies. If the operator needs tighter scope control (e.g. `openid email` only), that becomes a follow-up change with a `scopes` parameter on the helper.

## Migration Plan

1. Land the spec changes in this change folder. No code changes are required for the spec to land.
2. Implement the SPA helper, button component, and feature-flag plumbing behind the new flag.
3. Add the `[auth.external.google]` block to `supabase/config.toml` with env-var interpolation.
4. Update `scripts/lib/local-env-composer.mjs` to declare the new env keys (default `false` for the SPA flag, plus the two Supabase-side secrets with stub values for local stack).
5. Update `scripts/lib/env-prod-schema.mjs` to declare `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` in the `Web` group of the production manifest.
6. Add unit-test coverage that the callback path handles the Google redirect and that the button visibility flag works on `/login` and `/register`.
7. Roll out: operators enable the flag in their environment by setting `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED=true` in `apps/web/.env` and supplying real `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_SECRET` to Supabase (locally via `supabase/.env`, on cloud via the dashboard).

**Rollback:** Set `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED=false` and redeploy the web app. No data migration is required (the `auth.users` table is unchanged; no Supabase-side storage is touched). To fully disable the provider at the Supabase layer, set `[auth.external.google] enabled = false` in `supabase/config.toml` (or disable the provider in the cloud dashboard).

## Resolved Decisions

- **Placement on `/login`:** The "Continue with Google" button renders **above** the email/password form, with the same visual divider used by the "Continue with GitHub" button. Ordering of GitHub vs Google buttons is **GitHub first, Google second** (matches the operator's mental model: GitHub was the first social login shipped, Google is the addition).
- **`/register` exposure:** Yes, the registration page also exposes the Google button (same flag gate, same divider, same placement above the email/password form) for symmetry with `/login` and the existing GitHub button.
- **Branding variant:** Icon + text ("Continue with Google"), matching the GitHub button's "Continue with GitHub" copy. The `react-icons/si` (or equivalent) `Google` icon sits to the left of the label, mirroring `SiGithub` for the GitHub button.
- **Stub default value:** `google-oauth-stub` (mirroring the existing `github-oauth-stub` value).
