## Why

The Next.js UI currently couples business concerns to Supabase by using the browser client for sign-in, sign-up, sign-out, and session lifecycle. That splits auth flows across two planes (Supabase SDK in the browser vs Nest elsewhere) and makes it harder to evolve policy, auditing, or alternative identity backends in one place. Centralizing those flows behind `apps/api` keeps React as a presentation shell that speaks only HTTP to the owning backend.

## What Changes

- Remove direct `@supabase/ssr` / browser Supabase usage from `apps/web` for authentication and token handling.
- Implement user-facing authentication operations (session establishment, renewal, logout, and any supporting “who am I” checks) as business logic owned by `apps/api` **BREAKING** for any client that currently assumes browser Supabase session APIs.
- Rework `apps/web` to obtain credentials strictly via JSON responses from `NEXT_PUBLIC_API_URL` **over CORS when the UI and API differ by hostname**, holding access/refresh material client-side (**no auth cookies**), without exposing Supabase anon keys to interactive bundles for auth (**BREAKING** for environments relying on today’s solely client-side Supabase session).
- Narrow `apps/web` Supabase footprint to infra only where unavoidable (e.g. optional server-only libs for migration windows); target state is zero Supabase imports in client components.

## Capabilities

### New Capabilities

- _(none — behavior is folded into capability updates below)_

### Modified Capabilities

- `web-application`: Replace the requirement that the SPA uses the browser Supabase client for sessions and Bearer acquisition with requirements that the web app uses only backend-defined HTTP endpoints on `NEXT_PUBLIC_API_URL` behind **explicit CORS** (no cookie-based auth façade) so React never calls Supabase for auth lifecycle.
- `authentication`: Extend so `apps/api` owns end-user credential flows—while protected routes MAY still validate Supabase-issued JWTs internally if the API obtains them via server-side Auth—explicitly forbidding reliance on browsers calling Supabase Auth directly.

## Impact

- **apps/web**: `src/lib/supabase/client.ts`, auth forms (`login`, `register`), `sign-out-button`, `middleware`, `server.ts` helpers, env (`NEXT_PUBLIC_SUPABASE_*` usage in client bundles), and `src/lib/api.ts` token acquisition all need revisiting or replacement.
- **apps/api**: New or extended Nest modules/controllers for login, registration, logout, refresh, session; Supabase Auth Admin/server APIs only inside the Nest process; **JSON Bearer/refresh issuance** coordinated with **`CORS_ORIGIN`** (no cookie-based session transport).
- **Dependencies**: Reduced `@supabase/ssr` dependence in web bundles; `@supabase/supabase-js` may remain api-only or move behind server boundaries only.
- **Deployment / DX**: Secrets confined to api; **origin allowlisting** (`CORS_ORIGIN`) so the SPA on another domain may call Nest with `Authorization: Bearer`; XSS/CSP posture documented because tokens live in JS-accessible storage instead of HttpOnly cookies.
