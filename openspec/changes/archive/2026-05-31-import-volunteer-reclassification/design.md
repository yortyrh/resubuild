## Context

JSON Resume separates `work[]` (employer `name`, optional `location` and `description`) from `volunteer[]` (`organization`, no location/description). Agent imports historically prompted only for `work` and related sections, so volunteer roles were drafted as work entries. `prepareImportedResume` already normalized array sections but did not recategorize entries.

## Goals / Non-Goals

**Goals:**

- Deterministic post-processing so volunteer indicators in role text move entries to `volunteer[]` on every `prepareImportedResume` call.
- LLM prompts that reduce misclassification at draft time.
- Preserve paid jobs when only the employer name contains "Volunteer" (heuristics inspect position/summary/description/highlights, not `name`).

**Non-Goals:**

- Reclassifying existing CVs already stored in the database.
- Editor UI "Move to Volunteer" (separate `move-work-volunteer` change).
- Inferring volunteer status from job title alone without supporting text (e.g. "Volunteer Coordinator" at a paid employer).

## Decisions

### 1. Heuristic reclassification in `prepareImportedResume`

**Choice:** After defaulting array sections, run `reclassifyVolunteerWorkEntries` on the normalized object.

**Rules:**

- Treat a work item as volunteer if it has `organization` set, or if position/summary/description/highlights match `\b(volunteer|unpaid|community service|pro bono)\b` (case-insensitive).
- Map `name` or `organization` → `organization`; copy position, url, dates, highlights; merge `summary` and `description` into volunteer `summary`; drop `location` and `description`.

**Rationale:** Single choke point covers JSON, agent preview, and `POST /cv` without duplicating logic in `apps/api` or `apps/import-agent`.

### 2. Prompt updates in text and website workflows

**Choice:** Extend `DRAFT_INSTRUCTIONS` and `WEBSITE_DRAFT_INSTRUCTIONS` with explicit volunteer vs work placement.

**Rationale:** Complements heuristics; repair loop unchanged.

### 3. Exported helper for tests

**Choice:** Export `reclassifyVolunteerWorkEntries` for unit tests that assert false positives without running full `prepareImportedResume`.

## Risks

- **False positive:** Rare paid roles with "volunteer" in summary text may move to Volunteer; authors can recategorize when `move-work-volunteer` ships.
- **False negative:** Volunteer roles without keyword text may remain under Work until prompts or heuristics improve.
