## MODIFIED Requirements

### Requirement: Prepare Application SHALL produce a job_application record with tailored artifacts in one run

On successful workflow completion, the system SHALL persist a `job_application` row containing: extracted job metadata (title, company when known), reference to the selected live `source_cv_id` when available, a persisted `source_cv_snapshot` JSON copy of the base CV used for tailoring, reference to a new `tailored_cv_id` clone, and a `cover_letter` **Markdown** draft in the job posting language unless the optional user message specifies another language. The application SHALL be owned by the authenticated user. The flow SHALL NOT require or expose AI chat for refinement.

On `/dashboard/applications/[id]`, the workspace SHALL render the three sections — job summary (title, company, why-this-CV rationale), the tailored CV (basics and Edit/Preview links), and the cover letter editor with Copy/Print/PDF/Save actions — inside a tabbed control instead of a side-by-side two-column grid. The three sections SHALL still all be reachable from the same page; no section is removed.
