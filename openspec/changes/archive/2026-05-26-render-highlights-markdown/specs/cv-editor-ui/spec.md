## MODIFIED Requirements

### Requirement: View mode SHALL render markdown-authored fields as formatted Markdown

Every CV editor field that uses the shared Wysimark markdown editor in form mode (`markdown="block"` or inline markdown on highlights) SHALL render its saved value through a shared read-only Markdown renderer in view mode (resume-preview rows and nested highlight rows). Raw Markdown source syntax MUST NOT be shown to the user when formatted output is available. The `highlightBody` helper used for Work, Volunteer, and Projects highlight lists MUST render each bullet with the shared `MarkdownView` component using the inline variant—not as a plain text string inside `<li>`.

#### Scenario: Basics summary preview

- **WHEN** a user saves Basics summary containing bold text and a bullet list, then returns to view mode on the Basics tab
- **THEN** the summary SHALL display with bold emphasis and list formatting applied, not as literal `**` or `-` characters

#### Scenario: Work highlight bullet preview

- **WHEN** a work highlight contains inline emphasis or a link authored via the inline markdown editor
- **THEN** the highlight bullet in the Work tab view row SHALL render the emphasis and clickable link

#### Scenario: Work highlight bold text regression

- **WHEN** a saved work highlight contains `**Reduced API latency by 40%**` authored via the inline markdown editor
- **THEN** the Work tab view row SHALL display bold emphasis for that phrase
- **AND** SHALL NOT display literal `**` characters in the bullet text

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

#### Scenario: Volunteer and project highlight preview

- **WHEN** a volunteer or project highlight contains inline emphasis authored via the inline markdown editor
- **THEN** the corresponding tab view row SHALL render formatted Markdown in the highlight bullet, not raw source syntax
