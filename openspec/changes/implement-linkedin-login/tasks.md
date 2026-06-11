## 1. Feature Flags

- [ ] 1.1 Add `linkedin_oauth: boolean` to `AuthFeatures` type in `apps/web/src/lib/auth/features.ts`
- [ ] 1.2 Add `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED` parsing in `getAuthFeatures()`
- [ ] 1.3 Add test case for `linkedin_oauth` flag parsing in `apps/web/src/lib/auth/features.test.ts`

## 2. OAuth Helper

- [ ] 2.1 Add `signInWithLinkedIn()` function in `apps/web/src/lib/auth/oauth.ts` (or co-located auth directory), following the same pattern as `signInWithGitHub()`
- [ ] 2.2 Export `signInWithLinkedIn` from the auth module

## 3. UI Components

- [ ] 3.1 Add "Continue with LinkedIn" button to `/login` page (behind `getAuthFeatures().linkedin_oauth`)
- [ ] 3.2 Add "Continue with LinkedIn" button to `/register` page (same condition)
- [ ] 3.3 Verify button is disabled during OAuth call and shows error toast on failure

## 4. Supabase Configuration

- [ ] 4.1 Add `[auth.external.linkedin]` block to `supabase/config.toml` with `enabled = true` and `env(LINKEDIN_OAUTH_CLIENT_ID)` / `env(LINKEDIN_OAUTH_SECRET)`
- [ ] 4.2 Add stub values for `LINKEDIN_OAUTH_CLIENT_ID` and `LINKEDIN_OAUTH_SECRET` to `scripts/lib/local-env-composer.mjs` (marked as non-functional)
- [ ] 4.3 Verify `supabase start` works with the new provider config

## 5. E2E Test Impact

Add E2E test in `apps/api/e2e/auth-linkedin-oauth.spec.ts` following the pattern from `auth-github-oauth.spec.ts`:

- [ ] 5.1 Test LinkedIn button renders when flag is enabled
- [ ] 5.2 Test LinkedIn button hidden when flag is disabled
- [ ] 5.3 Test OAuth flow redirects and completes successfully
- [ ] 5.4 Test error handling when provider is misconfigured
