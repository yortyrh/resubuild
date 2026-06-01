## ADDED Requirements

### Requirement: Form controls SHALL treat null optional strings as empty display values

CV editor form controls bound to optional normalized resume string fields (including shared `TextField`, `Input`, `Textarea`, date fields, and combobox pickers) SHALL coerce `null` to an empty string for display and DOM `value` binding. Controlled inputs MUST NOT receive `value={null}`. Field helpers that call string methods (e.g. `.trim()`) MUST NOT throw when the bound resume value is `null`.

#### Scenario: Editing work entry with null optional field

- **WHEN** a user opens an edit form for a work entry whose optional string field is `null` in normalized resume data
- **THEN** the corresponding text input SHALL render empty
- **AND** React SHALL NOT warn that the input `value` prop must not be null

#### Scenario: Combobox with null network value

- **WHEN** a social profile row has `network: null`
- **THEN** the network combobox SHALL render with an empty visible value
- **AND** the component SHALL NOT throw during render

#### Scenario: Date field with null value

- **WHEN** a user edits an entry whose start or end date is `null`
- **THEN** the ISO date field native input SHALL show an empty value
- **AND** precision controls SHALL remain operable
