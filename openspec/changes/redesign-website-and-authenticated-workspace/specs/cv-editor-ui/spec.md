## MODIFIED Requirements

### Requirement: The CV editor SHALL provide structured editing and preview/export workflows

The CV editor MUST organize the primary CV workflow into three modes:

- `Edit`
- `Improve with AI`
- `Preview / Export`

`Edit` MUST remain the structured JSON Resume editing surface with item-level persistence. `Improve with AI` MUST contain AI-assisted improvement actions and recommendations. `Preview / Export` MUST consolidate template selection, layout controls, section/header visibility, print, PDF export, and JSON Resume export.

Ambiguous `Promote` wording MUST NOT be used for AI improvement actions. AI improvement actions SHOULD use `Improve with AI` and more specific labels such as `Improve summary`, `Quantify bullet points`, `Make ATS-friendly`, `Strengthen leadership`, `Add technical depth`, and `Shorten to one page`.

#### Scenario: User switches between editor modes

- **WHEN** the user opens a CV editor
- **THEN** the editor SHALL expose Edit, Improve with AI, and Preview / Export modes
- **AND** structured section editing SHALL be located under Edit
- **AND** export controls SHALL be located under Preview / Export

#### Scenario: Improve with AI explains suggested actions

- **WHEN** the user opens Improve with AI
- **THEN** the UI SHALL show actionable AI improvement options
- **AND** SHALL avoid using `Promote` as the primary label for these actions

### Requirement: CV preview layout controls SHALL be clear and minimally intrusive

The preview/export experience MUST reduce visual clutter while preserving control. Layout controls SHOULD be collapsed or secondary by default, and the control formerly labeled `Hide layout` MUST be renamed to `Layout settings` or equivalent.

Template selection SHOULD show visual thumbnails for available templates in addition to or instead of a plain dropdown.

Optional resume sections SHOULD be disabled by default unless explicitly enabled by the user or required by existing saved preferences:

- References
- Interests
- Awards
- Publications

Core sections SHOULD remain enabled by default when data exists:

- Summary
- Experience
- Education
- Skills

#### Scenario: Preview/export uses clear layout settings label

- **WHEN** the user opens Preview / Export
- **THEN** the layout control SHALL be labeled `Layout settings` or equivalent
- **AND** SHALL NOT rely on `Hide layout` as the primary wording

#### Scenario: Template selection is visual

- **WHEN** the user changes resume template
- **THEN** the UI SHOULD show template thumbnails or preview cards for Classic, Modern, Left aligned, Tabular, or supported templates

#### Scenario: Optional sections default off

- **WHEN** a new CV preview/export layout initializes without saved visibility preferences
- **THEN** References and Interests SHALL be off by default
- **AND** Awards and Publications SHALL be off by default unless the product explicitly decides to surface present award/publication data
