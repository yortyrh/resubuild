## Context

`/dashboard/cv/new` (`NewCvPageClient`) renders three tabs: manual create, JSON import, and PDF import. Tab order today is manual → JSON → PDF, defaulting to manual. JSON import (`ImportCvForm`) uses a hidden file input + “Choose file” button and an “Edit JSON manually” checkbox that expands `JsonResumeEditor` inline—mixing upload, validation preview, Gravatar option, and a large code editor in one scrollable form. PDF import (`ImportPdfCvForm`) uses a visible native `<input type="file">` with minimal styling and a text-only progress label during polling.

Import business logic (parse → `prepareImportedResume` → schema preview → `createCv`; PDF upload → poll job) is sound. The pain is presentation and state coupling in the JSON form.

## Goals / Non-Goals

**Goals:**

- Present import paths in relevance order: **PDF first**, then manual form, then JSON.
- Provide a **shared drop-zone upload** for JSON and PDF with drag-and-drop, MIME/size validation, selected-file display, and remove/clear.
- Move JSON manual editing into a **dialog** so the main import tab stays compact: upload → validation summary → optional “Edit JSON…” → Import.
- Keep all existing import semantics (size limits, active AI agent account gate for PDF per `ai-agent-accounts`, Gravatar option, no POST until confirm).
- Colocated Vitest coverage for upload component and simplified import forms.

**Non-Goals:**

- Backend/API changes, new import endpoints, or React Query migration (separate change).
- Paste-without-file JSON entry on the main tab (dialog can accept empty start or paste inside dialog only if needed later).
- Import into existing CV, bulk import, or new file types.
- Redesigning manual create form beyond tab reorder context.

## Decisions

### 1. Tab order and default

**Choice:** Tabs left-to-right: **Import PDF** | **Create manually** | **Import JSON**. Default `activeTab` = PDF import.

**Rationale:** Matches user expectation that uploading an existing résumé (PDF) is the primary onboarding path; JSON is advanced.

**Alternatives:** Card layout instead of tabs — rejected; tabs already exist and match dashboard patterns.

### 2. Shared `ImportFileUpload` component

**Choice:** New client component under `components/cv/` (or `components/ui/` if generic enough):

```tsx
<ImportFileUpload
  accept={{ 'application/json': ['.json'], ... }}
  maxBytes={MAX_IMPORT_FILE_BYTES}
  label="JSON Resume file"
  hint="Drag and drop or browse…"
  disabled={importing}
  value={selectedFile}
  onFileSelect={(file | null) => ...}
/>
```

- Hidden `<input type="file">` triggered by click on drop zone; drag events on a bordered region.
- Shows file name, size (optional), and a clear/remove control.
- Surfaces validation errors (wrong type, too large) inline before reading content.
- `data-testid` hooks for tests.

**Rationale:** PDF and JSON share the same interaction model; one component avoids duplicated drag/validation markup.

**Alternatives:** Third-party dropzone library — rejected to minimize dependencies; native drag events + shadcn styling suffice.

### 3. JSON edit in dialog

**Choice:** Remove `editJsonManually` checkbox and inline `JsonResumeEditor` from `ImportCvForm`. Add `ImportJsonEditDialog`:

- Opens via **Edit JSON…** button (enabled when a file was loaded or user wants to start from empty template).
- Contains `JsonResumeEditor` (existing dynamic code editor), **Save** (writes back to parent `jsonText`, closes dialog, re-runs preview), **Cancel** (discards dialog draft).
- Use shadcn **Dialog** (`npx shadcn@latest add dialog` if not present) for focus trap and accessibility.

Parent state:

- `jsonText` — source of truth after file read or dialog save.
- Dialog holds local draft while open; only commits on Save.

**Rationale:** Decouples “import confirmation surface” from “advanced editor”; reduces conditional rendering complexity in the main form.

**Alternatives:** Sheet/drawer — rejected; dialog matches short edit sessions and keeps context visible behind overlay.

### 4. JSON import main tab layout

**Choice:** Vertical flow:

1. `ImportFileUpload` (JSON)
2. Validation status (valid / schema errors / image hint) — unchanged logic from `import-cv-preview`
3. Gravatar checkbox when applicable
4. **Edit JSON…** (secondary) + **Import** (primary) + **Cancel**

No editor visible until dialog opens.

**Rationale:** File-first workflow; editing is explicitly opt-in.

### 5. PDF import layout

**Choice:** Replace native file input with `ImportFileUpload` (PDF accept, 5 MB). Keep the no-active-account setup card unchanged except for copy/links pointing to AI agent settings (`/dashboard/settings/ai-agent`) or the user menu per `ai-agent-settings-menu`. During import, show progress in a muted status line or small alert below the drop zone (reuse existing `progress` string from polling).

**Rationale:** Visual parity with JSON tab; no change to `startPdfImport` / poll loop.

### 6. Tab labels

**Choice:** Short labels aligned with order: **Import PDF** | **Create manually** | **Import JSON** (or “From PDF” / “From JSON” if space tight—pick one set in implementation).

**Rationale:** Clear source distinction; “Create manually” unchanged from today.

## Risks / Trade-offs

- **[Dialog + dynamic CodeEditor bundle]** → Editor loads only when dialog opens (keep `JsonResumeEditor` dynamic import); acceptable one-time delay.
- **[Drag-and-drop accessibility]** → Drop zone must be keyboard-activatable (button or focusable region + hidden input); label associated with input id.
- **[Dialog save with invalid JSON]** → Allow save to parent; main form still shows schema errors and disables Import until valid (same as today).
- **[Empty JSON without file]** → “Edit JSON…” may open dialog with `{}` or formatted empty resume for power users; Import remains disabled until valid—document in tests.

## Migration Plan

1. Add shadcn Dialog (if missing) and `ImportFileUpload`.
2. Refactor `ImportCvForm` + add `ImportJsonEditDialog`.
3. Refactor `ImportPdfCvForm` to use shared upload.
4. Update `NewCvPageClient` tab order and default tab.
5. Update/add Vitest; manual smoke on `/dashboard/cv/new`.

No database or API deployment steps. Rollback: revert web PR.

## Open Questions

- None blocking. Optional follow-up: wire PDF polling to React Query when `react-query-adoption` lands (after this change's UI refactor). Align setup links with `ai-agent-settings-menu` when that change lands (until then, existing import LLM settings path may remain).
