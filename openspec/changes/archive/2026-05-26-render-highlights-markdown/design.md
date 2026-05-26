## Context

The CV editor stores highlight bullets (Work, Volunteer, Projects) as Markdown strings via inline Wysimark editors (`StringListField` with `markdown`). View mode uses `highlightBody()` in `cv-sections.tsx`, which currently maps each value to a plain `<li>{value}</li>`. The shared `MarkdownView` component (`react-markdown` + `remark-gfm` + `rehype-sanitize`) already exists and is wired for block fields (summaries, descriptions) but was never connected to `highlightBody`. The `cv-editor-ui` spec already requires formatted highlight preview; this change closes the implementation gap.

Education `courses` use plain text inputs and MUST remain plain text in view mode.

## Goals / Non-Goals

**Goals:**

- Render Work, Volunteer, and Projects highlight bullets through `MarkdownView` with `variant="inline"`.
- Preserve existing list structure (`<ul className="list-disc ...">`) and resume-preview density.
- Add automated tests that fail if raw Markdown syntax appears in highlight output.
- Reuse existing sanitization and external-link policy from `MarkdownView`.

**Non-Goals:**

- Changing edit-mode Wysimark configuration or highlight CRUD APIs.
- Rendering Education courses as Markdown (plain text only).
- New dependencies or CSS beyond existing `.markdown-view--inline` styles.
- Public resume export / PDF rendering.

## Decisions

### 1. Update `highlightBody` only; add optional `markdown` flag

**Choice:** Extend `highlightBody(values, { markdown?: boolean })` defaulting `markdown: false`. Pass `markdown: true` for Work/Volunteer/Projects highlights; keep default for Education courses.

**Rationale:** Single helper serves both highlight lists and course lists without duplicating markup. Explicit flag prevents accidentally rendering plain course names as Markdown.

**Alternatives considered:**

- **Separate `markdownHighlightBody` helper:** Clearer naming but duplicates list markup.
- **Always use MarkdownView:** Would mis-render course strings containing `*` or `_`.

### 2. Use existing `MarkdownView` inline variant inside `<li>`

**Choice:** Each list item wraps `<MarkdownView value={value} variant="inline" />`.

**Rationale:** Matches archived `markdown-view-rendering` design and existing `cv-editor-ui` scenarios. Inline variant avoids block-level `<p>` margins inside bullets.

### 3. Colocated integration test on `highlightBody`

**Choice:** Export `highlightBody` for testing (or test via a minimal render helper in `cv-sections.test.tsx`) asserting bold text renders as `<strong>` and raw `**` does not appear.

**Rationale:** Prevents regression; unit tests on `MarkdownView` alone do not cover the wiring gap.

## Risks / Trade-offs

- **[Risk] Double list nesting if highlight Markdown contains list syntax** → Mitigation: Wysimark inline toolbar excludes list tools; inline variant CSS keeps nested lists compact if present.
- **[Risk] Escaped characters (e.g. `\%`) display literally** → Mitigation: Expected Markdown behavior; authors can remove unnecessary escapes in editor.
- **[Trade-off] Slightly heavier DOM per bullet** → Acceptable for correct preview; bullet counts are small.

## Migration Plan

1. Update `highlightBody` and call sites in `cv-sections.tsx`.
2. Add/update Vitest coverage.
3. Run `pnpm --filter @resumind/web test -- --run`.
4. Manual smoke test on Work tab with bold highlight (as in screenshot).

**Rollback:** Revert `highlightBody` to plain text; no data migration.

## Open Questions

None blocking.
