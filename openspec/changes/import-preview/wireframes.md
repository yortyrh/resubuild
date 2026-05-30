# Import preview — wireframes

Standalone wireframe reference for the `import-preview` change. Implementation details in `design.md`.

## Flow overview

```mermaid
flowchart LR
  subgraph sources [Import sources]
    File[File import JSON PDF MD]
    URL[URL import JSON HTML]
  end

  subgraph prepare [Prepare]
    Agent[Agent job optional]
    Parse[prepareImportedResume + validate]
  end

  subgraph review [User review]
    Form[Import form WF-2]
    PreviewDlg[Preview dialog WF-3]
    EditDlg[Edit dialog WF-4]
  end

  Create[createCv on Save confirm]

  File --> Agent
  File --> Parse
  URL --> Agent
  URL --> Parse
  Agent --> Parse
  Parse --> Form
  Form --> PreviewDlg
  Form --> EditDlg
  EditDlg --> Parse
  Form --> Create
```

## WF-1: Empty / invalid state

File and URL import routes share this action bar pattern when no valid preview exists.

| Control | State                                                     |
| ------- | --------------------------------------------------------- |
| Import  | Enabled when source ready (file selected or URL entered)  |
| Save    | Hidden until valid preview exists                         |
| Preview | Disabled until valid preview                              |
| Edit    | Disabled (JSON: enabled once file loaded even if invalid) |
| Cancel  | Enabled                                                   |

## WF-2: Ready to import

Applies to: file import (JSON/PDF/Markdown) and URL (JSON sync and HTML job success).

```
┌─────────────────────────────────────────────────────────────────┐
│  [Primary] Save                                                 │
│  [Outline] Preview          → opens WF-3                        │
│  [Outline] ✎ Edit           → opens WF-4                        │
│  [Outline] Cancel                                               │
│  ───────── progress bar (fetch / agent / save) ─────────        │
└─────────────────────────────────────────────────────────────────┘
```

Direct JSON: inline validation errors. Agent paths: success via toast.  
Optional Gravatar checkbox when image rules match existing `import-cv-preview` logic.

## WF-3: Preview dialog

| Region | Content                                                     |
| ------ | ----------------------------------------------------------- |
| Header | Title "Import preview", template `<Select>`, close button   |
| Body   | `<iframe srcDoc={renderResumeHtml(...)}>` with auto height  |
| Footer | Close only (no Import inside dialog — user returns to form) |

Compared to `/dashboard/cv/[id]/preview`:

| Feature                 | CV preview page | Import preview dialog |
| ----------------------- | --------------- | --------------------- |
| Template select         | Yes             | Yes                   |
| Layout / sections panel | Yes             | **No**                |
| Print / Download PDF    | Yes             | **No**                |
| Persist template        | Yes             | **No**                |
| Breadcrumb              | Yes             | **No**                |

## WF-4: Edit dialog

| Before                  | After            |
| ----------------------- | ---------------- |
| Button: `Edit JSON…`    | Button: `✎ Edit` |
| Title: Edit JSON Resume | Title: **Edit**  |

Behavior unchanged: Save commits to parent state; Cancel discards dialog edits.

## WF-5: Agent job in progress (PDF / Markdown / URL HTML)

```
Status banner: "Import in progress: {progress}"
All actions disabled except Cancel (optional: allow Cancel to stop polling only)
```

On `status: succeeded` + `previewData`: transition to WF-2.

## WF-6: URL import — removed UI

Remove the bordered **Preview** section that shows raw JSON in `<pre>`. Visual preview is only in WF-3.
