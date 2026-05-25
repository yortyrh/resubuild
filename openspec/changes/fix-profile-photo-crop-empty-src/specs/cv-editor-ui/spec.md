## ADDED Requirements

### Requirement: Profile photo crop dialog SHALL NOT render an image with empty src

The profile photo crop dialog component SHALL NOT mount an `<img>` element with an empty or missing `src` attribute when no preview URL is available or when the dialog is idle. This prevents spurious network requests and React/Next.js console warnings.

#### Scenario: Dialog closed with empty preview URL

- **WHEN** the crop dialog is not open and `imageUrl` is an empty string
- **THEN** the component SHALL NOT render an `<img>` element with `src=""`

#### Scenario: Dialog open with valid preview URL

- **WHEN** the crop dialog is open and `imageUrl` is a non-empty blob or media URL
- **THEN** the crop preview `<img>` SHALL render with that URL as `src`
- **AND** the user SHALL be able to adjust and confirm the crop as today
