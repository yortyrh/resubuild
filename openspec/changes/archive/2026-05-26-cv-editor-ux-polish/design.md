## Context

Recent changes introduced URL-backed section navigation with a desktop sidebar and a mobile Sheet drawer (`sidebar-tab-navigation`). Authors still saw plain "Loading…" text, duplicate headings, and preview rows that concatenated `"position, company"` in the title while rendering bare URLs in the body. Optional JSON Resume URI fields saved as empty strings (`url: ""`) failed Zod/schema validation on the API. Wysimark loads client-only via `next/dynamic`, leaving a flash of empty space during hydration.

This design documents the bundled UX polish already implemented in the working tree.

## Goals / Non-Goals

**Goals:**

- Unified collapsible section nav with icons at all breakpoints (no separate mobile drawer).
- Breadcrumb context and removal of redundant editor titles.
- Skeleton placeholders matching final layout during auth, list, editor, and markdown load.
- Clear resume-preview hierarchy: title, optional subtitle, labeled metadata, titled bullet groups.
- Strip empty strings from item payloads before API persistence (shared types helper).
- Keyboard-friendly forms: Enter submits save forms; Enter extends string lists; empty tag input submits parent form.
- Accessible delete confirmation on dashboard CV cards.

**Non-Goals:**

- Changing JSON Resume schema or Nest route shapes.
- Section-level data caching/layout lift (shared `[id]/layout.tsx` fetch dedup).
- Replacing Wysimark or altering toolbar presets.
- Breadcrumb deep-linking beyond existing section URLs.

## Decisions

### 1. Collapsible icon sidebar instead of mobile Sheet

**Choice:** Keep one `CvSectionNav` in a sticky left `aside` with three states (`auto`, `collapsed`, `expanded`). Below `md`, default to icon-only (`w-12`); at `md+`, default to labeled (`w-48`). Toggle button collapses/expands; icons always visible with `aria-label`/`title` when labels hidden.

**Rationale:** Removes duplicate navigation UX (drawer vs sidebar) and preserves URL-driven section switching without overlay friction.

**Alternative considered:** Retain Sheet on mobile — rejected; user wanted consistent left rail.

### 2. Breadcrumb replaces standalone editor heading

**Choice:** `CvEditorBreadcrumb` shows `My CVs → {derived title} → {section}` inside `CvSections`. Page client drops outer `h1`/`Edit CV` wrapper. Full title uses `deriveCvTitleFromBasics`; narrow viewports show `deriveCvShortTitleFromBasics` (name only when both name and label exist).

**Rationale:** Single hierarchy source; section name only appears when not on Basics.

### 3. Metadata field primitives

**Choice:** `metadata-field.tsx` exports `MetadataLabel`, `LabeledMetadataRow`, `MetadataFieldGroup`, `MetadataTextField`. `TagsList` accepts optional `label` and `variant="roles"` (primary-tinted pills). `highlightBody` accepts optional `title` (default `"Highlights"`).

**Rationale:** Consistent labeled preview for Projects entity/type/roles/keywords, Interests keywords, Education courses, and highlight lists.

### 4. Title / subtitle split for position + entity

**Choice:** `positionEntityView()` returns `{ title, subtitle }`. Linked entities in subtitle use `linkedEntitySubtitle` (styled external link). Work/Volunteer view rows pass `subtitle` to `ResumeItemRow`. Skills level and Publications publisher move to subtitle.

**Rationale:** Matches printed CV convention (role prominent, org secondary) and keeps URLs out of title comma-strings.

### 5. Shared payload sanitization

**Choice:** `sanitizeResumeItemPayload(item)` in `@resumind/types` trims strings and omits empty results; non-string values pass through unless null/undefined. Applied in `CvItemService.createArrayItem` / `updateArrayItem` and `ManagedArraySection` before API calls.

**Rationale:** Prevents optional URI fields from being sent as `""`; single implementation for web + API.

### 6. Skeleton loading strategy

**Choice:** shadcn `Skeleton` primitive; `DashboardShellSkeleton` for `SessionGate`; `CvListSkeleton` for dashboard list; `CvEditorSkeleton` mirrors breadcrumb + sidebar + section fields; `MarkdownEditorSkeleton` split inline/block for dynamic import `loading` callbacks.

**Rationale:** Reduces layout shift; skeleton shapes match final UI density.

### 7. Form keyboard behavior

**Choice:** `ResumeItemForm`, `SectionCreateForm`, `CreateCvForm` use native `<form onSubmit>` with `type="submit"` Save buttons. `StringListField` (non-markdown) focuses next row on Enter at last item. `TagsInput` submits parent form when Enter pressed on empty draft.

**Rationale:** Matches author expectations; avoids accidental double-submit on markdown rows.

### 8. Wysimark focus and sizing

**Choice:** Add `slate` / `slate-react` peers; `MarkdownEditorImpl` accepts `autoFocus`, `focusRequestId`, polls/MutationObserver until `[data-slate-editor]` focus succeeds. CSS tightens toolbar and editor padding via em-based rules in `globals.css`. Inline min/max heights reduced (36–72px vs 52–112px).

**Rationale:** Inline highlight editors should focus when added; smaller chrome fits dense list forms.

### 9. Dashboard delete dialog

**Choice:** Reuse `DeleteItemDialog` from `cv-item-ui` with pending delete id state; disable cancel while deleting.

**Rationale:** Consistent confirmation UX with section item deletes.

### 10. API fetch empty-body handling

**Choice:** `apiFetch` treats 204/205 as empty; reads `response.text()` and skips `JSON.parse` on blank body.

**Rationale:** Some Nest delete responses return no JSON body.

## Risks / Trade-offs

- **[Risk] Icon-only nav hides section names on mobile** → **Mitigation:** `aria-label`, `title`, and breadcrumb show active section name.
- **[Risk] Collapsed sidebar state not persisted** → **Mitigation:** Resets per session; acceptable for polish scope.
- **[Risk] Sanitization strips intentional whitespace-only strings** → **Mitigation:** JSON Resume text fields are not meaningful when blank; matches schema intent.
- **[Risk] Enter-to-submit in nested forms** → **Mitigation:** StringListField stops propagation on Enter; markdown rows excluded.

## Migration Plan

Frontend + types + API deploy together. No migration scripts.

1. Ship `@resumind/types` sanitization helper.
2. Deploy API with sanitized persistence.
3. Deploy web with client-side sanitization (backward compatible if API lags).
4. Rollback: revert monorepo commit.

## Open Questions

- Persist sidebar collapsed preference in `localStorage` (deferred).
- Lift CV fetch to `[id]/layout.tsx` to avoid refetch on section navigation (deferred).
