## ADDED Requirements

### Requirement: Application workspace chrome SHALL be excluded from print output

The application workspace component MUST apply the `no-print` utility class to both in-page chrome containers rendered above the tab content: the workspace header wrapper (`<div>` that hosts the job title `h1` and the Update action button) and the tab strip header wrapper (the flex row inside the tabs card that hosts `TabsList` and the per-tab action buttons — Edit CV, Preview, Copy letter, Print, PDF). The existing `@media print { .no-print { display: none !important; } }` rule in `apps/web/src/app/globals.css` MUST hide both wrappers whenever a user invokes the browser print dialog on `/dashboard/applications/[id]`. The body content of each tab panel (Job summary, Tailored CV preview, Cover letter preview) MUST remain visible and printable.

#### Scenario: Printing an application workspace page omits the header and tab strip

- **WHEN** a signed-in user opens the browser print dialog on
  `/dashboard/applications/[id]` (for any active tab: Job summary,
  Tailored CV, or Cover letter)
- **THEN** the workspace header row (job title + Update button) SHALL
  NOT appear in the print preview
- **AND** the tab strip header row (tab triggers + per-tab action
  buttons) SHALL NOT appear in the print preview
- **AND** the active tab panel's body content SHALL remain visible and
  printable
