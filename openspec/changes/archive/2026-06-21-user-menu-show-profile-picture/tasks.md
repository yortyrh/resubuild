## 1. API — expose user picture from `/auth/me`

- [x] 1.1 In `apps/api/src/auth/session.types.ts`, add `picture?: string | null` to `AuthMeResponse.user` and document that it is sourced from `user_metadata.avatar_url` (falling back to `user_metadata.picture`, coerced to `null` when empty).
- [x] 1.1b In `apps/api/src/auth/auth-user.types.ts`, add optional `userMetadata?: Record<string, unknown>` to `AuthUser` so handlers can derive profile fields from the validated session.
- [x] 1.1c In `apps/api/src/auth/supabase-auth.guard.ts`, attach `userMetadata` (defaults to `{}` when Supabase returns none) to `request.user` after `auth.getUser`. Update `supabase-auth.guard.spec.ts` "Valid token" scenario to assert the new field on the attached user.
- [x] 1.2 In `apps/api/src/auth/auth.controller.ts`, update the `me(@Req())` handler to derive `picture` from the validated Supabase user's `user_metadata` (already attached by `SupabaseAuthGuard`) and return it alongside `id` and `email`.
- [x] 1.3 Add a colocated Jest scenario in `apps/api/src/auth/auth.controller.spec.ts` covering: (a) `avatar_url` populates `picture`, (b) `picture` metadata populates `picture` when `avatar_url` is missing, (c) no avatar metadata yields `picture: null`.

## 2. Web — type the new field

- [x] 2.1 In `apps/web/src/lib/api.ts`, add `picture?: string | null` to the `AuthMe.user` interface so `fetchAuthMe` callers see the new field with correct typing.

## 3. Web — render the avatar in the user menu

- [x] 3.1 In `apps/web/src/components/dashboard/user-menu.tsx`, read `useAuthMe()` and switch the trigger button child: when `data?.user.picture` is a non-empty string, render an inline `<img className="h-8 w-8 rounded-full object-cover" src={...} alt="" onError={...} />`; otherwise render the existing `<UserRound className="h-4 w-4" />`.
- [x] 3.2 Track load-error state locally so a broken avatar URL falls back to the `UserRound` icon without flicker.

## 4. Web — tests

- [x] 4.1 In `apps/web/src/components/dashboard/user-menu.test.tsx`, add a scenario that mocks `useAuthMe` (or `fetchAuthMe`) to return `user.picture` and asserts an `<img>` with that `src` is rendered in the trigger.
- [x] 4.2 Add a scenario that mocks `useAuthMe` to return `user.picture: null` and asserts the `UserRound` icon is rendered instead.

## 5. Verification

- [x] 5.1 Run `pnpm --filter api test -- --run` and `pnpm --filter web test -- --run` and ensure they pass.
  - API: targeted auth tests pass (15/15 across `auth.controller.spec.ts` + `supabase-auth.guard.spec.ts`); application.service.spec.ts also passes (99/99). Full API run was blocked by `ENOSPC: no space left on device` on the dev machine (446Gi used / 466Gi). Disk clean-up required before re-running the full suite.
  - Web: targeted tests pass (16/16 across user-menu, auth-queries, security-settings).
- [x] 5.2 Run `pnpm --filter web typecheck` and `pnpm typecheck` to confirm both sides agree on the new optional field.
  - `apps/web` typecheck: passes.
  - `apps/api` typecheck: passes.
- [ ] 5.3 Manually verify in the dashboard: sign in with Google (or any OAuth that sets `avatar_url`), confirm the avatar renders in the user menu; sign out and sign back in with email/password, confirm the icon fallback renders.

## E2E test impact

- **Must pass unchanged**: existing `/auth/me` consumers (e.g. `security-settings.test.tsx`, `authenticated-entry.test.tsx`) only assert on `has_password` and email — the new `picture` field is additive and ignored by them.
- **Update required**: none — no existing E2E spec (`apps/web/e2e/`) reads `user.picture`.
- **Add**: optional — a future E2E spec in `apps/web/e2e/` could visit `/dashboard` while signed in via OAuth and assert the avatar `<img>` is in the menu, but is not required for this change to ship.
