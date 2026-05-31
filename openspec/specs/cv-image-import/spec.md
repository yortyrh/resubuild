# cv-image-import Specification

## Purpose

TBD - created by archiving change import-image-docx-pdf-ocr. Update Purpose after archive.

## Requirements

### Requirement: Image import SHALL produce schema-valid JSON Resume before CV create

The import pipeline SHALL transcribe résumé text from an uploaded PNG, JPEG, or WebP image using the user's vision-capable LLM, map content to JSON Resume shape, run verification (schema validation, date normalization, optional web lookup), and pass the result through `prepareImportedResume` and schema validation. The job SHALL store the prepared object as `previewData` and SHALL NOT persist a CV row. CV creation SHALL occur only when the client calls `POST /cv` after user confirmation.

#### Scenario: Valid image yields preview data

- **WHEN** processing completes for a résumé image with readable content
- **THEN** the job SHALL end in `succeeded` with `previewData` set
- **AND** no CV row SHALL be created by the import job

#### Scenario: Unreadable image fails job

- **WHEN** vision transcription returns empty content or the model errors
- **THEN** the job SHALL end in `failed` with a descriptive error
- **AND** no CV row SHALL be created

### Requirement: The web app SHALL expose image import on the file import route

Image import SHALL be available through **Import from file** at `/dashboard/cv/new/import/file`. Image import SHALL require import LLM configuration per `import-llm-config`. The client SHALL upload the image only after explicit Import confirmation, poll until `previewData` is available, then allow Preview, Edit, and Save per `import-preview-ui`.

#### Scenario: User imports image successfully

- **WHEN** a signed-in user selects a PNG/JPEG/WebP on the file import route, waits for agent success, and activates Save
- **THEN** the client SHALL call `POST /cv/import/image`, poll until `previewData` is available, then call `POST /cv` once
