## 1. Wire mdxeditor-theme into the editor wrapper

- [x] 1.1 Add `className="mdxeditor-theme"` to the `MDXEditor` element in `apps/web/src/components/cv/markdown-editor-impl.tsx` with a comment explaining that `@mdxeditor/editor` copies the token onto the dynamically-appended `.mdxeditor-popup-container` under `document.body`.

## 2. Add the global popup z-index rule

- [x] 2.1 Add the compound selector `.mdxeditor-popup-container.mdxeditor-theme { z-index: 200 !important; }` to `apps/web/src/app/globals.css` in the MDXEditor section, with a comment block explaining why the compound selector is required (the popup container is a sibling of the editor, not a descendant).

## 3. Pin the fix with a regression test

- [x] 3.1 Extend the `MDXEditor` mock in `apps/web/src/components/cv/markdown-editor-impl.test.tsx` to capture the `className` prop on a new `data-class-name` attribute on the rendered test root.
- [x] 3.2 Add a test asserting that mounting `<MarkdownEditorImpl value="" onChange={fn} variant="block" />` forwards `className="mdxeditor-theme"` to the underlying `MDXEditor`.

## 4. Verify

- [x] 4.1 Run `pnpm vitest run` in `apps/web` and confirm the new test plus the full suite pass (644/644 expected).
- [x] 4.2 Run `pnpm lint` and `pnpm typecheck` at the repo root and confirm both are clean.

## E2E test impact

Per `openspec/specs/e2e-testing/spec.md`, this change touches only the editor wrapper's CSS class wiring and the global stylesheet. There is no behavior change that would alter the Supabase / Nest / Storage E2E contract.

- **Must pass unchanged** — none. The change has no impact on any E2E spec.
- **Update required** — none.
- **Add** — none. The cover-letter editor still mounts and saves correctly under local Supabase; the dropdown is now reachable visually but the underlying mutation contract is unchanged.
