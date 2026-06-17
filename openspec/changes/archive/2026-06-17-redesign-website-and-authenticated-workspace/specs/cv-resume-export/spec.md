## MODIFIED Requirements

### Requirement: The CV export workflow SHALL keep existing behavior

The preview/export surface MUST preserve existing print-faithful PDF behavior and any
existing JSON Resume export behavior. This phase updates the visual grouping, button
hierarchy, toolbar spacing, template selector presentation, and brand styling only.

The export UI MUST NOT require new export metadata, export history, match analysis,
generation summaries, or new backend data.

#### Scenario: User exports a CV from preview/export

- **WHEN** the user opens the CV preview/export surface
- **THEN** the page SHALL show the document preview and existing export actions
- **AND** the PDF output SHALL remain print-faithful to the preview
- **AND** the controls SHALL use the refreshed purple/teal visual system

### Requirement: Application export actions SHALL remain behavior-preserving

When export or copy actions are available from an application workspace, they MUST remain
available after the UI refresh. The redesign MAY group or restyle existing actions, but
MUST NOT require a new `Exports` tab or new export metadata in this phase.

Available actions must render defensively when an application has only partial existing
outputs.

#### Scenario: Existing application output actions remain available

- **WHEN** an application has generated tailored CV or cover-letter output
- **THEN** the existing export/copy actions SHALL remain available in the redesigned
  workspace
- **AND** the UI SHALL not depend on new metadata to render those actions

#### Scenario: Application output is partially available

- **WHEN** an application lacks one generated output
- **THEN** the redesigned workspace SHALL still show the available existing actions
- **AND** SHALL not block one available action because another output is missing
