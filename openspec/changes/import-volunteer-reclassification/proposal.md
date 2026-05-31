> This change retroactively documents work already implemented in the working tree.

## Why

PDF and agent imports often place unpaid or volunteer roles in `work[]` even when the résumé text clearly labels them as volunteer (for example, a summary starting with "Volunteer/part-time role…"). Authors then see misclassified entries under Work in the editor and must fix them manually.

## What Changes

- Extend `prepareImportedResume` in `@resumind/types` to move misclassified work entries into `volunteer[]` using deterministic text heuristics and field mapping (`name` → `organization`, merge `description` into `summary`, omit work-only fields).
- Export `reclassifyVolunteerWorkEntries` for targeted use and colocated Vitest coverage (including a Kitchen Assistant / Good Shepherd fixture and a false-positive guard when the employer name contains "Volunteer").
- Update PDF/text and website import agent draft prompts so the LLM places volunteer/unpaid roles in `volunteer[]` and paid employment in `work[]`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cv-json-import`: `prepareImportedResume` SHALL reclassify volunteer work entries before create/preview.
- `resume-import-agent`: Text and website draft instructions SHALL direct volunteer vs paid employment into the correct JSON Resume sections.

## Impact

- **packages/types**: `prepare-imported-resume.ts`, `prepare-imported-resume.test.ts`
- **apps/import-agent**: `pdf-import.workflow.ts`, `website-import.workflow.ts`
- **All import paths** that call `prepareImportedResume` (JSON file, PDF, Markdown, image, DOCX, website URL preview) inherit reclassification on preview and create
