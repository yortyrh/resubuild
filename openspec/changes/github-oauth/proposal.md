# proposal.md

## What

Add GitHub OAuth as a social login provider via Supabase Auth, enabling users to sign in with their GitHub account alongside existing email/password authentication.

## Why

Users prefer social login options. GitHub OAuth is a common choice for developer-focused applications and reduces friction during sign-up by eliminating password requirements.

## What Changes

### Added

- `apps/api/src/auth/auth.dto.ts` — `GithubCallbackDto` class for code exchange validation
- `apps/api/src/auth/auth.service.ts` — `getGithubAuthUrl()` and `handleGithubCallback()` methods using `supabase.auth.signInWithOAuth` and `supabase.auth.exchangeCodeForSession`
- `apps/api/src/auth/auth.controller.ts` — `GET /auth/github` returns Supabase OAuth URL; `POST /auth/github/callback` exchanges code for session tokens
- `supabase/config.toml` — `[auth.external.github]` provider enabled
- `apps/web/src/components/auth/login-form.tsx` — "Continue with GitHub" button above email/password form
- `apps/web/src/app/auth/callback/page.tsx` — OAuth callback page that exchanges code and redirects to dashboard
- `openspec/specs/authentication/spec.md` — Added GitHub OAuth requirement with scenarios

## Capabilities

### Authentication (`openspec/specs/authentication/spec.md`)

**Modified:** Added `### Requirement: The API MUST expose GitHub OAuth authentication backed by Supabase Auth`

Three new scenarios:

- `GET /auth/github` initiates OAuth flow returning a Supabase-generated URL
- `POST /auth/github/callback` exchanges authorization code for token material
- Error case returns `401` with generic message on failure

No breaking changes to existing auth endpoints.
