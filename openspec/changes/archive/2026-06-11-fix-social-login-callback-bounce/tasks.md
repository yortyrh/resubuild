## 1. Root Cause Investigation

- [x] 1.1 Identified that `SessionGate` used `hasSession()` (sessionStorage mirror) instead of `useAuthSession()` (cookie-backed Supabase client) as the auth decision source
- [x] 1.2 Confirmed via runtime logs that after OAuth callback, `hasSession()` returned `false` while cookies were valid, causing redirect to `/login`
- [x] 1.3 Confirmed `useAuthenticatedEntryRedirect` on `/login` correctly reads cookies via Supabase client and bounced users back to `/dashboard`

## 2. Fix Implementation

- [x] 2.1 Replaced `hasSession()` call in `SessionGate` with `useAuthSession()` hook from `@/lib/queries/auth-queries`
- [x] 2.2 Removed `useState` + `startTransition` pattern; gate now renders `DashboardShellSkeleton` synchronously when query is pending or session absent
- [x] 2.3 Removed unused `startTransition` import
- [x] 2.4 Added explanatory comment documenting why `useAuthSession` (cookies) is used instead of `hasSession()` (sessionStorage mirror)

## 3. Testing

- [x] 3.1 Created `session-gate.test.tsx` with three cases: authenticated renders children, unauthenticated redirects to `/login`, regression pin confirming sessionStorage mirror does not override Supabase session
- [x] 3.2 Ran full web test suite: 495/496 pass (pre-existing `_env-probe.test.ts` failure unrelated to change)
- [x] 3.3 Verified fix with runtime reproduction using incognito browser: OAuth sign-in lands directly on `/dashboard` with no bounce

## E2E Test Impact

**Must pass unchanged** — `openspec/specs/e2e-testing/spec.md` does not require updates. This is a UI routing bug fix with no change to user-facing auth behavior (sessions, redirects, or guard logic beyond correcting a false-negative). The existing OAuth E2E scenarios in the e2e catalog cover sign-in flows and would exercise the fixed path.
