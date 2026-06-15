## MODIFIED Requirements

### Requirement: Application workspace SHALL expose Job summary, Tailored CV, and Cover letter as a tabbed panel

The page at `/dashboard/applications/[id]` SHALL render the three workspace sections — Job summary, Tailored CV, and Cover letter — inside a single tabbed control. The tabs SHALL appear in this order: Job summary, Tailored CV, Cover letter. Only one tab panel SHALL be visible at a time. All three sections SHALL remain reachable without leaving the page.

The tab group SHALL be rendered through the shared `Tabs` component
(`apps/web/src/components/ui/tabs.tsx`), which reserves the height of the
tallest panel so the panel does not reflow when the user switches between
the Job summary, Tailored CV, and Cover letter tabs (which differ
dramatically in height).

#### Scenario: User sees three tabs on the workspace

- **WHEN** a signed-in user opens `/dashboard/applications/[id]` for a `ready` application
- **THEN** the workspace SHALL display a tab strip with three triggers labeled Job summary, Tailored CV, and Cover letter
- **AND** exactly one of the three panels SHALL be visible on first render

#### Scenario: User switches between tabs

- **WHEN** the user clicks the Cover letter tab while the Job summary tab is active
- **THEN** the Cover letter panel SHALL become visible
- **AND** the Job summary and Tailored CV panels SHALL NOT be visible

#### Scenario: User keyboard-navigates tabs

- **WHEN** the user focuses the tab strip and presses the arrow keys or Tab
- **THEN** focus SHALL move between the three tab triggers in DOM order
- **AND** pressing Enter or Space SHALL activate the focused tab

#### Scenario: Switching between workspace tabs does not reflow the panel

- **WHEN** a signed-in user toggles between the Job summary, Tailored CV, and Cover letter tabs on `/dashboard/applications/[id]`
- **THEN** the height of the tabbed panel SHALL remain the height of the tallest of the three panels
- **AND** the action buttons in the workspace header (Edit CV, Preview, Copy letter, Print, PDF) SHALL NOT reflow vertically

### Requirement: Cover letter tab SHALL preserve editor actions and Save

The Cover letter tab SHALL contain the existing `MarkdownEditor` for the cover letter draft, the Copy letter / Print / PDF action buttons, and the Save letter button. The button labels, icons, and click handlers SHALL be unchanged from the previous two-column layout.

#### Scenario: Cover letter actions are present in the Cover letter tab

- **WHEN** the user activates the Cover letter tab
- **THEN** the panel SHALL show the markdown editor for the cover letter draft
- **AND** SHALL show Copy letter, Print, PDF, and Save letter buttons with the same labels and behavior as before this change
