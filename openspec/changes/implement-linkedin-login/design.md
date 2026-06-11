## Context

The `auth-github-oauth` spec established the pattern for social login via Supabase OAuth. LinkedIn OAuth will follow this exact pattern with minimal variation, reusing the existing `/auth/callback` page and the `SupabaseAuthGuard` in the API.

## Goals / Non-Goals

**Goals:**

- Add LinkedIn as a social login provider alongside GitHub
- Reuse existing callback infrastructure (`/auth/callback`)
- Follow existing OAuth helper pattern in `apps/web/src/lib/auth/oauth.ts`
- Configure Supabase LinkedIn provider with environment variable secrets

**Non-Goals:**

- Creating a new API endpoint for LinkedIn (the existing guard handles all providers)
- Modifying the `SupabaseAuthGuard` (provider-agnostic by design)
- Supporting LinkedIn-specific profile data extraction (Supabase handles token exchange)

## Decisions

### Decision: Use OpenID Connect flow via Supabase

LinkedIn's OAuth implementation via Supabase Auth uses OpenID Connect under the hood. The Supabase client handles the PKCE flow automatically.

**Rationale:** Same approach as GitHub OAuth. Supabase abstracts provider-specific details.

**Alternatives:**

- Direct LinkedIn OAuth implementation: Rejected — would bypass Supabase Auth and require custom token validation
- Magic link only: Rejected — user request specifically asks for LinkedIn login

### Decision: Feature flag `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED`

Mirrors the GitHub OAuth feature flag pattern.

**Rationale:** Allows staged rollout and testing without deployment.

### Decision: Environment variable stubs in `supabase/.env`

Following the established pattern from `auth-github-oauth`.

**Rationale:** `supabase start` fails without these values. Stubs allow local development to proceed.

## Risks / Trade-offs

- [Risk] LinkedIn OAuth app approval: LinkedIn requires app review for certain permissions (email, profile). → Mitigation: Start with basic profile scope, add scopes as needed for specific features.
- [Risk] Inconsistent user experience if LinkedIn button behaves differently from GitHub button → Mitigation: Follow exact same implementation pattern as GitHub OAuth helper.
