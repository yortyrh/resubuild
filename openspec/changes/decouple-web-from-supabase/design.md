## Context

Today `apps/web` uses `@supabase/ssr` (`createBrowserClient`) in `'use client'` modules for login, register, logout, and to read/refresh tokens in `src/lib/api.ts`. The Nest guard in `apps/api` already validates Supabase JWTs for CV routes—but auth *lifecycle* and token refresh live in the browser against Supabase, duplicating planes of control.

## Goals / Non-Goals

**Goals:**

- Eliminate Supabase SDK usage from interactive React bundles (`'use client'`) while preserving authenticated access to Nest-protected REST.
- Consolidate signup, login, logout, refresh, and “who am I” semantics in `apps/api` so the browser talks to Nest over HTTP with **explicit CORS** when the frontend and API use different origins (no reliance on SameSite cookies for auth).
- Keep Postgres + RLS and Supabase Auth as infra the API integrates with server-side (`@supabase/supabase-js`, service-role or documented Admin patterns), not as a client-visible dependency.

**Non-Goals:**

- Replacing Supabase Auth entirely or rewriting identity storage outside Supabase Postgres.
- Changing JSON Resume modeling, `packages/schemas`, or unrelated dashboard routing (unless required mechanically for redirects after auth responses).
- Client-side realtime/Supabase subscriptions (currently out of scope for this redesign).

## Decisions

1. **API owns credential flows.** Nest exposes explicit auth routes (exact paths to be finalized in implementation: e.g. `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`) that encapsulate validation, auditing hooks, error mapping, and calls to Supabase Auth **from the Node process only**.  
   *Alternatives rejected:* Thin “proxy-only” Nest routes—still concentrates policy in Nest but hides Supabase URLs from the browser—the choice here is identical outcome with clearer ownership of validation DTOs in Nest.

2. **Delivery of credentials to the browser (no cookies).** Auth responses **SHALL** return token material in JSON (for example short-lived **access token** plus **refresh token**, exact field names finalized in implementation). The SPA SHALL hold tokens in **`memory`/`sessionStorage` only**, send the access token as `Authorization: Bearer`, and exchange the refresh token on `POST /auth/refresh`; **cookies (including HttpOnly)** are **out of scope** for this architecture to keep cross-domain simple and avoid CSRF/token transport via `Set-Cookie`. Document the trade-off: XSS can exfiltrate refresh material—mitigate with **short access TTL**, **refresh rotation/revocation story as feasible**, **CSP**, and reduced `dangerouslySetInnerHTML`/unsanitized HTML.

3. **`apps/web` client surface + CORS.** Forms and `src/lib/api.ts` call **`NEXT_PUBLIC_API_URL` on whichever host the API deploys** (same or different subdomain). Nest **SHALL** allowlist browser origins via `CORS_ORIGIN` (comma-separated if needed); with **header-only Bearer** auth, **`Access-Control-Allow-Origin`** can mirror the requesting origin **without `credentials`**, simplifying wildcard-free allows. Middleware and server components MAY use `@supabase/ssr` temporarily during migration—but **migration target state** deletes client `createBrowserClient` and avoids shipping Supabase keys to `'use client'`.

4. **Existing guard.** Retain Bearer validation against Supabase `getUser` (or equivalently JWKS JWT verify if later optimized) unchanged in spirit; issuance path moves so tokens always originate server-side responses from new auth controllers.

5. **Next.js layering.** **Avoid** Next.js Route Handlers for auth transport: the browser calls the API **directly** with CORS. Route Handlers MUST NOT implement password checks; if a future edge case requires a server-only hop, it remains **business-logic-free** (no branching beyond passthrough)—not preferred for Resumind’s cross-domain deployment.

## Risks / Trade-offs

- **[Risk]** Token theft via XSS (refresh/access in JS-accessible storage) → **Mitigation:** Short-lived access tokens, CSP, minimal third-party scripts, sanitization discipline; optionally server-side refresh token binding or rotation in later hardening passes.
- **[Risk]** CORS misconfiguration blocking auth or widening origins too far. → **Mitigation:** Strict allowlist (`CORS_ORIGIN`), expose only needed methods/headers (`Authorization`, `Content-Type`), document local dev pairing (`NEXT_PUBLIC_WEB_ORIGIN`-style symmetry if validating redirect URLs separately).
- **[Risk]** Supabase SDK version drift Admin vs JWKS endpoints. → **Mitigation:** Single Nest `@supabase/supabase-js` instance with env-tested integration tests.
- **[Risk]** Larger API surface exposed to internet. → **Mitigation:** Rate-limit auth routes (Nest Throttler or reverse proxy); consistent error payloads without user enumeration leaks.

## Migration Plan

1. Implement Nest auth routes with feature flag or dual-mode window (temporary: accept legacy Bearer-from-client-Supabase and new issuance) optional—prefer **sharp cut behind a deploy checklist** once web updated.
2. Replace web forms + `api.ts` credential acquisition with direct Nest auth calls storing JSON tokens client-side + `Authorization` on CV requests.
3. Remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` from client-required env documentation if no longer referenced in client bundles; keep server-only vars in `apps/api` and optionally `apps/web` server-only middleware during transition.
4. Rollback: revert web to prior Supabase client commit and keep API compat if dual-mode was used briefly.

## Open Questions

- Whether refresh tokens are **opaque server-stored** vs **JWT**, and rotation policy on refresh.
- Whether `GET /auth/me` aggregates profile fields beyond JWT claims immediately or in a follow-up.
- Throttle limits distinct per-route (`/auth/login` vs `/auth/register`).

