## Context

`ResumeItemRow` in `cv-item-ui.tsx` supports an optional `actionsPlacement` prop (`'bottom' | 'header'`, default `'bottom'`). It was added in `basics-address-contact-line` so Basics could place **Edit** top-right beside the name block. All other managed sections use the default bottom bar.

The user wants Basics to match the rest of the editor: **Edit** below the row content, not in the header.

Current call sites:

- `managed-basics-section.tsx` — `actionsPlacement="header"` (only header usage)
- `managed-array-section.tsx` — default bottom placement

## Goals / Non-Goals

**Goals:**

- Basics view mode renders **Edit** in the bottom action bar like Work, Education, etc.
- Remove the Basics-only header placement override.
- Align spec requirements with the unified interaction pattern.

**Non-Goals:**

- Changing Edit placement for the CV document title (`EditableCvTitle`) — that component has its own layout.
- Changing profile photo controls, contact line layout, or summary rendering.
- Redesigning `ResumeItemRow` layout beyond removing unused header placement if applicable.

## Decisions

### 1. Remove `actionsPlacement="header"` from Basics

**Decision:** Delete the prop override in `ManagedBasicsSection` so `ResumeItemRow` uses default bottom placement.

**Rationale:** One-line change; no new UI patterns. Matches user expectation and other sections.

**Alternative considered:** Keep the prop but default Basics to bottom — rejected because it leaves dead `'header'` code with no callers.

### 2. Remove `actionsPlacement` prop from `ResumeItemRow`

**Decision:** After Basics stops using `'header'`, remove the prop and simplify `ResumeItemRow` to always render actions at the bottom.

**Rationale:** YAGNI — the prop exists solely for Basics header placement. Removing it reduces API surface and conditional layout branches.

**Alternative considered:** Keep the prop for future flexibility — rejected; no planned use case and adds complexity.

### 3. Spec delta: REMOVED header requirement, not MODIFIED

**Decision:** Use `## REMOVED Requirements` for "Basics view mode SHALL place Edit in the header top-right" and rely on the existing global requirement "Section interactions SHALL follow view, inline edit, bottom create, and confirmed delete patterns" to cover bottom Edit for Basics.

**Rationale:** The global requirement already mandates Edit on view rows with bottom create pattern; Basics was the exception via a dedicated requirement. Removing the exception restores consistency without duplicating a new MODIFIED block.

## Risks / Trade-offs

- **[Risk] Users accustomed to header Edit on Basics** → Mitigation: Bottom placement matches every other section; no data or workflow change.
- **[Risk] Tests assert header placement** → Mitigation: Update colocated Basics section tests in the same change.

## Migration Plan

Single frontend deploy. No migrations, feature flags, or API changes. Rollback is reverting the component and spec delta.

## Open Questions

None — scope is a single prop removal and spec cleanup.
