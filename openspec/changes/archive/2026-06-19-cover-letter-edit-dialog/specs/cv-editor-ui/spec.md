## MODIFIED Requirements

### Requirement: Markdown editor shell SHALL use square corners and stable toolbar height

Global styles for `.rich-text-editor` SHALL target the markdown editor shell via selectors that match the active editor library (MDXEditor's `.mdxeditor` root, its `[role='toolbar']` element, and its `[data-toolbar-item]` button nodes) rather than Wysimark-specific `[data-slate-editor='true']` / `[data-item-type='button']` selectors. The inner editor shell SHALL use square corners (`border-radius: 0`). Block-variant toolbars SHALL use a stable height baseline that does not clip wrapped toolbar items (e.g. `min-height: 2.25rem` with `height: auto` and `overflow: visible`); inline-variant toolbars SHALL use em-based height. Toolbar containers SHALL NOT add extra bottom margin that separates toolbar from content.

#### Scenario: Block editor toolbar height

- **WHEN** a user focuses a block markdown editor field (e.g. Work description)
- **THEN** the toolbar row SHALL render at its stable baseline height without rounded inner corners on the editor shell
- **AND** SHALL permit wrapped items to occupy a second row without clipping

#### Scenario: Inline editor compact toolbar

- **WHEN** a user focuses an inline markdown editor field
- **THEN** the toolbar SHALL use em-scaled compact height consistent with inline variant styling

## ADDED Requirements

### Requirement: MDXEditor toolbar SHALL present a solid, distinct tool-strip surface with hover and pressed states

Global styles targeting the MDXEditor block-variant toolbar (`[class*='_toolbarRoot']`) SHALL give the toolbar a solid background using the application `muted` color token (`hsl(var(--muted))`, no alpha) so it reads as a distinct surface in both light and dark mode rather than a translucent overlay over the content. The toolbar SHALL have a bottom border separator using `--border` so the content area beneath it reads as a separate region. The top-left and top-right corners of the toolbar SHALL be rounded (`0.375rem`) to match the editor shell above and below it; the contentEditable area below SHALL have matching `border-top-left-radius: 0` / `border-top-right-radius: 0` so the seam between toolbar and content has no visible gap.

The toolbar SHALL be sticky at `top: 0` inside its scroll container (the dialog body for the cover-letter editor; the page for other consumers) so it remains visible while the user scrolls long content. The toolbar SHALL be permitted to wrap onto multiple rows (`flex-wrap: wrap`, `height: auto`, `overflow: visible`) so the wide Block-type select trigger can move to a second row on narrow surfaces without being clipped.

Toolbar buttons and the Block-type select trigger SHALL be styled with rounded corners (`0.3125rem`), muted text color, a transition on background-color, and a `:hover` background that lifts toward `--background`. Toggle-style buttons SHALL expose an explicit "on"/pressed visual state when their `data-state` equals `'on'` or `aria-pressed` equals `'true'`.

#### Scenario: Toolbar has solid surface

- **WHEN** a block markdown editor field is rendered (e.g. inside the cover-letter edit dialog)
- **THEN** the toolbar SHALL display with a solid `hsl(var(--muted))` background
- **AND** SHALL NOT be transparent or translucent over the content

#### Scenario: Toolbar is sticky while scrolling

- **WHEN** the user scrolls a long letter inside the cover-letter edit dialog
- **THEN** the toolbar SHALL remain visible at the top of the editor region
- **AND** the editor content SHALL scroll beneath it

#### Scenario: Toolbar wraps without clipping

- **WHEN** the Block-type select trigger does not fit alongside the other toolbar items on the first row
- **THEN** the toolbar SHALL wrap the trigger onto a second row
- **AND** the toolbar SHALL NOT clip the wrapped items

#### Scenario: Toolbar button hover affordance

- **WHEN** the user hovers over a toolbar button or the Block-type select trigger
- **THEN** the control SHALL display a visibly distinct hover background

#### Scenario: Toggle button pressed state

- **WHEN** a toolbar toggle button (e.g. Bold, Italic, Bulleted list) is active
- **THEN** the button SHALL display a visibly distinct pressed/active background
- **AND** the same affordance SHALL apply whether the active state is conveyed via `data-state='on'` or `aria-pressed='true'`
