## 1. Work section inline highlights

- [x] 1.1 In `apps/web/src/components/cv/cv-sections.tsx`, add `StringListField` for `highlights` to Work `renderForm` with `markdown={true}` and helper description for achievement bullets
- [x] 1.2 Remove Work `renderAfterView` block and `ManagedNestedStrings` usage for work highlights
- [x] 1.3 Confirm Work create/update payload includes trimmed `highlights` array via existing `toPayload`

## 2. Volunteer section inline highlights

- [x] 2.1 Add `StringListField` for `highlights` to Volunteer `renderForm` with `markdown={true}`
- [x] 2.2 Remove Volunteer `renderAfterView` and nested highlight UI

## 3. Projects section inline highlights

- [x] 3.1 Add `StringListField` for `highlights` to Projects `renderForm` with `markdown={true}` and existing Highlights hint copy
- [x] 3.2 Remove Projects `renderAfterView` and nested highlight UI

## 4. Education section inline courses

- [x] 4.1 Add `StringListField` for `courses` to Education `renderForm` (plain text, no markdown)
- [x] 4.2 Remove Education `renderAfterView` and nested course UI

## 5. Cleanup and verification

- [x] 5.1 Remove unused imports from `cv-sections.tsx` (`ManagedNestedStrings`, nested highlight/course API helpers if unreferenced)
- [x] 5.2 Delete `apps/web/src/components/cv/managed-nested-strings.tsx` if no remaining imports; otherwise leave for follow-up
- [x] 5.3 Manual QA: create/edit/cancel Work, Volunteer, Education, and Projects entries with multiple list items; verify view-mode bullets and single parent Save persistence
- [x] 5.4 Run `pnpm --filter web test -- --run` for any affected component tests
