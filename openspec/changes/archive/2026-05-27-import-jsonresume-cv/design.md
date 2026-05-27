## Context

Resumind stores CVs as JSON Resume documents in `public.cv.data`, validated server-side against `packages/schemas/resume.schema.json` (official [JSON Resume schema](https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json)). Creating a CV today requires manual Basics entry on `/dashboard/cv/new`; `POST /cv` already accepts a full `data` object and applies Resumind-specific `meta` via `applyResumeMetaForCreate`.

Sample files in `.samples/resumes/jsonresume/` demonstrate real-world imports: full sections, external `basics.image` URLs, and occasional `$schema` / foreign `meta` fields that must not be persisted verbatim.

## Goals / Non-Goals

**Goals:**

- Let signed-in users create a CV by uploading or pasting a JSON Resume file.
- Reuse existing `POST /cv` + schema validation—no parallel persistence path. After `normalize-cv-database`, `CvService.create` writes normalized rows via `disassembleResume` internally; importers still send assembled JSON Resume `data`.
- Normalize imported payloads in `@resumind/types` so web (and future API clients) share one import contract.
- Show actionable errors for invalid JSON and schema validation failures.
- Navigate to the editor after successful import with server-derived title from basics.

**Non-Goals:**

- Import into an **existing** CV (overwrite / merge)—create-only for v1.
- Bulk import of multiple files.
- Client-side AJV validation (server remains authoritative; client only parses JSON).
- Re-hosting external profile images during import (keep imported `basics.image` URL as-is if valid).
- Supporting non–JSON Resume formats (PDF, DOCX, LinkedIn export).

## Decisions

### 1. Reuse `POST /cv` instead of a dedicated import endpoint

**Choice:** Web calls existing `createCv({ data: prepared })` after normalization.

**Rationale:** Create flow already inserts a row, applies meta, validates, and derives title. Import is “create with a pre-filled document.”

**Alternatives considered:**

- `POST /cv/import` — duplicate service logic without benefit.
- Multipart upload to API — unnecessary; JSON fits in request body.

### 2. Shared normalizer: `prepareImportedResume(raw: unknown): Record<string, unknown>`

**Choice:** Add to `packages/types`:

- Require top-level object (throw typed error if not).
- Strip `$schema` and incoming `meta` (server overwrites meta on create).
- Deep-copy known resume sections; default missing array sections to `[]` (work, education, skills, etc.) using the same keys as `createEmptyResume()`.
- Pass through `basics` and all valid JSON Resume sections unchanged (no field renaming).

**Rationale:** Imported files omit empty arrays or include stale meta/canonical URLs from other hosts. Central helper keeps web thin and enables future server-side reuse.

**Alternatives considered:**

- Normalize only in web component — duplicates logic, untested in isolation.
- Strict reject if sections missing — poor UX; empty arrays are schema-valid.

### 3. Import UI on `/dashboard/cv/new` as a second mode

**Choice:** Page layout with two paths: **Create manually** (existing `CreateCvForm`) and **Import JSON** (new `ImportCvForm` or section). Use tabs or stacked cards—match existing dashboard styling (shadcn).

Import form includes:

- Hidden file input (`accept=".json,application/json"`) with visible “Choose file” button.
- Optional textarea for paste-then-import (same code path after parse).
- Max file size guard (e.g. 1 MB) before read.
- Submit creates CV; cancel returns to dashboard without POST.

**Rationale:** New CV is the natural entry point; avoids cluttering dashboard list.

### 4. Error handling layers

**Choice:**

| Failure               | UX                                  |
| --------------------- | ----------------------------------- |
| Invalid JSON syntax   | Inline message: “Invalid JSON file” |
| Not an object         | “Resume must be a JSON object”      |
| API 400 schema errors | Show API `errors[]` paths/messages  |
| Network / 401         | Existing `apiFetch` error strings   |

**Rationale:** Users need to fix source files; surfacing AJV paths matches API behavior.

### 5. No create on page load (unchanged rule)

**Choice:** Import still requires explicit user action (file select + Import button). Selecting a file alone does not POST until confirmed.

**Rationale:** Consistent with manual create; prevents accidental imports.

### 6. Title derivation unchanged

**Choice:** Rely on existing `deriveCvTitleFromBasics` after create—no client-sent `title`.

**Rationale:** Already implemented; import may populate full basics immediately.

## Risks / Trade-offs

- **[Large or malicious JSON files]** → Client size limit + server body limit; parse in try/catch.
- **[External image URLs break later]** → Document as known limitation; users can re-upload via Basics photo control.
- **[Imported empty-string URIs fail validation]** → API returns 400; user edits in editor or fixes source file. Optional follow-up: extend normalizer to strip empty strings like `sanitizeResumeItemPayload`.
- **[Schema version drift]** → Shared schema in `packages/schemas`; bump when JSON Resume schema updates.

## Migration Plan

1. Ship `prepareImportedResume` + tests in `packages/types`.
2. Ship web import UI on new-CV page.
3. No database migration.
4. Rollback: hide import UI; helper unused but harmless.

## Open Questions

- None blocking v1. Future: “Import into existing CV” as separate change; optional client-side schema preview with AJV in web.
