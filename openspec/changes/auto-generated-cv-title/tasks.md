## 1. Shared title derivation

- [ ] 1.1 Add `deriveCvTitleFromBasics` to `packages/types` (export from package index)
- [ ] 1.2 Add colocated Vitest tests in `packages/types` for name+label, name-only, label-only, empty, and whitespace trim cases

## 2. API sync

- [ ] 2.1 Use `deriveCvTitleFromBasics` in `apps/api/src/cv/cv.service.ts` on create (after validating `data.basics`)
- [ ] 2.2 Update basics patch path (service or item handler) to persist derived `title` alongside `data` on every basics merge
- [ ] 2.3 Extend `apps/api/src/cv/cv.service.spec.ts` (and controller tests if needed) for create and basics-patch title derivation

## 3. Web — remove manual title UI

- [ ] 3.1 Remove CV title field from `apps/web/src/components/cv/create-cv-form.tsx`; adjust `onSave` payload to `{ basics }` only
- [ ] 3.2 Update `apps/web/src/app/dashboard/cv/new/new-cv-page-client.tsx` to call `createCv` without `title`
- [ ] 3.3 Replace `EditableCvTitle` in `apps/web/src/components/cv/cv-editor.tsx` with read-only derived title display (use `cv.title` from props or derive from loaded basics)
- [ ] 3.4 Simplify `apps/web/src/app/dashboard/cv/[id]/edit-cv-page-client.tsx` if title state/fetch is only for editable title
- [ ] 3.5 Delete `editable-cv-title.tsx` and its test file (or repurpose tests for read-only header component if retained)

## 4. Web — tests and cleanup

- [ ] 4.1 Update `create-cv-form.test.tsx` and `new-cv-page-client.test.tsx` — no title input, create payload without title
- [ ] 4.2 Ensure basics save refreshes or updates displayed document title in edit shell (response handling or local derive)
- [ ] 4.3 Run `pnpm test -- --run` for affected packages and fix failures

## 5. Verification

- [ ] 5.1 Manual smoke: create CV with name+label → dashboard card and edit header show `Name — Label`
- [ ] 5.2 Manual smoke: edit Basics name → title updates after save without separate title control
- [ ] 5.3 Run `pnpm verify` (or CI-equivalent lint, typecheck, test, build)
