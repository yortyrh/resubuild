## ADDED Requirements

### Requirement: Agent import success toasts SHALL mention auto-discovered social profiles

When an agent import job (PDF, Markdown, HTML URL, or free text) succeeds and the job response includes `discoveredProfilesCount` greater than zero, the client SHALL show a toast indicating that social profiles were found online and merged into the preview, prompting the user to verify them in Preview or Edit before Save.

#### Scenario: Toast after profiles discovered

- **WHEN** a PDF import job succeeds with `discoveredProfilesCount: 2`
- **THEN** the client SHALL toast that two social profiles were auto-added
- **AND** SHALL still show the existing résumé-ready toast or combine messages without duplicate toasts for the same event

#### Scenario: No discovery toast when count absent or zero

- **WHEN** an agent import job succeeds without `discoveredProfilesCount` or with value `0`
- **THEN** the client SHALL NOT mention auto-discovered profiles in the success toast
