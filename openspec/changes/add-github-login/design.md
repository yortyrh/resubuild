## Context

The current `authentication` spec (requirement "GitHub and Google OAuth MUST NOT be supported" at `openspec/specs/authentication/spec.md:92-104`) and the underlying code actively disallow social login. This change reintroduces a single social-login option — **GitHub OAuth** — that the operator can enable per environment.

The `stabilize-authentication` change (2026-06-07) originally added a `POST /auth/github/callback` server-side exchange in Nest; the subsequent `remove-social-oauth` change (2026-06-10) deleted that endpoint and the corresponding `GET /auth/github` redirect. This change is a **fresh design** that re-implements GitHub OAuth using the SPA-issued `supabase.auth.signInWithOAuth` PKCE flow that `stabilize-authentication` chose for all other Supabase-driven auth. It does **not** re-introduce the prior server-side `POST /auth/github/callback` route, nor does it revert any other change introduced by `remove-social-oauth`.

The repo today already contains the substrate needed for this flow:

- `apps/web/src/lib/supabase/` — the publishable-key Supabase client used by interactive modules.
- `apps/web/src/app/auth/callback/` — the existing PKCE callback page (currently handling magic-link sessions from `supabase.auth.signInWithOtp`). The same page can be reused for the GitHub PKCE redirect with no behavioural change.
- `[auth] additional_redirect_urls` in `supabase/config.toml` already lists `http://localhost:3000/auth/callback` — the GitHub redirect reuses this exact entry.
- `apps/web/src/lib/auth/features.ts` (per the `auth-feature-flags` spec) already defines the build-time `getAuthFeatures()` pattern. A new `github_oauth` flag slots in alongside `forgot_password`, `email_verification`, and `passwordless`.

## Goals / Non-Goals

**Goals:**

- Reintroduce GitHub OAuth as a sign-in option on the SPA, gated by a new build-time feature flag (`NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED`).
- Use the Supabase-issued PKCE flow (`supabase.auth.signInWithOAuth({ provider: 'github' })`) on the SPA — no new server-side OAuth callback, no new server-side token exchange.
- Configure GitHub as an external provider in `supabase/config.toml` with a clear operator override path for the `client_id` and `secret`.
- Amend the `authentication` spec to permit GitHub OAuth (under the new `auth-github-oauth` spec) and continue to forbid Google OAuth.
- Keep the existing `/auth/callback` page as the single redirect handler for all Supabase-issued flows (magic link, GitHub).

**Non-Goals:**

- Adding Google OAuth or any other social provider.
- Re-introducing the prior `POST /auth/github/callback` server-side code-exchange endpoint.
- Changing the existing Bearer-token guard in the Nest API — Supabase-issued JWTs continue to validate regardless of provider.
- Adding provider-specific account linking UI (e.g. "Link your GitHub account to an existing email/password account") beyond what Supabase Auth provides by default when a GitHub identity shares an email with an existing user.
- Changing `apps/web/src/lib/api.ts` or any other API helper — provider-agnostic.

## Decisions

### Decision: Drive the flow from the SPA, not the API

- **Choice:** Add a `signInWithGitHub()` helper in `apps/web/src/lib/auth/oauth.ts` (or co-located in the existing auth directory) that calls `supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: \`\${APP_URL}/auth/callback\` } })`. No new route in `apps/api`.
- **Rationale:** Matches the pattern the `stabilize-authentication` change chose for all Supabase-driven flows. Eliminates the cookie/CORS coupling the prior `POST /auth/github/callback` implementation required and that `remove-social-oauth` was designed to remove. The Bearer-token guard already accepts any Supabase-issued JWT, so the API is provider-agnostic.
- **Alternatives considered:** Server-side callback (rejected — re-introduces the coupling the prior change removed and is the very thing `remove-social-oauth` was designed to delete).

### Decision: Feature-flag the GitHub button at build time

- **Choice:** Add `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` to the `AuthFeatures` shape in `apps/web/src/lib/auth/features.ts`, alongside the existing three flags. The button renders only when this flag is the literal string `true`. A complementary `AUTH_GITHUB_OAUTH_ENABLED` env var is **not** required on the API side because the API exposes no GitHub-specific endpoint to gate.
- **Rationale:** Consistent with the build-time-resolved pattern the `auth-feature-flags` spec mandates. Avoids the round-trip and layout shift that the previous `GET /auth/features` endpoint introduced. The provider availability is also controlled at Supabase (the `[auth.external.github]` block in `supabase/config.toml` and the provider toggle in the Supabase Cloud dashboard) — the SPA flag is purely for "do I render the button", not "is the provider actually live".
- **Alternatives considered:** Runtime fetch from a hypothetical `/auth/features` endpoint (rejected — explicitly forbidden by `auth-feature-flags`).

### Decision: Reuse the existing `/auth/callback` page for the GitHub PKCE redirect

- **Choice:** The SPA passes `redirectTo: \`\${APP_URL}/auth/callback\``to`signInWithOAuth`, and the existing `AuthCallback` page handles the code exchange. No new route.
- **Rationale:** The page already exists and already handles the Supabase-issued PKCE flow for the magic-link path. Adding a separate `/auth/github/callback` route would duplicate that logic. The single-handler model also keeps the `additional_redirect_urls` list in `supabase/config.toml` smaller.
- **Alternatives considered:** Dedicated `/auth/github/callback` route (rejected — duplicates the existing exchange logic and is exactly the server-side pattern the `remove-social-oauth` change was eliminating).

### Decision: Provider config lives in `supabase/config.toml` with env-var interpolation

- **Choice:** Add `[auth.external.github]` with `enabled = true` and `client_id`, `secret` referenced via env interpolation. The `client_id` and `secret` are not committed; the operator supplies them in `supabase/.env` (or via the cloud dashboard). For the local Supabase stack, `scripts/lib/local-env-composer.mjs` adds stub `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_SECRET` values so `supabase start` does not fail.
- **Rationale:** Keeps secrets out of the committed config. The Supabase CLI's `config.toml` natively supports env interpolation (e.g. `client_id = "env(GITHUB_OAUTH_CLIENT_ID)"`), which is the pattern the existing `[auth.email]` block already relies on. Local-stack stubs avoid breaking the e2e flow described in `openspec/specs/e2e-testing/spec.md`.
- **Alternatives considered:** Hard-coding placeholders in `supabase/config.toml` (rejected — leaks intent and risks accidental prod use); configuring only via the Supabase Cloud dashboard with no local-stack support (rejected — breaks `supabase start` for e2e).

### Decision: First GitHub sign-in auto-creates the user; subsequent sign-ins reuse the identity

- **Choice:** Rely on Supabase Auth's default behaviour: a successful GitHub sign-in either resumes an existing user with a linked `github` identity or creates a new user with the GitHub email. We do not introduce a separate "link GitHub to existing account" UI in this change.
- **Rationale:** Supabase handles the identity linking and email-conflict resolution server-side, and the existing `email_confirmed_at` semantics still apply (a GitHub-derived email is pre-verified). Building a custom linking UI would duplicate Supabase's logic and conflict with the existing `/auth/check-email` page.
- **Alternatives considered:** Custom "this email already has a password account, please sign in first then link" UI (rejected — out of scope; can be added in a follow-up change if user feedback demands it).

## Risks / Trade-offs

- **[Risk] GitHub email may collide with an existing password user → silent account takeover risk** → Mitigation: rely on Supabase's default linking policy, which surfaces a "Account already exists" error to the browser when the conflict cannot be auto-resolved; document the behaviour in the spec and add a UI affordance that routes the user to the password form on that error.
- **[Risk] Provider configuration drifts between the SPA flag and the Supabase project (button shown but provider disabled, or vice versa)** → Mitigation: document the dependency in the README; on `signInWithOAuth` failure, the existing error UI surfaces a "Provider not enabled" message and the operator can re-deploy with the correct flag.
- **[Risk] `/auth/callback` becomes a hot path for multiple flows and a regression in one breaks the other** → Mitigation: keep the callback handler minimal (it already only invokes `supabase.auth.exchangeCodeForSession` and routes on `onAuthStateChange`); add a unit test that asserts the same code path handles magic-link and GitHub redirects identically.
- **[Risk] Reintroducing GitHub OAuth partially undoes the privacy posture the `remove-social-oauth` change established** → Mitigation: the new flow is opt-in via build-time flag (off by default in `apps/web/.env`), and the `[auth.external.github]` block is `enabled = true` in `supabase/config.toml` but the actual provider is not live until the operator supplies real `client_id` / `secret` — the default `.env` still ships without those secrets.
- **[Risk] The `apps/web/.env` file currently does not declare `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED`** → Mitigation: `scripts/lib/local-env-composer.mjs` adds the new key with default `false` to `WEB_OPERATOR_CONTROLLED_KEYS` (or equivalent), so first-run and re-run behaviour match the existing three flags.

## Migration Plan

1. Land the spec changes in this change folder. No code changes are required for the spec to land.
2. Implement the SPA helper and button placement behind the new flag.
3. Add the `[auth.external.github]` block to `supabase/config.toml` with env-var interpolation.
4. Update `scripts/lib/local-env-composer.mjs` to declare the new env keys (default `false` for the SPA flag, plus the two Supabase-side secrets with stub values for local stack).
5. Add e2e coverage that the callback path handles the GitHub redirect.
6. Roll out: operators enable the flag in their environment by setting `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED=true` in `apps/web/.env` and supplying real `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_SECRET` to Supabase (locally via `supabase/.env`, on cloud via the dashboard).

**Rollback:** Set `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED=false` and redeploy the web app. No data migration is required (the `auth.users` table is unchanged; no Supabase-side storage is touched). To fully disable the provider at the Supabase layer, set `[auth.external.github] enabled = false` in `supabase/config.toml` (or disable the provider in the cloud dashboard).

## Resolved Decisions

- **Placement on `/login`:** The "Continue with GitHub" button renders **above** the email/password form, with a visual divider between the OAuth row and the password form. The social entry point is the fastest path and deserves the top-of-fold position; the password form remains the fallback below.
- **`/register` exposure:** Yes, the registration page also exposes the GitHub button (same flag gate, same divider, same placement above the email/password form) for symmetry with `/login`.
- **Branding variant:** Icon + text ("Continue with GitHub"), matching the existing "Email me a link" button style. The `lucide-react` `Github` icon (or equivalent) sits to the left of the label.
