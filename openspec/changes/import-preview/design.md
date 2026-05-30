## Context

Import flows today diverge:

| Route      | Source → JSON Resume          | Preview                | Create CV                    |
| ---------- | ----------------------------- | ---------------------- | ---------------------------- |
| JSON file  | Client parse                  | Validation text only   | Client `createCv` on confirm |
| URL (JSON) | API sync                      | Raw JSON `<pre>` block | Client `createCv` on confirm |
| URL (HTML) | Agent job → `previewData`     | Raw JSON `<pre>` block | Client `createCv` on confirm |
| PDF        | Agent job → server `createCv` | None                   | Auto-navigate to `cvId`      |
| Markdown   | Agent job → server `createCv` | None                   | Auto-navigate to `cvId`      |

The full CV preview page (`/dashboard/cv/[id]/preview`) already renders templates client-side via `renderResumeHtml`, template catalog from `listCvTemplates()`, and an iframe with resize reporting. Import preview should reuse that rendering stack but omit layout/section toggles and persistence.

## Goals / Non-Goals

**Goals:**

- Single prepared JSON Resume object (`ImportSourcePreview.prepared`) is the only gate before `createCv` on every import path.
- PDF/Markdown agent jobs stop persisting CV rows; they return `previewData` like website import.
- Shared **Import preview dialog** with template dropdown + rendered iframe (read-only).
- Shared **Edit** dialog (renamed from Edit JSON…) with left `Pencil` icon; available on all import forms when source text or prepared data exists.
- Consistent action row: **Import** (primary), **Preview** (outline, when valid), **Edit** (outline with icon), **Cancel**.

**Non-Goals:**

- Section visibility / drag reorder in import preview (layout panel stays on saved-CV preview page only).
- Print / Download PDF from import preview.
- Persisting selected template before CV create (template choice in dialog is ephemeral; user picks default template after import in editor/preview).
- Changing agent extraction pipelines or LLM prompts.
- Import-from-chat or free-text routes (out of scope unless they already share import forms).

## Decisions

### 1. API: Reuse website preview finalize for PDF and Markdown

**Choice:** Extract `finishPreviewJob(jobId, draft)` (rename/generalize `finishWebsitePreviewJob`) and call it from PDF/Markdown workflows instead of `finalize` → `cvService.create`.

**Rationale:** One code path validates + stores `previewData`; avoids duplicate CVs when user abandons after agent success. Matches URL HTML semantics.

**Alternatives considered:**

- Keep server create + client delete on abandon — wasteful, RLS cleanup complexity.
- Return draft without `prepareImportedResume` — inconsistent with other imports.

### 2. Client: `ImportPreviewDialog` renders locally without CV id

**Choice:** New component accepts `resume: Record<string, unknown>`, loads `listCvTemplates()` once on open, defaults template to `classic`, calls `renderResumeHtml(resume, templateId)` and reuses iframe height helpers from `cv-preview-frame.ts`.

**Rationale:** No new API endpoint; preview data is already on the client. Same visual fidelity as saved-CV preview.

**Alternatives considered:**

- `GET /cv/export/html` with ephemeral body — unnecessary network round-trip and auth coupling.
- Embed full `CvPreviewClient` — pulls layout panel, persistence, breadcrumbs.

### 3. Shared `ImportFormActions` helper

**Choice:** Small presentational component or hook used by all four import forms for Preview/Edit/Import/Cancel buttons and disabled states.

**Rationale:** Keeps button order, icons, and aria labels identical; reduces copy-paste across forms.

### 4. Edit dialog rename only (no behavior change)

**Choice:** `ImportJsonEditDialog` title **Edit**, description mentions JSON Resume; trigger button shows `Pencil` icon left of label **Edit**. PDF/Markdown/URL get Edit opening the same dialog bound to `JSON.stringify(preview.prepared)` when preview is valid (or empty `{}` before first success).

**Rationale:** User-facing consistency; PDF/Markdown users can tweak agent output before create.

### 5. PDF/Markdown form flow mirrors URL HTML

**Choice:** After upload + agent success, forms set `preview` from `parseImportJsonSource(JSON.stringify(job.previewData))`, show validation/Gravatar/image hints like JSON/URL, enable Preview + Edit + Import. Page handlers call shared `onImport({ data, useGravatar })` instead of `onSuccess(cvId)`.

**Rationale:** One navigation path (`createCv` → `/dashboard/cv/:id`) in page parent components.

## Wireframes

Reference wireframes for UX review and implementation. See also `wireframes.md` for standalone copies.

### WF-1: Import form — before source ready (JSON example)

```
┌─────────────────────────────────────────────────────────────────┐
│  Import JSON Resume                                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │     Drag and drop a JSON Resume file or browse…          │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│  Choose a JSON Resume file…                                   │
│                                                                 │
│  [ Import ]  [ ✎ Edit ]  [ Cancel ]                            │
│     ↑ disabled    ↑ disabled                                    │
└─────────────────────────────────────────────────────────────────┘
```

### WF-2: Import form — valid preview ready (all routes)

```
┌─────────────────────────────────────────────────────────────────┐
│  Import from PDF                                                │
├─────────────────────────────────────────────────────────────────┤
│  ✓ resume.pdf                                                   │
│  JSON Resume data is valid.                                     │
│  ☐ Use Gravatar profile photo (user@example.com)                │
│                                                                 │
│  [ Import ]  [ Preview ]  [ ✎ Edit ]  [ Cancel ]               │
│     ↑ primary   ↑ opens WF-3                                    │
└─────────────────────────────────────────────────────────────────┘
```

### WF-3: Import preview dialog

```
┌──────────────── Import preview ────────────────────────────────┐
│  Template  [ Classic ▼ ]                              [ ✕ ]    │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐│
│  │  YORTY RUIZ HERNÁNDEZ                                      ││
│  │  Location · Phone · Email · LinkedIn · GitHub              ││
│  │  ─────────────────────────────────────────────────────     ││
│  │  SUMMARY                                                   ││
│  │  Lorem ipsum…                                              ││
│  │  EXPERIENCE                                                ││
│  │  …                                                         ││
│  └──────────────────────────────────────────────────────────┘│
│                    (scrollable iframe)                          │
├────────────────────────────────────────────────────────────────┤
│                                          [ Close ]              │
└─────────────────────────────────────────────────────────────────┘
```

No layout sidebar. Template change re-renders iframe immediately.

### WF-4: Edit dialog (renamed)

```
┌──────────────── Edit ───────────────────────────────────────────┐
│  Edit the JSON Resume source. Changes apply after Save.         │
├────────────────────────────────────────────────────────────────┤
│  JSON source                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ {                                                         │  │
│  │   "basics": { "name": "…" },                              │  │
│  │   …                                                       │  │
│  │ }                                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│                              [ Cancel ]  [ Save ]               │
└─────────────────────────────────────────────────────────────────┘
```

Save re-runs `parseImportJsonSource` on the parent form; invalid JSON shows inline errors without closing.

### WF-5: PDF/Markdown — agent in progress

```
┌─────────────────────────────────────────────────────────────────┐
│  Import from PDF                                                │
├─────────────────────────────────────────────────────────────────┤
│  ✓ resume.pdf                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Import in progress: verifying                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│  [ Importing… ]  [ Preview ]  [ ✎ Edit ]  [ Cancel ]           │
│     ↑ disabled      ↑ disabled    ↑ disabled                      │
└─────────────────────────────────────────────────────────────────┘
```

### WF-6: URL import — fetch then preview (replaces raw JSON block)

```
Before (remove):
  ┌ Preview ─────────────────┐
  │ { "basics": { … } }      │  ← raw <pre> removed
  └──────────────────────────┘

After:
  Same as WF-2 — user opens WF-3 via Preview button
```

## Risks / Trade-offs

- **[Breaking API]** PDF/Markdown E2E and clients expecting `cvId` on job success → Update `import.service.spec.ts`, web forms, and document in cv-rest-api delta; migration is deploy web + API together.
- **[Large dialog on mobile]** Full iframe preview may be tall → Use `max-h-[90vh]` scrollable dialog; template select stays sticky in header.
- **[Edit on PDF/Markdown before job completes]** Edit disabled until `previewData` valid → Clear disabled state in WF-5.
- **[Template not saved on import]** User may expect chosen template to persist → Document as non-goal; post-import template picker unchanged.

## Migration Plan

1. Deploy API change first (jobs return `previewData`; old web still broken for PDF/Markdown until step 2).
2. Deploy web with unified preview UX and updated poll handlers.
3. No data migration; orphan CVs from old PDF/Markdown imports remain.

**Rollback:** Revert API finalize to create CV server-side; revert web forms to `onSuccess(cvId)`.

## Open Questions

- None — template persistence on import explicitly deferred.
