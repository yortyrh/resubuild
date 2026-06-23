## MODIFIED Requirements

### Requirement: The web SPA SHALL provide a change-password UI

The dashboard SHALL expose a Security settings page at `/dashboard/settings/security` that contains a "Change password" form. The form SHALL require the current password and the new password (with confirmation) and SHALL call `POST /auth/password` via the existing `apiFetch` helper. On `200`, the form SHALL display a success toast and clear the inputs. On `401`, the form SHALL display "Current password is incorrect" inline. On `400`, the form SHALL display the Supabase password-policy message.

#### Scenario: User changes their password

- **WHEN** a signed-in user enters current + new password on `/dashboard/settings/security` and submits
- **THEN** the client SHALL call `POST /auth/password`
- **AND** on `200` SHALL show a success toast and clear the form

#### Scenario: User enters wrong current password

- **WHEN** the API returns `401` from `POST /auth/password`
- **THEN** the form SHALL display the inline error "Current password is incorrect" and SHALL NOT clear the form

#### Scenario: User sees Security settings in the sidebar

- **WHEN** a signed-in user opens the dashboard sidebar
- **THEN** a "Security" link to `/dashboard/settings/security` SHALL appear in the settings group at the bottom of the sidebar

## REMOVED Requirements

_None_
