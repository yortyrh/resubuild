## Why

Users increasingly expect social login options beyond email. LinkedIn is a widely-used professional identity provider that many users prefer for work-related applications. Adding LinkedIn OAuth follows the same pattern already established with GitHub OAuth, providing a consistent authentication experience.

## What Changes

- Add "Continue with LinkedIn" button to `/login` and `/register` pages (behind feature flag)
- Add `signInWithLinkedIn()` helper in `apps/web/src/lib/auth/oauth.ts`
- Configure Supabase LinkedIn external provider in `supabase/config.toml`
- Add feature flag `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED`
- Add local env stubs for `LINKEDIN_OAUTH_CLIENT_ID` and `LINKEDIN_OAUTH_SECRET` in `supabase/.env`

## Capabilities

### New Capabilities

- `auth-linkedin-oauth`: LinkedIn OpenID Connect OAuth flow via Supabase Auth, following the same patterns as the existing `auth-github-oauth` capability

### Modified Capabilities

- `auth-feature-flags`: Add `linkedin_oauth` to the auth feature flags spec

## Impact

- `apps/web`: New OAuth helper and UI changes
- `supabase/config.toml`: New LinkedIn provider configuration
- `supabase/.env`: New environment variable stubs
- Feature flag infrastructure
