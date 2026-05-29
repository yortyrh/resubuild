## ADDED Requirements

### Requirement: The CV preview page SHALL provide a template layout configuration panel

On `/dashboard/cv/[id]/preview`, the editor UI SHALL expose a **Layout** panel (`TemplateConfigPanel`) allowing authors to reorder visible sections (drag-and-drop), toggle section visibility, toggle per-section optional fields, and customize section labels where supported. Changes SHALL debounce and persist via `PATCH /cv/:id/template-presentation` for the currently selected template. The panel SHALL use design tokens consistent with `apps/web/DESIGN.md` (`surface-soft`).

#### Scenario: Section reorder updates preview

- **WHEN** the user drags Education above Experience in the layout panel
- **THEN** the app SHALL PATCH presentation config
- **AND** refetch export HTML so the preview reflects the new order

#### Scenario: Hide section updates preview

- **WHEN** the user hides the Projects section in the layout panel
- **THEN** the preview iframe SHALL no longer show a Projects section after refetch

### Requirement: Preview SHALL display export HTML in an isolated iframe

The preview client SHALL load HTML from `GET /cv/:id/export/html` and display it using `iframe[srcDoc]`, not `dangerouslySetInnerHTML` on a page-level div. A loading skeleton SHALL show until HTML is available.

#### Scenario: Preview uses iframe

- **WHEN** export HTML is loaded on the preview page
- **THEN** the resume content SHALL render inside an iframe element
- **AND** app chrome (toolbar, layout panel) SHALL remain outside the iframe
