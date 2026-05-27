## Why

Resumind stores each CV as a monolithic JSONB document in `public.cv.data`. Every item mutation loads, clones, validates, and rewrites the entire document, which is inefficient as CVs grow and blocks section-scoped reads for editor views. A normalized relational model lets each editor tab fetch and persist only its slice, while full JSON Resume assembly remains available for preview, export, and import flows.

## What Changes

- Replace the single `data jsonb` blob with normalized Postgres tables for `basics` (including nested `location` as `jsonb`), `basics_profile`, and one table per top-level JSON Resume array section (`cv_work`, `cv_education`, etc.).
- Add a `sort` integer column on non-date multi-valued entity tables only (`cv_basics_profile`, `cv_skill`, `cv_language`, `cv_interest`, `cv_reference`); auto-assign on create. Date-primary sections (`cv_work`, `cv_volunteer`, `cv_education`, `cv_award`, `cv_certificate`, `cv_publication`, `cv_project`) list by their date fields instead.
- Add reorder API endpoints for the five `sort`-backed sections.
- Store string-list fields (`highlights`, `courses`, `keywords`, `roles`) as `jsonb` arrays on their parent row instead of child tables.
- Introduce a server-side assembler that builds a full JSON Resume document from normalized rows only when needed (export, preview, schema validation on full document, import bulk write).
- Refactor `CvItemService` and related persistence to read/write individual tables per section instead of mutating `cv.data`.
- Add a data migration that converts existing `cv.data` JSONB rows into normalized tables; drop or deprecate the `data` column after cutover.
- Document the relational model (ER diagram and table dictionary) in `design.md`.

**BREAKING**: Internal persistence shape changes; existing direct Supabase queries against `cv.data` will no longer work. Public REST routes remain stable, but optimistic concurrency may move from document-level `meta.version` to row-level `updated_at` / section versioning (see design).

## Capabilities

### New Capabilities

- `cv-normalized-schema`: Relational table definitions, column types, ordering rules (`sort` vs date fields), jsonb string-list columns, foreign keys, indexes, and RLS policies for all CV section tables.

### Modified Capabilities

- `database-cv-rls`: CV storage moves from a single JSONB column to normalized tables with per-table RLS tied to `cv.user_id`.
- `cv-rest-api`: Item routes query and mutate normalized tables; full-document endpoints assemble JSON Resume on read; create/import bulk-insert normalized rows.
- `cv-item-crud`: Persistence semantics shift from array-index-in-JSON to stable row ids; date sections order by date fields, non-date sections use explicit `sort`; API paths keep numeric indices for compatibility.
- `resume-schema-validation`: Validation runs on assembled document at write boundaries; section-scoped writes validate the affected entity DTO plus optional full-document check on export.

## Impact

- **Database**: New Supabase migrations under `supabase/migrations/`; data backfill from existing `cv.data`.
- **API**: `CvService`, `CvItemService`, controllers, and e2e tests in `apps/api/`.
- **Web**: Editor sections may fetch section-scoped data instead of full CV (optional follow-up within same change if API adds section GET routes).
- **Types**: `@resumind/types` assembler/disassembler helpers; possible stable entity id types.
- **Related changes**: `import-jsonresume-cv` and `import-pdf-resume` should bulk-write normalized tables instead of JSONB blob once this lands.
- **Testing**: Migration tests, assembler round-trip tests, item CRUD e2e against normalized storage.
