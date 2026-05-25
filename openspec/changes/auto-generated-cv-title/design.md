## Context

Today `cv.title` is a separate text column on `public.cv`, edited independently via `EditableCvTitle` (PATCH title only) and a **CV title** field on `/dashboard/cv/new`. Resume identity already lives in `data.basics.name` and `data.basics.label`, which the Basics section displays prominently. The two sources diverge easily and force duplicate authoring.

The `title` column remains useful as a denormalized string for dashboard cards and page headers without parsing JSON on every list query.

## Goals / Non-Goals

**Goals:**

- Single source of truth for document identity: Basics **Name** and **Label**.
- Shared derivation function in `packages/types` for consistent formatting across API and web.
- Server-side sync of `cv.title` whenever basics are written (create CV, PATCH basics).
- Simpler UI: no title field on create, no title edit on the edit shell.
- Dashboard list continues to show `cv.title` (now derived).

**Non-Goals:**

- Removing the `title` database column or changing RLS.
- Backfill migration script for existing rows (optional follow-up; new writes sync going forward; list can show stale titles until basics are saved again).
- Changing JSON Resume schema fields or section-level item titles (work position, award title, etc.).
- Blocking API clients from sending explicit `title` on PATCH (field stays optional; product UI stops using it).

## Decisions

### 1. Title format: `name — label` with fallbacks

**Choice:** Trim whitespace from `basics.name` and `basics.label`. If both non-empty: `` `${name} — ${label}` ``. If only name: name. If only label: label. If both empty: `Untitled CV`.

**Rationale:** Matches how authors think (person + role), fits one-line dashboard cards, and mirrors Basics hierarchy (name primary, label secondary).

**Alternatives considered:**

- Name only, ignore label — loses professional headline in list.
- Two-line title in DB — column is single text; multiline awkward in cards.

### 2. Derivation lives in `packages/types`

**Choice:** Export `deriveCvTitleFromBasics(basics?: { name?: string; label?: string }): string` from `@resumind/types` with colocated unit tests.

**Rationale:** API must compute on write; web may use for optimistic display before refetch. One function avoids drift.

### 3. Server recomputes title on basics writes

**Choice:** In `CvService.create`, after merging `data.basics`, set `title` from derivation (ignore client `dto.title` for product path; if `dto.title` sent without basics, still derive from resulting basics). In basics patch handler, after merge/validate, include derived `title` in the same DB update as `data`.

**Rationale:** Authoritative sync even if a client forgets to send title; dashboard list stays correct without extra client logic.

**Alternatives considered:**

- Client-only derivation — fragile, third-party clients could desync.
- DB trigger — harder to test, logic outside TypeScript.

### 4. Edit shell shows read-only derived header

**Choice:** Replace `EditableCvTitle` with a simple read-only heading using `cv.title` from GET (or derive client-side from loaded basics for instant feedback after basics save updates local state). No Edit button. Typography similar to current view mode (`text-2xl font-semibold`).

**Rationale:** Title is not editable; editing happens in Basics tab only.

### 5. Create form drops title field

**Choice:** `CreateCvForm` collects Basics fields only. `onSave` passes `{ basics }`; parent calls `createCv({ data: { basics } })` without `title`. API derives title on insert.

**Rationale:** Aligns create flow with single source of truth from first save.

### 6. Remove title-only PATCH from web client

**Choice:** Delete `EditableCvTitle` and stop calling `updateCv(cvId, { title })`. Keep DTO field on API for backward compatibility.

## Risks / Trade-offs

- **[Existing CVs with custom titles]** → Titles remain until basics are saved again; optional one-time backfill can run `deriveCvTitleFromBasics` over all rows.
- **[API clients sending manual title]** → Explicit `title` on PATCH could overwrite derived value if we keep current merge order → **Mitigation:** When `data.basics` is present in PATCH (full or basics route), always overwrite `title` with derivation; document that manual title is legacy.
- **[Label-only CVs]** → Derivation uses label alone; acceptable edge case for incomplete profiles.

## Migration Plan

1. Ship shared helper + API sync (create + basics patch).
2. Ship web UI removal of title inputs.
3. No DB migration required.
4. Rollback: revert UI and stop overwriting title on basics patch; manual title editing returns.

## Open Questions

- None blocking — backfill script deferred unless product wants immediate list consistency for all existing CVs.
