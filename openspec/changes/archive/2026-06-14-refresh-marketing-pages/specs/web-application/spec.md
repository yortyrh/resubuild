## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a public features page at `/features`, a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The root route `/` MUST render a marketing landing page for anonymous visitors and MUST redirect signed-in visitors to `/dashboard`. The landing page MUST be implemented inside a route group (e.g. `src/app/(marketing)/page.tsx`) so the URL stays at `/`. The features page MUST be implemented at `src/app/(marketing)/features/page.tsx` so it inherits the marketing layout and styles while keeping the URL at `/features`.

#### Scenario: Anonymous visitor lands on the marketing page

- **WHEN** an anonymous visitor navigates to `/`
- **THEN** the response SHALL be `200 OK` with HTML rendering the marketing landing page
- **AND** the page SHALL include a primary CTA **Try the live demo** linking to `/login`
- **AND** the page SHALL NOT redirect to `/login`

#### Scenario: Anonymous visitor loads the features page

- **WHEN** an anonymous visitor navigates to `/features`
- **THEN** the response SHALL be `200 OK` with HTML rendering the marketing-styled features catalog
- **AND** the page SHALL reuse `MarketingHeader` and `MarketingFooter`
- **AND** the page SHALL NOT render `<video>` elements for feature demos
- **AND** each feature entry SHALL render a CSS illustration card (`FeatureCard` / `FeatureIllustration`)
- **AND** the bottom **Try the live demo** CTA SHALL link to `/login`

#### Scenario: Signed-in visitor is redirected to the dashboard

- **WHEN** a visitor with a valid session in `sessionStorage` navigates to `/`
- **THEN** the page SHALL redirect to `/dashboard` via the existing `HomeRedirect` component
