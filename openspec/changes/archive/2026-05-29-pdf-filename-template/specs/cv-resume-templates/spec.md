# cv-resume-templates

## MODIFIED Requirements

### Requirement: PDF export filename includes template label

When `GET /cv/:id/export/pdf` generates a downloadable PDF, the `Content-Disposition` header SHALL use a filename of the format `{name} - {label}.pdf` where `{name}` is the slugified resume title (e.g., `alex-mercer-growth-marketing-manager`) and `{label}` is the template's human-readable label (e.g., `classic`).

#### Scenario: PDF download uses template label in filename

- **WHEN** user downloads PDF for a CV titled "Alex Mercer - Growth Marketing Manager" using template `classic`
- **THEN** the `Content-Disposition` header filename SHALL be `alex-mercer-growth-marketing-manager - classic.pdf`

#### Scenario: PDF download uses template label for non-default template

- **WHEN** user downloads PDF for a CV with template `modern` selected
- **THEN** the `Content-Disposition` header filename SHALL include `modern` in the label portion (e.g., `resume-title - modern.pdf`)

### Requirement: Template metadata provides label for filename construction

The `GET /cv/export/templates` response SHALL include a `label` field for each template, used as the `{label}` portion of the PDF filename.

#### Scenario: Templates list provides labels

- **WHEN** client calls `GET /cv/export/templates`
- **THEN** each template entry SHALL contain `id` and `label` fields
- **AND** the `label` values SHALL be the same labels used in the PDF filename
