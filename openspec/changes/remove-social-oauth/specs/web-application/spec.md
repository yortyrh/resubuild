# web-application

## MODIFIED Requirements

### Requirement: The web app MUST use backend-owned HTTP endpoints for authentication and authenticated Nest API access

Interactive client bundles MAY import `@supabase/supabase-js` **exclusively for authentication flows** (sign-in, sign-out, OTP, magic link, email verification, session inspection). OAuth flows are excluded. The Supabase client SHALL persist sessions and rehydrate from `sessionStorage` when cookie state is empty so `apiFetch` and `SessionGate` agree after credential login.

#### Scenario: Client bundle has Supabase client but no DB-direct symbols

- **WHEN** a developer inspects the production web bundle
- **THEN** `@supabase/supabase-js` symbols MAY appear for auth only
- **AND** OAuth provider buttons and `signInWithOAuth` calls SHALL NOT be present in auth UI modules
