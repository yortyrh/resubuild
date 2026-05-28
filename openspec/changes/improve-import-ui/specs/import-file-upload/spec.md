## ADDED Requirements

### Requirement: The web app SHALL provide a shared file upload drop zone for résumé imports

The client SHALL expose a reusable upload component for typed file selection on import flows. The component MUST support click-to-browse via a hidden file input and drag-and-drop onto a visible drop region. It SHALL accept configurable `accept` MIME/extension rules and a maximum byte size. When a file is selected, the UI SHALL display the file name and offer a control to clear the selection. When validation fails (wrong MIME/type, oversize, or read error propagated from parent), the component or its parent SHALL show an inline error and SHALL NOT treat the file as selected.

#### Scenario: User selects a valid file by click

- **WHEN** a user activates the drop zone and chooses a file matching accept rules and under the size limit
- **THEN** the component SHALL invoke the selection callback with the file
- **AND** SHALL display the selected file name

#### Scenario: User drops a valid file

- **WHEN** a user drops a file matching accept rules and under the size limit onto the drop zone
- **THEN** the component SHALL invoke the selection callback with the file
- **AND** SHALL display the selected file name

#### Scenario: Oversized file rejected

- **WHEN** a user selects or drops a file larger than the configured maximum
- **THEN** the UI SHALL show a file-too-large error
- **AND** SHALL NOT invoke the selection callback with that file

#### Scenario: Wrong file type rejected

- **WHEN** a user selects or drops a file that does not match the configured accept rules
- **THEN** the UI SHALL show a type error
- **AND** SHALL NOT invoke the selection callback with that file

#### Scenario: User clears selection

- **WHEN** a user clears the current selection
- **THEN** the component SHALL invoke the selection callback with `null`
- **AND** SHALL reset the visible file summary

### Requirement: Import upload components SHALL remain accessible

The drop zone SHALL expose an associated label and keyboard-operable control to open the file picker. While disabled (e.g. during import), the drop zone SHALL NOT accept new files.

#### Scenario: Keyboard user opens file picker

- **WHEN** a keyboard user focuses the drop zone activation control and confirms
- **THEN** the system file picker SHALL open

#### Scenario: Upload disabled during import

- **WHEN** the parent sets the upload component to disabled during an in-flight import
- **THEN** the drop zone SHALL NOT accept new files until re-enabled
