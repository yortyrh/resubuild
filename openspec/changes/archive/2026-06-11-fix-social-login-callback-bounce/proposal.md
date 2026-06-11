# fix-social-login-callback-bounce

## Why

After completing a GitHub or Google OAuth sign-in, the `/auth/callback` route correctly exchanges the code for a session and sets `sb-*` auth cookies, then 307-redirects to `/dashboard`. However, `SessionGate` (the dashboard route guard) used `hasSession()` — which reads the legacy `sessionStorage` mirror — to decide if the user was authenticated. On first paint of `/dashboard`, the `sessionStorage` mirror is empty because `SupabaseListener`'s async hydration runs after the gate's check. This caused a false "not authenticated" result, sending users to `/login`. The login page then correctly read the valid cookie-backed session via `useAuthSession()` and bounced them back to `/dashboard`. Every OAuth sign-in resulted in an unnecessary `/dashboard → /login → /dashboard` round-trip.

## What Changes

- `SessionGate` (`apps/web/src/components/auth/session-gate.tsx`) replaced `hasSession()` (sessionStorage mirror) with `useAuthSession()` (cookie-backed Supabase client) as the authoritative session source for route guarding.
- `SessionGate` removed the `useState` + `startTransition` pattern in favour of rendering the `DashboardShellSkeleton` synchronously when the Supabase query is pending.
- `session-gate.test.tsx` added as a co-located unit test with three cases: happy path (authenticated → children), unauthenticated redirect, and regression pin (sessionStorage mirror must not override the Supabase session).
- `authenticated-entry.tsx` was temporarily instrumented for runtime diagnosis then returned to its original state.

## Capabilities

### Modified Capabilities

- `authentication` — The `SessionGate` component is part of the SPA's authenticated-route guard system described by the `authentication` spec. The requirement that the SPA route guard correctly identifies an authenticated session after an OAuth callback is implicitly covered by the existing spec; this change is a correctness fix with no new requirement surface.

### New Capabilities

_(None — no new capabilities introduced.)_
