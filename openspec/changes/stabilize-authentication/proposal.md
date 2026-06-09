# proposal.md

## Why

The current authentication surface is functional but fragile and feature-poor: a custom Supabase client is recreated on every Nest request, the SPA has no password recovery, no email verification, no passwordless logins, and no Google sign-in, and the only social provider (GitHub) is plumbed through a hand-rolled code-exchange endpoint rather than the Supabase client API. Users hit a dead end when they forget their password, accounts with email confirmations enabled get stuck waiting for a server endpoint that does not exist, and the lack of a real logout invalidation means a stolen refresh token is usable until it expires. This change makes the auth flow stable (single source of truth, no custom transports), complete (recovery, email change, email verification, magic link/OTP, Google), and feature-flagged so deployments can opt in incrementally. Passkey/WebAuthn is intentionally deferred to a follow-up change.

## What Changes

### Stabilization

- Replace the per-call `createClient` in `AuthService` with a single module-scoped Supabase client built once at boot, and remove the obsolete `getBrowserClient` factory. **BREAKING** (internal: API behavior unchanged, only the lifetime of the Supabase client changes).
- Remove the hand-rolled `POST /auth/github/callback` server-side code exchange. The web SPA SHALL instead use the `@supabase/supabase-js` client API (browser bundle, fed by Supabase publishable key) to complete the GitHub PKCE flow directly, exactly like the other Supabase client-driven flows. Nest retains only the `Authorization: Bearer` validator (`SupabaseAuthGuard`) and a thin `/auth/me` introspection endpoint; all token minting/refresh happens in the browser through Supabase. **BREAKING** (public: `POST /auth/github/callback` is removed).
- Web SPA SHALL hold a `@supabase/supabase-js` client and use it as the _primary_ identity store: tokens (`access_token`/`refresh_token`) come from the client, not from `POST /auth/login`. `POST /auth/refresh` is **removed**; the Supabase client refreshes through the publishable-key session. The legacy `POST /auth/login` and `POST /auth/register` endpoints SHALL be **deprecated** and routed through the Supabase client under the hood, then retained for `auth.admin` server-side needs (account creation for password recovery emails, email change confirmation, etc.). **BREAKING** (the auth client surface in the browser changes; `POST /auth/refresh` no longer exists; `apiFetch` in `apps/web/src/lib/api.ts` continues to use the access token issued by the client).
- Real sign-out: `POST /auth/logout` SHALL call `supabase.auth.admin.signOut(userId)` server-side (service-role key) so refresh tokens are revoked, and the web client SHALL call `supabase.auth.signOut()` to clear local state.

### New flows

- **Change password** (always on): authenticated user POSTs `{ current_password, new_password }` to `POST /auth/password`; server validates the current password via `supabase.auth.signInWithPassword`, then updates via `supabase.auth.admin.updateUserById(userId, { password })`. Web UI lives in `/dashboard/settings/security` (or co-located with the user menu).
- **Forgot password** (feature-flagged via `AUTH_FORGOT_PASSWORD_ENABLED`, default off): web form at `/forgot-password` POSTs email to `POST /auth/forgot-password`; server triggers `supabase.auth.resetPasswordForEmail(email, { redirectTo: APP_URL + '/reset-password' })`. The reset landing page at `/reset-password` reads the recovery session from the Supabase client and calls `supabase.auth.updateUser({ password })`.
- **Email validation / verification** (feature-flagged via `AUTH_EMAIL_VERIFICATION_ENABLED`, default off): `supabase/config.toml` has `[auth.email] enable_confirmations` set as an **independent** config point (the operator must keep `AUTH_EMAIL_VERIFICATION_ENABLED` and `enable_confirmations` in sync — the spec and README document the dependency). Registration redirects to `/auth/check-email`; user clicks the link → Supabase verifies → client picks up the verified session and redirects to `/dashboard`. Server exposes `GET /auth/email-verified` returning `{ verified: boolean }` for the SPA to poll/inspect if needed.
- **Passwordless (magic link / OTP)** (feature-flagged via `AUTH_PASSWORDLESS_ENABLED`, default off): `POST /auth/otp` accepts `{ email, channel: 'email' }` and calls `supabase.auth.signInWithOtp`; OTP mode returns `{ message: 'OTP sent' }` and a one-time `email_otp` token via the returned session on next sign-in. Web UI on `/login` adds an "Email me a code" tab that calls `POST /auth/otp`, then `POST /auth/otp/verify` with `{ email, token }` (which calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`).
- **Google OAuth** (always on; provider availability is controlled at the Supabase project level): `supabase/config.toml` gains `[auth.external.google]` enabled, and the SPA "Continue with Google" button calls `supabase.auth.signInWithOAuth({ provider: 'google' })` directly.

### Disabled-by-default feature flags

The three optional flows (forgot-password, email verification, passwordless) are off in `supabase/config.toml` and in `apps/web` by default. Each is enabled by setting the corresponding env var in `apps/api/.env` AND `apps/web/.env`:

- `AUTH_FORGOT_PASSWORD_ENABLED=true`
- `AUTH_EMAIL_VERIFICATION_ENABLED=true` (must be set in conjunction with `[auth.email].enable_confirmations = true` in `supabase/config.toml` — see `auth-email-verification` spec)
- `AUTH_PASSWORDLESS_ENABLED=true`

The flags SHALL be surfaced at boot (config validation in `apps/api/src/config/`) and exposed to the SPA via a public `GET /auth/features` endpoint returning the active flag set, so the UI hides controls that are not enabled in the current environment.

### Spec impact

- `openspec/specs/authentication/spec.md` is modified: the GitHub OAuth requirement is rewritten around the client-side Supabase flow, password recovery and the four optional flows are added, and a new requirement covers the `/auth/features` capability flags and the `GET /auth/me` contract.
- `openspec/specs/web-application/spec.md` is modified: the client is now allowed to use `@supabase/supabase-js` in `'use client'` modules for the _client-only_ auth flows (sign-in, OAuth, OTP, email-verify, sign-out), and the spec calls out the env-var-gated capabilities.
- New spec: `openspec/specs/auth-feature-flags/spec.md` covering the four feature flags and the `/auth/features` endpoint.

## Capabilities

### New Capabilities

- `auth-feature-flags`: Public endpoint and env-var contract for the three opt-in auth capabilities (forgot-password, email-verification, passwordless). Created as `specs/auth-feature-flags/spec.md`.
- `auth-password-recovery`: Forgot-password / reset-password flow (off by default). Created as `specs/auth-password-recovery/spec.md`.
- `auth-email-verification`: Account email verification on signup (off by default). Created as `specs/auth-email-verification/spec.md`.
- `auth-passwordless`: Email magic link and OTP sign-in (off by default). Created as `specs/auth-passwordless/spec.md`.
- `auth-change-password`: Authenticated password change (always on). Created as `specs/auth-change-password/spec.md`.

### Modified Capabilities

- `authentication`: Major rewrite — Supabase client in the web bundle, real server-side sign-out, removal of `POST /auth/github/callback`, and added scenarios for `/auth/features` and the new lifecycle endpoints. Delta goes under `openspec/changes/stabilize-authentication/specs/authentication/spec.md`.
- `web-application`: Carve-out permitting the Supabase client (anon key, public env) in the web bundle for auth flows only; remove the prohibition on `@supabase/supabase-js` in interactive modules. Delta goes under `openspec/changes/stabilize-authentication/specs/web-application/spec.md`.

## Impact

- `apps/api/src/auth/auth.service.ts` — refactor to module-scoped client, remove `getBrowserClient`, add password change / forgot / email-verify / OTP / Google methods, real logout.
- `apps/api/src/auth/auth.controller.ts` — remove `POST /auth/github/callback` and `POST /auth/refresh`, add `/auth/password`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/email-verified`, `/auth/otp`, `/auth/otp/verify`, `/auth/features`. Keep `/auth/login` and `/auth/register` as deprecated (server-side wrappers around the Supabase client) for backward compatibility and for server-only needs.
- `apps/api/src/auth/auth.module.ts` — register new providers, expose a single `SUPABASE_CLIENT` injection token.
- `apps/api/src/auth/supabase-auth.guard.ts` — unchanged.
- `apps/api/src/config/` — new config validation schema for the four `AUTH_*_ENABLED` flags.
- `apps/api/.env.example` and `apps/web/.env.example` — add `SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `AUTH_FORGOT_PASSWORD_ENABLED`, `AUTH_EMAIL_VERIFICATION_ENABLED`, `AUTH_PASSWORDLESS_ENABLED`.
- `supabase/config.toml` — add `[auth.external.google]`. The `[auth.email].enable_confirmations` setting is documented in the spec as an **independent** config point that the operator must keep in sync with `AUTH_EMAIL_VERIFICATION_ENABLED` — there is no auto-sync. **Security note**: the committed GitHub `client_id` and `secret` in `supabase/config.toml` will be rotated to a placeholder + a documented "fill in via env" pattern **after the change is merged to `main`** in a dedicated follow-up PR (Phase 8 of the migration plan). The current PR does not change the file, so the live OAuth app continues to work during review.
- `apps/web/src/lib/supabase/client.ts` — NEW. The publishable-key Supabase client used by `'use client'` modules.
- `apps/web/src/lib/auth-session.ts` — replace with a thin wrapper around the Supabase client (`getSession`, `onAuthStateChange`); keep `sessionStorage` for fast boot reads.
- `apps/web/src/lib/api.ts` — `apiFetch` continues to read the access token from the Supabase client session.
- `apps/web/src/components/auth/login-form.tsx` — adds Google button, OTP/magic-link tab (gated), forgot-password link (gated).
- `apps/web/src/components/auth/register-form.tsx` — handles the `requires_email_verification` response, routes to `/auth/check-email`.
- `apps/web/src/app/auth/callback/page.tsx` — supports the Supabase PKCE flow (detects verified email + sessions automatically).
- `apps/web/src/app/auth/check-email/page.tsx` — NEW, gated by `AUTH_EMAIL_VERIFICATION_ENABLED`.
- `apps/web/src/app/forgot-password/page.tsx`, `apps/web/src/app/reset-password/page.tsx` — NEW, gated by `AUTH_FORGOT_PASSWORD_ENABLED`.
- `apps/web/src/app/dashboard/settings/security/page.tsx` — NEW. Password change.
- New unit tests beside every new server module. New e2e coverage in `apps/api/test/e2e/local-supabase.e2e-spec.ts` for password change and feature-flags endpoint (other flows remain Supabase-config dependent and are validated via the UI per the existing OAuth pattern).
- Documentation: `openspec/specs/web-application/spec.md` carve-out, `openspec/specs/authentication/spec.md` rewrite, new `openspec/specs/auth-feature-flags/spec.md`, `openspec/specs/auth-password-recovery/spec.md`, `openspec/specs/auth-email-verification/spec.md`, `openspec/specs/auth-passwordless/spec.md`, `openspec/specs/auth-change-password/spec.md`.
