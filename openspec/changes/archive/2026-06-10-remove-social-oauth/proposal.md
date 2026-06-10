# proposal.md

> This change retroactively documents work already implemented in the working tree.

## Why

The `stabilize-authentication` change added GitHub and Google OAuth, a runtime `GET /auth/features` endpoint, and a dual session model (Supabase cookies plus `sessionStorage`). Operators do not need social login for release 1, the features round-trip caused visible layout shift on auth pages, and email/password sign-in could land on `/dashboard` with "Not authenticated" because `SessionGate` trusted `sessionStorage` while `apiFetch` read an empty Supabase cookie session. This change removes social OAuth, resolves capability flags at build time, and aligns session hydration so credential login survives hard refresh.

## What Changes

- **Remove GitHub and Google OAuth** from the SPA (`LoginForm`, auth mutations), Nest API (`GET /auth/github`, GitHub callback handlers), and `supabase/config.toml` (`[auth.external.github]`, `[auth.external.google]`). **BREAKING** for any client that relied on social sign-in.
- **Remove `GET /auth/features`** and the `providers` array; the SPA reads three flags from `NEXT_PUBLIC_AUTH_*` via `getAuthFeatures()` / `useAuthFeatures`. **BREAKING** for programmatic consumers of `/auth/features`.
- **Keep `/auth/callback` as a Next.js Route Handler** for PKCE/magic-link completion (`exchangeCodeForSession`); remove the client `page.tsx` callback.
- **Fix session hydration**: stop purging Supabase cookies on client init; rehydrate the Supabase client from `sessionStorage` when cookies are empty; `SupabaseListener` only clears storage on explicit `SIGNED_OUT`.
- **Local env composer** (`scripts/lib/local-env-composer.mjs`): mirror `AUTH_FORGOT_PASSWORD_ENABLED` → `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED`; drop OAuth-related keys from operator-controlled sets.
- **Auth UX shell**: shared `AuthPageShell`, `AuthenticatedEntry`, dev Mailpit hint, `AppProviders` wrapper.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `authentication`: Replace OAuth requirements with "GitHub and Google OAuth MUST NOT be supported"; remove OAuth secret references from bundle rules.
- `auth-feature-flags`: Client-side build-time flags; remove `/auth/features` and `providers`; document env composer mirroring.
- `auth-email-verification`: SPA flag only (`NEXT_PUBLIC_*`); `GET /auth/email-verified` no longer gated server-side.
- `auth-password-recovery`: UI gating via `getAuthFeatures()` instead of `/auth/features`.
- `auth-passwordless`: UI gating via `getAuthFeatures()` instead of `/auth/features`.
- `web-application`: Remove OAuth from allowed Supabase client flows list.

## Impact

- `apps/web`: login/register forms, auth queries/mutations, `auth-session.ts`, `supabase/client.ts`, `supabase-listener.tsx`, `/auth/callback/route.ts`, new auth shell components.
- `apps/api`: `auth.controller.ts`, `auth.service.ts`, `auth.config.ts`; removed `AuthFeaturesDto` and features endpoint.
- `supabase/config.toml`, `.env.example` files, `scripts/setup-local-env.sh`, `scripts/lib/local-env-composer.mjs`, `scripts/lib/env-prod-schema.mjs`.
- Unit tests across web auth modules and API auth service/config specs.
