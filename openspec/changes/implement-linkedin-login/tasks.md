## 1. Feature Flags

- [x] 1.1 Add `linkedin_oauth: boolean` to `AuthFeatures` type in `apps/web/src/lib/auth/features.ts`
- [x] 1.2 Add `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED` parsing in `getAuthFeatures()`
- [x] 1.3 Add test case for `linkedin_oauth` flag parsing in `apps/web/src/lib/auth/features.test.ts`

## 2. OAuth Helper

- [x] 2.1 Add `signInWithLinkedIn()` function in `apps/web/src/lib/auth/oauth.ts` (or co-located auth directory), following the same pattern as `signInWithGitHub()`
- [x] 2.2 Export `signInWithLinkedIn` from the auth module (via direct import from oauth.ts)

## 3. UI Components

- [x] 3.1 Add "Continue with LinkedIn" button to `/login` page (behind `getAuthFeatures().linkedin_oauth`)
- [x] 3.2 Add "Continue with LinkedIn" button to `/register` page (same condition)
- [x] 3.3 Verify button is disabled during OAuth call and shows error toast on failure

## 4. Supabase Configuration

- [x] 4.1 Add `[auth.external.linkedin]` block to `supabase/config.toml` with `enabled = true` and `env(LINKEDIN_OAUTH_CLIENT_ID)` / `env(LINKEDIN_OAUTH_SECRET)`
- [x] 4.2 Add stub values for `LINKEDIN_OAUTH_CLIENT_ID` and `LINKEDIN_OAUTH_SECRET` to `scripts/lib/local-env-composer.mjs` (marked as non-functional)
- [x] 4.3 Verify `supabase start` works with the new provider config

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — all scenarios (LinkedIn OAuth is UI-only; API SupabaseAuthGuard is provider-agnostic, no contract changes)

### Update required

- None

### Add

- None — LinkedIn OAuth flow is handled entirely client-side by Supabase client library. The existing `/auth/callback` page and `SupabaseAuthGuard` handle LinkedIn tokens without any code changes.
