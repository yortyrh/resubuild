## Context

`apps/web/src/app/auth/callback/route.ts` is the Next.js server route handler that exchanges the Supabase PKCE code for a session and then issues a 302 to the post-login destination (or an error redirect to `/login?error=…`). The route runs **on the server**, so it cannot read `window.location.origin`. Until now it built its absolute redirects with `request.nextUrl.origin`.

In production (Docker container, possibly behind a reverse proxy), the request that hits the Next.js server often comes in via the internal container port — e.g. `http://localhost:8080` for `WEB_PORT=8080`. The route's 302 to `<requestOrigin>/dashboard` therefore puts `http://localhost:8080` in the browser's address bar, which is wrong from a user-facing perspective (bookmarks, share links, refresh behavior all break) and was the source of the "still redirected to https://localhost:8080/dashboard" report after the client-side `NEXT_PUBLIC_APP_URL` fix.

The previous change (add-next-public-app-url) added `getAppUrl()` to centralize origin resolution, but the helper was designed for the **client bundle** (with a `window.location.origin` fallback). On the server, with no `window`, the helper returned the empty string, which was not what the route needed.

## Goals / Non-Goals

**Goals:**

- The `/auth/callback` route's post-exchange redirect and error redirect both land on the public origin in production.
- Local development continues to work with `NEXT_PUBLIC_APP_URL` unset (the helper falls back to the request's apparent origin).

**Non-Goals:**

- This change does not introduce a new capability — it only fixes the derivation of an existing URL.
- This does not change the **client-side** `redirectTo` behavior (already fixed in add-next-public-app-url).
- This does not introduce a Trust-Proxy / X-Forwarded-Host awareness layer; using `NEXT_PUBLIC_APP_URL` is the explicit, declarative way to set the public origin.

## Decisions

### 1. Add an optional `requestOrigin` parameter to `getAppUrl()` (and its `authCallbackUrl` / `resetPasswordCallbackUrl` siblings)

**Decision:** `getAppUrl(requestOrigin?: string): string`. On the server (no `window`), if `NEXT_PUBLIC_APP_URL` is unset and the caller passes a `requestOrigin`, return that (with trailing slash stripped). This keeps the helper pure while letting the server route hand in the only origin it actually knows.

**Rationale:** Avoids introducing a new function or a separate server-side helper. Reuses the same precedence rules across client and server. Tests cover both branches.

**Alternatives considered:**

- New `getServerAppUrl(request)` helper — duplicates logic and would diverge over time.
- Hardcode `NEXT_PUBLIC_APP_URL` reads in the route — leaks origin-resolution knowledge into route code and bypasses the central helper.
- Trust the `X-Forwarded-Host` header when `NEXT_PUBLIC_APP_URL` is unset — adds trust-proxy complexity and can be spoofed if the proxy isn't configured. Defer until the team confirms a reverse-proxy topology.

### 2. Server route uses `getAppUrl(request.nextUrl.origin)` for **every** absolute redirect

**Decision:** Both the success redirect (`new URL(next, getAppUrl(request.nextUrl.origin))`) and the error redirect (`new URL('/login', getAppUrl(request.nextUrl.origin))`) go through the helper. No `request.nextUrl.origin` reference remains in the file.

**Rationale:** Consistency. A future change to one redirect should follow the same pattern; making them all use the helper is the lowest-friction way to keep them aligned.

**Alternatives considered:**

- Only fix the success redirect — error redirects are less frequent but a user who hits a GitHub error and ends up at `http://localhost:8080/login?error=…` is just as bad.

## Risks / Trade-offs

| Risk                                                                                               | Mitigation                                                                                                                                               |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` left blank in `.env.prod` → user lands on `http://localhost:8080`            | Document the requirement in the env generator and the docker-compose comments; CI/CD should fail-fast if the var is empty when the target is not `local` |
| `request.nextUrl.origin` differs from the public host (no reverse proxy, no `NEXT_PUBLIC_APP_URL`) | Documented in design — the operator must set `NEXT_PUBLIC_APP_URL` whenever the request origin is not the public origin                                  |

## Migration Plan

1. **No DB migration.** Pure code change.
2. **Deploy.** The new `getAppUrl(requestOrigin)` API is additive — any caller that doesn't pass the arg keeps the previous behavior. The route is the only caller and is updated atomically.
3. **Verify** by hitting `/auth/callback` in production with `NEXT_PUBLIC_APP_URL` set and confirming the address bar shows the public origin.
4. **Rollback** by reverting the commit; the helper signature is forward-compatible (the parameter is optional).
