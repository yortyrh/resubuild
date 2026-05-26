## 1. Wire highlight view rendering

- [x] 1.1 Update `highlightBody()` in `apps/web/src/components/cv/cv-sections.tsx` to accept an optional `{ markdown?: boolean }` flag and render each bullet with `<MarkdownView variant="inline" />` when `markdown` is true
- [x] 1.2 Pass `markdown: true` to `highlightBody()` for Work, Volunteer, and Projects highlight lists; keep plain text rendering for Education `courses`

## 2. Tests

- [x] 2.1 Add colocated tests (e.g. `apps/web/src/components/cv/cv-sections-highlight.test.tsx`) asserting bold highlight text renders as emphasis and literal `**` does not appear in output
- [x] 2.2 Extend `apps/web/src/components/cv/cv-sections-field-coverage.test.tsx` if needed so Work view rows with markdown highlights assert formatted output

## 3. Verification

- [x] 3.1 Run `pnpm --filter @resumind/web test -- --run` and fix any failures
- [x] 3.2 Manual smoke test: open Work tab view mode with a highlight containing bold text; confirm formatted output matches edit-mode preview
