## ADDED Requirements

### Requirement: View mode SHALL render persisted URL fields as clickable external links

Every JSON Resume `url` field shown in CV editor view mode (resume-preview rows) SHALL be rendered as a clickable hyperlink using the stored value as the destination. The link MUST open in a new browsing context (`target="_blank"`) with `rel="noopener noreferrer"`. Bare hostnames without a scheme (e.g. `linkedin.com/in/user`) SHALL be normalized to HTTPS for navigation.

#### Scenario: Social profile URL in preview

- **WHEN** a user views a saved social profile entry with a non-empty URL on the Social profiles tab
- **THEN** the URL SHALL appear as a clickable link that opens the profile destination in a new tab

#### Scenario: Basics website in contact line

- **WHEN** a user views Basics with a non-empty `basics.url` alongside email or phone
- **THEN** the website segment in the contact line under the name SHALL be a clickable link opening in a new tab while other contact segments remain plain text

#### Scenario: Work entry URL in preview

- **WHEN** a user views a saved work entry with a non-empty `url` field
- **THEN** the Work tab preview SHALL display the URL as a clickable external link in the entry body

#### Scenario: Project URL in preview

- **WHEN** a user views a saved project with a non-empty `url` field
- **THEN** the Projects tab preview SHALL display the URL as a clickable external link

#### Scenario: Publication and certificate URLs in preview

- **WHEN** a user views a saved publication or certificate with a non-empty `url` field
- **THEN** the corresponding tab preview SHALL display the URL as a clickable external link

#### Scenario: Unsafe URL scheme

- **WHEN** a stored URL uses a disallowed scheme such as `javascript:`
- **THEN** the editor view SHALL NOT navigate via script execution and SHALL omit or neutralize the unsafe hyperlink while preserving safe display where possible

### Requirement: Markdown-rendered links SHALL open in a new tab

When view mode renders links produced from Markdown-authored fields (summaries, descriptions, highlights), those anchors SHALL use the same new-tab and `rel` policy as dedicated `url` fields.

#### Scenario: Link inside work summary Markdown

- **WHEN** a work summary saved with Markdown contains an `[label](https://example.com)` link and the user views the Work entry
- **THEN** the rendered link SHALL open `https://example.com` in a new tab with `rel="noopener noreferrer"`
