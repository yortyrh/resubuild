## Why

In production, social-login and magic-link flows compute `redirectTo` from `window.location.origin`. When the Next.js app is accessed through an unexpected origin (e.g. `http://localhost:8080` inside a Docker container or via a reverse-proxy port), the OAuth provider redirects back to that origin instead of the registered public URL, causing failures because the Supabase project's `additional_redirect_urls` allowlist does not include the non-public origin.

## What Changes

- Add `NEXT_PUBLIC_APP_URL` env var to the web app: a build-time-resolved public origin used to build all Supabase OAuth `redirectTo` and `emailRedirectTo` values.
- Add a new `getAppUrl()` / `authCallbackUrl()` / `resetPasswordCallbackUrl()` helper in `apps/web/src/lib/auth/app-url.ts`.
- Replace all `window.location.origin` derivations in `oauth.ts` and `auth-mutations.ts` with the new helper.
- Wire `NEXT_PUBLIC_APP_URL` through the web Dockerfile build-arg, docker-compose.prod.yml, and the production env generator (`scripts/lib/env-prod-schema.mjs`).
- Update the three OAuth specs (auth-github-oauth, auth-google-oauth, auth-linkedin-oauth) to document the new env-var override behavior.

## Capabilities

### New Capabilities

None — this is an implementation detail of three existing capabilities.

### Modified Capabilities

- `auth-github-oauth`: The `redirectTo` base URL is now derived from `process.env.NEXT_PUBLIC_APP_URL` (falls back to `window.location.origin` in local dev). The existing requirement stands; only the derivation method changes.
- `auth-google-oauth`: Same delta as auth-github-oauth.
- `auth-linkedin-oauth`: Same delta as auth-github-oauth.

## Impact

- `apps/web`: new `app-url.ts` helper, updated `oauth.ts` and `auth-mutations.ts`, new env var `NEXT_PUBLIC_APP_URL` in `.env.example` and `.env`
- `docker-compose.prod.yml`: new build arg `NEXT_PUBLIC_APP_URL`
- `apps/web/Dockerfile`: new build arg and `ENV` for `NEXT_PUBLIC_APP_URL`
- `scripts/lib/env-prod-schema.mjs`: new manifest key in schema, serialize, and target defaults
- `openspec/specs/auth-github-oauth/spec.md`, `auth-google-oauth/spec.md`, `auth-linkedin-oauth/spec.md`: updated `redirectTo` derivation contract
