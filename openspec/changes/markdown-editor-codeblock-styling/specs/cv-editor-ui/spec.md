## ADDED Requirements

### Requirement: MDXEditor code block chrome SHALL match the dashboard surface language

When `MarkdownEditorImpl` renders a code block inside a `.rich-text-editor` surface, the CodeMirror wrapper (`[class*='_codeMirrorWrapper']` under `.rich-text-editor .mdxeditor`) SHALL present dashboard-consistent chrome: a `1px solid hsl(var(--border) / 0.4)` border, a `0.25rem` border-radius, no padding on the wrapper itself (`padding: 0`) with `overflow: hidden` so the inner CodeMirror edges align flush, and a `0.75rem` bottom margin separating it from the next block.

#### Scenario: Code block renders with the dashboard border and radius

- **WHEN** a `freeForm` block editor renders a code block
- **THEN** the wrapper SHALL display with the configured `1px` `--border/0.4` outline and `0.25rem` corner radius
- **AND** SHALL NOT retain the bundled MDXEditor `var(--baseLine)` solid border or `var(--radius-medium)` (≈ 0.375rem) radius

### Requirement: MDXEditor code area SHALL use a muted-gray surface

When `MarkdownEditorImpl` renders a code block inside a `.rich-text-editor` surface, the `.cm-editor` and `.cm-content` elements SHALL render with a `hsl(var(--muted) / 0.45)` background so the code area reads as a distinct gray-tinted surface against the white `contentEditable` rather than blending into it.

#### Scenario: Code area is gray, not white

- **WHEN** a `freeForm` block editor renders a code block
- **THEN** the inner `.cm-editor` and `.cm-content` SHALL display with `hsl(var(--muted) / 0.45)` as their background color
- **AND** SHALL NOT retain the bundled `cm6-theme-basic-light` pure white (`#ffffff`) background

### Requirement: MDXEditor line-number gutter SHALL be transparent with a right divider

When `MarkdownEditorImpl` renders a code block inside a `.rich-text-editor` surface, the `.cm-gutters` element SHALL be transparent (so the gray code area shows through) and SHALL carry a `1px solid hsl(var(--border) / 0.35)` right border plus `padding-right: 0.5rem` and `min-width: 2rem` so the gutter reads as a thin numbered rail rather than a solid tinted column.

#### Scenario: Gutter is transparent with a divider

- **WHEN** a `freeForm` block editor renders a code block
- **THEN** the `.cm-gutters` background SHALL be transparent
- **AND** SHALL display a thin right-side border separator and `0.5rem` right padding between the digit and the code

### Requirement: MDXEditor line-number digit SHALL be vertically centered in its row

When `MarkdownEditorImpl` renders a code block inside a `.rich-text-editor` surface, the `.cm-lineNumbers .cm-gutterElement` SHALL use `display: flex; align-items: center; justify-content: flex-end` so the digit sits at the vertical midpoint of each row instead of CodeMirror's default `flex-start` top alignment.

#### Scenario: Line number centered vertically

- **WHEN** a `freeForm` block editor renders a code block with multiple lines
- **THEN** each line-number digit SHALL appear vertically centered relative to the row's line height
- **AND** SHALL NOT sit at the top of the row
