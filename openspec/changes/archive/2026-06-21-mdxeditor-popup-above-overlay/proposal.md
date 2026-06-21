## Why

The cover-letter edit dialog hosts a `MarkdownEditor` inside a Radix dialog
(`z-50`), and clicking the **Block type** select (or the Link dialog, table
grid picker, etc.) opens a dropdown that appears under the dialog overlay —
the user sees a closed dropdown with no options rendered. The Block-type
dropdown is the most visible symptom, but every MDXEditor floating surface
(Block-type select, Link dialog, table grid picker) shares the same portal and
suffers the same fate.

This change retroactively documents the fix already implemented in the working
tree: tag `MDXEditor` with a stable `mdxeditor-theme` class so the dynamically
appended `.mdxeditor-popup-container` (a sibling of the editor under
`document.body`, not a descendant) gets a stable selector that the global
stylesheet can raise above the dialog overlay.

## What Changes

- `apps/web/src/components/cv/markdown-editor-impl.tsx` passes
  `className="mdxeditor-theme"` to `MDXEditor`. `@mdxeditor/editor` copies that
  token onto the dynamically-appended `.mdxeditor-popup-container` div it
  creates on mount.
- `apps/web/src/app/globals.css` adds a compound selector
  `.mdxeditor-popup-container.mdxeditor-theme { z-index: 200 !important; }`
  so the portal lands above the Radix dialog overlay (`z-50`).
- `apps/web/src/components/cv/markdown-editor-impl.test.tsx` captures the
  `className` prop on the mocked `MDXEditor` and asserts the
  `mdxeditor-theme` token is passed.

The popup container must be a **sibling** of the editor, not a descendant, so
the compound selector is the right tool. The original bug report's suggested
descendant selector would have been a no-op because the popup lives under
`document.body` and the editor is nested deep in the dialog tree.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cv-editor-ui`: new requirement ensuring the markdown editor's portalized
  popup container (Block-type dropdown, Link dialog, table grid picker) is
  rendered above any ancestor overlay (Radix dialog, drawer, popover) so its
  content is reachable when the editor is mounted inside one of those
  surfaces.

## Impact

- `apps/web/src/components/cv/markdown-editor-impl.tsx` — adds a `className`
  prop to the `MDXEditor` element.
- `apps/web/src/components/cv/markdown-editor-impl.test.tsx` — expands the
  mock to record `className` and adds a regression test pinning the
  `mdxeditor-theme` token.
- `apps/web/src/app/globals.css` — adds one new selector block (~13 lines,
  including the rationale comment).

No runtime dependency changes, no API changes, no migration. The fix is
contained to the editor wrapper and the global stylesheet.
