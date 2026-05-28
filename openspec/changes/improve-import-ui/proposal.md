## Why

The new-CV page exposes three import/create paths (manual form, JSON, PDF) but tab order and default selection prioritize manual entry over PDF—the path most users expect first. JSON import mixes file upload, inline validation, and an optional full-page JSON editor in one form, which makes the UI hard to scan and the component logic brittle. PDF import uses a bare native file input with minimal feedback. Both import flows need consistent, accessible drop-zone upload components and a clearer separation between “pick a file” and “edit JSON in a dialog.”

## What Changes

- Reorder new-CV tabs to **PDF → manual form → JSON**, with PDF as the default tab.
- Replace native file inputs with a shared **file upload drop zone** component for JSON Resume (`.json`, max 1 MB) and PDF (`.pdf`, max 5 MB), including drag-and-drop, selected-file summary, clear/remove, and validation errors.
- Move JSON manual editing into a **modal dialog** opened from the JSON import tab (e.g. “Edit JSON…”), instead of toggling an inline editor in the main form.
- Simplify `ImportCvForm` state: file selection drives preview/validation; the dialog owns editor text until the user saves back to the import flow.
- Polish PDF import layout: drop zone, progress/status during polling, and unchanged active-AI-account gate with link to AI agent settings (see `ai-agent-settings-menu`).
- Update unit tests for import forms and tab order; no API or backend changes.

## Capabilities

### New Capabilities

- `import-file-upload`: Shared client file-upload drop zone for typed résumé imports (JSON and PDF), with size/MIME validation, drag-and-drop, and accessible labels.

### Modified Capabilities

- `web-application`: New-CV tab order (PDF first, default), shared upload UX, JSON edit-in-dialog pattern.
- `cv-json-import`: Import UX requirements updated—file upload component, JSON edit in dialog (not inline toggle), simplified confirm flow.
- `cv-pdf-import`: PDF import section uses shared upload component and improved status presentation (behavior unchanged).

## Dependencies

- None for UI-only scope. Wording for AI setup links aligns with **`ai-agent-settings-menu`** when that change lands.

## Impact

- **apps/web**: `new-cv-page-client.tsx` (tab order/default), new `import-file-upload.tsx` (or similar), refactors to `import-cv-form.tsx` and `import-pdf-cv-form.tsx`, optional `import-json-edit-dialog.tsx`; colocated Vitest updates.
- **No API changes**: `POST /cv`, `POST /cv/import/pdf`, job polling, and `prepareImportedResume` stay as-is.
- **Dependencies**: Reuse existing shadcn `Dialog` (add if missing) and Lucide icons; no new npm packages required unless a lightweight drop-zone helper is preferred over custom markup.
