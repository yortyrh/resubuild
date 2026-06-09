# tasks.md

## 1. Module-scoped Supabase client + config validation

- [ ] 1.1 Add `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to `apps/api/.env.example` and the corresponding `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `apps/web/.env.example`
- [ ] 1.2 Add a `ConfigModule` validation schema entry in `apps/api/src/config/` for the three `AUTH_*_ENABLED` booleans (`AUTH_FORGOT_PASSWORD_ENABLED`, `AUTH_EMAIL_VERIFICATION_ENABLED`, `AUTH_PASSWORDLESS_ENABLED`)
- [ ] 1.3 Create `apps/api/src/auth/supabase-client.provider.ts` that exports a single `SupabaseClient` built from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` at boot
- [ ] 1.4 Wire the provider in `apps/api/src/auth/auth.module.ts`; remove the `getBrowserClient()` factory from `auth.service.ts`; refactor `login`, `register`, `getGithubAuthUrl`, `handleGithubCallback` to use the injected client
- [ ] 1.5 Update `apps/api/src/auth/supabase-auth.guard.ts` to read the service-role client and the resolved user; remove the anon-key fallback path
- [ ] 1.6 Update unit tests in `apps/api/src/auth/auth.service.spec.ts` and `apps/api/src/auth/supabase-auth.guard.spec.ts` to use the module-scoped client (mocks: provide `{ provide: SUPABASE_CLIENT, useValue: ... }`)

## 2. Feature flags endpoint and env wiring

- [ ] 2.1 Implement `GET /auth/features` in `apps/api/src/auth/auth.controller.ts` returning `{ forgot_password, email_verification, passwordless, providers }`; the `providers` array reads from the Supabase config (use env vars `SUPABASE_AUTH_EXTERNAL_GITHUB_ENABLED` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED`)
- [ ] 2.2 Add the corresponding DTO and unit test (`auth.controller.spec.ts`) covering: all flags false, each flag individually true, providers empty/populated
- [ ] 2.3 Add `apps/web/src/lib/auth/features.ts` with `fetchAuthFeatures()` calling `GET /auth/features`; export a typed `AuthFeatures` interface
- [ ] 2.4 Add unit tests beside `features.ts` (mocked fetch)

## 3. Real server-side sign-out

- [ ] 3.1 Implement `signOut(userId)` on `AuthService` calling `supabase.auth.admin.signOut(userId)`; update `POST /auth/logout` to call it; respond `204`
- [ ] 3.2 Update `apps/web/src/components/auth/sign-out-button.tsx` and `apps/web/src/components/dashboard/user-menu.tsx` to call `supabase.auth.signOut()` after the API call (when the SPA is using the Supabase client); keep the existing path for the legacy sessionStorage flow
- [ ] 3.3 Add unit tests for `auth.service.signOut` (success + missing user)

## 4. SPA Supabase client

- [ ] 4.1 Add `@supabase/supabase-js` to `apps/web/package.json` dependencies (latest 2.x)
- [ ] 4.2 Create `apps/web/src/lib/supabase/client.ts` exporting `createSupabaseBrowserClient()` using `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with `auth.persistSession=true, autoRefreshToken=true, detectSessionInUrl=true`
- [ ] 4.3 Refactor `apps/web/src/lib/auth-session.ts` to delegate to the Supabase client: `hasSession()` checks `supabase.auth.getSession()`, `getValidAccessToken()` returns the session's access token, `clearSession()` calls `supabase.auth.signOut()` if a session exists
- [ ] 4.4 Subscribe to `supabase.auth.onAuthStateChange` once at the app root (add a `<SupabaseListener />` client component in `apps/web/src/app/layout.tsx`); keep the existing `STORAGE_KEYS` access-token mirror for backwards compatibility with `apiFetch` reads
- [ ] 4.5 Update unit tests for `auth-session.ts` and any new files (mock `@supabase/supabase-js`)

## 5. Drop the custom GitHub callback and `POST /auth/refresh`; use the Supabase client API

- [ ] 5.1 Remove `POST /auth/github/callback` from `apps/api/src/auth/auth.controller.ts`; remove `handleGithubCallback` and `GithubCallbackDto` from `auth.service.ts` and `dto/auth.dto.ts`; remove the relevant unit tests
- [ ] 5.2 Mark `GET /auth/github` as deprecated in the controller JSDoc; keep the method but have it return a `Deprecation: true` response header
- [ ] 5.3 Update `apps/web/src/components/auth/login-form.tsx`: "Continue with GitHub" now calls `supabase.auth.signInWithOAuth({ provider: 'github' })` directly; the redirect URL points to `<APP_URL>/auth/callback`
- [ ] 5.4 Update `apps/web/src/app/auth/callback/page.tsx`: when `code` is in the query string, call `supabase.auth.exchangeCodeForSession(code)`; otherwise read the session from `supabase.auth.getSession()` (PKCE); in both cases, persist the session via the Supabase client and redirect to `/dashboard`
- [ ] 5.5 Add `SupabaseListener` integration test (Vitest, mocking the Supabase client) to assert session hydration on callback
- [ ] 5.6 Remove `POST /auth/refresh` from `apps/api/src/auth/auth.controller.ts`; remove the `refresh` method from `AuthService` and `RefreshDto` from `dto/auth.dto.ts`; remove the relevant unit tests
- [ ] 5.7 Update `apps/web/src/lib/auth-session.ts` (refactored in §4) so it never calls `/auth/refresh`; the Supabase client refreshes through the publishable-key session automatically
- [ ] 5.8 Grep the web bundle and the API source for any remaining references to `/auth/refresh` and remove them (notably `getValidAccessToken` in the legacy `auth-session.ts` path)

## 6. Change password (always on)

- [ ] 6.1 Add `ChangePasswordDto` (`current_password`, `new_password` with `MinLength(8)`) to `apps/api/src/auth/dto/auth.dto.ts`
- [ ] 6.2 Add `AuthService.changePassword(userId, dto)` that (a) calls `signInWithPassword` with the user's email + `current_password` to verify, then (b) calls `supabase.auth.admin.updateUserById(userId, { password: new_password })`
- [ ] 6.3 Add `POST /auth/password` to `auth.controller.ts`, protected by `SupabaseAuthGuard`
- [ ] 6.4 Add unit tests for `changePassword` (success, wrong current password, weak new password, unauthenticated)
- [ ] 6.5 Add `apps/web/src/app/dashboard/settings/security/page.tsx` with a "Change password" form (current, new, confirm)
- [ ] 6.6 Wire the form to `POST /auth/password` via `apiFetch`; surface success/error toasts
- [ ] 6.7 Add a "Security" link in `apps/web/src/components/dashboard/user-menu.tsx` pointing to `/dashboard/settings/security`
- [ ] 6.8 Add Vitest component tests for the Security page

## 7. Forgot password / reset password (gated by `AUTH_FORGOT_PASSWORD_ENABLED`)

- [ ] 7.1 Add `ForgotPasswordDto` and `ResetPasswordDto` to `apps/api/src/auth/dto/auth.dto.ts`
- [ ] 7.2 Add `AuthService.forgotPassword(email)` and `resetPassword(dto)`; mount `POST /auth/forgot-password` and `POST /auth/reset-password` on the controller, both gated by the flag
- [ ] 7.3 Add unit tests for both methods
- [ ] 7.4 Add `apps/web/src/app/forgot-password/page.tsx` (form) and `apps/web/src/app/reset-password/page.tsx` (form driven by the Supabase recovery session)
- [ ] 7.5 Update `apps/web/src/components/auth/login-form.tsx` to render the "Forgot your password?" link when `forgot_password: true`
- [ ] 7.6 Hide the link and the routes when the flag is off (route guard in each page that checks `fetchAuthFeatures().forgot_password`)
- [ ] 7.7 Add Vitest component tests for the forgot/reset pages

## 8. Email verification (gated by `AUTH_EMAIL_VERIFICATION_ENABLED`)

- [ ] 8.1 Document the two-knob email-verification config in the root `README.md` and `.env.example`: the operator is responsible for keeping `AUTH_EMAIL_VERIFICATION_ENABLED` and `[auth.email].enable_confirmations` in sync; warn explicitly about the misconfiguration states. Do **not** add a `supabase config push` auto-sync script.
- [ ] 8.2 Add `GET /auth/email-verified` to `auth.controller.ts`, gated by the flag; supports an optional `?token=...` query that calls `supabase.auth.verifyOtp({ token, type: 'email' })`
- [ ] 8.3 Add unit tests for the controller method
- [ ] 8.4 Update `apps/web/src/components/auth/register-form.tsx`: when `signUp` returns no session and `email_verification: true`, redirect to `/auth/check-email`
- [ ] 8.5 Add `apps/web/src/app/auth/check-email/page.tsx` that polls the session (or accepts a `?token=...` in the URL) and redirects to `/dashboard` once verified
- [ ] 8.6 Update `apps/web/src/components/auth/session-gate.tsx` to bounce unverified users to `/auth/check-email` when `email_verification: true`
- [ ] 8.7 Add Vitest component tests

## 9. Passwordless (gated by `AUTH_PASSWORDLESS_ENABLED`)

- [ ] 9.1 Add `OtpRequestDto` and `OtpVerifyDto` to `apps/api/src/auth/dto/auth.dto.ts`
- [ ] 9.2 Add `AuthService.sendOtp(dto)` and `AuthService.verifyOtp(dto)`; mount `POST /auth/otp` and `POST /auth/otp/verify` on the controller, gated by the flag
- [ ] 9.3 Add unit tests
- [ ] 9.4 Add a tabbed control to `apps/web/src/components/auth/login-form.tsx` with three modes: "Password", "Email me a code", "Email me a link"; render only when `passwordless: true`
- [ ] 9.5 Implement the "Email me a code" mode: calls `POST /auth/otp`, then collects the 6-digit code and calls `POST /auth/otp/verify`
- [ ] 9.6 Implement the "Email me a link" mode: calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` and instructs the user to click the link
- [ ] 9.7 Add Vitest component tests for the three modes and the flag-gated rendering

## 10. Google OAuth

- [ ] 10.1 Update `supabase/config.toml` to add `[auth.external.google]` enabled, with `client_id` and `secret` read from `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`
- [ ] 10.2 Update `apps/api/src/auth/auth.controller.ts`'s `GET /auth/features` to include `"google"` in `providers` when the Google block is enabled
- [ ] 10.3 Add a "Continue with Google" button to `apps/web/src/components/auth/login-form.tsx` that calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
- [ ] 10.4 Add unit tests for the providers array in the features response
- [ ] 10.5 Document `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` in `apps/api/.env.example` and the root `.env.example`

## 11. Secret rotation for committed OAuth credentials (post-merge follow-up)

The rotation of the committed GitHub `client_id` / `secret` in `supabase/config.toml` is **not part of this change's PR**. It is a follow-up that lands **after this change is merged to `main`** (Phase 8 of the migration plan in `design.md`). The tasks below are tracked in the follow-up PR.

- [ ] 11.1 (follow-up) Replace the committed `client_id` and `secret` in `supabase/config.toml` for `[auth.external.github]` with env-driven placeholders (`${SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID}`, `${SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET}`)
- [ ] 11.2 (follow-up) Document the new env vars in the root `README.md` and `.env.example`
- [ ] 11.3 (follow-up) Revoke the previously-committed GitHub OAuth credentials in the Supabase dashboard
- [ ] 11.4 (follow-up) Verify `supabase start` fails fast with a clear message when the env vars are missing

## 12. Specs and documentation

- [ ] 12.1 Confirm `openspec/changes/stabilize-authentication/specs/authentication/spec.md` matches the implementation (delta applied)
- [ ] 12.2 Confirm `openspec/changes/stabilize-authentication/specs/web-application/spec.md` matches the implementation (carve-out applied)
- [ ] 12.3 Confirm new specs `auth-feature-flags`, `auth-password-recovery`, `auth-email-verification`, `auth-passwordless`, `auth-change-password` are reachable from `openspec list`
- [ ] 12.4 Update root `README.md` to document the env vars and the feature flags; document the two-knob email-verification config (`AUTH_EMAIL_VERIFICATION_ENABLED` + `[auth.email].enable_confirmations`) and the requirement to keep them in sync; remove the explicit "no Supabase in the web bundle" sentence from the auth section (replace with the new carve-out)

## 13. Tooling and lint guards

- [ ] 13.1 Add a Biome lint rule (or a small custom `no-restricted-imports` block in `apps/web/biome.json` or `.eslintrc`) that bans `from '@supabase/supabase-js'` in `apps/web/src/lib/cv-*` and `apps/web/src/components/cv/*` paths
- [ ] 13.2 Add a Vitest assertion (or a build-time grep) verifying the production web bundle does not include `SUPABASE_SERVICE_ROLE_KEY` or the cv-rest-api symbols

## 14. E2E test impact

### Must pass unchanged

- `apps/api/test/e2e/local-supabase.e2e-spec.ts` — auth: login + /auth/me
- `apps/api/test/e2e/local-supabase.e2e-spec.ts` — CV, media, export, template-presentation, lifecycle, sections, AI-agent, import-LLM, import-URL, MCP

### Update required

- `apps/api/test/e2e/local-supabase.e2e-spec.ts` — auth scenarios:
  - Update the `/auth/me` test to use a session minted through the new module-scoped client (no behaviour change at the HTTP layer)
  - Add a scenario for the new `/auth/logout` behaviour (refresh token unusable after logout, via Supabase's revocation)
  - Add a scenario for `GET /auth/features` (default flags = all false; providers include github)
  - **Remove** the existing `POST /auth/refresh` scenario (the endpoint no longer exists)

### Add

- `apps/api/test/e2e/local-supabase.e2e-spec.ts`:
  - `POST /auth/password` — happy path, wrong current password, weak new password, missing token
  - `POST /auth/forgot-password` — happy path (200 with generic message), enumeration resistance (unknown email still 200), disabled flag (404)
  - `POST /auth/reset-password` — happy path, expired token
  - `GET /auth/email-verified` — with valid token, with missing token, disabled flag (404)
  - `POST /auth/otp`, `POST /auth/otp/verify` — disabled flag (404); enumeration resistance; happy path (with Supabase email capture in local dev)
- New Vitest suite in `apps/web/src/lib/supabase/__tests__/` covering the Supabase listener and the auth-session refactor.
- New Vitest component tests in `apps/web/src/components/auth/__tests__/` and `apps/web/src/app/dashboard/settings/security/__tests__/` for each new form/control.
