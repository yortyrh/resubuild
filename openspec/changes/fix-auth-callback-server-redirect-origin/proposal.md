## Why

The previous change (add-next-public-app-url) fixed the **client-side** `redirectTo` value sent to Supabase when kicking off OAuth and magic-link flows, but the **server-side** `/auth/callback` route still constructs its absolute redirects (to `/dashboard` and `/login?error=…`) from `request.nextUrl.origin`. In Docker, the request that hits the Next.js server appears to come from the internal container address — e.g. `http://localhost:8080` (the WEB_PORT) — so the browser gets redirected to `http://localhost:8080/dashboard` and the address bar shows the internal origin instead of the public URL.

## What Changes

- `getAppUrl()` (and its `authCallbackUrl` / `resetPasswordCallbackUrl` siblings) now accept an optional `requestOrigin` parameter. On the server, when `NEXT_PUBLIC_APP_URL` is unset, the function returns the caller-provided request origin (with trailing-slash stripped) instead of the empty string. This keeps local dev working without `NEXT_PUBLIC_APP_URL` and gives the `/auth/callback` route a single helper to call from the server.
- The `/auth/callback` server route handler now uses `getAppUrl(request.nextUrl.origin)` for every absolute redirect it constructs (success redirect to `/dashboard`, error redirects to `/login?error=…`). `NEXT_PUBLIC_APP_URL` continues to take precedence over the request origin.
- Add new tests in `route.test.ts` proving the redirect targets land on the public origin in production and on the request origin in local dev.
- Add new tests in `app-url.test.ts` covering the server-side branch (no `window`, env var unset, request origin provided).

## Capabilities

### New Capabilities

None — this is an implementation detail of the existing three OAuth capabilities.

### Modified Capabilities

- `auth-github-oauth`: A new requirement documents that the `/auth/callback` server route redirects to the public origin (via `NEXT_PUBLIC_APP_URL`) after a successful code exchange and on provider errors.
- `auth-google-oauth`: Same delta as auth-github-oauth.
- `auth-linkedin-oauth`: Same delta as auth-github-oauth.

## Impact

- `apps/web/src/lib/auth/app-url.ts`: `getAppUrl(requestOrigin?)`, `authCallbackUrl(requestOrigin?)`, `resetPasswordCallbackUrl(requestOrigin?)` — additive parameter.
- `apps/web/src/lib/auth/app-url.test.ts`: new tests for the server-side branch.
- `apps/web/src/app/auth/callback/route.ts`: every absolute redirect now uses `getAppUrl(request.nextUrl.origin)` instead of `request.nextUrl.origin`.
- `apps/web/src/app/auth/callback/route.test.ts`: new tests covering the production-redirect bug fix.
- `openspec/specs/auth-github-oauth/spec.md`, `auth-google-oauth/spec.md`, `auth-linkedin-oauth/spec.md`: new requirements + scenarios documenting the server-side redirect contract.
