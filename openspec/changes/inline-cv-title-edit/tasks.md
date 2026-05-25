## 1. Editable title component

- [ ] 1.1 Add `apps/web/src/components/cv/editable-cv-title.tsx` with view/edit state (`editing`, `draft`, `saving`), view row (title + **Edit**), and edit row (input + **Save** / **Cancel**)
- [ ] 1.2 Wire save to `updateCv(cvId, { title })` with existing toast success/error messages; on success commit title and exit edit mode
- [ ] 1.3 Implement cancel revert, Enter-to-save, Escape-to-cancel, and disabled actions while saving

## 2. Integrate into CvEditor

- [ ] 2.1 Replace persistent `Label` + `Input` + **Save title** block in `cv-editor.tsx` with `EditableCvTitle`
- [ ] 2.2 Remove unused `savingTitle` / `saveTitle` logic from `cv-editor.tsx` after extraction

## 3. Tests

- [ ] 3.1 Add colocated `editable-cv-title.test.tsx` covering view default, edit/save/cancel flows, and API mock for `updateCv`
- [ ] 3.2 Run `pnpm --filter web test -- --run` for new and affected tests

## 4. Verification

- [ ] 4.1 Manually verify edit page: view shows title + Edit; edit shows input; Save persists; Cancel reverts; no standalone **Save title** button
