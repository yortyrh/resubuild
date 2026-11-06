# CV data and persistence (`CV`)

### REQ-CV-001 JSON Resume as the content model

CV content follows the [JSON Resume](https://jsonresume.org/schema) schema: basics (name, label, image, email, phone, url, summary, location, profiles) plus the sections work, volunteer, education, awards, certificates, publications, skills, languages, interests, references, and projects.

### REQ-CV-002 CV library

A user can create, list, open, and delete CVs. The library lists only the user's own regular CVs; copies created for job applications are hidden from it (see REQ-APP-004).

- Deleting a CV from the library asks for confirmation in an in-app dialog that names the CV and cannot be dismissed while the delete is running.
- Each library card shows a static skeleton thumbnail of the CV's template (unknown templates fall back to Classic). The thumbnail contains no text: the header, section headings and entry lines are all placeholder bars. Section headings follow the template's heading style (Classic: centered with a rule below; Left aligned: left with a rule below; Modern and Tabular: left without a rule). Sections vary in length so they do not read as one repeated block, and every section shown fits inside the page without being cut off at the bottom.

### REQ-CV-003 Title derived from basics

A CV's title is always computed from the basics name and label. It is never stored or edited separately, and it updates immediately after basics change.

### REQ-CV-004 Item-level persistence

Each entry (one work item, one skill, one profile, etc.) and the basics block are saved or deleted individually as soon as the user confirms. There is no document-level "Save CV" step.

- String lists inside an entry (highlights, courses, keywords, roles) are saved together with their parent entry, not item by item.
- Responses return the saved entry with a stable id so the client can update the UI without reloading.
- A failed save or delete shows an error and never pretends it succeeded.

### REQ-CV-005 Stable entry identity

Every section entry has a stable unique id. Updates, deletes, and reorders address entries by that id, never by list position.

### REQ-CV-006 Ordering

- Date-based sections (work, volunteer, education, projects) are ordered by end date (ongoing roles first), then start date, newest first. Awards and certificates are ordered by date, publications by release date, newest first.
- Profiles, skills, languages, interests, and references keep the order chosen by the user (see REQ-EDIT-008).

### REQ-CV-007 Clean payloads

Blank or whitespace-only string fields are omitted before saving, so optional fields such as URLs and dates are never stored as empty strings.

### REQ-CV-008 Validation

Any full resume document that is created, imported, or replaced is validated against the JSON Resume schema and rejected with readable field errors when invalid. Single-entry saves are validated against that entry's shape.

### REQ-CV-009 Section-scoped loading

Opening a CV loads only its header (basics). Each section loads its own entries when needed. A full assembled document is built only for export and preview.

### REQ-CV-010 Clone

The system can deep-copy a CV (header and all sections, order preserved) into a new CV linked to its source. Used by job applications (REQ-APP-003) and by promoting a tailored CV to the library (REQ-APP-005).

### REQ-CV-011 Move between Work and Volunteer

An entry can be moved between Work and Volunteer. Fields are mapped to the target section; the original is removed only after the new entry is saved, so a failure never loses data.

### REQ-CV-012 Profile photo media

Users can upload a profile photo for a CV, crop it, and delete it.

- Upload accepts only images within a size limit and rejects invalid files before storing anything.
- The original upload is kept; cropping produces a separate derived image, which is served by default; a small thumbnail is generated for the editor.
- Images are served publicly through an unguessable id, so exports and the headless PDF renderer can load them without credentials. Metadata, crop changes, and delete are owner-only.
- Deleting a photo removes the original and all derived images.

### REQ-CV-013 Template presentation settings

Each CV stores presentation settings per template: section order, hidden sections, custom section labels, and which basics fields are shown. Defaults apply when nothing is saved. Invalid settings are rejected. The settings drive preview and every export format.
