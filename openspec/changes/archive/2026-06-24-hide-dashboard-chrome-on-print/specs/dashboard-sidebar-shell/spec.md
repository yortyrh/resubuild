## ADDED Requirements

### Requirement: Dashboard chrome SHALL be excluded from print output

Both the persistent left sidebar rendered by `DashboardSidebarShell` and the sticky top bar rendered by `DashboardTopBar` (both branches) MUST carry the `no-print` utility class. The existing `@media print { .no-print { display: none !important; } }` rule in `apps/web/src/app/globals.css` MUST hide both elements whenever the user invokes the browser print dialog on any `/dashboard/*` route.

#### Scenario: Printing a dashboard page omits the sidebar and top bar

- **WHEN** a signed-in user opens the browser print dialog on a
  `/dashboard/*` page (e.g. `/dashboard`, `/dashboard/applications`,
  `/dashboard/cv/[id]/work`, `/dashboard/settings/ai-agent`)
- **THEN** the dashboard sidebar SHALL NOT appear in the print preview
- **AND** the dashboard top bar SHALL NOT appear in the print preview
- **AND** the main page content SHALL remain visible and printable

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
