# application-workspace-tab-persistence Specification

## Purpose

TBD - created by archiving change application-workspace-tab-view. Update Purpose after archive.

## Requirements

### Requirement: Last selected application-workspace tab SHALL persist in sessionStorage

The workspace SHALL write the active tab id to `sessionStorage` under the key `application-workspace:lastTab` whenever the user changes tabs. On first render, the workspace SHALL read that key and use the stored value as the initial active tab if it is one of the valid tab ids (`summary`, `tailored-cv`, `cover-letter`); otherwise the workspace SHALL default to `summary`.

#### Scenario: User selects Cover letter and reloads

- **WHEN** the user activates the Cover letter tab and then reloads the workspace page in the same browser tab
- **THEN** the workspace SHALL mount with the Cover letter tab active
- **AND** `sessionStorage.getItem('application-workspace:lastTab')` SHALL equal `cover-letter`

#### Scenario: Stored value is invalid

- **WHEN** `sessionStorage.getItem('application-workspace:lastTab')` returns a value that is not one of `summary`, `tailored-cv`, or `cover-letter`
- **THEN** the workspace SHALL mount with the Job summary tab active
- **AND** SHALL NOT throw an error

#### Scenario: Tab change writes to sessionStorage

- **WHEN** the user activates any tab in the workspace
- **THEN** the workspace SHALL update `sessionStorage['application-workspace:lastTab']` to the activated tab id before the next render
