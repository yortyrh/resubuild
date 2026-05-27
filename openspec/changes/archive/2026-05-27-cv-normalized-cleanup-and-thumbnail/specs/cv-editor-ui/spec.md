## MODIFIED Requirements

### Requirement: Basics view mode SHALL display profile photo beside identity block

When `basics.image` is set, Basics view mode SHALL render a profile photo thumbnail to the **left** of the name/label and contact line within the row title area. The raw photo URL MUST NOT appear as body text below the summary. For owned API media URLs, the thumbnail `<img>` src SHALL be the public thumbnail URL (`/media/{id}/thumbnail`), not the full display URL. The crop dialog and persisted `basics.image` SHALL continue to use the full `/media/{id}` URL.

#### Scenario: Photo shown with name and contact

- **WHEN** a user views Basics with `basics.image` pointing at owned media and the thumbnail loads successfully
- **THEN** a preview at most 150×150 CSS pixels (aspect ratio preserved) SHALL appear left of the name (`text-xl`) and contact paragraph
- **AND** the image request SHALL target the thumbnail endpoint, not the full media stream

#### Scenario: No photo configured

- **WHEN** a user views Basics with no `basics.image`
- **THEN** no thumbnail SHALL render
- **AND** an upload affordance SHALL remain available in view mode

#### Scenario: External image URL

- **WHEN** `basics.image` is an external URL (not owned API media)
- **THEN** the thumbnail MAY use that URL directly with the same max 150×150 display constraint
- **AND** no thumbnail endpoint is required

## REMOVED Requirements

### Requirement: Failed reorder SHALL preserve prior order in the UI

**Reason:** Optimistic concurrency via `meta.version` and HTTP 409 on reorder was removed; reorder uses last-write-wins.

**Migration:** On any reorder API failure, revert to the pre-reorder list and show a generic error—no 409-specific reload or concurrency message.
