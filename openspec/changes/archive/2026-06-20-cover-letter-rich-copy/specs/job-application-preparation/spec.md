## MODIFIED Requirements

### Requirement: Users SHALL copy and export the cover letter for email or PDF

The application workspace SHALL store and display `cover_letter` as Markdown. The UI SHALL provide a single copy action that writes **rich text** to the clipboard (`text/html` derived from rendered Markdown, with `text/plain` fallback) so one paste into an email client or document preserves formatting. The `text/html` clipboard payload SHALL preserve the author's heading structure: markdown heading syntax (`#` through `######`) in `cover_letter` SHALL be rendered as `<h1>` through `<h6>` elements in the clipboard HTML, so email editors (Gmail, Outlook web, etc.) apply their built-in heading typography on paste. The plain-text fallback SHALL continue to ship the Markdown source as-is, with the email subject line prepended, so non-HTML-aware paste targets receive readable text. The API SHALL expose authenticated letter export routes returning HTML and PDF (Markdown rendered to HTML) using the same server-side PDF engine as CV export. Letter PDF export MAY return `503` when the PDF engine is unavailable, matching CV export behavior.

#### Scenario: Copy letter as rich text for email or document

- **WHEN** a user clicks copy on the cover letter in the workspace
- **THEN** the clipboard SHALL include HTML rich text derived from the Markdown letter
- **AND** SHALL include a plain-text fallback for clients that ignore HTML

#### Scenario: Copy letter preserves markdown headings in rich-text payload

- **WHEN** the cover letter Markdown contains a heading line (e.g. `# Section title` or `## Subheading`)
- **THEN** the `text/html` clipboard payload SHALL include the corresponding `<h1>`–`<h6>` element
- **AND** pasting into an email editor that recognizes `<h1>`–`<h6>` (e.g. Gmail compose) SHALL apply that editor's built-in heading typography
- **AND** the plain-text fallback SHALL still include the subject line and the Markdown body

#### Scenario: Copy letter preserves bold via `<strong>` in rich-text payload

- **WHEN** the cover letter Markdown contains bold syntax (`**bold**`)
- **THEN** the `text/html` clipboard payload SHALL include a `<strong>` element so the pasted email renders the bold run with the editor's built-in bold styling

#### Scenario: Download letter PDF

- **WHEN** a user requests letter PDF export for their application
- **THEN** the API SHALL return `application/pdf` bytes generated from rendered letter HTML
- **AND** the PDF body SHALL contain the same `<h1>`–`<h6>` elements as the HTML export so headings print with the letter-specific heading typography defined in the `cv-resume-export` spec
