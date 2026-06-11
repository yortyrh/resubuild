## REMOVED Requirements

### Requirement: GitHub and Google OAuth MUST NOT be supported

**Reason**: This requirement has been split. The "Google OAuth MUST NOT be supported" half is moved to the `web-application` spec (which documents the build-time `NEXT_PUBLIC_*` feature-flag mechanism, including a scenario that asserts no "Continue with Google" button is rendered on `/login` and that Google provider endpoints are not exposed). The "GitHub OAuth MUST NOT be supported" half is replaced by the new `auth-github-oauth` spec, which now permits and constrains GitHub OAuth as a build-time-flagged sign-in option. The spec language "MUST NOT be supported" no longer reflects the product surface after the `add-github-login` change lands.

**Migration**: No migration is required at the application level. Operators who do not want GitHub OAuth in a given environment simply set `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED=false` (or leave it unset) in `apps/web/.env`; the button does not render. The `supabase/config.toml` `[auth.external.github]` block is `enabled = true` regardless — operators who do not want the provider live in a given environment simply do not supply real `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_SECRET` to the Supabase project, and `signInWithOAuth` will fail closed with a "Sign-in failed" toast.
