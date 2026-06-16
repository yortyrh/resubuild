## MODIFIED Requirements

### Requirement: The application preparation flow SHALL preserve existing generation behavior while improving presentation

The Prepare Application page MUST keep the existing job-source inputs, base-CV selection behavior, optional-instruction behavior, validation behavior, and generation submission contract.

The page MAY be restyled as source cards, a cleaner form, or a stepper-like presentation, but the visual layout MUST NOT introduce new required fields, new backend payload fields, new AI outputs, or new generation stages.

#### Scenario: User prepares an application with the redesigned UI

- **WHEN** a signed-in user opens the prepare application page
- **THEN** the page SHALL expose the same supported job-source options as before
- **AND** SHALL expose the same base-CV selection behavior as before
- **AND** SHALL submit the same existing generation payload shape

#### Scenario: Stepper-like presentation preserves behavior

- **WHEN** the UI uses a stepper-like presentation
- **THEN** each step SHALL only organize existing inputs
- **AND** the final generation request SHALL be equivalent to the previous generation request

### Requirement: The Applications view SHALL present existing applications as a polished table or card-table

The Applications view MUST present applications using a table or card/table hybrid optimized for scanning. It MUST use existing application data only.

Application rows/cards SHOULD show, when available:

- role;
- company;
- status;
- base CV;
- created or updated date;
- existing generated outputs/actions;
- primary open action;
- secondary overflow menu.

The view MUST NOT require match scores, evidence, recommendations, generated summaries, or new application metadata.

#### Scenario: Applications list shows useful existing context

- **WHEN** applications are listed
- **THEN** each application item SHALL show role and company
- **AND** SHALL show optional existing metadata only when available
- **AND** destructive actions SHALL NOT be displayed as the dominant visible row action

#### Scenario: Existing applications render without new metadata

- **WHEN** an application record has only the existing fields
- **THEN** the redesigned Applications view SHALL still render it successfully
- **AND** SHALL not show empty placeholders for unsupported match-analysis or evidence features

### Requirement: The application workspace SHALL keep existing outputs and polish the current UI

The application workspace MUST keep the current functional tabs/sections and generated outputs available today. The redesign SHALL improve spacing, cards, tab styling, buttons, loading states, empty states, and responsive layout without replacing the workspace with new analysis-driven panes.

Allowed label changes MUST be behavior-preserving. For example, `Update` MAY become `Regenerate` only when it reruns the same existing generation flow.

The workspace MUST NOT add these features in this phase:

- Evidence used panel;
- compare mode;
- generation summary;
- match analysis tab;
- recommended edits;
- changes-applied summary;
- new export history;
- required structured AI metadata.

#### Scenario: Workspace preserves existing tab behavior

- **WHEN** the user opens an existing application workspace
- **THEN** the existing functional areas and outputs SHALL remain available
- **AND** the visual presentation SHALL use the refreshed brand system
- **AND** no new analysis-only tab SHALL be required to complete the existing workflow

#### Scenario: Cover letter remains the existing editor/output surface

- **WHEN** the user opens the cover-letter area
- **THEN** the UI SHALL show the existing cover-letter content and existing actions
- **AND** SHALL NOT require evidence metadata to render or use the cover letter