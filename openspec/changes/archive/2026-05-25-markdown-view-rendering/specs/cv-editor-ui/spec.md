## ADDED Requirements

### Requirement: View mode SHALL render markdown-authored fields as formatted Markdown

Every CV editor field that uses the shared Wysimark markdown editor in form mode (`markdown="block"` or inline markdown on highlights) SHALL render its saved value through a shared read-only Markdown renderer in view mode (resume-preview rows and nested highlight rows). Raw Markdown source syntax MUST NOT be shown to the user when formatted output is available.

#### Scenario: Basics summary preview

- **WHEN** a user saves Basics summary containing bold text and a bullet list, then returns to view mode on the Basics tab
- **THEN** the summary SHALL display with bold emphasis and list formatting applied, not as literal `**` or `-` characters

#### Scenario: Work highlight bullet preview

- **WHEN** a work highlight contains inline emphasis or a link authored via the inline markdown editor
- **THEN** the highlight bullet in the Work tab view row SHALL render the emphasis and clickable link

#### Scenario: Reference text preview

- **WHEN** a reference entry includes multi-paragraph Markdown with block quotes or lists
- **THEN** the References tab view row SHALL render block-level Markdown structure beneath the contact name

### Requirement: Markdown view rendering SHALL be consistent across all CV section tabs

The shared Markdown renderer SHALL be used for markdown-authored view output in Basics, Work, Volunteer, Projects, Awards, Publications, References, and nested highlight list rows (Work, Volunteer, Projects) without tab-specific one-off plain-text fallbacks.

#### Scenario: Awards summary preview

- **WHEN** a user views a saved award whose summary was authored with the block markdown editor
- **THEN** the Awards tab preview SHALL show formatted Markdown for the summary field

#### Scenario: Project description preview

- **WHEN** a saved project includes a non-empty description authored with the block markdown editor
- **THEN** the Projects tab preview SHALL show the description as rendered Markdown in the entry body

### Requirement: Markdown view output SHALL be sanitized and safe

The read-only Markdown renderer MUST sanitize HTML emitted from user-authored Markdown and MUST NOT execute scripts or render unsafe tags. External links rendered from Markdown SHOULD open in a new browsing context with appropriate `rel` attributes.

#### Scenario: Untrusted link in summary

- **WHEN** saved Markdown includes a link with a `javascript:` URL or embedded script attempt
- **THEN** the view renderer SHALL omit or neutralize unsafe content while still displaying safe text where possible
