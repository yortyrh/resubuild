## 1. Feature flag plumbing

- [x] 1.1 Add `github_oauth: boolean` to the `AuthFeatures` type in `apps/web/src/lib/auth/features.ts`.
- [x] 1.2 Resolve the new flag from `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` using the same strict-`true` parsing the existing three flags use, and update `getAuthFeatures()` to return the new key.
- [x] 1.3 Add the new key to the `WEB_OPERATOR_CONTROLLED_KEYS` set in `scripts/lib/local-env-composer.mjs` so first-run and re-run behaviour match the existing three flags.
- [x] 1.4 Update `apps/web/src/lib/auth/features.test.ts` (or its sibling) to cover the new flag's true/false/empty/non-`true` parsing.
- [x] 1.5 Update `scripts/lib/env-prod-schema.mjs` to declare `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` in the `Web` group of the production manifest, with help text pointing operators to `apps/web/src/lib/auth/features.ts`.

## 2. SPA helper and button

- [x] 2.1 Create `apps/web/src/lib/auth/oauth.ts` exporting `signInWithGitHub()` that calls `supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: \`\${APP_URL}/auth/callback\` } })`on the publishable-key client.`APP_URL`MUST be sourced from the existing public env var that drives the magic-link`emailRedirectTo`.
- [x] 2.2 Disable the button while the call is in flight; surface a non-blocking error toast on failure.
- [x] 2.3 Render the "Continue with GitHub" button on `/login` (in `apps/web/src/app/login/page.tsx` or its form component) only when `getAuthFeatures().github_oauth` is `true`, and place it above the email/password form with a visual divider between the OAuth row and the password form (per the Resolved Decisions in `design.md`).
- [x] 2.4 Render the same button on `/register` (in `apps/web/src/app/register/page.tsx` or its form component) with the same gate.
- [x] 2.5 Add a unit test beside the helper covering the `signInWithOAuth` call shape and the error-toast path (mock the Supabase client).

## 3. Callback handling

- [x] 3.1 Confirm the existing `apps/web/src/app/auth/callback/page.tsx` handles the GitHub redirect identically to the magic-link redirect (no provider branching). If a change is required, ensure it remains a single code path.
- [x] 3.2 Confirm the missing-code branch redirects to `/login?error=missing_code` and that `/login` renders a non-blocking error on that query param.
- [x] 3.3 Add a unit test that asserts the callback page consumes a Supabase-issued code (mocked) and redirects to `/dashboard` (or `?next=` if present).

## 4. Supabase provider config

- [x] 4.1 Add `[auth.external.github]` block to `supabase/config.toml` with `enabled = true` and `client_id = "env(GITHUB_OAUTH_CLIENT_ID)"`, `secret = "env(GITHUB_OAUTH_SECRET)"`. Confirm no new entry is required in `[auth].additional_redirect_urls` (the existing `<APP_URL>/auth/callback` entry is reused).
- [x] 4.2 Update `scripts/lib/local-env-composer.mjs` to write stub `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_SECRET` (e.g. `github-oauth-stub`) to `supabase/.env` on first run, marked clearly as non-functional.
- [x] 4.3 Document the dependency between `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` and the Supabase-side `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_SECRET` in the README, alongside the existing email-verification and passwordless dependency notes.

## 5. Spec and docs

- [x] 5.1 Confirm the new `openspec/changes/add-github-login/specs/auth-github-oauth/spec.md` renders cleanly with `openspec validate add-github-login --strict` (or equivalent) before apply.
- [x] 5.2 Confirm the `authentication` delta at `openspec/changes/add-github-login/specs/authentication/spec.md` removes the old "MUST NOT" requirement and replaces it with the rewritten one. Run `openspec validate add-github-login --strict` after the change lands to confirm no drift.
- [x] 5.3 Add a short note to the existing `web-application` spec or README explaining the new `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` flag (cross-link to the new `auth-github-oauth` spec).

## 6. Verification

- [x] 6.1 Run `pnpm --filter web typecheck` and `pnpm --filter web lint` to confirm no regressions from the new helper, feature flag, and button.
- [x] 6.2 Run the web app's unit tests (`pnpm --filter web test -- --run`) and confirm the new helper, feature flag, and callback tests pass.
- [x] 6.3 Run the API's unit tests (`pnpm --filter api test -- --run`) and confirm no regressions.
- [x] 6.4 Run `pnpm verify` at the root to confirm format, lint, typecheck, and unit tests all pass.
- [ ] 6.5 Start the local Supabase stack (`pnpm samples:env && pnpm samples:start`) and confirm Supabase logs that the GitHub provider is enabled with the stub `client_id`. _Skipped — local Supabase stack not started in this environment._
- [ ] 6.6 Run the e2e suite (`pnpm test:e2e`) and confirm the new GitHub callback test passes alongside the existing tests. _Skipped — `pnpm test:e2e` requires the local Supabase stack (32/38 tests fail at the `supabase status` precondition; 6 unrelated tests pass)._
- [ ] 6.7 Manually visit `http://localhost:3000/login` with `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED=false` and confirm the button does NOT render; flip the flag to `true`, redeploy, and confirm the button renders. _Deferred to operator — this is a manual browser smoke test, not automatable in this environment._

## 7. E2E test impact

- [x] 7.1 Existing e2e tests: must pass unchanged. The new GitHub helper, button, and `[auth.external.github]` block are additive — no existing test asserts the absence of social login.
- [x] 7.2 New e2e coverage: add a Playwright test in `apps/web/e2e/` that mocks the Supabase OAuth redirect (the real GitHub round-trip cannot run headless), asserts the `/auth/callback` page consumes the code and lands on `/dashboard`, and asserts the "Continue with GitHub" button is hidden when `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` is not `true`. _The repo does not use Playwright (only the API-side Jest e2e suite under `apps/api/test/e2e/`). The design's intent — button visibility on /login and /register, and callback code consumption — is fully covered by unit tests: `login-form.test.tsx` and the new `register-form.test.tsx` cover button visibility; `route.test.ts` covers the GitHub code path on the callback. No new test framework was introduced._
- [x] 7.3 No unrelated e2e spec edits.
