## Why

The dashboard user-menu button always renders a generic `UserRound` icon, even when the authenticated user has a profile picture available from their OAuth provider (Google, GitHub, LinkedIn) via Supabase's `user_metadata.avatar_url`. Showing that picture personalizes the dashboard chrome and matches what users expect from any modern app — the avatar they see in the OAuth consent screen is the same one they should see in their own product.

## What Changes

- Extend `GET /auth/me` to include `user.picture` (URL string or `null`) sourced from the authenticated user's Supabase `user_metadata` (`avatar_url` / `picture`), so the SPA has a single server-validated source of the avatar instead of reaching into Supabase client metadata directly.
- Mirror the field in the web client's `AuthMe` type and `useAuthMe` query (`apps/web/src/lib/api.ts`, `apps/web/src/lib/queries/auth-queries.ts`).
- Replace the `UserRound` icon in the `UserMenu` trigger button (`apps/web/src/components/dashboard/user-menu.tsx`) with the user's picture when present (small round avatar via inline `<img>`, `object-cover`, button-sized), falling back to the existing `UserRound` icon when absent, when image load fails, or while the query is loading.
- Add a colocated test asserting the avatar renders when `fetchAuthMe` resolves with a `picture` URL and the icon fallback otherwise.

## Capabilities

### New Capabilities

<!-- None — extends existing authentication and dashboard user-menu -->

### Modified Capabilities

- `authentication`: `/auth/me` MUST return `user.picture` (URL string or `null`) sourced from the authenticated Supabase user's `user_metadata.avatar_url` (falling back to `picture`) so the SPA can render the avatar without reaching into Supabase client metadata.

## Impact

- **API**: `apps/api/src/auth/auth.controller.ts` (`me` handler), `apps/api/src/auth/session.types.ts` (`AuthMeResponse.user` gains `picture?: string | null`), `apps/api/src/auth/auth-user.types.ts` (`AuthUser` gains `userMetadata?`), and `apps/api/src/auth/supabase-auth.guard.ts` (attach `userMetadata` after `supabase.auth.getUser`).
- **API unit tests**: `apps/api/src/auth/auth.controller.spec.ts` gains 4 scenarios (avatar_url, legacy picture, missing metadata, empty string); `apps/api/src/auth/supabase-auth.guard.spec.ts` "Valid token" scenario updated to assert `userMetadata` is attached.
- **Web**: `apps/web/src/lib/api.ts` (`AuthMe.user.picture?`), `apps/web/src/lib/queries/auth-queries.ts` (consolidate duplicate `AuthMe` by re-exporting from `@/lib/api`), and `apps/web/src/components/dashboard/user-menu.tsx` (read `useAuthMe()`, render avatar `<img>` with `onError` fallback to `UserRound` icon).
- **Web tests**: `apps/web/src/components/dashboard/user-menu.test.tsx` gains 2 scenarios (avatar renders, fallback renders) and adds `afterEach(cleanup)`.
- **No schema, storage, or new dependencies** — purely additive fields, a guard attachment, and a UI swap.
