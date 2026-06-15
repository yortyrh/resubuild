## MODIFIED Requirements

### Requirement: The web SPA SHALL provide passwordless sign-in UI

The `/login` page SHALL render a tabbed or segmented control with three options: "Password" (default), "Email me a code", "Email me a link". The "Email me a code" tab SHALL collect an email, call `POST /auth/otp`, then prompt for the 6-digit code and call `POST /auth/otp/verify`. The "Email me a link" tab SHALL call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '<APP_URL>/auth/callback' } })` and instruct the user to click the link in their email. The SPA picks up the resulting session from the URL hash via the Supabase client.

The tab group SHALL render only when `getAuthFeatures().passwordless` is
`true` (resolved client-side from
`NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED`).

The tab group SHALL be rendered through the shared `Tabs` component
(`apps/web/src/components/ui/tabs.tsx`), which reserves the height of the
tallest panel so the centered auth card does not shift when the user
switches between the Password, Email me a code, and Email me a link tabs.

#### Scenario: User signs in with an OTP code

- **WHEN** a user selects "Email me a code", enters their email, receives the code, and submits the 6 digits
- **THEN** the SPA SHALL POST to `/auth/otp/verify` AND on success persist the session via `apiFetch` and redirect to `/dashboard`

#### Scenario: User signs in with a magic link

- **WHEN** a user selects "Email me a link" and clicks the link in the email
- **THEN** the SPA SHALL land on `/auth/callback` with the Supabase client session already populated
- **AND** SHALL redirect to `/dashboard`

#### Scenario: Passwordless controls hidden when flag is off

- **WHEN** `getAuthFeatures().passwordless` is `false` (i.e.
  `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED` is not the literal string
  `true`)
- **THEN** the `/login` page SHALL render only the password form (no tabs)

#### Scenario: Switching between passwordless tabs does not shift the centered auth card

- **WHEN** a signed-out user lands on `/login` with `getAuthFeatures().passwordless === true` and toggles between the Password, Email me a code, and Email me a link tabs
- **THEN** the height of the auth card SHALL remain the height of the tallest of the three panels
- **AND** the card's vertical position SHALL NOT change between switches
