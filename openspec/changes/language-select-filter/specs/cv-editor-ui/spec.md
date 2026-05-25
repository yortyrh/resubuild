## ADDED Requirements

### Requirement: Languages tab language field MUST use a searchable combobox

The Languages section edit form SHALL replace the free-text Language input with an accessible filterable combobox (button trigger, searchable dropdown, keyboard navigation, click-outside dismiss) consistent with the Basics country picker interaction model. Options SHALL be drawn from a canonical ISO 639-1 aligned list (English display names). The control SHALL persist the selected **language name** string to `resume.languages[].language` per JSON Resume schema.

#### Scenario: Selecting English from picker

- **WHEN** a user edits a language entry and selects "English" from the combobox
- **THEN** `language` SHALL equal `"English"` after save roundtrip
- **AND** the Languages view row SHALL display "English" as the title

#### Scenario: Filtering by typed query

- **WHEN** a user opens the language combobox and types `spa` in the search field
- **THEN** the option list SHALL narrow to matching languages (e.g. Spanish)
- **AND** the user SHALL be able to select a match via click or Enter

#### Scenario: Keyboard navigation

- **WHEN** the language combobox dropdown is open
- **THEN** ArrowDown and ArrowUp SHALL move highlight among filtered options
- **AND** Enter SHALL select the highlighted option and close the dropdown
- **AND** Escape SHALL close the dropdown without changing the value

#### Scenario: Legacy custom language value preserved

- **WHEN** a language entry has `language` set to a string not present in the canonical list (e.g. imported CV data)
- **THEN** the combobox trigger SHALL display that stored string as the current selection
- **AND** the user SHALL still be able to search and pick a canonical name to replace it

#### Scenario: Fluency field unchanged

- **WHEN** a user edits a language entry
- **THEN** Fluency SHALL remain a free-text field separate from the language combobox
