## 1. Types — volunteer reclassification

- [x] 1.1 Add `reclassifyVolunteerWorkEntries` and volunteer detection/mapping helpers in `packages/types/src/prepare-imported-resume.ts`
- [x] 1.2 Invoke reclassification at end of `prepareImportedResume`
- [x] 1.3 Colocated Vitest: Kitchen Assistant volunteer move, employer-name false positive, existing normalize tests

## 2. Import agent prompts

- [x] 2.1 Update `DRAFT_INSTRUCTIONS` in `apps/import-agent/src/workflows/pdf-import.workflow.ts`
- [x] 2.2 Update `WEBSITE_DRAFT_INSTRUCTIONS` in `apps/import-agent/src/workflows/website-import.workflow.ts`

## 3. Verification

- [x] 3.1 Run `pnpm --filter @resumind/types test -- --run`

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth, CV CRUD, import preview/create flows; no new routes or UI

### Update required

_None — behavior change is in shared normalization and agent prompts; existing import E2E paths remain valid._
