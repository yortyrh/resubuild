# cv-editor-ui delta — migrate rich-text editor from `@wysimark/react` to `@mdxeditor/editor`

## RENAMED Requirements

- FROM: `### Requirement: Markdown-first MDEditor usages SHALL migrate to `@wysimark/react``
- TO: `### Requirement: Markdown-first MDEditor usages SHALL migrate to `@mdxeditor/editor``

- FROM: `### Requirement: Wysimark toolbars SHALL be constrained and SHALL NOT offer in-editor image upload`
- TO: `### Requirement: Rich-text editor toolbars SHALL be constrained and SHALL NOT offer in-editor image upload`

- FROM: `### Requirement: Wysimark editor content padding SHALL be compact`
- TO: `### Requirement: Markdown editor content padding SHALL be compact`

- FROM: `### Requirement: Wysimark editor shell SHALL use square corners and stable toolbar height`
- TO: `### Requirement: Markdown editor shell SHALL use square corners and stable toolbar height`

- FROM: `### Requirement: Inline Wysimark editors SHALL allow compact multiline editing`
- TO: `### Requirement: Inline markdown editors SHALL allow compact multiline editing`

## MODIFIED Requirements

### Requirement: CV editor and dashboard SHALL show skeleton placeholders while loading

While authentication, CV list, CV editor data, or client-only markdown editors are loading, the UI SHALL render skeleton placeholders that approximate final layout (sidebar icons, breadcrumb bars, list cards, form fields, markdown chrome) instead of plain `"Loading…"` text alone.

#### Scenario: Session gate loading

- **WHEN** the dashboard shell is waiting for session validation
- **THEN** a dashboard-shaped skeleton (header + content placeholders) SHALL be shown

#### Scenario: CV list loading

- **WHEN** the dashboard CV list fetch is in progress
- **THEN** skeleton cards matching the CV list grid SHALL be shown

#### Scenario: CV editor loading

- **WHEN** a user navigates to a CV editor route before resume JSON is available
- **THEN** a skeleton matching breadcrumb, sidebar, and section content SHALL be shown

#### Scenario: Markdown editor hydration

- **WHEN** a markdown editor chunk is loading on the client
- **THEN** an inline or block skeleton matching the editor variant SHALL occupy the editor region until the editor mounts

(Updated to remove the "Wysimark" library name from the scenario prose; the behavior — skeleton during hydration — is unchanged.)

### Requirement: Markdown-first MDEditor usages SHALL migrate to `@mdxeditor/editor`

The CV editor MUST remove `@wysimark/react` and any earlier `@uiw/react-md-editor` components for Basics summaries and repeatable rich-text stacks. Replacement SHALL instantiate `@mdxeditor/editor` (`MDXEditor` + explicit plugin list) via a shared wrapper, SHALL present WYSIWYG chrome by default, and SHALL render as a client component (`'use client'`) without a `next/dynamic` SSR shim. The shared wrapper MUST NOT require a `pnpm` patch against the editor's dist.

#### Scenario: Non-technical author edits Summary

- **WHEN** a user without Markdown knowledge modifies Summary prose
- **THEN** usable formatting controls SHALL operate without exposing raw Markdown as the mandatory surface

#### Scenario: No pnpm patch against the editor

- **WHEN** the project installs dependencies
- **THEN** `pnpm install` SHALL NOT apply a patch to `@mdxeditor/editor`
- **AND** `pnpm-workspace.yaml` and the root `package.json` `pnpm.patchedDependencies` map SHALL NOT contain an entry for `@wysimark/react`

### Requirement: Rich-text editor toolbars SHALL be constrained and SHALL NOT offer in-editor image upload

The shared rich-text wrapper SHALL configure the markdown editor's toolbar (via `@mdxeditor/editor`'s `toolbarPlugin`) with two presets:

- **Inline variant** (`variant='inline'`): Undo/Redo, Bold, Italic, Strikethrough, Link.
- **Block variant** (`variant='block'`): Undo/Redo, Heading (paragraph / H1 / H2 / H3), Bold, Italic, Strikethrough, Link, Bulleted/Ordered list toggle, Thematic break, Block quote, Code block, Table.

The editor MUST NOT expose an image-upload plugin, an image-insert toolbar item, or any drag-and-drop image handler. Profile images are uploaded only via the Basics photo control, which calls the existing Nest media API. The editor MUST NOT be configured with `imagePlugin`, `linkWithAutocompletePlugin`'s image mode, or any other plugin that surfaces an image-upload affordance.

#### Scenario: Block editor toolbar scope

- **WHEN** a user opens a block rich-text field (e.g. Work description)
- **THEN** toolbar items SHALL be limited to the block preset above and SHALL NOT include image upload

#### Scenario: Inline editor toolbar scope

- **WHEN** a user opens an inline rich-text field (e.g. a Work highlight)
- **THEN** toolbar items SHALL be limited to the inline preset (Undo/Redo, Bold, Italic, Strikethrough, Link)
- **AND** SHALL NOT include heading selectors, list toggles, code block, table, or image upload

### Requirement: Markdown editor content padding SHALL be compact

Block editor content area SHALL use `0.75rem` padding; inline variant SHALL use `0.5rem` padding, overriding the editor library's defaults via application CSS targeting the new editor's contenteditable region. Inline variant SHALL reserve sufficient top and trailing padding so overlaid remove icons do not obscure editable text.

#### Scenario: Inline highlight field density

- **WHEN** a user edits an inline rich-text field inside a work entry card
- **THEN** the editable region SHALL render with reduced vertical padding suitable for inline form density
- **AND** text SHALL remain readable when a remove icon is present at the top-right

#### Scenario: Block editor padding unchanged

- **WHEN** a user edits a block rich-text field
- **THEN** content padding SHALL remain at or below `1rem` and SHALL feel comparable to the previous editor

### Requirement: Markdown editor shell SHALL use square corners and stable toolbar height

Global styles for `.rich-text-editor` SHALL target the markdown editor shell via selectors that match the active editor library (MDXEditor's `.mdxeditor` root, its `[role='toolbar']` element, and its `[data-toolbar-item]` button nodes) rather than Wysimark-specific `[data-slate-editor='true']` / `[data-item-type='button']` selectors. The inner editor shell SHALL use square corners (`border-radius: 0`). Block-variant toolbars SHALL use a fixed height of 30px; inline-variant toolbars SHALL use em-based height. Toolbar containers SHALL NOT add extra bottom margin that separates toolbar from content.

#### Scenario: Block editor toolbar height

- **WHEN** a user focuses a block markdown editor field (e.g. Work description)
- **THEN** the toolbar row SHALL render at 30px height without rounded inner corners

#### Scenario: Inline editor compact toolbar

- **WHEN** a user focuses an inline markdown editor field
- **THEN** the toolbar SHALL use em-scaled compact height consistent with inline variant styling

### Requirement: Inline markdown editors SHALL allow compact multiline editing

The inline markdown editor variant SHALL permit multiple lines of content with vertical growth within configured min/max heights. Application CSS MUST NOT force single-line paragraph layout for the inline variant. Inline editors SHALL remain visually denser than block editors via smaller base font size and compact toolbar icon sizing.

#### Scenario: Author enters multiple highlight lines

- **WHEN** a user inserts a line break in an inline markdown highlight field
- **THEN** the editor SHALL display more than one line without clipping content to a single-line height

#### Scenario: Inline vs block visual scale

- **WHEN** a user compares an inline highlight editor with a block description editor on the same form
- **THEN** the inline editor SHALL use smaller typography and padding than the block editor

## REMOVED Requirements

_None._ All four previously Wysimark-named requirements (toolbar scope, padding, shell, multiline inline) are re-stated as `MODIFIED` above with editor-library-agnostic wording; no requirement is removed outright.
