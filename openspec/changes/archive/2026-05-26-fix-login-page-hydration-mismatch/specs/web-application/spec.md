## ADDED Requirements

### Requirement: Auth pages SHALL render cross-links outside client form boundaries

The `/login` and `/register` routes SHALL render static navigation cross-links (login ↔ register) from Server Components. Interactive auth forms (`LoginForm`, `RegisterForm`) SHALL NOT include Next.js `<Link>` cross-links in their `'use client'` module trees.

#### Scenario: Login page cross-link is server-rendered

- **WHEN** a user loads `/login`
- **THEN** the **Register** cross-link SHALL be rendered by the Server Component page (or a server-safe shared helper)
- **AND** `LoginForm` SHALL contain only the sign-in form and its client state

#### Scenario: Register page cross-link is server-rendered

- **WHEN** a user loads `/register`
- **THEN** the **Sign in** cross-link SHALL be rendered by the Server Component page (or a server-safe shared helper)
- **AND** `RegisterForm` SHALL contain only the registration form and its client state

#### Scenario: Standard browser hydration on auth pages

- **WHEN** a developer loads `/login` or `/register` in a standard browser (not Cursor embedded browser) with `pnpm dev` running
- **THEN** the browser console SHALL NOT report a React hydration mismatch attributable to auth cross-links
