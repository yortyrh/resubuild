## 1. Helper module

- [x] 1.1 Add optional `requestOrigin` parameter to `getAppUrl()` / `authCallbackUrl()` / `resetPasswordCallbackUrl()` in `apps/web/src/lib/auth/app-url.ts`
- [x] 1.2 Add tests in `app-url.test.ts` covering the server-side branch (no `window`, env var unset, request origin provided)

## 2. Server route

- [x] 2.1 Update `apps/web/src/app/auth/callback/route.ts` to use `getAppUrl(request.nextUrl.origin)` for every absolute redirect (success + error)
- [x] 2.2 Add tests in `route.test.ts` proving the route redirects to `NEXT_PUBLIC_APP_URL` when set and falls back to the request origin in local dev

## 3. Spec updates

- [x] 3.1 Add new requirement + scenarios to `openspec/specs/auth-github-oauth/spec.md` documenting the server-side redirect contract
- [x] 3.2 Add new requirement + scenarios to `openspec/specs/auth-google-oauth/spec.md`
- [x] 3.3 Add new requirement + scenarios to `openspec/specs/auth-linkedin-oauth/spec.md`

## E2E test impact

None — UI-only change to an existing redirect URL contract. The e2e suite already exercises `/auth/callback`; the new contract is a stricter version of the existing assertion (request origin in local dev, env-var origin in production).
