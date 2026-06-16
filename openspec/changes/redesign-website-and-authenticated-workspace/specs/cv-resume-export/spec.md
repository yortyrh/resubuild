## MODIFIED Requirements

### Requirement: The CV export workflow SHALL provide print-faithful PDF and portable structured exports

The preview/export surface MUST group export actions clearly and consistently:

- `Export PDF`
- `Print`
- `JSON Resume`
- any supported cover-letter or application-related exports when reached from an application workspace.

The UI MUST preserve print-faithful PDF behavior and MUST continue to position exports as clean, ATS-friendly documents. Export controls SHOULD be visually secondary to the document preview except for the single selected primary export action.

#### Scenario: User exports a CV from Preview / Export

- **WHEN** the user opens Preview / Export for a CV
- **THEN** the page SHALL show the document preview and grouped actions for PDF, Print, and JSON Resume
- **AND** the PDF output SHALL remain print-faithful to the preview

### Requirement: Application exports SHALL group tailored CV and cover-letter outputs

When the user exports from an application workspace, export actions MUST be grouped in the `Exports` tab. The tab MUST support available outputs defensively:

- tailored CV PDF;
- cover letter PDF;
- JSON Resume;
- copy cover letter;
- print;
- latest export metadata.

The UI MUST not block other exports when one output is unavailable. For example, a cover letter may be copyable even if tailored CV PDF metadata is missing.

#### Scenario: Application export tab renders available outputs

- **WHEN** an application has a tailored CV and cover letter
- **THEN** the Exports tab SHALL show actions for tailored CV PDF, cover letter PDF, JSON Resume, copy, and print when supported

#### Scenario: Application export tab handles partial outputs

- **WHEN** an application lacks one generated output
- **THEN** the Exports tab SHALL still show available export/copy actions
- **AND** SHALL explain which output is missing or needs regeneration
