## ADDED Requirements

### Requirement: The authenticated dashboard SHALL render a persistent left sidebar on desktop

The dashboard chrome at `apps/web/src/app/dashboard/layout.tsx` SHALL
render a left sidebar for viewports at or above the `md` breakpoint. The
sidebar SHALL occupy a fixed-width rail (approximately 16rem) and SHALL
contain, in vertical order:

1. A brand/logo region at the top linking to `/dashboard`.
2. A primary navigation region with links to `/dashboard` ("My CVs") and
   `/dashboard/applications` ("Applications"), each with an icon and a
   text label.
3. An optional contextual middle group that appears only when the route
   matches `/dashboard/cv/[id]/*`:
   - For non-preview CV editor routes, the group SHALL contain the CV
     section links (Basics, Social profiles, Work, Volunteer, Education,
     Skills, Projects, Awards, Certificates, Publications, Languages,
     Interests, References).
   - For the preview route (`/dashboard/cv/[id]/preview`), the group
     SHALL contain preview tools: template selection, layout
     configuration (Sections, Header fields, Experience fields), and
     export/print actions (Back, Print, JSON Resume, PDF).
4. A bottom region containing settings links
   (`/dashboard/settings/ai-agent`, `/dashboard/settings/mcp`,
   `/dashboard/settings/import-llm`, `/dashboard/settings/security`)
   grouped under a "Settings" heading, plus the current user avatar and
   a sign-out control.

The sidebar SHALL use the project's panel surface treatment
(`surface-soft text-card-foreground`) and a right-edge divider
(`chrome-divider border-r`). Active navigation items SHALL use the
existing accent state (`bg-accent text-accent-foreground`) and expose
`aria-current="page"` to assistive technology.

#### Scenario: Sidebar is visible on desktop

- **WHEN** a signed-in user opens any `/dashboard/*` route on a viewport
  at or above the `md` breakpoint
- **THEN** a vertical sidebar SHALL be visible on the left edge of the
  viewport
- **AND** it SHALL contain a logo, "My CVs", "Applications", and the
  settings group
- **AND** when on a CV editor route it SHALL also contain the CV
  sections group
- **AND** when on the preview route it SHALL also contain the preview
  tools group

#### Scenario: Active item is highlighted

- **WHEN** a signed-in user visits `/dashboard/applications`
- **THEN** the "Applications" item in the sidebar SHALL render the
  active state (`bg-accent text-accent-foreground`)
- **AND** it SHALL have `aria-current="page"`
- **AND** the "My CVs" item SHALL NOT have an active state

#### Scenario: Settings links are reachable from the sidebar bottom

- **WHEN** a signed-in user opens the dashboard sidebar
- **THEN** links to AI agent settings, MCP settings, Import LLM settings,
  and Security settings SHALL appear in the bottom region of the sidebar

### Requirement: The sidebar SHALL collapse into a Sheet on mobile viewports

On viewports below the `md` breakpoint the persistent sidebar SHALL be
hidden. A slim top bar SHALL appear containing the brand wordmark and a
hamburger menu button. Activating the button SHALL open a Radix `Sheet`
from the left side of the viewport containing the same sidebar content.
The Sheet SHALL close when the user selects a link, clicks the backdrop,
or activates the close control.

#### Scenario: Mobile dashboard shows hamburger toggle

- **WHEN** a signed-in user opens `/dashboard` on a viewport below the
  `md` breakpoint
- **THEN** a top bar SHALL be visible with the brand and a menu button
  labeled "Open menu"
- **AND** the persistent sidebar SHALL NOT be visible

#### Scenario: Sheet opens and closes on navigation

- **WHEN** a signed-in user on mobile taps the hamburger menu button
- **THEN** a Sheet SHALL slide in from the left containing the sidebar
  content
- **AND** when the user selects "Applications" the Sheet SHALL close
  and navigation to `/dashboard/applications` SHALL occur

### Requirement: The CV editor SHALL no longer render its own section rail

`CvSectionLayout` and `CvEditorChrome` SHALL NOT render a left section
rail or a mobile section Sheet. Section navigation SHALL be provided by
the global `DashboardSidebar` contextual middle group. The editor chrome
remaining in `CvEditorChrome` SHALL be limited to the breadcrumb/header
row and the section content area.

#### Scenario: Editor page has no secondary rail

- **WHEN** a signed-in user visits `/dashboard/cv/[id]/work` on desktop
- **THEN** only one left sidebar SHALL be visible (the global dashboard
  sidebar)
- **AND** the CV sections group SHALL appear inside that sidebar
- **AND** no secondary section rail SHALL be rendered by the editor

### Requirement: The CV preview page SHALL host its tools in the global sidebar

The CV preview page SHALL NOT render a top toolbar (Back, Layout,
Template, Print, JSON, PDF) or an inline/mobile layout panel. Those
controls SHALL move into the global sidebar's preview-tools contextual
middle group. The preview page's main content area SHALL render only the
breadcrumb header and the CV iframe.

#### Scenario: Preview page shows tools in the sidebar

- **WHEN** a signed-in user visits `/dashboard/cv/[id]/preview` on desktop
- **THEN** the sidebar SHALL contain a "Preview" group with template
  selection, layout configuration, and export/print actions
- **AND** the main content area SHALL NOT contain the previous top
  toolbar or inline layout panel

#### Scenario: Preview layout panel updates the rendered CV

- **WHEN** a signed-in user toggles a section in the sidebar's layout
  configuration
- **THEN** the preview iframe SHALL update to reflect the new
  configuration

### Requirement: Dashboard loading skeleton SHALL match the sidebar layout

The `DashboardShellSkeleton` used by `SessionGate` SHALL render a layout
that matches the new sidebar + main content structure: a 16rem-wide
placeholder rail on the left (with logo, nav, and bottom-region
skeletons) and a main-content skeleton area on the right. This avoids a
visual jump when the session resolves and the real sidebar replaces the
skeleton.

#### Scenario: Skeleton mirrors the sidebar shell

- **WHEN** an unauthenticated or loading visitor lands on `/dashboard`
- **THEN** the skeleton SHALL show a left rail placeholder and a right
  content placeholder
- **AND** the rail width SHALL match the rendered sidebar width
