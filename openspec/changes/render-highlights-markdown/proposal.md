## Why

Work, Volunteer, and Projects highlights are authored with inline Wysimark markdown editors in form mode, but view mode still renders highlight bullets as raw strings (e.g. `**Reduced API latency by 40%**` appears literally). The shared `MarkdownView` component and `cv-editor-ui` requirements already expect formatted highlight output; this gap breaks preview fidelity and confuses authors who see formatting while editing but not after save.

## What Changes

- Update `highlightBody()` in `cv-sections.tsx` to render each highlight bullet with `MarkdownView` (`variant="inline"`) instead of plain text in `<li>`.
- Apply the same renderer for Work, Volunteer, and Projects highlight lists in resume-preview rows (Education `courses` remain plain text).
- Add colocated unit tests asserting markdown emphasis and links render in highlight bullets.
- No form-mode, API, schema, or dependency changes.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `cv-editor-ui`: Clarify and enforce that highlight bullet view rendering MUST use the shared `MarkdownView` inline renderer (no plain-text fallback in `highlightBody`).

## Impact

- **Frontend**: `apps/web/src/components/cv/cv-sections.tsx` (`highlightBody`); optional test updates in `cv-sections-field-coverage.test.tsx` or a focused highlight test file.
- **No backend, schema, or new dependencies** — reuses existing `MarkdownView`.
