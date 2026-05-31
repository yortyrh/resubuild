# cv-resume-export Specification

## Purpose

TBD - created by archiving change cv-html-view-pdf-export. Update Purpose after archive.

## Requirements

### Requirement: The system SHALL render exported CVs in classic MIT academic résumé format

A shared module (workspace package) SHALL export a function that accepts a JSON Resume object and returns a complete HTML document suitable for print and PDF. The visual design SHALL follow classic MIT-style résumé conventions: single-column serif layout (e.g. Georgia/Times), black text on white, centered header block, section titles in bold ALL-CAPS with a horizontal rule beneath each title, and entry blocks where the primary entity (employer or institution) is bold on the first line and employment dates are right-aligned on that same line.

The renderer SHALL support all JSON Resume sections used by the product: basics (including optional profiles in the contact area), summary, work, volunteer, education, skills, projects, awards, certificates, publications, languages, interests, and references.

#### Scenario: Renderer produces valid HTML document

- **WHEN** the renderer is invoked with a schema-valid sample resume from `.samples/resumes/jsonresume/`
- **THEN** the output SHALL be a document starting with `<!DOCTYPE html>` and include a single main content root suitable for print
- **AND** section titles visible in the body SHALL use MIT-style ALL-CAPS headings with a horizontal rule (e.g. `EXPERIENCE`, `EDUCATION`)

#### Scenario: Empty optional sections are omitted

- **WHEN** the resume omits `work` and `skills`
- **THEN** the HTML SHALL NOT include empty Experience or Skills sections

#### Scenario: Centered header with contact line

- **WHEN** basics include name, label, email, phone, and location
- **THEN** the header SHALL center the name prominently
- **AND** SHALL render contact details on a centered line (or lines) using bullet separators between items, consistent with MIT samples

### Requirement: Section order SHALL prioritize experience before education

The document body SHALL render sections in this order when data is present: Summary → Experience (work) → Volunteer → Education → Skills → Projects → Awards → Certificates → Publications → Languages → Interests → References. Education MUST NOT appear before Experience when both are present.

#### Scenario: Work and education both present

- **WHEN** a resume includes at least one work entry and one education entry
- **THEN** the HTML source order SHALL place the Experience section before the Education section

#### Scenario: Education only

- **WHEN** a resume has education but no work
- **THEN** the HTML SHALL include Education without an empty Experience section

### Requirement: Experience entries SHALL use MIT employer-first layout

Each work entry SHALL display: (1) employer name (and location when present) in bold on the left, with the date range right-aligned on the same line; (2) job position in italic on the following line; (3) optional summary and highlight bullets indented below.

#### Scenario: Work entry typography

- **WHEN** a work item has name "Acme Corp", position "Senior Engineer", and dates 2020-01 to 2024-06
- **THEN** the export HTML for that entry SHALL show "Acme Corp" as the bold primary line with dates right-aligned
- **AND** SHALL show "Senior Engineer" in italic on the line below the employer line
- **AND** SHALL NOT use the job title as the sole bold first line without the employer name

### Requirement: Education entries SHALL use MIT institution-first layout

Each education entry SHALL display: (1) institution name in bold on the left, with the date range right-aligned on the same line; (2) study type and area (degree program) in bold on the following line; (3) optional course bullets indented below.

#### Scenario: Education entry typography

- **WHEN** an education item has institution "MIT", studyType "Ph.D.", area "Mechanical Engineering", and start/end dates
- **THEN** the export HTML SHALL show the institution bold on the first line with dates right-aligned
- **AND** SHALL show degree/program information bold on the second line

### Requirement: Skills SHALL render as MIT category lines

Each skill group SHALL render as a single line (or wrapped line) in the form **{skill name}:** followed by comma-separated keywords (and level when present). Skills MUST NOT use an unrelated card or multi-row definition-list layout that diverges from MIT category lines.

#### Scenario: Skills line format

- **WHEN** a skill has name "Computer" and keywords ["Python", "MATLAB"]
- **THEN** the export HTML SHALL include a line beginning with a bold "Computer:" label followed by comma-separated tools

### Requirement: Markdown-authored resume fields SHALL render as formatted HTML in export output

Fields stored as Markdown in the database (including basics summary, section summaries and descriptions, highlight bullets, and reference text) SHALL be converted to sanitized HTML before insertion into the export template. The export output MUST NOT display raw Markdown syntax (e.g. literal `**` or `- ` list markers) when the stored value contains Markdown formatting.

#### Scenario: Bold highlight in work section

- **WHEN** a work highlight contains `**Reduced latency by 40%**`
- **THEN** the export HTML for that bullet SHALL render bold emphasis without literal asterisks

#### Scenario: Unsafe HTML in Markdown is stripped

- **WHEN** a summary contains a Markdown link or inline HTML script attempt
- **THEN** the sanitized output SHALL NOT include executable script content

### Requirement: Export assembly SHALL build a full JSON Resume from normalized storage

The export pipeline SHALL load the CV header and all normalized section rows for the requested `cvId`, assemble them into one JSON Resume object using the shared `assembleResume` helper, and SHALL include `profiles` inside `basics.profiles` for template rendering. This assembly SHALL be used only for export endpoints, not for slim dashboard reads.

#### Scenario: Export includes profiles in basics

- **WHEN** a CV has two profile rows and export HTML is requested
- **THEN** the assembled resume passed to the renderer SHALL include both profiles under `basics.profiles`

### Requirement: Media image URLs in export HTML SHALL be absolute

When `basics.image` references a resume media URL served by the API, the renderer or export service SHALL rewrite it to an absolute URL resolvable by a headless browser loading the HTML (using configured API public origin).

#### Scenario: Profile photo in PDF

- **WHEN** basics image is `/media/{id}` or a fully qualified API media URL
- **THEN** the export HTML `img` source SHALL use an absolute URL so PDF generation can fetch the image

### Requirement: PDF generation SHALL use the same HTML as the HTML export endpoint

The PDF export implementation SHALL obtain HTML by calling the same rendering path as `GET /cv/:id/export/html` (no duplicate template). Puppeteer (or puppeteer-core with configured Chromium) SHALL render that HTML to Letter-sized PDF with print backgrounds and margins matching the template `@page` rules.

#### Scenario: PDF bytes match HTML preview content

- **WHEN** a CV has a single work entry with a known employer name
- **THEN** text extracted from the generated PDF SHALL include that employer name (smoke-level assertion in tests)

#### Scenario: PDF engine unavailable

- **WHEN** Chromium is not available and PDF is requested
- **THEN** the API SHALL respond with 503 and a message that PDF export is temporarily unavailable
- **AND** HTML export SHALL remain available if the CV exists

### Requirement: JSON export SHALL use the same assembly path as HTML and PDF

The export pipeline for JSON SHALL load the CV header and all normalized section rows, assemble them with `assembleResume` (including `profiles` under `basics.profiles`), then pass the result through `prepareExportedResume` before responding. JSON export SHALL NOT rewrite `basics.image` to absolute URLs; stored media references SHALL be preserved as in the database.

#### Scenario: JSON export includes profiles in basics

- **WHEN** a CV has two profile rows and JSON export is requested
- **THEN** the exported document SHALL include both profiles under `basics.profiles`
- **AND** profile entries SHALL NOT include internal row `id` fields

#### Scenario: JSON export preserves stored image reference

- **WHEN** `basics.image` is stored as a relative API media path
- **THEN** the JSON export SHALL emit the same stored path string
- **AND** SHALL NOT require absolute URL rewriting used for HTML/PDF rendering

### Requirement: Presentation letter export SHALL render Markdown to HTML and PDF

The export system SHALL provide authenticated `GET /applications/:id/export/letter/html` returning a complete HTML document for the application's `cover_letter` Markdown, and `GET /applications/:id/export/letter/pdf` returning PDF bytes generated by the same headless browser pipeline used for CV PDF export. Letter HTML SHALL render Markdown as sanitized formatted HTML suitable for print and for client-side rich-text clipboard copy (`text/html` with plain-text fallback). A separate plain-text-only export endpoint is not required.

#### Scenario: Letter HTML document

- **WHEN** an authenticated user requests letter HTML export for their application
- **THEN** the response SHALL be `text/html` with formatted letter body content derived from Markdown

#### Scenario: Letter PDF matches HTML source

- **WHEN** letter PDF export succeeds
- **THEN** PDF content SHALL be generated from the same letter HTML template as the HTML export route

#### Scenario: Letter PDF unavailable without Chromium

- **WHEN** the PDF engine is not configured and letter PDF is requested
- **THEN** the API SHALL respond with `503` and a clear message, consistent with CV PDF export behavior
