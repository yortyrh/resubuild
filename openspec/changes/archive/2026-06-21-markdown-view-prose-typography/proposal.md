## Why

`apps/web/src/components/cv/markdown-view.tsx` is the shared read-only renderer used by the Cover letter preview tab (`apps/web/src/components/applications/application-workspace.tsx`, line 336) and by every markdown-authored view field across the CV editor (Basics summary, Work summary/description/highlights, Volunteer summary/highlights, Project description/highlights, Award summary, Publication summary, Reference text). The current implementation only ships hand-rolled styles for paragraphs, lists, links, blockquotes, code blocks, and tables — headings (`<h1>` through `<h6>`) are unstyled, so a cover letter that begins with `## Greeting` or `## Closing` displays at body-text size instead of as a heading.

The recent `markdown-editor-free-form-mode` change makes headings a real authoring surface in the cover letter dialog (`## Greeting` renders as an `<h2>` inside the editor), so the read-only preview must visually match. Hand-rolling a heading scale that matches the rest of the app is redundant: `@tailwindcss/typography` already provides one, and it composes cleanly with the existing `.markdown-view` overrides via CSS layer ordering and the cascade.

This change retroactively documents work already implemented in the working tree that adopts `@tailwindcss/typography` and layers it onto the `MarkdownView` block variant.

## What Changes

- Add `@tailwindcss/typography@^0.5.20` as a dev dependency in `apps/web/package.json` and register it in `apps/web/src/app/globals.css` via `@plugin '@tailwindcss/typography';` next to the existing `tailwindcss-animate` registration.
- In `apps/web/src/components/cv/markdown-view.tsx`, layer `prose prose-sm max-w-none` onto the `markdown-view` wrapper class for the `block` variant only. The `inline` variant stays unchanged because it renders inside `<li>` highlight bullets where heavy prose spacing would break the existing CV list layout.
- In `apps/web/src/components/cv/markdown-view.test.tsx`, add two new tests that pin the prose layering: the block variant carries `prose`, `prose-sm`, and `max-w-none`; the inline variant does not.
- In `apps/web/src/app/globals.css`, add a `.markdown-view` CSS variable remap block (light + dark via `@media (prefers-color-scheme: dark)`) so the prose plugin's hardcoded colors follow the project's design tokens (`--foreground`, `--muted-foreground`, `--primary`, `--border`, `--muted`). Without this, dark-mode previews would render light-grey body text on the dark surface because the plugin only adapts to dark mode when paired with the `prose-invert` variant (which we don't apply — the app drives dark mode via media query).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cv-editor-ui`: the shared read-only `MarkdownView` component layers `@tailwindcss/typography` (`prose prose-sm max-w-none`) onto its `block` variant so headings, lists, links, blockquotes, code blocks, and tables pick up the typography plugin's sensible defaults. The `inline` variant remains prose-free so highlight bullets keep their tight, list-friendly layout. The block variant's color tokens (`--tw-prose-*` / `--tw-prose-invert-*`) are remapped to the project's design tokens inside `.markdown-view` so dark-mode previews stay readable.
- `application-workspace-tabs`: the Cover letter tab's read-only `MarkdownView` preview now renders the cover letter with `prose` typography, so headings authored with `## ` (which the cover letter dialog accepts via `freeForm` mode) display at heading size in the preview, matching what the editor shows.

## Impact

- `apps/web/package.json` — new dev dependency `@tailwindcss/typography@^0.5.20`.
- `apps/web/src/app/globals.css` — `@plugin '@tailwindcss/typography';` registration; new `.markdown-view` CSS variable remap block (light + dark) for `--tw-prose-*` / `--tw-prose-invert-*`.
- `apps/web/src/components/cv/markdown-view.tsx` — layer `prose prose-sm max-w-none` on the block variant's wrapper class; inline variant unchanged.
- `apps/web/src/components/cv/markdown-view.test.tsx` — two new tests asserting the block variant carries `prose` / `prose-sm` / `max-w-none` and the inline variant does not.
- `pnpm-lock.yaml` — lockfile entry for the new dev dependency.
