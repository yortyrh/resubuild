## Why

The CV document title duplicates information already captured in JSON Resume `basics.name` and `basics.label`. Authors must maintain the same identity twice—once in Basics and again via a separate editable title—which drifts out of sync and adds unnecessary UI (title field on create, `EditableCvTitle` on edit, independent PATCH). The dashboard list and edit shell should reflect the person's name and professional label from Basics automatically.

## What Changes

- **Remove manual title editing** from the CV edit shell (`EditableCvTitle` and title-only PATCH from the UI).
- **Remove the CV title field** from the new-CV create form; authors enter identity only via Basics **Name** and **Label**.
- **Derive `cv.title` automatically** from `basics.name` and `basics.label` using a shared formatter (e.g. `"Jane Doe — Software Engineer"`, name-only when label is empty, **Untitled CV** when both are empty).
- **Sync title on basics mutations**: whenever basics are created or updated (create CV, `PATCH /cv/:id/basics`), the API SHALL recompute and persist `cv.title` from the resulting basics snapshot.
- **Display derived title** read-only in the edit shell header and continue using `cv.title` in the dashboard CV list (now always in sync with Basics).
- **BREAKING**: Clients can no longer set an arbitrary document title independent of Basics; `PATCH` with `title` alone becomes unnecessary for the web app (API may retain the field for backward compatibility but the product no longer exposes it).

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `cv-editor-ui`: Replace editable document title with read-only display derived from Basics name/label; remove title edit scenarios.
- `web-application`: New-CV flow collects Basics only (no separate title field); create payload derives title server-side from basics.
- `cv-rest-api`: Service SHALL derive and persist `cv.title` from `data.basics.name` and `data.basics.label` on create and on basics patch; document title-only PATCH as deprecated for product clients.

## Impact

- **Shared**: New helper in `packages/types` (e.g. `deriveCvTitleFromBasics`) used by API and optionally web for display consistency.
- **API**: `cv.service.ts` create/update/basics paths recompute title; tests for derivation edge cases.
- **Web**: Remove `editable-cv-title.tsx` usage; simplify `create-cv-form.tsx`, `cv-editor.tsx`, `edit-cv-page-client.tsx`; update dashboard list if needed; remove or repurpose colocated title tests.
- **Specs/tests**: Delta updates to `cv-editor-ui`, `web-application`, `cv-rest-api`; Vitest and Jest coverage for formatter and sync behavior.
- **Database**: No schema change (`title` column retained as denormalized display string).
