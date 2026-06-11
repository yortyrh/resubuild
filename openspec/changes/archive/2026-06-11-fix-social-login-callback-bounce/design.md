## Context

The SPA uses two session stores:

1. **Cookie-backed Supabase client** (`@supabase/ssr` `createBrowserClient`) — reads `sb-*` cookies set by `exchangeCodeForSession` on the server. Authoritative source of truth for "is the user signed in".
2. **sessionStorage mirror** (`@/lib/auth-session`) — a legacy compatibility layer for `apiFetch`, which cannot access cookies and instead reads `resubuild.access_token` from `sessionStorage`. Written asynchronously by `SupabaseListener`'s `useEffect` on mount and on every `onAuthStateChange` event.

`SessionGate` guards the `/dashboard` route. It ran `hasSession()` (checking sessionStorage mirror) on first paint. After an OAuth callback, the browser lands on `/dashboard` with valid `sb-*` cookies from the 307 redirect, but the sessionStorage mirror has not yet been hydrated — `SupabaseListener`'s `useEffect` runs asynchronously after the gate's check. `hasSession()` returned `false` → `router.replace('/login')` → user bounced.

`LoginForm` and `RegisterForm` use `useAuthenticatedEntryRedirect`, which reads `useAuthSession()` (Supabase client, cookies). They correctly identified the user as authenticated and bounced back to `/dashboard`.

## Goals / Non-Goals

**Goals:**

- Eliminate the `/dashboard → /login → /dashboard` bounce on OAuth (and magic-link) sign-in.
- Make `SessionGate` use the same authoritative session source as the login/register pages.

**Non-Goals:**

- Do not remove the sessionStorage mirror — it is still required for `apiFetch` compatibility.
- Do not change `SupabaseListener`'s hydration timing or location.
- Do not change `LoginForm`, `RegisterForm`, or `authenticated-entry` — they already use the correct source.

## Decisions

### Decision: Read session from Supabase client, not sessionStorage mirror

**Chosen approach:** `SessionGate` calls `useAuthSession()` (backed by the `@supabase/ssr` browser client, which reads `sb-*` cookies synchronously) instead of `hasSession()` (which reads `sessionStorage`).

**Alternatives considered:**

1. **Hydrate sessionStorage synchronously before SessionGate runs** — Would require making `SupabaseListener` synchronous or moving its logic higher in the React tree. Rejected: too invasive, changes the timing contract of a component used for compatibility.

2. **Remove sessionStorage check from `hasSession()` and fix only the gate** — The sessionStorage mirror is still needed for `apiFetch` compatibility. Leaving `hasSession()` as-is means it can still serve its original purpose without changes.

3. **Add a cookie-based check alongside sessionStorage** — Would add complexity and two possible sources of truth. Rejected in favour of the simplest fix: route guard should use the same source as the forms.

**Rationale:** `useAuthSession()` is already the pattern used by `authenticated-entry.tsx` for the login/register pages. It is the authoritative source. `hasSession()` is explicitly for `apiFetch` compat (it reads `sessionStorage`). Using a compat layer as the auth guard was the root cause.

## Risks / Trade-offs

- **[Risk] Dependency on `@supabase/ssr` cookie handling** — The Supabase client reads cookies synchronously. If the cookies are not sent (e.g. SameSite=Strict misconfiguration), this would break the gate. **Mitigation:** Same cookies power the entire login/register auth flow, so any breakage would be immediately visible there. No new surface area introduced.

- **[Risk] `staleTime: Infinity` in `useAuthSession`** — The session query never refetches automatically. **Mitigation:** `SupabaseListener` calls `onAuthStateChange` and mirrors to sessionStorage; a sign-out event clears the stored session, which is picked up by the gate on next navigation.

- **[Trade-off] The skeleton now renders while the query resolves** — Before the fix, `SessionGate` showed the skeleton then immediately redirected. Now it shows the skeleton while `useAuthSession` resolves (a fast synchronous read). The net effect is identical from the user's perspective — no visible content until auth is confirmed.

## Migration Plan

No migration required. This is a component-internal fix with no API, schema, or environment changes. The fix is fully contained within `session-gate.tsx` and covered by new unit tests.
