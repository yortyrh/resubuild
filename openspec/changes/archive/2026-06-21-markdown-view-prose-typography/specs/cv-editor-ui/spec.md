## ADDED Requirements

### Requirement: Block-variant MarkdownView SHALL layer `@tailwindcss/typography` so headings and other elements size correctly

The shared read-only `MarkdownView` component (`apps/web/src/components/cv/markdown-view.tsx`) SHALL layer the `@tailwindcss/typography` `prose` utility (specifically `prose prose-sm max-w-none`) onto its wrapper element when `variant === 'block'` (the default), so headings, ordered/unordered lists, links, blockquotes, tables, inline code, and preformatted code render with the typography plugin's sensible defaults. `max-w-none` strips the plugin's default 65ch cap so the rendered prose fills the available wrapper width.

The inline variant (`variant === 'inline'`) SHALL NOT carry the `prose` utility classes: highlight bullets and nested-string titles must keep their existing tight, list-friendly layout without prose-grade spacing.

The plugin's color palette MUST be remapped inside `.markdown-view` to the project's design tokens (`--foreground`, `--muted-foreground`, `--primary`, `--border`, `--muted`) for both light mode and dark mode (via `@media (prefers-color-scheme: dark)`), so block-mode previews stay readable on the project's surfaces in both color schemes.

#### Scenario: Block variant carries prose classes

- **WHEN** a consumer renders `<MarkdownView value={md} variant="block" />`
- **THEN** the wrapper element SHALL have the classes `markdown-view`, `prose`, `prose-sm`, and `max-w-none` in its `classList`
- **AND** SHALL NOT have `markdown-view--inline`

#### Scenario: Inline variant stays prose-free

- **WHEN** a consumer renders `<MarkdownView value={md} variant="inline" />`
- **THEN** the wrapper element SHALL have the classes `markdown-view` and `markdown-view--inline` in its `classList`
- **AND** SHALL NOT have `prose`, `prose-sm`, or `max-w-none`

#### Scenario: Headings in block variant render at prose-sm scale

- **WHEN** block-variant `MarkdownView` renders markdown that begins with `## Heading`
- **THEN** the rendered output SHALL contain an `<h2>` element sized by `@tailwindcss/typography` (`prose-sm` heading scale)

#### Scenario: Dark-mode block preview uses project foreground color

- **WHEN** the user's `prefers-color-scheme` is `dark`
- **THEN** the prose body text inside a `.markdown-view` block variant SHALL use `hsl(var(--foreground))` (not the plugin's hardcoded light palette)
- **AND** the prose headings inside a `.markdown-view` block variant SHALL also use `hsl(var(--foreground))`
