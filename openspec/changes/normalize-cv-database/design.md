## Context

Resumind persists CVs in `public.cv` with a single `data jsonb` column holding the full JSON Resume document. The Nest `CvItemService` loads the entire document for every section mutation (basics patch, work create, skill delete, etc.), clones it in memory, validates the whole resume, and writes the blob back. The web editor loads the full CV on mount even though each tab only renders one section.

The JSON Resume schema defines a singleton `basics` object (with nested `location` and `profiles[]`), twelve top-level array sections, and Resumind-specific `meta`. String-list fields (`work.highlights`, `education.courses`, `skills.keywords`, `projects.keywords`, `projects.roles`, `interests.keywords`) are arrays of strings in JSON but do not warrant separate relational tables at this scale.

Constraints: Supabase Postgres with RLS; SPA talks only to Nest (no direct Supabase from web); JSON Resume remains the interchange format for import, export, and schema validation; existing item-scoped REST routes and editor UX should remain stable where possible.

## Goals / Non-Goals

**Goals:**

- Normalize CV content into relational tables with one row per multi-valued entity and explicit `sort` ordering.
- Store string-list attributes as `jsonb` arrays on the parent entity row.
- Enable section-scoped reads and writes so editor views fetch only the data they need.
- Assemble a full JSON Resume document on demand for preview, export, import verification, and full-document validation.
- Preserve RLS isolation per user across all new tables.
- Document the relational model with an ER diagram and table dictionary in this file.
- Migrate existing `cv.data` rows to normalized tables with a reversible cutover plan.

**Non-Goals:**

- Normalizing string-list items (`highlights`, `courses`, `keywords`, `roles`) into child tables — they stay as `jsonb` on the parent row.
- Changing the JSON Resume interchange schema or public export format.
- Real-time collaboration or CRDT-based merging.
- Client-side direct Supabase access.
- Drag-and-drop reorder UI in this change (only the `sort` column and server support; UI reorder is a follow-up).

## Relational Model

### Entity-Relationship Diagram

```mermaid
erDiagram
    auth_users ||--o{ cv : owns
    cv ||--o| cv_basics : has
    cv_basics ||--o| cv_basics_location : has
    cv ||--o{ cv_basics_profile : contains
    cv ||--o{ cv_work : contains
    cv ||--o{ cv_volunteer : contains
    cv ||--o{ cv_education : contains
    cv ||--o{ cv_award : contains
    cv ||--o{ cv_certificate : contains
    cv ||--o{ cv_publication : contains
    cv ||--o{ cv_skill : contains
    cv ||--o{ cv_language : contains
    cv ||--o{ cv_interest : contains
    cv ||--o{ cv_reference : contains
    cv ||--o{ cv_project : contains

    cv {
        uuid id PK
        uuid user_id FK
        text title
        text meta_version
        text meta_canonical
        timestamptz meta_last_modified
        timestamptz created_at
        timestamptz updated_at
    }

    cv_basics {
        uuid cv_id PK_FK
        text name
        text label
        text image
        text email
        text phone
        text url
        text summary
    }

    cv_basics_location {
        uuid cv_id PK_FK
        text address
        text postal_code
        text city
        text country_code
        text region
    }

    cv_basics_profile {
        uuid id PK
        uuid cv_id FK
        int sort
        text network
        text username
        text url
    }

    cv_work {
        uuid id PK
        uuid cv_id FK
        int sort
        text name
        text location
        text description
        text position
        text url
        text start_date
        text end_date
        text summary
        jsonb highlights
    }

    cv_volunteer {
        uuid id PK
        uuid cv_id FK
        int sort
        text organization
        text position
        text url
        text start_date
        text end_date
        text summary
        jsonb highlights
    }

    cv_education {
        uuid id PK
        uuid cv_id FK
        int sort
        text institution
        text url
        text area
        text study_type
        text start_date
        text end_date
        text score
        jsonb courses
    }

    cv_award {
        uuid id PK
        uuid cv_id FK
        int sort
        text title
        text date
        text awarder
        text summary
    }

    cv_certificate {
        uuid id PK
        uuid cv_id FK
        int sort
        text name
        text date
        text url
        text issuer
    }

    cv_publication {
        uuid id PK
        uuid cv_id FK
        int sort
        text name
        text publisher
        text release_date
        text url
        text summary
    }

    cv_skill {
        uuid id PK
        uuid cv_id FK
        int sort
        text name
        text level
        jsonb keywords
    }

    cv_language {
        uuid id PK
        uuid cv_id FK
        int sort
        text language
        text fluency
    }

    cv_interest {
        uuid id PK
        uuid cv_id FK
        int sort
        text name
        jsonb keywords
    }

    cv_reference {
        uuid id PK
        uuid cv_id FK
        int sort
        text name
        text reference
    }

    cv_project {
        uuid id PK
        uuid cv_id FK
        int sort
        text name
        text description
        text start_date
        text end_date
        text url
        text entity
        text type
        jsonb highlights
        jsonb keywords
        jsonb roles
    }
```

### Table Dictionary

| Table                | Cardinality    | `sort` | `jsonb` string lists              | Notes                                                                                    |
| -------------------- | -------------- | ------ | --------------------------------- | ---------------------------------------------------------------------------------------- |
| `cv`                 | 1 per document | —      | —                                 | Header row; holds `title` and flattened `meta_*` columns; `data` dropped after migration |
| `cv_basics`          | 0–1 per CV     | —      | —                                 | Singleton; created empty on CV insert                                                    |
| `cv_basics_location` | 0–1 per CV     | —      | —                                 | Optional; FK to `cv_id` (same as basics)                                                 |
| `cv_basics_profile`  | 0–N            | yes    | —                                 | Ordered social profiles                                                                  |
| `cv_work`            | 0–N            | yes    | `highlights`                      | ISO8601 dates as text                                                                    |
| `cv_volunteer`       | 0–N            | yes    | `highlights`                      |                                                                                          |
| `cv_education`       | 0–N            | yes    | `courses`                         |                                                                                          |
| `cv_award`           | 0–N            | yes    | —                                 |                                                                                          |
| `cv_certificate`     | 0–N            | yes    | —                                 |                                                                                          |
| `cv_publication`     | 0–N            | yes    | —                                 |                                                                                          |
| `cv_skill`           | 0–N            | yes    | `keywords`                        |                                                                                          |
| `cv_language`        | 0–N            | yes    | —                                 |                                                                                          |
| `cv_interest`        | 0–N            | yes    | `keywords`                        |                                                                                          |
| `cv_reference`       | 0–N            | yes    | —                                 | Column `reference` holds the quote text                                                  |
| `cv_project`         | 0–N            | yes    | `highlights`, `keywords`, `roles` |                                                                                          |

**Indexes:** `(cv_id, sort)` on every multi-valued table; `(user_id, updated_at desc)` remains on `cv`. **RLS:** each child table policy joins to `cv` and checks `cv.user_id = auth.uid()`.

**Default `jsonb`:** string-list columns default to `'[]'::jsonb`; never `null` in application code.

## Decisions

### 1. Normalized tables instead of JSONB document blob

**Choice:** One Postgres table per JSON Resume section (plus basics split into singleton + location + profiles).

**Rationale:** Section-scoped SELECT/INSERT/UPDATE/DELETE; smaller write payloads; future reorder only touches `sort` values; clearer query plans for list endpoints.

**Alternatives considered:**

- Keep JSONB and add generated columns — still full-document rewrite on each mutation.
- JSONB per section on `cv` (`work jsonb`, `skills jsonb`) — partial improvement but no stable row ids and awkward RLS per section.

### 2. `sort` integer for ordering; API keeps numeric index paths

**Choice:** Each multi-valued row has `sort int not null`. Public REST paths remain `/cv/:cvId/work/:index` where `index` is the zero-based position after `ORDER BY sort ASC, id ASC`. Reordering in the future updates `sort` only.

**Rationale:** Matches current `cv-item-crud` contract; avoids breaking web client URL patterns. Stable internal `uuid` primary keys survive reorder without row replacement.

**Alternatives considered:**

- Expose row UUID in URLs — cleaner internally but breaking change for clients and e2e tests.
- Use `sort` as sparse gaps (10, 20, 30) — defer until drag-and-drop reorder ships.

### 3. String lists as `jsonb`, not child tables

**Choice:** `highlights`, `courses`, `keywords`, and `roles` stored as `jsonb` string arrays on the parent row, matching JSON Resume shape when assembled.

**Rationale:** User requirement; avoids join explosion for bullet lists; TagsInput already edits arrays on parent save; nested highlight/course CRUD routes become in-row array mutations (same API semantics).

### 4. Assembler / disassembler in `@resumind/types`

**Choice:** Add `assembleResume(cvRow, sections): Resume` and `disassembleResume(data): NormalizedCvPayload` used by API and migration.

**Rationale:** Single mapping between DB snake_case columns and JSON Resume camelCase; unit-testable round-trip; import flows write via disassembler.

### 5. Section-scoped GET routes (additive)

**Choice:** Add `GET /cv/:cvId/work`, `GET /cv/:cvId/skills`, etc., returning ordered section arrays. Keep `GET /cv/:id` assembling full document for dashboard list preview and export.

**Rationale:** Editor tabs load one section; list view may still need title + basics only (future `GET /cv/:id/summary` optional).

**Alternatives considered:**

- Web continues fetching full CV — simpler but misses read optimization goal.

### 6. Concurrency: CV-level `meta_version` on `cv` row

**Choice:** Move `meta.version` to `cv.meta_version` (text). Item mutations compare client version against `cv.meta_version`, bump on success, set `meta_last_modified`. Drop embedding version inside assembled `meta` only at API boundary via assembler.

**Rationale:** Preserves existing 409 conflict UX without validating entire document diff. Section rows do not carry separate versions in v1.

### 7. Validation strategy

**Choice:** Item DTO validation via class-validator on write; after mutation, optionally assemble and run JSON Resume schema validation before commit on create/import/bulk operations. Section-only PATCH validates entity shape against shared types.

**Rationale:** Full schema validation on every highlight edit is expensive; entity DTOs catch most errors; full validation on assemble for export/import.

### 8. Migration: backfill then drop `data`

**Choice:** Migration script reads each `cv.data`, disassembles into normalized rows in a transaction, verifies assembler round-trip equality (ignoring meta), then a follow-up migration drops `cv.data`.

**Rationale:** Clean cutover; rollback window keeps `data` column until verification passes in staging.

## Risks / Trade-offs

| Risk                                                | Mitigation                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Round-trip drift (JSON ↔ SQL)                       | Property-based or fixture tests for every section; migration verification step |
| RLS policy gaps on child tables                     | Mirror `cv` ownership check; e2e cross-tenant tests per table                  |
| API index vs sort mismatch after concurrent inserts | Return fresh ordered list + version after every mutation; 409 on stale version |
| Large jsonb arrays on project rows                  | Acceptable for resume scale; GIN index only if profiling shows need            |
| Migration failure on malformed legacy JSON          | Skip or quarantine rows with logged errors; manual fix playbook                |
| More joins for full document assembly               | Single CV read is rare (export/preview); cache optional later                  |

## Migration Plan

1. Add normalized tables and RLS policies (nullable coexistence with `cv.data`).
2. Ship assembler/disassembler + unit tests in `packages/types`.
3. Implement dual-write or backfill job: populate normalized tables from existing `cv.data`.
4. Switch `CvService` / `CvItemService` reads and writes to normalized tables.
5. Verify e2e suite and sample CV round-trip.
6. Drop `cv.data` column in final migration.
7. Rollback: re-enable JSONB reads from backup column if dual-write period retained; otherwise restore from Supabase backup.

## Open Questions

- Whether web refactors each editor tab to section GET in the same change or immediately after API ships section routes.
- Whether `GET /cv` list should return assembled `data` or a slim DTO (title, dates, basics name only) — recommend slim DTO in follow-up to reduce list payload.
- Sparse `sort` gap strategy when drag-and-drop reorder is implemented.
