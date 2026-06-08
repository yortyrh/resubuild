# tasks.md

## Completed tasks

- [x] Add `GithubCallbackDto` to `apps/api/src/auth/dto/auth.dto.ts`
- [x] Add `getGithubAuthUrl()` and `handleGithubCallback()` to `apps/api/src/auth/auth.service.ts`
- [x] Add `GET /auth/github` and `POST /auth/github/callback` to `apps/api/src/auth/auth.controller.ts`
- [x] Enable `[auth.external.github]` in `supabase/config.toml`
- [x] Add "Continue with GitHub" button to `apps/web/src/components/auth/login-form.tsx`
- [x] Create OAuth callback page at `apps/web/src/app/auth/callback/page.tsx` with Suspense boundary
- [x] Update `openspec/specs/authentication/spec.md` with GitHub OAuth requirement and scenarios

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth: login + /auth/me
- `local-supabase.e2e-spec.ts` — CV, media, export, template-presentation, lifecycle, sections, AI-agent, import-LLM, import-URL, MCP

### Update required

- None

### Add

- None — UI-only addition; no existing API contract changed. Existing auth E2E scenarios cover email/password login; GitHub OAuth flow requires manual provider configuration in Supabase dashboard and is tested via the UI.
