## 1. Field coverage audit

- [ ] 1.1 Build a field matrix in `design.md` comments or inline in `tasks.md`: for each tab, list every `@resumind/types` field bound in `renderForm` and mark view coverage (present / missing)
- [ ] 1.2 Confirm Basics, Social profiles, Skills, Languages, Interests, and References are already at parity; note any remaining gap for follow-up in the same change

## 2. Work and Volunteer view updates

- [ ] 2.1 Update Work `renderView` in `apps/web/src/components/cv/cv-sections.tsx` to show `url` (meta or body) and `description` (body, after summary, before highlights) when non-empty
- [ ] 2.2 Update Volunteer `renderView` to show `url` when non-empty

## 3. Education, Projects, Awards view updates

- [ ] 3.1 Update Education `renderView` to show `url` and `score` in meta when non-empty
- [ ] 3.2 Update Projects `renderView` to show `url`, `entity`, and `type` when non-empty (labeled lines in meta or body per design)
- [ ] 3.3 Update Awards `renderView` to show `awarder` in meta when non-empty

## 4. Certificates and Publications view updates

- [ ] 4.1 Update Certificates `renderView` to show `url` when non-empty
- [ ] 4.2 Update Publications `renderView` to show `url` and `summary` in body when non-empty

## 5. Optional shared helpers

- [ ] 5.1 If URL or labeled scalar lines repeat ≥3 times after edits, extract minimal helpers (e.g. `ViewUrlLine`, `ViewLabeledLine`) under `apps/web/src/components/cv/`; otherwise keep inline

## 6. Link presentation coordination

- [ ] 6.1 If `clickable-links-new-tab` is merged, use `ExternalLink` for new URL view lines; if not merged, render plain text URLs and swap in a follow-up merge
- [ ] 6.2 If `markdown-view-rendering` is merged, ensure newly visible markdown fields (`description`, publication `summary`) use `MarkdownView` instead of raw `<p>`

## 7. Tests

- [ ] 7.1 Add colocated Vitest tests (e.g. `cv-sections-field-coverage.test.tsx`) that mount section view output with fully populated sample items for Work, Volunteer, Education, Projects, Awards, Certificates, and Publications
- [ ] 7.2 Assert each previously missing field appears in the document when set and is absent when empty
- [ ] 7.3 Run `pnpm --filter web test -- --run` and fix any failures

## 8. Manual verification

- [ ] 8.1 Load a CV with populated optional fields (or seed test data) and confirm each tab shows all saved values in view mode without entering Edit
