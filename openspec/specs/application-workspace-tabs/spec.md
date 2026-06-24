# application-workspace-tabs Specification

## Purpose

TBD - created by archiving change application-workspace-tab-view. Update Purpose after archive.

## Requirements

### Requirement: Application workspace SHALL expose Job summary, Tailored CV, and Cover letter as a tabbed panel

The page at `/dashboard/applications/[id]` SHALL render the three workspace sections — Job summary, Tailored CV, and Cover letter — inside a single tabbed control. The tabs SHALL appear in this order: Job summary, Tailored CV, Cover letter. Only one tab panel SHALL be visible at a time. All three sections SHALL remain reachable without leaving the page.

The tab group SHALL be rendered through the shared `Tabs` component
(`apps/web/src/components/ui/tabs.tsx`), which reserves the height of the
tallest panel so the panel does not reflow when the user switches between
the Job summary, Tailored CV, and Cover letter tabs (which differ
dramatically in height).

#### Scenario: User sees three tabs on the workspace

- **WHEN** a signed-in user opens `/dashboard/applications/[id]` for a `ready` application
- **THEN** the workspace SHALL display a tab strip with three triggers labeled Job summary, Tailored CV, and Cover letter
- **AND** exactly one of the three panels SHALL be visible on first render

#### Scenario: User switches between tabs

- **WHEN** the user clicks the Cover letter tab while the Job summary tab is active
- **THEN** the Cover letter panel SHALL become visible
- **AND** the Job summary and Tailored CV panels SHALL NOT be visible

#### Scenario: User keyboard-navigates tabs

- **WHEN** the user focuses the tab strip and presses the arrow keys or Tab
- **THEN** focus SHALL move between the three tab triggers in DOM order
- **AND** pressing Enter or Space SHALL activate the focused tab

#### Scenario: Switching between workspace tabs does not reflow the panel

- **WHEN** a signed-in user toggles between the Job summary, Tailored CV, and Cover letter tabs on `/dashboard/applications/[id]`
- **THEN** the height of the tabbed panel SHALL remain the height of the tallest of the three panels
- **AND** the action buttons in the workspace header (Edit CV, Preview, Copy letter, Print, PDF) SHALL NOT reflow vertically

### Requirement: Cover letter tab SHALL preserve editor actions and Save

The Cover letter tab SHALL render the saved cover letter markdown through the read-only `MarkdownView` component (sanitized via `rehypeSanitize`) instead of the inline `MarkdownEditor`. The tab SHALL expose an **Edit** action in its action bar before **Copy letter**. Activating the Edit action SHALL open a dedicated `ApplicationLetterEditDialog` that hosts the `MarkdownEditor` (block variant), seeds its draft from the current server value on every open, and persists changes exclusively through the `updateApplicationLetter` mutation. The mutation's `JobApplicationSummary` response SHALL be written into the react-query cache for the workspace via `queryClient.setQueryData`, after which the Cover letter tab SHALL re-render the new content without an extra GET. The workspace SHALL NOT maintain a local `letterDraft` mirror of the cover letter or an imperative editor ref bridge. The previous inline **Save letter** button SHALL NOT be rendered.

#### Scenario: Cover letter tab shows read-only preview

- **WHEN** a signed-in user opens `/dashboard/applications/[id]` and activates the Cover letter tab with a non-empty saved letter
- **THEN** the tab SHALL render the letter through `MarkdownView` with the block variant
- **AND** SHALL NOT render an inline `MarkdownEditor` on the tab
- **AND** SHALL NOT render a Save letter button

#### Scenario: Edit action opens the dialog

- **WHEN** the user activates the Edit action in the Cover letter action bar
- **THEN** the workspace SHALL open `ApplicationLetterEditDialog` seeded with the current `data.coverLetter`
- **AND** the dialog SHALL host the `MarkdownEditor` (block variant) for editing

#### Scenario: Edit action is disabled while an update is in progress

- **WHEN** `updateInProgress` is true (the workspace's status mutation is pending)
- **THEN** the Edit action in the Cover letter action bar SHALL be disabled
- **AND** SHALL NOT open the dialog on activation

#### Scenario: Saving in the dialog writes back to the cache

- **WHEN** the user edits the cover letter inside the dialog and presses Save
- **THEN** the workspace SHALL call `updateApplicationLetter(applicationId, draft)`
- **AND** on success SHALL write the returned `JobApplicationSummary` into the `['application', applicationId]` cache entry
- **AND** SHALL close the dialog
- **AND** the Cover letter tab SHALL re-render with the new content from the cache without an extra GET

#### Scenario: Closing the dialog discards unsaved edits

- **WHEN** the user edits the cover letter inside the dialog and closes the dialog without pressing Save (Cancel, Escape, or close button)
- **THEN** the workspace SHALL NOT call `updateApplicationLetter`
- **AND** SHALL NOT mutate the `['application', applicationId]` cache entry
- **AND** the Cover letter tab SHALL continue to render the previous server value

### Requirement: Cover letter preview SHALL be capped at a scrollable max height

The Cover letter tab SHALL wrap its read-only `MarkdownView` in a container that caps the visible height at approximately 60% of the viewport height (`max-h-[60vh]`) and enables vertical scrolling inside the container for letters that exceed that height. Long letters SHALL scroll inside the tab rather than expanding the panel and displacing the action bar or other workspace sections. The cap SHALL apply at the workspace call site and SHALL NOT alter the `MarkdownView` component itself, so other consumers (CV editor preview rows) remain unconstrained.

#### Scenario: Tall cover letter scrolls inside the tab

- **WHEN** the saved cover letter exceeds the cap height
- **THEN** the wrapper SHALL enable vertical scrolling for the letter content
- **AND** the tab SHALL NOT expand to the full letter height

### Requirement: Cover letter Copy/Print/PDF actions SHALL read from the react-query cache

The Copy rich text, Print letter, and Download PDF actions in the Cover letter tab SHALL read `data.coverLetter` from the react-query cache directly. They SHALL NOT rely on any local mirror state. After a successful save through `ApplicationLetterEditDialog`, these actions SHALL immediately reflect the saved value on the next invocation.

#### Scenario: Copy reflects the latest saved value

- **WHEN** the user saves a new letter via the dialog and then activates Copy rich text
- **THEN** Copy SHALL read the updated `data.coverLetter` from the cache
- **AND** SHALL write the new content (HTML rich text with plain-text fallback) to the clipboard

#### Scenario: Print reflects the latest saved value

- **WHEN** the user saves a new letter via the dialog and then activates Print letter
- **THEN** Print SHALL read the updated `data.coverLetter` from the cache
- **AND** the print output SHALL contain the new content

### Requirement: Cover letter edit dialog SHALL mount the MarkdownEditor in freeForm mode

The `ApplicationLetterEditDialog` SHALL mount its `MarkdownEditor` instance with the `freeForm` prop set so the editor accepts the full markdown grammar (headings, code blocks) when authoring a cover letter. CV section constraints (no headings, no code blocks, no image upload) MUST NOT apply to the cover letter authoring surface.

#### Scenario: Cover letter dialog enables full markdown

- **WHEN** the dialog renders an `ApplicationLetterEditDialog` with non-empty `initialValue`
- **THEN** the `<MarkdownEditor>` instance inside the dialog SHALL receive `freeForm=true`
- **AND** saved cover letter markdown that begins with `## ` SHALL render as an `<h2>` (or equivalent heading) inside the editor

#### Scenario: Heading markdown seeds the editor unchanged

- **WHEN** a user opens the dialog with `initialValue` equal to `"## Some heading\nSome text"`
- **THEN** the editor SHALL receive the full string `"## Some heading\nSome text"` on its `markdown` prop without truncation or escape
- **AND** `markdownShortcutPlugin` plus `headingsPlugin` SHALL promote the `## ` prefix into a heading node

#### Scenario: Cover letter preview is unaffected

- **WHEN** a user saves a heading-prefixed cover letter and reopens the Cover letter tab in read-only mode
- **THEN** the `MarkdownView` preview SHALL continue to render the heading via its existing `react-markdown` + `remark-gfm` pipeline
- **AND** no editor-preview drift SHALL occur

### Requirement: Cover letter preview SHALL render headings at prose-sm typography scale

The Cover letter tab's read-only `MarkdownView` preview SHALL render headings authored with `## ` syntax at the typography scale provided by `@tailwindcss/typography` (`prose-sm`), so the preview size matches what the cover-letter editor (mounted in `freeForm` mode per the cover letter `MarkdownEditor` `freeForm` requirement) shows while editing. The preview SHALL NOT render heading text at body-text size.

This requirement scopes the cv-editor-ui `MarkdownView` block-variant prose layering to the Cover letter preview context; the underlying capability lives in the `cv-editor-ui` spec.

#### Scenario: Heading markdown renders at heading size in cover letter preview

- **WHEN** a user saves a cover letter that begins with `## Greeting` and reopens the Cover letter tab in read-only mode
- **THEN** the Cover letter preview SHALL render `## Greeting` as an `<h2>` sized by the project's typography scale (larger than body text)
- **AND** no editor-preview drift SHALL occur (the preview size matches the editor's heading size)

#### Scenario: Dark-mode cover letter preview is readable

- **WHEN** the user's `prefers-color-scheme` is `dark` and the Cover letter tab is active with a non-empty saved letter
- **THEN** the Cover letter preview text SHALL use the project's dark-mode foreground color
- **AND** headings, links, and blockquotes SHALL use the project's dark-mode color palette (not the prose plugin's hardcoded light palette)

### Requirement: Application workspace chrome SHALL be excluded from print output

The application workspace component MUST apply the `no-print` utility class to both in-page chrome containers rendered above the tab content: the workspace header wrapper (`<div>` that hosts the job title `h1` and the Update action button) and the tab strip header wrapper (the flex row inside the tabs card that hosts `TabsList` and the per-tab action buttons — Edit CV, Preview, Copy letter, Print, PDF). The existing `@media print { .no-print { display: none !important; } }` rule in `apps/web/src/app/globals.css` MUST hide both wrappers whenever a user invokes the browser print dialog on `/dashboard/applications/[id]`. The body content of each tab panel (Job summary, Tailored CV preview, Cover letter preview) MUST remain visible and printable.

#### Scenario: Printing an application workspace page omits the header and tab strip

- **WHEN** a signed-in user opens the browser print dialog on
  `/dashboard/applications/[id]` (for any active tab: Job summary,
  Tailored CV, or Cover letter)
- **THEN** the workspace header row (job title + Update button) SHALL
  NOT appear in the print preview
- **AND** the tab strip header row (tab triggers + per-tab action
  buttons) SHALL NOT appear in the print preview
- **AND** the active tab panel's body content SHALL remain visible and
  printable
