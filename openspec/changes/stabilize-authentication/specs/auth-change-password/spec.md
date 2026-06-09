# auth-change-password

## Purpose

Allow an authenticated user to change their account password from within the dashboard, with the current password verified server-side and the new password persisted through Supabase Auth.

## ADDED Requirements

### Requirement: The API MUST expose a password change endpoint

`apps/api` SHALL expose `POST /auth/password` protected by `SupabaseAuthGuard`. The body SHALL be a JSON object of `{ current_password: string, new_password: string }`. The server SHALL:

1. Resolve the user from the Bearer token via `supabase.auth.getUser(token)`.
2. Verify the current password by calling `supabase.auth.signInWithPassword({ email: user.email, password: current_password })` against a throwaway client.
3. If the verification succeeds, call `supabase.auth.admin.updateUserById(userId, { password: new_password })`.
4. On success respond `200 OK` with `{ updated: true }`.
5. On invalid current password respond `401 Unauthorized` with the message `"Current password is incorrect"`.
6. On new-password policy violation (Supabase `weak_password` error) respond `400 Bad Request` with the message `"Password does not meet policy requirements"`.
7. On any other failure respond `500 Internal Server Error` with no Supabase internals in the body.

The endpoint SHALL always be reachable, regardless of feature flags.

#### Scenario: Successful password change

- **WHEN** an authenticated user POSTs valid `current_password` and a strong `new_password` to `POST /auth/password`
- **THEN** the API SHALL respond `200` with `{ updated: true }` AND the new password SHALL be usable on the next `POST /auth/login`

#### Scenario: Wrong current password

- **WHEN** an authenticated user POSTs an incorrect `current_password` to `POST /auth/password`
- **THEN** the API SHALL respond `401` with the message `"Current password is incorrect"`
- **AND** the existing password SHALL remain unchanged

#### Scenario: Weak new password

- **WHEN** an authenticated user POSTs a `new_password` that fails Supabase's password policy
- **THEN** the API SHALL respond `400` with the message `"Password does not meet policy requirements"`
- **AND** the existing password SHALL remain unchanged

#### Scenario: Unauthenticated call

- **WHEN** a client calls `POST /auth/password` without a valid Bearer token
- **THEN** the guard SHALL respond `401` and the handler SHALL NOT execute

### Requirement: The web SPA SHALL provide a change-password UI

The dashboard SHALL expose a Security settings page at `/dashboard/settings/security` that contains a "Change password" form. The form SHALL require the current password and the new password (with confirmation) and SHALL call `POST /auth/password` via the existing `apiFetch` helper. On `200`, the form SHALL display a success toast and clear the inputs. On `401`, the form SHALL display "Current password is incorrect" inline. On `400`, the form SHALL display the Supabase password-policy message.

#### Scenario: User changes their password

- **WHEN** a signed-in user enters current + new password on `/dashboard/settings/security` and submits
- **THEN** the client SHALL call `POST /auth/password`
- **AND** on `200` SHALL show a success toast and clear the form

#### Scenario: User enters wrong current password

- **WHEN** the API returns `401` from `POST /auth/password`
- **THEN** the form SHALL display the inline error "Current password is incorrect" and SHALL NOT clear the form

#### Scenario: User sees Security settings in the menu

- **WHEN** a signed-in user opens the dashboard user menu
- **THEN** a "Security" link to `/dashboard/settings/security` SHALL appear
