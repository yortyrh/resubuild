# design.md

## Context

Resumind's auth flow today is built around a hand-rolled bridge: a custom Supabase client is created on every Nest call, the web SPA does not use `@supabase/supabase-js` at all, the GitHub OAuth code exchange is implemented as a custom `POST /auth/github/callback` endpoint, and the only social provider in `supabase/config.toml` is GitHub. The result is feature-light (no recovery, no email verification, no passwordless, no Google), and a couple of latent stability problems: refresh tokens cannot be revoked server-side, the per-request client construction defeats connection pooling, and the SPA holds tokens in `sessionStorage` with no first-party way to refresh them. Concurrently, the existing `authentication` and `web-application` specs explicitly forbid `@supabase/ssr` / `@supabase/supabase-js` in client bundles, which must be relaxed to enable the new flows. The three optional capabilities (forgot password, email verification, passwordless) need to be off by default so they can be turned on per deployment.

## Goals / Non-Goals

**Goals**

- A single, module-scoped Supabase client in Nest; no more per-request `createClient`.
- A first-party Supabase client in the web SPA used for all browser-side auth flows (sign-in, OAuth, OTP, email verification, sign-out).
- Removal of the custom `POST /auth/github/callback` server-side exchange in favour of the Supabase client API.
- Real server-side sign-out that revokes the refresh token via `supabase.auth.admin.signOut`.
- Five new flows with clear ownership: change password, forgot/reset password, email verification, passwordless (magic link + OTP), Google OAuth.
- Three env-var-gated feature flags surfaced through a public `GET /auth/features` endpoint and consumed by the SPA UI.
- Backward compatibility for the existing `POST /auth/login` and `POST /auth/register` endpoints (they remain available; SPA switches to client-driven flow). `POST /auth/refresh` is **removed** — the Supabase client handles refresh automatically.

**Non-Goals**

- Migrating server-side auth to `@nestjs/passport` JWT strategies. `SupabaseAuthGuard` stays.
- Adding a new database table. All auth state stays in Supabase Auth.
- Server-side session storage or Redis-backed refresh-token tracking. We rely on Supabase's own refresh-token rotation.
- Passkey / WebAuthn authentication. Deferred to a later change.
- A full session-cookie / `@supabase/ssr` SSR refactor. The SPA-only model is preserved; route handlers stay out of the auth path.
- Removing the existing GitHub OAuth configuration; only the SPA's hand-rolled code exchange is replaced.
- Email/SMS factor selection UX (always email for OTP).

## Decisions

### D1. Module-scoped Supabase client in Nest (`SUPABASE_CLIENT` token)

`AuthModule` provides a single `SupabaseClient` constructed at boot from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (the service-role key is required for `auth.admin` operations: change password and admin sign-out). The legacy anon-key `BrowserClient` is no longer used by `AuthService`; it survives only as a fallback for the deprecated `POST /auth/login` and `POST /auth/register` endpoints (which need a client to issue user JWTs server-side).

**Why**: removes per-request client construction (stable connection pool), unlocks `auth.admin` methods, and is the canonical pattern from `supabase-js`.

**Alternatives considered**: keep `getBrowserClient()` (anon key) per call — rejected because it cannot do `auth.admin.updateUserById`, which is needed for password change. Use a separate `SupabaseAdminClient` provider — rejected in favour of one client (service-role) and a permission-aware API.

### D2. SPA gets a publishable-key Supabase client

New `apps/web/src/lib/supabase/client.ts` exports a `createSupabaseBrowserClient()` that uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY` for backward compatibility) and `auth.persistSession = true, autoRefreshToken = true, detectSessionInUrl = true`. `apps/web/src/lib/auth-session.ts` becomes a thin wrapper that subscribes to `supabase.auth.onAuthStateChange` and exposes the current access token to `apiFetch` (replacing the current `getValidAccessToken(apiUrl)` round-trip).

**Why**: a single source of truth for the user, automatic refresh, automatic PKCE handling for OAuth, automatic OTP/magic-link verification, automatic email verification pickup. Removes the need for a custom GitHub callback exchange.

**Alternatives considered**: `@supabase/ssr` cookies + server components — rejected: keeps `apiFetch` Bearer pattern intact, avoids rewriting all dashboards to server components, and matches the rest of the SPA. A `useAuth` hook that wraps the raw Supabase client — included as a small additional helper but not required for correctness.

### D3. Remove `POST /auth/github/callback`; the SPA completes the flow

The `auth.controller.ts` loses the `POST /auth/github/callback` route. The SPA calls `supabase.auth.signInWithOAuth({ provider: 'github' })` and either lets Supabase's PKCE handle the redirect hash automatically (preferred) or, when the user lands on `/auth/callback` with `?code=...`, calls `supabase.auth.exchangeCodeForSession(code)` client-side. Tokens end up in the SPA's Supabase client session and are read by `apiFetch`.

**Why**: removes a custom transport, eliminates the "two sources of tokens" problem, and uses the same client surface for GitHub that we'll use for Google.

**Alternatives considered**: keep the server-side exchange for symmetry with magic link — rejected: every other flow runs in the client, and Supabase already exposes PKCE for OAuth. Keep both — rejected: duplicate code, duplicate failure modes.

### D4. Server-side sign-out via `auth.admin.signOut`

`POST /auth/logout` accepts the user's access token, calls `supabase.auth.getUser(token)` to resolve the user, then `supabase.auth.admin.signOut(userId)` to revoke all refresh tokens for that user. The SPA also calls `supabase.auth.signOut()` to clear local state.

**Why**: a stolen refresh token is unusable after the user signs out — addresses the current "logout is a no-op" gap.

**Alternatives considered**: client-only sign-out (status quo) — rejected: doesn't actually revoke tokens. Refresh-token blacklist in our own table — rejected: Supabase already does this when you call `admin.signOut`.

### D5. Feature flags via env vars and `GET /auth/features`

`apps/api/src/config/` reads three booleans:

- `AUTH_FORGOT_PASSWORD_ENABLED`
- `AUTH_EMAIL_VERIFICATION_ENABLED`
- `AUTH_PASSWORDLESS_ENABLED`

`ConfigModule.forRoot({ validationSchema })` validates them and `GET /auth/features` returns `{ forgot_password: bool, email_verification: bool, passwordless: bool, providers: ('github' | 'google')[] }`. The SPA uses this response to hide or render the corresponding controls. Defaults: all three `false`; `providers` always includes `github` and includes `google` when `[auth.external.google]` is enabled in `supabase/config.toml`.

**Why**: a single source of truth prevents drift between server config and UI. Off-by-default means new deployments are not surprised by enabled flows.

**Alternatives considered**: feature flags only on the client (env at build time) — rejected: server and client can disagree at runtime. Feature flag service (LaunchDarkly, etc.) — rejected: overkill for a monorepo of this size.

### D6. Always-on change-password, opt-in everything else

Change password requires the user to already be authenticated and is therefore safe to ship unconditionally. The other three flows (forgot password, email verification, passwordless) are off by default per the task.

**Why**: change password is a security requirement that should always work; the other three involve email-based setup (forgot password, email verification, passwordless) that operators may not yet want to expose.

### D7. Magic link + OTP share a single `/auth/otp` endpoint

`POST /auth/otp { email, channel }` calls `supabase.auth.signInWithOtp({ email, options: { channel: 'email' } })`. The flow is fully UI-driven:

- "Email me a sign-in link" mode: user clicks the link in their email → SPA picks up the Supabase session from the URL hash.
- "Email me a 6-digit code" mode: SPA prompts for the code and calls `POST /auth/otp/verify { email, code }` → server calls `supabase.auth.verifyOtp({ email, token, type: 'email' })` and returns the standard token bundle.

**Why**: a single Supabase method covers both; reuse the existing `AuthTokenResponse` shape.

### D8. Google OAuth in `supabase/config.toml`, surfaced via `/auth/features`

Add `[auth.external.google] enabled = true, client_id, secret` to `supabase/config.toml`. `supabase start` reads from env (`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`) so the real production values never land in the repo. The SPA button calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.

**Why**: the user explicitly asked for "Login with Google"; the existing GitHub pattern in `supabase/config.toml` is the template to follow. Keeping client_id/secret in env (not the file) is the same hardening we apply to GitHub in this change.

### D9. `apps/web` spec carve-out for the Supabase client

`openspec/specs/web-application/spec.md` is modified to permit `@supabase/supabase-js` (browser bundle) **only** for the auth flows listed in the new `authentication` spec. The existing "no client-side Supabase" prohibition is replaced with: "No client-side Supabase for _anything other than_ auth flows (no DB reads, no server-side secrets). The `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` env var is the only Supabase key allowed in client bundles; service-role keys remain server-only."

**Why**: this is a deliberate, narrow relaxation, scoped to the auth spec. DB access, storage, and RLS bypasses are still server-only.

### D10. Backward-compat of login/register, removal of `/auth/refresh`

`POST /auth/login` and `POST /auth/register` are kept and now route through the module-scoped Supabase client. They remain useful for:

- Programmatic server-side session minting (tests, scripts)
- Server-issued emails (we don't have any today, but the door stays open)
- Clients (mobile, CLI) that prefer password grant over PKCE

`POST /auth/refresh` is **removed**. The SPA no longer needs it (the Supabase client refreshes through the publishable-key session), and keeping a second refresh path in the API would be a footgun. The SPA no longer calls login/register/refresh; it uses the Supabase client. Refresh is documented as a Supabase-client responsibility only.

### D12. Security hardening of `supabase/config.toml` (post-merge)

The committed GitHub `client_id` and `secret` will be rotated to env-driven values in a follow-up change **after this change is merged to `main`**: `supabase/config.toml` will read `${SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID}` and `${SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET}`, the previously-committed credentials will be revoked in the Supabase dashboard, and a `[auth.external.google]` block will follow the same pattern. The README and `.env.example` will document the requirement.

**Why**: committed OAuth secrets are a security smell, and the GitHub values currently in the file look real. Rotating them after merge keeps the live OAuth app working during review of this change and avoids mixing the rotation PR with the stabilization work.

**Current change scope**: this change does not touch the OAuth secrets in `supabase/config.toml`. It only documents the post-merge plan in Phase 8 of the migration.

## Risks / Trade-offs

- **R1**: Service-role key in Nest has full admin power. A compromise of the API process is a compromise of the user table. → Mitigation: Nest runs behind CORS allowlist and `CORS_ORIGIN`; the key is read from env (not source); we add a config validation step at boot.
- **R2**: Carve-out of `@supabase/supabase-js` for the web bundle opens the door to accidental DB calls in client code. → Mitigation: a Biome rule (or `eslint-plugin-import` boundary) banning `from '@supabase/supabase-js'` in any `apps/web/src/lib/cv-*` or `apps/web/src/components/cv/*` file; a new spec scenario asserts the production bundle's auth chunk does not import any `cv-rest-api` or `database-cv-rls` symbol.
- **R3**: OTP + email verification both require Supabase configuration (email templates, SMTP). A misconfigured deployment could expose partially-working flows. → Mitigation: each flow is feature-flagged off by default; `GET /auth/features` mirrors config exactly; the server returns `404` on the disabled paths so e2e can detect misconfiguration.
- **R4**: `auth.admin.updateUserById` for password change does not require the current password by default. → Mitigation: server validates the current password first via `signInWithPassword` with a throwaway client call before invoking `updateUserById`.
- **R5**: Removing `POST /auth/github/callback` is a breaking change for any third-party client. → Mitigation: none expected to be affected; documented in `proposal.md` and `tasks.md`; the change is gated behind a normal release (no deprecation window required for a first-party product).
- **R6**: Rotating the committed GitHub secrets will break any local dev environment that has been using the committed values. → Mitigation: `supabase start` will fail fast on missing env vars with a clear message; `.env.example` and README document the new vars.
- **R7**: Browser-side `signInWithPassword` keeps the user's password in the JS heap for the duration of the request. → Mitigation: same as today (the existing `LoginForm` already POSTs passwords over the wire); the request lifetime is the same. No new exposure.
- **R8**: New client-side Supabase adds bundle weight. → Mitigation: the Supabase client is already an indirect dependency of the API; lifting it into the web bundle costs ~30KB gzipped and replaces the hand-rolled callback logic. Net win.
- **R9**: `supabase.auth.admin.signOut` requires the user id, which means a logged-out browser that forges a "sign me out" request could revoke someone else's session if the guard is misimplemented. → Mitigation: the guard's resolved user id is the only id ever passed; explicit unit test asserts that a stolen access token cannot revoke another user's session.
- **R10**: The two email-verification knobs (`AUTH_EMAIL_VERIFICATION_ENABLED` in Nest + `[auth.email].enable_confirmations` in `supabase/config.toml`) are independent config points. An operator who flips one but not the other gets surprising behaviour (e.g. Nest reports the feature is on, but Supabase never sends the email). → Mitigation: README and the email-verification spec call out the dependency explicitly; both the API and the SPA's email-verification scenarios document the required Supabase-side setting.

## Migration Plan

1. **Phase 1 (no behaviour change)**: introduce the module-scoped `SUPABASE_CLIENT` provider in `AuthModule`; keep `getBrowserClient()` as an internal helper for now. Add `GET /auth/features` and the three env vars (defaulting to `false`). No SPA changes.
2. **Phase 2 (SPA carve-out)**: relax the `web-application` spec; add `apps/web/src/lib/supabase/client.ts`; rewrite `auth-session.ts` to be a thin Supabase wrapper. SPA `LoginForm` still uses `POST /auth/login` for now.
3. **Phase 3 (client-driven GitHub + remove `/auth/refresh`)**: drop `POST /auth/github/callback`; switch the "Continue with GitHub" button to `supabase.auth.signInWithOAuth`; remove `POST /auth/refresh` (Supabase client handles refresh). Verify dashboard login still works.
4. **Phase 4 (real logout)**: implement `admin.signOut` in `POST /auth/logout`; SPA `SignOutButton` continues to call it and also calls `supabase.auth.signOut()`.
5. **Phase 5 (change password)**: add `POST /auth/password`, `/dashboard/settings/security` page. Always on.
6. **Phase 6 (opt-in flows)**: add the three env-gated flows one at a time. Each ships behind its flag. Default = off.
7. **Phase 7 (Google)**: enable `[auth.external.google]` in `supabase/config.toml`; add the button to `LoginForm`.
8. **Phase 8 (secret rotation, post-merge)**: after the change is merged to `main`, rotate the committed GitHub `client_id`/`secret` in `supabase/config.toml` to env-driven values, then revoke the previously-committed credentials in the Supabase dashboard. The PR for the rotation is a follow-up that lands in a later release.

Rollback per phase is straightforward: each phase is a separate PR; if a phase breaks, revert the PR and the previous phase's behaviour returns. The `GET /auth/features` endpoint is the kill switch for any opt-in flow: setting the env var to `false` immediately hides the UI and makes the server return `404` on the gated endpoints.

## Open Questions

All four open questions from the first draft are now resolved:

- **OQ1 (resolved: remove)**: `POST /auth/refresh` is removed in Phase 3. The Supabase client refreshes through the publishable-key session; the API no longer offers a server-side refresh endpoint.
- **OQ2 (resolved: independent configs)**: `AUTH_EMAIL_VERIFICATION_ENABLED` in `apps/api/.env` and `[auth.email].enable_confirmations` in `supabase/config.toml` are kept as two separate config points. The operator is responsible for keeping them in sync. The README and the `auth-email-verification` spec document the dependency; no auto-sync script is provided.
- **OQ3 (resolved: deferred)**: Passkey / WebAuthn is **out of scope for this change**. It is dropped from the goals, the new capabilities, the tasks, and the spec list. It can be re-scoped in a follow-up change once the team has had time to study the WebAuthn / passkey UX trade-offs (factor requirements, cross-device sync, recovery).
- **OQ4 (resolved: rotate after merge)**: The committed GitHub `client_id` / `secret` in `supabase/config.toml` will be rotated **after the change is merged to `main`**, in a dedicated follow-up PR (Phase 8 of the migration plan). That follow-up will also revoke the previously-committed credentials in the Supabase dashboard. The current PR does not change the file, so the live OAuth app continues to work during review.
