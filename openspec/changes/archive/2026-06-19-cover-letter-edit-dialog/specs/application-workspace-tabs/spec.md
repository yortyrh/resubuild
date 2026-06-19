## MODIFIED Requirements

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

## ADDED Requirements

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
