## Context

The web app uses `window.location.origin` to construct the Supabase `redirectTo` and `emailRedirectTo` URLs for OAuth flows and magic-link/password-reset emails. In production (Docker container behind a reverse proxy), `window.location.origin` resolves to the internal container address (`http://localhost:8080`), which is not registered in Supabase's `additional_redirect_urls` allowlist, causing OAuth redirects to fail.

The API already has a similar pattern via `PUBLIC_API_URL`. The web app needs the equivalent mechanism for its client-side bundle.

## Goals / Non-Goals

**Goals:**

- Supabase `redirectTo` / `emailRedirectTo` URLs always point to the publicly accessible origin in every environment.
- Local development continues to work without any env var set, using `window.location.origin` as the fallback.

**Non-Goals:**

- This does not change how Supabase sessions are stored or validated.
- This does not introduce a new capability — it only fixes the derivation of an existing URL.

## Decisions

### 1. New `NEXT_PUBLIC_APP_URL` env var with `window.location.origin` fallback

**Decision:** Introduce `NEXT_PUBLIC_APP_URL` as a build-time env var (prefixed `NEXT_PUBLIC_` so Next.js inlines it at build time). When unset, fall back to `window.location.origin` at runtime.

**Rationale:** `NEXT_PUBLIC_` vars are the standard Next.js mechanism for client-side env vars. Fallback to `window.location.origin` preserves zero-config local development. `PUBLIC_API_URL` on the API follows the same pattern.

**Alternatives considered:**

- `APP_URL` without `NEXT_PUBLIC_` prefix — would not be inlined by Next.js, defeating the purpose.
- Always require the env var — breaks local dev DX with no benefit.

### 2. Central helper module `apps/web/src/lib/auth/app-url.ts`

**Decision:** Export `getAppUrl()`, `authCallbackUrl()`, and `resetPasswordCallbackUrl()` from a single module. All auth code (`oauth.ts`, `auth-mutations.ts`) calls these helpers instead of constructing URLs inline.

**Rationale:** Centralizes the fallback logic in one place. If the fallback strategy changes again, only this file needs updating.

**Alternatives considered:**

- Inline the logic in each caller — violates DRY and makes the fallback hard to maintain.
- Put helpers in existing `oauth.ts` — mixes redirect URL construction with OAuth protocol logic.

### 3. Build-arg passthrough in Dockerfile and docker-compose.prod.yml

**Decision:** `docker-compose.prod.yml` passes `NEXT_PUBLIC_APP_URL` as a build arg to the web service; the web `Dockerfile` declares `ARG NEXT_PUBLIC_APP_URL` and `ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL` so Next.js sees it during the build.

**Rationale:** Next.js bakes `NEXT_PUBLIC_` vars into the client bundle at build time. The var must be present during `next build` inside the container, not just at runtime. This is standard Next.js Docker practice.

**Alternatives considered:**

- Runtime `ENV` only — Next.js has already baked the bundle by runtime; the var would not be inlined.
- `.env` file baked into image — checked into source control risks leaking; build args are ephemeral per deploy.

## Risks / Trade-offs

| Risk                                                                                       | Mitigation                                                                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` set incorrectly in production (trailing slash, wrong domain)         | Trailing slash stripped in `getAppUrl()`; CI/CD pipeline should validate the value against Supabase allowlist |
| Developer forgets to register `NEXT_PUBLIC_APP_URL` in Supabase `additional_redirect_urls` | Comment in `.env.example` and `docker-compose.prod.yml` remind operators to update Supabase dashboard         |

## Migration Plan

1. **Deploy** `NEXT_PUBLIC_APP_URL` must be set as a build arg in CI/CD before deploying the new image.
2. **Supabase dashboard** Operator must add the public URL to `additional_redirect_urls` before social login works in production.
3. **Rollback** Revert to the previous image; no database migration required.
