## MODIFIED Requirements

### Requirement: The web app SHALL provide dedicated create and import routes

The dashboard **New CV** dropdown SHALL link to independent routes under `/dashboard/cv/new/` for manual create, file import, and URL import. The legacy tabbed `/dashboard/cv/new` page SHALL redirect to a default route. The file import route subtitle SHALL state that JSON is validated locally and PDF, Markdown, Word, and image formats are converted by the AI agent before confirmation.

#### Scenario: File import route copy

- **WHEN** a user opens `/dashboard/cv/new/import/file`
- **THEN** the page subtitle SHALL mention JSON, PDF, Markdown, Word, and image upload options
