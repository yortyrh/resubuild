# auth-feature-flags Specification

## MODIFIED Requirements

### Requirement: Auth feature flags MUST be resolved client-side at build time

The web SPA SHALL resolve the authentication feature flags directly from
`process.env.NEXT_PUBLIC_*` environment variables, via
`apps/web/src/lib/auth/features.ts`. The four flags are:

- `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED`
- `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED`
- `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED`
- `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED`

Each value is interpreted as a strict boolean: only the literal string `true`
enables the flag. Any other value (including the empty string, `1`, `yes`,
`TRUE` — case matters) is treated as `false`. A missing env var defaults to
`false`. This is enforced by `getAuthFeatures()` and covered by
`apps/web/src/lib/auth/features.test.ts`.

The resolved shape is:

```ts
type AuthFeatures = {
  forgot_password: boolean;
  email_verification: boolean;
  passwordless: boolean;
  linkedin_oauth: boolean;
};
```

#### Scenario: LinkedIn OAuth enabled

- **WHEN** `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED=true` in
  `apps/web/.env`
- **THEN** `getAuthFeatures().linkedin_oauth` SHALL be `true`
- **AND** the SPA SHALL render the "Continue with LinkedIn" button on `/login`
  and `/register` pages
