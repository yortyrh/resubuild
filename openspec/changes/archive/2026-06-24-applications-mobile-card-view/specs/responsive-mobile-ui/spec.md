## ADDED Requirements

### Requirement: Applications data grid SHALL switch to a stacked card list below the md breakpoint

The Applications data grid at `/dashboard/applications` MUST render as
a stacked list of `surface-soft text-card-foreground` cards below the
`md` (768px) Tailwind breakpoint, and MUST keep the existing
four-column table at `md+`. Both views MUST display the same row
data, surface the same status badge (`Queued` / `Running` / `Ready` /
`Failed`) or `Updating…` indicator, expose the same `Update` outline
button, and expose the same three-dots row actions menu
(Export CV as PDF, Export cover letter as PDF, Preview CV, Delete)
with the same disabled and in-flight states. The desktop actions
cell MUST keep the `Update` button and the three-dots menu trigger
on a single line — neither control SHALL wrap to a second row when
the Company or Position cells consume their `max-w` budget.

#### Scenario: Mobile list shows one card per application

- **WHEN** a signed-in user opens `/dashboard/applications` on a
  viewport below the `md` breakpoint
- **THEN** the page SHALL render one `surface-soft` card per
  application row in a stacked list
- **AND** the document SHALL NOT show the four-column Applications
  table
- **AND** the document SHALL NOT overflow horizontally at 375px
  viewport width
- **AND** each card SHALL show the Company (primary link), the
  Position (subtitle link), the status badge, the `Update` outline
  button, and the three-dots row actions trigger

#### Scenario: Card uses the same status and menu as the table row

- **WHEN** a row's status is `Ready` and no export is in flight
- **THEN** both the table cell and the card SHALL render the `Ready`
  status badge
- **AND** opening the three-dots menu from either view SHALL list
  Export CV as PDF, Export cover letter as PDF, Preview CV, and
  Delete with the same enabled / disabled rules (Preview CV and
  Export CV as PDF disabled when the application has no
  `tailoredCvId`; cover letter export always enabled)

#### Scenario: Updating state surfaces in both views

- **WHEN** a row's `updateInProgress` is true
- **THEN** the table status cell and the card SHALL both render the
  `Updating…` indicator (Loader2 spinner with `aria-label="Update in progress"`)
- **AND** the `Update` button in both views SHALL be disabled and
  labelled `Updating…`

#### Scenario: Desktop table actions stay on one line

- **WHEN** a signed-in user opens `/dashboard/applications` at or
  above the `md` breakpoint with a long Company or Position value
- **THEN** the table's actions cell SHALL render the `Update` button
  and the three-dots menu trigger on a single line
- **AND** the `Update` button SHALL NOT wrap to a second row
- **AND** the three-dots menu trigger SHALL NOT wrap to a second row
