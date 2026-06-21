## Context

The dashboard `UserMenu` trigger (`apps/web/src/components/dashboard/user-menu.tsx`) currently renders a generic `UserRound` icon as the button affordance, regardless of who is signed in. The authenticated user already has a profile picture available server-side via Supabase `user_metadata.avatar_url` (set automatically by Google / GitHub / LinkedIn OAuth flows) — but `/auth/me` only returns `id` and `email`, so the SPA cannot render it without separately inspecting Supabase client state.

The change is small and additive: expose `picture` from `/auth/me`, mirror it in the web client's `AuthMe` type, and use it in the user menu trigger with the existing icon as fallback.

## Goals / Non-Goals

**Goals:**

- Show the authenticated user's OAuth-supplied avatar in the dashboard user menu trigger when available.
- Keep server-side source-of-truth (the validated session) for the URL so the SPA doesn't need a second round-trip to Supabase client metadata.
- Preserve current UX (icon fallback) when no avatar is available or while the auth query is still loading.

**Non-Goals:**

- Allowing users to upload or change their avatar from the dashboard (CV `basics.image` already covers that flow on a per-CV basis).
- Rendering avatars in any other dashboard surface (settings page header, etc.) — only the user-menu trigger for this change.
- Persisting or normalizing avatars (no re-hosting, no proxying) — render the OAuth-provided URL directly.
- Changing the existing `has_password` field, sign-in/sign-up flows, or token lifecycle.

## Decisions

### 1. Server-side `picture` derivation in `GET /auth/me`

**Decision:** Extend the `me` handler in `apps/api/src/auth/auth.controller.ts` to read the validated Supabase user (already attached by `SupabaseAuthGuard` after `supabase.auth.getUser`) and set `user.picture` from `user_metadata.avatar_url` ?? `user_metadata.picture`, trimmed and coerced to `null` when empty.

**Rationale:** The guard already validates the access token via `supabase.auth.getUser`; the resulting user object exposes `user_metadata` directly, so no extra Supabase call is needed. Returning the URL server-side keeps the field trustworthy (a client cannot fabricate it) and avoids each consumer reaching into Supabase client state.

**Alternatives considered:**

- _Add a separate `/auth/me/avatar` endpoint_ — rejected; adds an extra round-trip and duplicates the same auth check.
- _Expose the full `user_metadata` blob_ — rejected; leaks other provider fields (locale, `full_name`, etc.) that the SPA may not need yet, and widens the API surface area.

### 2. Reuse existing `useAuthMe` query, no new fetch

**Decision:** Add `picture` to the `AuthMe` interface in `apps/web/src/lib/api.ts`. `useAuthMe` already fetches `/auth/me` with `staleTime: 60s`; the avatar is already on the same payload — no new query, no second request.

**Rationale:** The user menu is rendered on every dashboard page; piggy-backing on the existing query keeps the menu rendering instant once `useAuthMe` resolves, with zero added network traffic for most navigations.

**Alternatives considered:**

- _Read `supabase.auth.getUser()` directly in the menu_ — rejected; the API path is the canonical source and is already in flight on mount.

### 3. Avatar rendering with icon fallback in the user menu trigger

**Decision:** In `UserMenu`, replace the static `UserRound` icon child of the trigger button with a small conditional render:

- If `useAuthMe().data?.user.picture` is a non-empty string, render an `<img>` sized to match the icon button footprint (`h-8 w-8`, `rounded-full`, `object-cover`) with the URL as `src` and a local `onError` handler that flips back to the icon.
- Otherwise, render the existing `UserRound` icon unchanged.

While the query is loading (no data yet), keep the icon to avoid layout shift.

**Rationale:** `apps/web/src/components/ui/avatar.tsx` does not exist in this codebase yet, so an inline `<img>` keeps the diff self-contained and avoids pulling in a new shadcn primitive + CSS file just for one element. The button's `size="icon"` already constrains the visual footprint to a small square, so the avatar sits where the icon used to without restyling the trigger.

**Alternatives considered:**

- _Add shadcn `Avatar` primitive_ — rejected for this change; useful if/when more dashboard surfaces need avatars, but out of scope for a single button swap.
- _Always render `Avatar` and hide the icon completely_ — rejected; a missing avatar should still show an affordance, not an empty button.

### 4. No new dependencies

**Decision:** Reuse the existing `useAuthMe` hook and render with a plain `<img>` inside the existing button. No new packages required.

**Rationale:** Keeps the diff small and avoids touching lockfiles or CI cache keys.

## Risks / Trade-offs

- **[Third-party avatar hotlinking]** → Acceptable: the existing dashboard already loads user-controlled `basics.image` URLs on the CV preview; the same trust model applies. If an avatar URL 404s or blocks hotlinking, `AvatarFallback` shows the existing icon, so the menu stays functional.
- **[Avatar URL changes mid-session]** → Cached on the `/auth/me` response with `staleTime: 60s`; if the user re-authenticates with a new provider the URL updates on next refetch. Acceptable: avatars change infrequently and the 60s window matches the rest of the auth envelope.
- **[Privacy / tracking]** → Avatars come from OAuth providers we already trust for sign-in; no new third-party is contacted on render.

## Migration Plan

1. Deploy API: `GET /auth/me` adds `user.picture` (additive field, no breaking change for existing consumers).
2. Deploy web: `useAuthMe` type extended; `UserMenu` swaps icon for avatar when present.
3. Rollback: revert either side independently; the field is optional on both ends.

## Open Questions

- None blocking. If a future change wants the avatar in other surfaces (settings page header, etc.), it can reuse `useAuthMe().data?.user.picture` without further API work.
