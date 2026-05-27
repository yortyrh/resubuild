## Context

The API threads `meta.version` through mutations and stores `meta_version`, `meta_canonical`, and `meta_last_modified` on the `cv` row. Slim reads expose `data.meta` via `headerToSlimCvData` / `metaFromCvHeader`. The web editor loads `meta.version` for optimistic concurrency. All of this supported monolithic JSON document semantics; normalized row-level CRUD makes it redundant. Export (future) may need canonical URL, lastModified, and schema `meta` again—that is explicitly out of scope now.

## Goals / Non-Goals

**Goals:**

- Remove version parameters, assertions, bumps, and 409 paths.
- Remove `meta` from all management API response `data` envelopes.
- Stop reading/writing `meta_*` columns in application code.
- Delete `resume-meta.ts` and dependent imports.
- Simplify mutation and read code paths.

**Non-Goals:**

- Dropping `meta_*` columns via migration (defer to export work or cleanup migration).
- Implementing JSON Resume export or re-adding `meta` for export.
- Row-level ETags or `updated_at`-based conflict detection.
- Overlapping `simplify-cv-read-paths` beyond shared touch points (`headerToSlimCvData`, `cv-editor-provider`).

## Decisions

### 1. Last-write-wins for all item mutations

No optimistic lock; concurrent edits to the same row resolve to last save.

### 2. No `meta` in management API surface

**Choice:** `data` on CV reads and document mutations contains `basics` only (when present). No `data.meta`.

**Rationale:** Editor and dashboard do not consume meta today except version (removed). Export will assemble meta at export time.

**Future export:** Reintroduce helpers to set `meta.canonical`, `meta.lastModified`, and optionally `meta.version` when building the downloadable document—not on every save.

### 3. Ignore `data.meta` on inbound writes

**Choice:** `disassembleResume` does not map `data.meta` to header columns; create/PATCH with `data.meta` in body has no effect on DB.

**Rationale:** Avoids silent partial meta updates; keeps one clear rule.

### 4. Repository: omit meta columns from writes

**Choice:** `insertCv` / header updates do not set `meta_version`, `meta_canonical`, `meta_last_modified` (leave null or existing DB default).

**Rationale:** Columns remain for future export migration without app logic touching them.

### 5. Remove `resume-meta.ts`

**Choice:** Delete file and `packages/types` exports; remove `stripResumeMetaFromEditor` usage—editor initializes from `createEmptyResume()` merged with slim `data.basics` only.

### 6. `assembleResume` omits `meta` until export

**Choice:** Internal assembly for schema validation on write paths does not attach `meta` to the assembled object (or strips it before validation if schema requires optional meta).

**Rationale:** Aligns runtime shape with management API; export path will add meta later.

### 7. Slim mutation responses

`CvItemMutationResponse`: `{ item }` or `{ items }` only—no `version`.

## Risks / Trade-offs

| Risk                                                                   | Mitigation                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| JSON Resume schema validation expects optional `meta` on full document | Validate without meta or use schema path that treats meta optional |
| Seed script still writes meta                                          | Update `scripts/lib/seed-supabase.mjs` to match                    |
| Stale `meta_*` data in DB                                              | Harmless; export feature can overwrite or ignore                   |
| Two tabs overwrite same row                                            | Accept; document in design                                         |

## Migration Plan

1. Single PR: types → API → web → tests.
2. No DB migration; existing `meta_*` values ignored.
3. Clients must not depend on `data.meta` or mutation `version`.

## Open Questions

_None — export defers all meta fields._
