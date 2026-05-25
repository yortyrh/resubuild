## ADDED Requirements

### Requirement: CV document title SHALL use view/edit inline pattern in the edit shell

The CV edit shell (`CvEditor`) SHALL present the persisted document title (`cv.title`) in **view mode** by default: prominent read-only text with an **Edit** control. **Edit mode** SHALL expose a single-line text input and **Save** / **Cancel** actions. The editor MUST NOT show a persistent labeled title field and standalone **Save title** button in the default (view) layout.

#### Scenario: Default view shows title and Edit

- **WHEN** a user opens the CV edit page with a saved title
- **THEN** the document title SHALL render as read-only text above the section tabs
- **AND** an **Edit** button SHALL be visible without an always-on title input
- **AND** a standalone **Save title** button SHALL NOT be visible

#### Scenario: Edit mode exposes input and actions

- **WHEN** a user activates **Edit** on the document title
- **THEN** a text input SHALL appear prefilled with the current title
- **AND** **Save** and **Cancel** buttons SHALL be available
- **AND** the read-only title display SHALL be hidden until save or cancel completes

#### Scenario: Save persists title via API

- **WHEN** a user changes the title in edit mode and activates **Save**
- **THEN** the client SHALL call the existing CV update endpoint with the new `title`
- **AND** on success the view mode SHALL show the updated title
- **AND** a success toast SHALL be shown consistent with current title-save feedback

#### Scenario: Cancel discards unsaved edits

- **WHEN** a user activates **Edit**, modifies the draft title, then activates **Cancel**
- **THEN** the displayed title SHALL revert to the last successfully saved value
- **AND** no title update API call SHALL be made

#### Scenario: Empty title displays placeholder in view mode

- **WHEN** a user views the edit shell and the saved title is empty or whitespace-only
- **THEN** view mode SHALL show an **Untitled CV** (or equivalent) placeholder treatment
- **AND** the **Edit** affordance SHALL remain available

#### Scenario: Save disabled while request in flight

- **WHEN** a title save request is in progress
- **THEN** **Save** and **Cancel** (and **Edit** if still visible) SHALL be disabled or otherwise prevent duplicate submission until the request completes
