## 1. Helper module

- [x] 1.1 Create `apps/web/src/lib/auth/app-url.ts` exporting `getAppUrl()`, `authCallbackUrl()`, and `resetPasswordCallbackUrl()`
- [x] 1.2 Create `apps/web/src/lib/auth/app-url.test.ts` covering `NEXT_PUBLIC_APP_URL` precedence and `window.location.origin` fallback

## 2. Consumer updates

- [x] 2.1 Update `apps/web/src/lib/auth/oauth.ts` — replace inline `redirectTo` derivations with `authCallbackUrl()`
- [x] 2.2 Update `apps/web/src/lib/auth/oauth.test.ts` — mock `authCallbackUrl` from `app-url.ts`
- [x] 2.3 Update `apps/web/src/lib/queries/auth-mutations.ts` — replace local `callbackUrl`/`resetPasswordUrl` helpers with imports from `app-url.ts`

## 3. Environment and Docker

- [x] 3.1 Add `NEXT_PUBLIC_APP_URL` to `apps/web/.env.example` (empty value, triggers fallback in local dev)
- [x] 3.2 Add `ARG NEXT_PUBLIC_APP_URL` / `ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL` to `apps/web/Dockerfile`
- [x] 3.3 Add `NEXT_PUBLIC_APP_URL` build arg to `docker-compose.prod.yml` web service with comment about Supabase allowlist

## 4. Production env generator

- [x] 4.1 Add `NEXT_PUBLIC_APP_URL` to `MANIFEST_SCHEMA` in `scripts/lib/env-prod-schema.mjs` (group: `Web`, required: false)
- [x] 4.2 Add to `TARGETED_PUBLIC_URL_KEYS` for correct defaults (`docker-compose`: `http://localhost:3000`; `railway`: `https://app.resubuild.dev`)
- [x] 4.3 Add to `Web` group in `serializeToDotenv` output

## 5. Spec updates

- [x] 5.1 Update `openspec/specs/auth-github-oauth/spec.md` to document `process.env.NEXT_PUBLIC_APP_URL` + fallback derivation
- [x] 5.2 Update `openspec/specs/auth-google-oauth/spec.md` to document `process.env.NEXT_PUBLIC_APP_URL` + fallback derivation
- [x] 5.3 Update `openspec/specs/auth-linkedin-oauth/spec.md` to document `process.env.NEXT_PUBLIC_APP_URL` + fallback derivation

## E2E test impact

None — UI-only change; OAuth redirect URL is an implementation detail tested by existing integration tests.
