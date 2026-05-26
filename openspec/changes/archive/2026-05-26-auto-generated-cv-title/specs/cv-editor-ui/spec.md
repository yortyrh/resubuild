## ADDED Requirements

### Requirement: CV document title SHALL derive from Basics name and label

The persisted document title (`cv.title`) SHALL be computed from `data.basics.name` and `data.basics.label` using the shared derivation rules: trim both fields; when both are non-empty use `` `{name} — {label}` ``; when only name is non-empty use name; when only label is non-empty use label; when both are empty use **Untitled CV**. The edit shell SHALL display this derived title as read-only prominent text above section tabs. Authors SHALL NOT edit document title independently of Basics.

#### Scenario: Both name and label set

- **WHEN** basics contain name `Jane Doe` and label `Software Engineer`
- **THEN** the edit shell header SHALL display `Jane Doe — Software Engineer`
- **AND** the dashboard CV list SHALL show the same derived title from `cv.title`

#### Scenario: Name only

- **WHEN** basics contain name `Jane Doe` and an empty or whitespace-only label
- **THEN** the derived title SHALL be `Jane Doe`

#### Scenario: Neither name nor label

- **WHEN** basics name and label are both empty or whitespace-only
- **THEN** the derived title SHALL be `Untitled CV`

#### Scenario: No title edit affordance

- **WHEN** a user views the CV edit shell
- **THEN** the document title SHALL NOT expose Edit, Save, or Cancel controls for title
- **AND** SHALL NOT show a standalone title text input in the default layout

#### Scenario: Title updates after basics save

- **WHEN** a user saves Basics with an updated name or label
- **THEN** the edit shell header SHALL reflect the newly derived title after the basics save succeeds (via updated `cv.title` in the response or equivalent refetch)

## REMOVED Requirements

### Requirement: CV document title SHALL use view/edit inline pattern in the edit shell

**Reason**: Document title is derived from Basics; independent inline title editing duplicates Basics and is removed.

**Migration**: Edit **Name** and **Label** in the Basics tab; title updates automatically on save.
