## Why

Authors often already have a CV as a JSON Resume file (from [jsonresume.org](https://jsonresume.org), CLI export, or third-party tools). Today they must re-enter everything manually through the Basics-only create form. Importing a conforming JSON Resume file lets users onboard in one step and aligns with Resumind's core data model.

## What Changes

- Add an **Import from JSON** path on the new-CV flow (`/dashboard/cv/new`) that accepts a `.json` file (and optionally pasted JSON text).
- Parse the file client-side, **normalize** imported payload (strip foreign `$schema` / `meta`, ensure expected section arrays), then create a CV via the existing `POST /cv` with the full resume `data`.
- Surface **clear validation errors** when JSON is malformed or fails JSON Resume schema validation (400 from API).
- After successful import, navigate to `/dashboard/cv/:id` for editing—same as manual create.
- Add a shared **`prepareImportedResume`** helper in `packages/types` with colocated tests, used by the web client before `createCv`.
- Sample fixtures under `.samples/resumes/jsonresume/` SHALL remain valid import targets for manual and E2E smoke tests.

## Capabilities

### New Capabilities

- `cv-json-import`: Normalization of external JSON Resume documents, client import UX, and end-to-end create-from-file behavior.

### Modified Capabilities

- `web-application`: New-CV route exposes import UI alongside manual Basics create; documents import success and error handling.
- `cv-rest-api`: Clarify that `POST /cv` accepts a full imported resume body (all sections), not only `basics`; imported foreign `meta` is replaced by server meta helpers.

## Impact

- **packages/types**: New `prepareImportedResume` (and export from package index) with Vitest coverage.
- **apps/web**: Import component on `/dashboard/cv/new`, updates to `create-cv-form` page layout, `api.ts` usage unchanged except payload shape; colocated component tests.
- **apps/api**: No new routes required; existing create + `ResumeSchemaValidator` path handles import. Optional doc/test updates for full-document create.
- **Specs/tests**: New `cv-json-import` spec; deltas for `web-application` and `cv-rest-api`; Vitest + manual smoke with sample JSON files.
