## Why

Date-primary CV sections (Work, Volunteer, Education, Projects, Awards, Certificates, Publications) currently sort primarily by **start date**, which misorders ongoing roles and does not match how authors expect CVs to read (most recent experience first, with current roles at the top). Date display also omits a clear "Current" label when `endDate` is unset, and required-date validation is inconsistent between sections.

## What Changes

- Change list ordering for Work, Volunteer, Education, and Projects to **`end_date` descending**, with **missing `end_date` treated as ongoing** and listed **before** dated entries; use `start_date` descending and `id` ascending as tiebreakers.
- Change list ordering for Awards and Certificates to **`date` descending**; Publications to **`release_date` descending** (unchanged primary key, clarified contract).
- Display date ranges in the editor as `{startDate} – Current` when `endDate` is absent (e.g. `2000-10-12 – Current`).
- **Enforce required dates in the editor UI** on user create/edit:
  - Work, Volunteer, Education, Projects: **`startDate` required** (not enforced for AI/import payloads).
  - Awards, Certificates, Publications: **`date` / `releaseDate` required on creation**.
- **Re-sort section lists in the client** whenever a date field changes in the form (before save) and after successful create/update/delete API responses (server order is authoritative).
- Update shared `sort*Rows` helpers in `packages/types` and API list/assembly paths to match the new ordering contract.
- Update unit tests and E2E scenarios that assert `start_date`-primary work ordering.

## Capabilities

### New Capabilities

<!-- None — sorting and validation extend existing CV editor and schema behavior -->

### Modified Capabilities

- `cv-normalized-schema`: Date-primary section ordering rules change from `start_date DESC` primary to `end_date DESC NULLS FIRST` (and equivalent for single-date sections).
- `cv-editor-ui`: Date range display with "Current", required date fields on user forms, and client-side re-sort when dates change.
- `cv-item-crud`: Editor validation requirements for required start/date fields; list order expectations after mutations.
- `web-application`: Client section state SHALL re-sort date-primary arrays using shared sort helpers after date edits and successful mutations.

## Impact

- **packages/types**: `sortWorkRows`, `sortVolunteerRows`, `sortEducationRows`, `sortProjectRows` (and tests); new or updated `formatDateRange` helper export if shared.
- **apps/api**: `cv-normalized.repository` list queries (if DB order differs from in-memory sort); item DTO validation optional for user-facing routes only; unit and E2E tests for work list order.
- **apps/web**: Section components (`work-section`, `volunteer-section`, `education-section`, `projects-section`, `awards-section`, `certificates-section`, `publications-section`), `cv-section-helpers`, `managed-array-section` (or section-specific save hooks), `IsoDateField` optional `required` prop.
- **Templates/export**: Preview and export consume assembled order from API — no separate sort logic expected if API is correct.
- **E2E**: `local-supabase.e2e-spec.ts` work ordering scenario must be updated to assert `end_date`-primary behavior.
