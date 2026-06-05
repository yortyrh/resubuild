## MODIFIED Requirements

### Requirement: PDF import SHALL produce schema-valid JSON Resume before CV create

The import pipeline SHALL extract text from the PDF, map content to JSON Resume shape, run verification (schema validation, date normalization, optional web lookup tools using the user's Tavily web scrape key when configured), optionally discover and merge social profiles into `basics.profiles` when Tavily is configured, and pass the result through `prepareImportedResume` and schema validation. The job SHALL store the prepared object as `previewData` and SHALL NOT persist a CV row. CV creation SHALL occur only when the client calls `POST /cv` after user confirmation with the prepared data (same meta, validation, and title derivation as direct create). When discovery adds profiles, the job response MAY include `discoveredProfilesCount` indicating how many profiles were auto-added. The PDF text extraction step (`extractPdfTextTool`) MUST call `parser.getText({ parseHyperlinks: true })` so that hyperlink annotations in the source PDF are returned as Markdown inline links (e.g. `[yorty](https://linkedin.com/in/yorty)`) in the extracted text; this preserves the icon-to-URL mapping that the LLM draft step needs to populate `basics.profiles` and is otherwise lost when `pdf-parse@2` strips icons to plain text.

#### Scenario: Valid PDF yields preview data

- **WHEN** processing completes for a text-based PDF with extractable content
- **THEN** the job SHALL end in `succeeded` with `previewData` set
- **AND** no CV row SHALL be created by the import job

#### Scenario: Preview includes discovered profiles

- **WHEN** a PDF import job succeeds after social profile discovery added two profiles
- **THEN** `previewData.basics.profiles` SHALL include those profiles
- **AND** `discoveredProfilesCount` MAY equal `2`

#### Scenario: Unextractable PDF fails job

- **WHEN** the PDF yields no extractable text (e.g. scanned image-only)
- **THEN** the job SHALL end in `failed` with an error indicating the PDF could not be parsed
- **AND** no CV row SHALL be created

#### Scenario: Hyperlink annotations surface as Markdown links in the extracted text

- **WHEN** the source PDF contains a hyperlink annotation that maps the icon next to a candidate's name to a LinkedIn profile URL
- **THEN** `extractPdfTextTool` SHALL return text containing a Markdown inline link in the form `[<label>](<url>)` for that annotation
- **AND** the LLM draft step SHALL be able to derive the URL from the extracted text

#### Scenario: PDFs without hyperlink annotations are unaffected

- **WHEN** the source PDF contains no hyperlink annotations
- **THEN** `extractPdfTextTool` SHALL return the same plain text it would have returned before this change
- **AND** the import pipeline SHALL continue to produce a schema-valid draft

#### Scenario: Vision-OCR fallback path is unaffected

- **WHEN** the PDF yields no extractable text and the vision-OCR fallback runs
- **THEN** the OCR transcription path is unchanged
- **AND** the final `previewData` SHALL still satisfy the JSON Resume schema
