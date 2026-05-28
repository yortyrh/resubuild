## MODIFIED Requirements

### Requirement: The system SHALL render exported CVs in classic MIT academic résumé format

A shared module (workspace package) SHALL expose a **template registry** and a function `renderResumeHtml(resume, templateId, options)` that returns a complete HTML document suitable for print and PDF. The default template id `mit-classic` SHALL follow classic MIT-style résumé conventions: single-column serif layout (e.g. Georgia/Times), black text on white, centered header block, section titles in bold ALL-CAPS with a horizontal rule beneath each title, and entry blocks where the primary entity (employer or institution) is bold on the first line and employment dates are right-aligned on that same line.

Additional registered templates SHALL implement distinct CAPD sample layouts while sharing the same JSON Resume input, Markdown sanitization, and media URL resolution. The renderer SHALL support all JSON Resume sections used by the product: basics (including optional profiles in the contact area), summary, work, volunteer, education, skills, projects, awards, certificates, publications, languages, interests, and references.

#### Scenario: Renderer produces valid HTML document

- **WHEN** `renderResumeHtml` is invoked with template `mit-classic` and a schema-valid sample resume from `.samples/resumes/jsonresume/`
- **THEN** the output SHALL be a document starting with `<!DOCTYPE html>` and include a single main content root suitable for print
- **AND** section titles visible in the body SHALL use MIT-style ALL-CAPS headings with a horizontal rule (e.g. `EXPERIENCE`, `EDUCATION`)

#### Scenario: Alternate template changes layout

- **WHEN** the same resume is rendered with `mit-classic` and with `capd-alum`
- **THEN** the two HTML documents SHALL differ in section order or typographic structure
- **AND** both SHALL be valid complete HTML documents

#### Scenario: Empty optional sections are omitted

- **WHEN** the resume omits `work` and `skills`
- **THEN** the HTML SHALL NOT include empty Experience or Skills sections for any template

#### Scenario: Centered header with contact line

- **WHEN** basics include name, label, email, phone, and location and template is `mit-classic`
- **THEN** the header SHALL center the name prominently
- **AND** SHALL render contact details on a centered line (or lines) using bullet separators between items, consistent with MIT samples

### Requirement: PDF generation SHALL use the same HTML as the HTML export endpoint

The PDF export implementation SHALL obtain HTML by calling the same rendering path as `GET /cv/:id/export/html`, including identical **template id resolution** (query param, stored CV template, default). Puppeteer (or puppeteer-core with configured Chromium) SHALL render that HTML to Letter-sized PDF with print backgrounds and margins matching the template `@page` rules.

#### Scenario: PDF bytes match HTML preview content

- **WHEN** a CV has a single work entry with a known employer name and a fixed template id
- **THEN** text extracted from the generated PDF SHALL include that employer name (smoke-level assertion in tests)

#### Scenario: PDF uses selected template

- **WHEN** export PDF is requested with `?template=capd-global`
- **THEN** the HTML passed to Puppeteer SHALL be rendered with the global CAPD template

#### Scenario: PDF engine unavailable

- **WHEN** Chromium is not available and PDF is requested
- **THEN** the API SHALL respond with 503 and a message that PDF export is temporarily unavailable
- **AND** HTML export SHALL remain available if the CV exists
