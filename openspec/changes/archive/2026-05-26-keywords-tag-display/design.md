## Context

Keywords on Skills, Interests, and Projects are stored as string arrays and edited with the shared `TagsInput` component (`tags-input.tsx`), which renders each value as a muted pill (`bg-muted rounded-md px-2 py-1 text-sm`) with an optional remove button. View mode in `cv-sections.tsx` currently joins keywords with `', '` inside a `<p>` tag, producing a flat comma-separated line that does not match the edit UI.

The `cv-editor-ui` spec already mentions "tag-like text" for Skills keywords but does not mandate pill styling or cover Interests/Projects explicitly.

## Goals / Non-Goals

**Goals:**

- Introduce a read-only `TagsList` component sharing pill styling with `TagsInput` (no remove button, no input).
- Use `TagsList` for Skills, Interests, and Projects keyword arrays in view mode.
- Extract shared pill class names so edit and view stay visually in sync.
- Add colocated tests for `TagsList` and keyword view rendering.

**Non-Goals:**

- Changing Projects **roles** display (still comma-separated prose for now unless product asks).
- Form-mode `TagsInput` behavior or keyword CRUD APIs.
- Public resume export / PDF styling.
- New dependencies.

## Decisions

### 1. New `TagsList` component colocated with `TagsInput`

**Choice:** Add `tags-list.tsx` beside `tags-input.tsx` with a `values: string[]` prop and optional `className`. Each tag renders as a read-only `<span>` using the same pill classes as `TagsInput`.

**Rationale:** Keeps view markup simple, testable, and decoupled from form state. Avoids mounting interactive remove buttons in read-only rows.

**Alternatives considered:**

- **Export pill markup from `TagsInput` only:** Would still require a read-only wrapper; separate component is clearer.
- **Reuse `TagsInput` with `readOnly` prop:** Mixes edit concerns (draft input, remove handlers) into view rows.

### 2. Share pill styling via a small constant or helper

**Choice:** Extract tag pill classes to a shared export (e.g. `tagPillClassName` in `tags-input.tsx` or `tags-shared.ts`) consumed by both `TagsInput` and `TagsList`.

**Rationale:** Single source of truth prevents edit/view style drift.

### 3. Replace all three keyword view call sites in `cv-sections.tsx`

**Choice:** Skills body, Interests body, and Projects keywords line use `<TagsList values={item.keywords} />`. Remove `Keywords: {join}` prefix on Projects; the tag row is self-explanatory in context (same as Skills/Interests).

**Rationale:** Consistent scanning across sections; matches user request for tag UI like edit mode.

**Alternatives considered:**

- **Keep "Keywords:" label on Projects:** Redundant when pills are visually distinct; omitted for cleaner layout.

### 4. Wrap in flex container matching edit mode

**Choice:** `TagsList` root uses `flex flex-wrap gap-2` (same as `TagsInput` tag row).

**Rationale:** Identical layout rhythm between view and edit.

## Risks / Trade-offs

- **[Risk] Long keyword strings overflow row width** → Mitigation: Pills wrap via `flex-wrap`; existing truncate on meta column unaffected.
- **[Risk] Style drift if pill classes duplicated** → Mitigation: Shared class constant used by both components.
- **[Trade-off] Slightly taller rows for many keywords** → Acceptable for improved scannability vs one long comma line.

## Migration Plan

1. Add shared pill styling and `TagsList` component.
2. Update Skills, Interests, and Projects `renderView` in `cv-sections.tsx`.
3. Add colocated Vitest coverage.
4. Run `pnpm --filter @resumind/web test -- --run`.

**Rollback:** Revert to comma-separated `<p>` rendering; no data migration.

## Open Questions

None blocking.
