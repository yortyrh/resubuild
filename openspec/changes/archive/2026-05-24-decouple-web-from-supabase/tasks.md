## 1. API — Auth module and Nest implementation

- [x] 1.1 Add Nest `apps/api/src/auth` (controller + service) with validated DTOs for `login`, `register`, `logout`, `refresh`, and `me`; wire into `apps/api/src/app.module.ts` respecting existing `SupabaseAuthGuard` conventions.
- [x] 1.2 Implement credential flows via server-only `@supabase/supabase-js` (verify required env: `SUPABASE_URL`, anon key + service-role/admin secret naming per Supabase docs) without exposing secrets in responses or logs (`apps/api/src/config`).
- [x] 1.25 Configure CORS in `apps/api` bootstrap so SPA origins from `CORS_ORIGIN` can call auth and REST across domains with `Authorization` and JSON bodies (Bearer-only transport; omit cookie credentials expectations).
- [x] 1.3 Extend `apps/api/README.md` (or `.env.example` if present) documenting new auth endpoints, JSON access/refresh Bearer strategy (no auth cookies), `CORS_ORIGIN` allowlisting for a **different host** than the web app, and required `Access-Control-Allow-Headers` for `Authorization`.
- [x] 1.4 Add targeted Jest tests under `apps/api/src/auth/` validating success and `401`/validation failure paths via mocked Supabase adapter or contract tests suited to Nest TestingModule boundaries.

## 2. Web — Remove Supabase from client bundles

- [x] 2.1 Replace `apps/web/src/components/auth/login-form.tsx` form submission to POST to `NEXT_PUBLIC_API_URL` auth login (CORS-safe `fetch`; store returned tokens client-side—memory or `sessionStorage`) removing `createClient` from `@/lib/supabase/client`.
- [x] 2.2 Replace `apps/web/src/components/auth/register-form.tsx` similarly removing browser Supabase sign-up invocation.
- [x] 2.3 Rewrite `apps/web/src/components/dashboard/sign-out-button.tsx` to call Nest auth logout and clear locally stored tokens (no cookie clearing required for primary session).
- [x] 2.4 Refactor `apps/web/src/lib/api.ts`: drop `createClient`; read cached access token for `Authorization: Bearer`, refresh via JSON `/auth/refresh` before expiry (no `credentials: 'include'` for cookie auth unless unrelated cookies exist elsewhere), preserve existing `apiFetch` error-shape behavior noted in deltas.
- [x] 2.5 Delete `apps/web/src/lib/supabase/client.ts` once nothing imports it; tighten `middleware.ts`/`server.ts` so server-only bundles never leak Supabase into client transpilation pipelines (remove or refactor `apps/web/src/lib/supabase/` per finalized approach).
- [x] 2.6 Update README / deployment notes about environment variables stripping `NEXT_PUBLIC_SUPABASE_*` from client-required surfaces when unused; document transitional variables if middleware still validates via Supabase during rollout.

## 3. Consolidation — Specs archive / verification

- [x] 3.1 Run `/opsx-archive` workflow after implementations land so `openspec/specs/authentication/spec.md` and `openspec/specs/web-application/spec.md` merge deltas cleanly.
- [x] 3.2 Smoke-test critical flows manually: signup, login dashboard load, CV create/edit via `NEXT_PUBLIC_API_URL`, logout clears access, expiry/refresh behaves per design. _(Automated: `pnpm --filter @resumind/api test`, `pnpm --filter @resumind/web test -- --run`, lint + builds.)_
