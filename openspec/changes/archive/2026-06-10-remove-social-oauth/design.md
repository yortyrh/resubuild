# design.md

## Context

`stabilize-authentication` (archived 2026-06-10) introduced Supabase client auth in the SPA, optional flows behind feature flags, and GitHub/Google OAuth. Release 1 needs email/password (and optional passwordless) only. The runtime `/auth/features` fetch caused auth-page flicker. After OAuth removal, email login still failed on dashboard because `hasSession()` read `sessionStorage` while `getValidAccessToken()` called `supabase.auth.getSession()` on cookies that `purgeStaleAuthState()` had cleared on every page load.

## Goals / Non-Goals

**Goals**

- No GitHub or Google sign-in surfaces in SPA, API, or local Supabase config.
- Three auth capability flags resolved at build time in the SPA; forgot-password still enforced server-side via `AUTH_FORGOT_PASSWORD_ENABLED`.
- PKCE/magic-link callback via `/auth/callback` Route Handler (server-side `exchangeCodeForSession`).
- Single coherent session: `sessionStorage` remains the SPA gate; Supabase client rehydrates from it when cookies are absent.
- Local `setup:env` keeps API/web forgot-password flags aligned.

**Non-Goals**

- Adding new auth providers or passkeys.
- Reintroducing `GET /auth/features`.
- Full `@supabase/ssr` cookie-only session model.
- Removing passwordless, email verification, or forgot-password flows.

## Decisions

### D1. Drop social OAuth entirely

Removed `signInWithOAuth` hooks, API GitHub routes, and `[auth.external.*]` blocks. `/auth/callback` stays for email magic links and PKCE recovery, not OAuth redirects.

**Why**: Product scope is credential + optional passwordless only; fewer secrets and config drift.

### D2. Build-time feature flags in the SPA

`apps/web/src/lib/auth/features.ts` exports `getAuthFeatures()` reading `NEXT_PUBLIC_AUTH_*`. `useAuthFeatures` uses `staleTime: Infinity`. Removed `GET /auth/features`, `AuthFeaturesDto`, and `providers`.

**Why**: Eliminates layout shift; flags change only on redeploy (acceptable for `NEXT_PUBLIC_*`).

### D3. Session rehydration from sessionStorage

`hydrateSessionFromStorage()` in `auth-session.ts` calls `supabase.auth.setSession()` when `getSession()` is empty but `sessionStorage` has tokens. `SupabaseListener` does the same on mount. Removed `purgeStaleAuthState()` from `getSupabaseClient()` init.

**Why**: `SessionGate` and `apiFetch` must agree on auth state after password login and hard refresh.

### D4. Route Handler for `/auth/callback`

Replaced client `page.tsx` with `route.ts` that exchanges `code` server-side and redirects to `next` (default `/dashboard`). Errors map through `oauth-callback-error.ts` (PKCE/generic only).

**Why**: Server exchange avoids client race with `detectSessionInUrl`; aligns with Next.js App Router patterns.

### D5. Local env composer mirrors forgot-password only

`local-env-composer.mjs` preserves operator `AUTH_FORGOT_PASSWORD_ENABLED` and writes matching `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED`. Email-verification and passwordless web flags are operator-controlled independently (no API mirror).

## Risks / Trade-offs

- **Misconfigured flags**: SPA and API can disagree on forgot-password; server guard remains authoritative (404).
- **Build-time flags**: Toggling a flow requires web rebuild/redeploy, not a runtime flip.
- **sessionStorage**: Still the dashboard gate; rehydration bridges to Supabase client for Bearer tokens.

## Migration

1. Remove OAuth env vars from `.env` files (`SUPABASE_AUTH_EXTERNAL_*`, `NEXT_PUBLIC_SUPABASE_AUTH_EXTERNAL_*`).
2. Run `pnpm setup:env` to refresh composed local env.
3. Redeploy web with updated `NEXT_PUBLIC_AUTH_*` values.
