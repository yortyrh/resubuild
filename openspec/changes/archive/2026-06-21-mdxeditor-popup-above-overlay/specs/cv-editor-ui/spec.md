## ADDED Requirements

### Requirement: MarkdownEditor SHALL tag MDXEditor with mdxeditor-theme so its portalized popup container renders above ancestor overlays

The shared `MarkdownEditorImpl` wrapper (`apps/web/src/components/cv/markdown-editor-impl.tsx`) SHALL pass `className="mdxeditor-theme"` to the `MDXEditor` element it renders. `@mdxeditor/editor` copies that token onto the `.mdxeditor-popup-container` div it creates on mount and appends to `document.body` (the popup container is a sibling of the editor, not a descendant).

The global stylesheet (`apps/web/src/app/globals.css`) SHALL raise the popup container's z-index above any ancestor overlay (Radix dialog, drawer, popover) using the compound selector `.mdxeditor-popup-container.mdxeditor-theme { z-index: 200 !important; }` so that the Block-type select dropdown, the Link dialog, and the table grid picker are all reachable when the editor is mounted inside such an overlay (notably the cover-letter edit dialog at `z-50`).

The compound selector is required because the popup container is a sibling of the editor under `document.body`, not a descendant — a descendant selector (`.mdxeditor-theme .mdxeditor-popup-container`) would never match.

#### Scenario: Block-type select dropdown is reachable inside the cover-letter dialog

- **WHEN** the cover-letter edit dialog is open and the user clicks the Block-type select trigger
- **THEN** the Block-type select dropdown SHALL appear visibly above the dialog overlay
- **AND** SHALL list the available block types (Paragraph, Quote, and Heading 1–6 in `freeForm` mode; Paragraph and Quote in the constrained block variant) so the user can pick one

#### Scenario: Link dialog and table grid picker render above the cover-letter dialog overlay

- **WHEN** the cover-letter edit dialog is open and the user activates the Link button or the Insert table action
- **THEN** the Link dialog or table grid picker SHALL appear visibly above the dialog overlay
- **AND** SHALL NOT be clipped or covered by the overlay's semi-transparent backdrop

#### Scenario: MarkdownEditorImpl forwards the mdxeditor-theme token to MDXEditor

- **WHEN** a consumer mounts a `<MarkdownEditor variant="block" onChange={fn} />` (with or without `freeForm`)
- **THEN** the underlying `MDXEditor` element SHALL receive `className` containing the `mdxeditor-theme` token

#### Scenario: Popup container carries the mdxeditor-theme token at runtime

- **WHEN** the `MDXEditor` mounts in the DOM
- **THEN** the `.mdxeditor-popup-container` element appended to `document.body` SHALL carry the `mdxeditor-theme` class alongside the editor's own `mdxeditor` and MDXEditor module-scoped classes
