# cv-docx-import Specification

## Purpose

TBD - created by archiving change import-image-docx-pdf-ocr. Update Purpose after archive.

## Requirements

### Requirement: DOCX import SHALL produce schema-valid JSON Resume before CV create

The import pipeline SHALL extract plain text from an uploaded `.docx` file, map content to JSON Resume shape via the shared text import workflow, run verification, and pass the result through `prepareImportedResume` and schema validation. The job SHALL store the prepared object as `previewData` and SHALL NOT persist a CV row.

#### Scenario: Valid DOCX yields preview data

- **WHEN** processing completes for a Word document with extractable text
- **THEN** the job SHALL end in `succeeded` with `previewData` set
- **AND** no CV row SHALL be created by the import job

#### Scenario: Empty DOCX fails before job enqueue

- **WHEN** a client uploads a DOCX that yields no extractable text
- **THEN** the API SHALL respond with `400` and SHALL NOT create a job

### Requirement: The web app SHALL expose DOCX import on the file import route

DOCX import SHALL be available through **Import from file** at `/dashboard/cv/new/import/file` with the same Import → Preview/Edit → Save flow as PDF and Markdown.

#### Scenario: User imports DOCX successfully

- **WHEN** a signed-in user selects a `.docx` file, waits for agent success, and activates Save
- **THEN** the client SHALL call `POST /cv/import/docx`, poll until `previewData` is available, then call `POST /cv` once
