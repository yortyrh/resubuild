## ADDED Requirements

### Requirement: Markdown string list rows SHALL expose overlaid remove control

When `StringListField` renders with `markdown={true}`, each row SHALL wrap the inline markdown editor in a positioned container and SHALL provide a remove control as an icon button fixed to the top-right of that container. The control MUST include an accessible name (e.g. `aria-label="Remove"`). Plain-text string list rows SHALL continue to use the existing adjacent remove button layout.

#### Scenario: Removing a markdown highlight row

- **WHEN** a user activates the remove icon on an inline markdown highlight row
- **THEN** that row SHALL be removed from the parent list value
- **AND** the remove control SHALL NOT occupy a separate column beside the editor

#### Scenario: Plain-text list unchanged

- **WHEN** a user edits a plain-text `StringListField` (e.g. Education courses)
- **THEN** remove SHALL remain the adjacent outline button pattern

### Requirement: Inline Wysimark editors SHALL allow compact multiline editing

The inline markdown editor variant SHALL permit multiple lines of content with vertical growth within configured min/max heights. Application CSS MUST NOT force single-line paragraph layout (e.g. zeroed block margins on all Slate elements) for the inline variant. Inline editors SHALL remain visually denser than block editors via smaller base font size and compact toolbar icon sizing.

#### Scenario: Author enters multiple highlight lines

- **WHEN** a user inserts a line break in an inline markdown highlight field
- **THEN** the editor SHALL display more than one line without clipping content to a single-line height

#### Scenario: Inline vs block visual scale

- **WHEN** a user compares an inline highlight editor with a block description editor on the same form
- **THEN** the inline editor SHALL use smaller typography and padding than the block editor

## MODIFIED Requirements

### Requirement: Wysimark editor content padding SHALL be compact

Block editor content area (`[data-slate-editor='true']`) SHALL use `1rem` padding; inline variant SHALL use `0.5rem` padding, overriding Wysimark defaults via application CSS. Inline variant SHALL reserve sufficient top and trailing padding so overlaid remove icons do not obscure editable text.

#### Scenario: Inline highlight field density

- **WHEN** a user edits an inline rich-text field inside a work entry card
- **THEN** the editable region SHALL render with reduced vertical padding suitable for inline form density
- **AND** text SHALL remain readable when a remove icon is present at the top-right

#### Scenario: Block editor padding unchanged

- **WHEN** a user edits a block rich-text field
- **THEN** content padding SHALL remain `1rem` as today

## REMOVED Requirements

_None — behavior is refined via ADDED/MODIFIED requirements above._
