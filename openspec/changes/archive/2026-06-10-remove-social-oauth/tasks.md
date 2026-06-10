# tasks.md

## 1. Remove social OAuth

- [x] 1.1 Remove GitHub/Google buttons and OAuth hooks from `login-form.tsx` and `register-form.tsx`
- [x] 1.2 Remove `useGithubSignIn`, `useGoogleSignIn`, and `startOAuth` from `auth-mutations.ts`
- [x] 1.3 Remove `providers` from `auth/features.ts`; drop `AuthProviderId`
- [x] 1.4 Remove `GET /auth/github` and GitHub callback from `auth.controller.ts` / `auth.service.ts`
- [x] 1.5 Remove `GithubCallbackDto` from `auth.dto.ts`
- [x] 1.6 Remove `[auth.external.github]` and `[auth.external.google]` from `supabase/config.toml`
- [x] 1.7 Remove OAuth env vars from `.env.example`, `apps/web/.env.example`, `apps/api/.env.example`
- [x] 1.8 Remove OAuth keys from `env-prod-schema.mjs` and `local-env-composer.mjs`
- [x] 1.9 Update `README.md` to drop OAuth setup instructions

## 2. Client-side feature flags

- [x] 2.1 Add `apps/web/src/lib/auth/features.ts` with `getAuthFeatures()` and tests
- [x] 2.2 Wire `useAuthFeatures` in auth pages and forms
- [x] 2.3 Remove `GET /auth/features`, `AuthFeaturesDto`, and `getFeatures()` from API
- [x] 2.4 Trim `AuthConfigService` to forgot-password server flag only

## 3. Session hydration fix

- [x] 3.1 Remove `purgeStaleAuthState()` from `getSupabaseClient()` init
- [x] 3.2 Add `hydrateSessionFromStorage()` in `auth-session.ts` and use in `getValidAccessToken()`
- [x] 3.3 Update `supabase-listener.tsx` to rehydrate from storage; clear only on `SIGNED_OUT`
- [x] 3.4 Add rehydration unit test in `auth-session.test.ts`

## 4. Auth callback and shell

- [x] 4.1 Replace `/auth/callback/page.tsx` with `route.ts` (PKCE exchange + redirect)
- [x] 4.2 Add `auth-page-shell.tsx`, `authenticated-entry.tsx`, `app-providers.tsx`
- [x] 4.3 Add dev Mailpit hint for local email flows
- [x] 4.4 Simplify `oauth-callback-error.ts` (no GitHub-specific copy)

## 5. Local env tooling

- [x] 5.1 Add `scripts/lib/local-env-composer.mjs` with forgot-password mirroring
- [x] 5.2 Update `scripts/setup-local-env.sh` to use composer
- [x] 5.3 Add composer unit tests

## 6. Tests and specs

- [x] 6.1 Update web auth unit tests (login-form, mutations, queries, features, callback route)
- [x] 6.2 Update API auth service/config specs
- [x] 6.3 Update delta specs under this change folder

## E2E test impact

**Must pass unchanged**

- `apps/api/test/e2e/local-supabase.e2e-spec.ts` — CV CRUD, media, and non-OAuth auth flows
- Existing seed/fixture scripts (`pnpm samples:seed`)

**Update required**

- None — OAuth was not covered by committed API E2E scenarios; removed endpoints return 404

**Add**

- None — social OAuth removal is enforced by unit tests and spec requirements; credential login E2E coverage remains unchanged
