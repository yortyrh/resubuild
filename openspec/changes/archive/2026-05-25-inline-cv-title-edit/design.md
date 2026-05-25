## Context

`CvEditor` (`apps/web/src/components/cv/cv-editor.tsx`) currently renders the CV document title as a persistent `Label` + `Input` + **Save title** button above `CvSections`. Managed sections (Basics, Work, etc.) use a view/edit split: `ResumeItemRow` for read-only preview with **Edit**, and `ResumeItemForm` with draft state, **Save**, and **Cancel**. Title persistence already uses `updateCv(cvId, { title })` with toast feedback; only presentation and interaction need to change.

The edit page shell (`edit-cv-page-client.tsx`) still shows a static **Edit CV** page heading separate from the document title—this change scopes to the **CV title** field inside `CvEditor`, not the page `<h1>`.

## Goals / Non-Goals

**Goals:**

- Match section-row view/edit semantics for the document title.
- Reuse existing save API and toast behavior.
- Keep title state local with cancel reverting to last committed value.
- Align typography and action placement with Basics header patterns (prominent title, Edit top-right in view mode).

**Non-Goals:**

- Renaming the page-level **Edit CV** heading or dashboard list title UX.
- Auto-save on blur or debounced persistence.
- Changing `cv.title` validation rules on the API.
- Editing `resume.meta` or JSON Resume `basics.name` (separate fields).

## Decisions

### 1. Introduce `EditableCvTitle` component colocated with `cv-editor.tsx`

**Choice:** New `editable-cv-title.tsx` (or inline in `cv-editor.tsx` if small) owning `editing`, `draft`, `saving`, and handlers.

**Rationale:** Title is not a JSON Resume section row; shoehorning it into `ResumeItemRow` would add fake `meta`/`children` props. A focused component mirrors the `editing` / `draft` / `save` / `cancel` state machine from `ManagedBasicsSection` without border-b row chrome.

**Alternative considered:** Reuse `ResumeItemForm` only in edit mode and a minimal flex row in view mode—acceptable if it avoids duplicating Save/Cancel markup; still wrap in `EditableCvTitle` for clarity.

### 2. View layout: title left, Edit right

**Choice:** Flex row `items-start justify-between` with `text-2xl font-semibold tracking-tight` (or `text-xl` to match Basics name) for saved title; **Edit** `Button` `variant="outline" size="sm"` top-right.

**Rationale:** Consistent with upcoming Basics header Edit placement (`basics-address-contact-line` change). Empty title shows **Untitled CV** placeholder styling (`text-muted-foreground`).

### 3. Edit layout: single input + Save / Cancel

**Choice:** `Input` (no visible field label in edit mode; optional `aria-label="CV title"`) plus `ResumeItemForm`-style button pair: primary **Save**, outline **Cancel**.

**Rationale:** Matches `ResumeItemForm` action order and disabled-while-saving behavior.

### 4. Save behavior unchanged; cancel reverts draft

**Choice:** On Save, call `updateCv(cvId, { title: draft })`; on success update committed `title` state and exit edit mode. On Cancel, reset `draft` from committed `title` and exit edit mode without API call.

**Rationale:** Prevents accidental persistence; same as section drafts.

### 5. Enter key submits in edit mode

**Choice:** `onKeyDown` on input: Enter triggers Save (if not saving); Escape triggers Cancel.

**Rationale:** Expected inline-edit affordance; low cost.

## Risks / Trade-offs

- **[Risk] Double heading confusion** (page **Edit CV** + document title) → **Mitigation:** Document in design only; no code change to page `<h1>` in this change.
- **[Risk] Empty title saved** → **Mitigation:** Allow empty string if API permits; otherwise trim and fall back to `Untitled CV` before save (match current default).
- **[Risk] Stale `initialTitle` after navigation** → **Mitigation:** `useState(initialTitle)` already used; no change to prop sync unless parent remounts (existing behavior).

## Migration Plan

Frontend-only deploy. No feature flag. Rollback: revert `cv-editor.tsx` / new component.

## Open Questions

- None blocking. Optional follow-up: sync browser document title (`document.title`) with saved CV title for wayfinding.
