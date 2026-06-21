## ADDED Requirements

### Requirement: Session introspection MUST expose the authenticated user's profile picture URL

`GET /auth/me` SHALL return `user.picture` in addition to `id` and `email`. The value MUST be the authenticated user's profile picture URL string sourced from the Supabase user's `user_metadata.avatar_url` (falling back to `user_metadata.picture` when `avatar_url` is absent), or `null` when neither metadata key is present or non-empty. The field MUST be derived server-side from the validated session so the SPA does not need to reach into Supabase client metadata to render an avatar.

#### Scenario: Authenticated user with OAuth avatar metadata

- **WHEN** a client sends a valid `Authorization: Bearer <access_token>` to `GET /auth/me`
- **AND** Supabase returns a user whose `user_metadata` includes a non-empty `avatar_url`
- **THEN** the response `user.picture` SHALL equal that `avatar_url` string

#### Scenario: Authenticated user with legacy `picture` metadata but no `avatar_url`

- **WHEN** a client sends a valid `Authorization: Bearer <access_token>` to `GET /auth/me`
- **AND** Supabase returns a user whose `user_metadata` contains a non-empty `picture` but no `avatar_url`
- **THEN** the response `user.picture` SHALL equal that `picture` string

#### Scenario: Authenticated user without any avatar metadata

- **WHEN** a client sends a valid `Authorization: Bearer <access_token>` to `GET /auth/me`
- **AND** Supabase returns a user whose `user_metadata` contains neither `avatar_url` nor `picture` (or both are empty strings)
- **THEN** the response `user.picture` SHALL be `null`
