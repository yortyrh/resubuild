# CV REST API

## Purpose

Specify the NestJS HTTP surface for listing, reading, creating, updating, and deleting CVs, including request validation and integration with Supabase for persistence.

## Requirements

### Requirement: All `/cv` routes MUST require authentication

The `CvController` SHALL apply the Supabase auth guard to every handler so unauthenticated requests never reach service logic.

#### Scenario: No bearer token

- **WHEN** a client calls any `/cv` route without a bearer token
- **THEN** the response SHALL be 401 from the auth guard

### Requirement: The API SHALL expose CRUD endpoints for CVs scoped to the authenticated user

Handlers MUST implement `GET /cv`, `GET /cv/:id`, `POST /cv`, `PATCH /cv/:id`, and `DELETE /cv/:id`, using a per-user Supabase client created with the caller's access token so RLS applies. `GET /cv` SHALL return only CV rows where `kind = primary` (excluding application clones). `GET /cv/:id` and mutating operations SHALL still apply to any CV owned by the user, including application clones and source CVs referenced by applications, when the id is known.

#### Scenario: List CVs

- **WHEN** an authenticated client calls `GET /cv`
- **THEN** the service SHALL return CV rows for that user with `kind = primary` ordered by `updated_at` descending

#### Scenario: List excludes application clone

- **WHEN** a user owns a primary CV and an application clone
- **THEN** `GET /cv` SHALL return only the primary CV

#### Scenario: Get application clone by id

- **WHEN** an authenticated client calls `GET /cv/:id` with an application clone id
- **THEN** the service SHALL return that CV if owned by the user

#### Scenario: Get source CV by id for application preview

- **WHEN** an authenticated client calls `GET /cv/:id` with the source CV id from an application they own
- **THEN** the service SHALL return that CV and its sections for read-only preview

#### Scenario: Missing CV

- **WHEN** `GET /cv/:id` or a mutating operation targets an id that does not exist or is not owned (RLS empty result)
- **THEN** the API SHALL respond with 404 and a CV not found message where implemented

### Requirement: Create and update payloads MUST be validated with class-validator DTOs

`POST` bodies SHALL use `CreateCvDto` (optional `title`, required `data` object). `PATCH` bodies SHALL use `UpdateCvDto` (optional `title`, optional `data`). The global validation pipe SHALL strip unknown properties and reject invalid shapes. When `data.basics` is supplied on create or when basics are patched via item routes, the service SHALL overwrite any client-provided `title` with the value derived from basics.

#### Scenario: Invalid DTO

- **WHEN** the body violates DTO constraints (e.g. missing `data` on create)
- **THEN** the framework SHALL return 400 without persisting

### Requirement: Create flow SHALL insert baseline row then apply validated resume `data`

On `POST`, the service SHALL insert a `cv` row with empty basics columns and empty normalized section rows, disassemble the request `data` object into the `cv` row and child tables via the shared assembler/disassembler, validate the assembled document, then persist in a transaction. The service SHALL ignore `data.meta` on input and SHALL NOT persist `meta_version`, `meta_canonical`, or `meta_last_modified`. The response SHALL include a computed `title` derived from `deriveCvTitleFromBasics` applied to the validated basics (ignoring any client-supplied `title`). The response `data` field SHALL contain basics only and SHALL NOT include a `meta` property. When `data` contains a full imported JSON Resume (multiple sections beyond `basics`), the same flow SHALL apply: incoming client `meta` SHALL be ignored, and the full document SHALL be validated against the JSON Resume schema before persist.

#### Scenario: Successful create

- **WHEN** `POST /cv` includes valid `data` with `basics` (and optionally `meta` in the body)
- **THEN** normalized rows for supplied sections SHALL be persisted
- **AND** the response SHALL include the new CV id, computed `title`, timestamps, and slim `data` with `basics` only
- **AND** the response `data` SHALL NOT include `meta`

#### Scenario: Successful create from imported full resume

- **WHEN** `POST /cv` includes valid `data` with `basics`, `work`, `education`, and other JSON Resume sections as produced by `prepareImportedResume`
- **THEN** normalized rows for all supplied sections SHALL be persisted
- **AND** the response SHALL include a computed `title` from basics

#### Scenario: Imported document fails schema validation

- **WHEN** `POST /cv` includes `data` that violates the JSON Resume schema after assembly
- **THEN** the API SHALL respond with 400 and structured validation errors
- **AND** SHALL NOT leave a partially populated CV row

#### Scenario: PDF import finalize uses create flow

- **WHEN** a PDF import job reaches finalize with schema-valid prepared data
- **THEN** the service SHALL persist the CV using the same create implementation as `POST /cv`
- **AND** the job result SHALL include the new `cvId`

### Requirement: The API SHALL expose template presentation endpoints

Authenticated handlers on `/cv/:id/template-presentation` SHALL provide:

- `GET` — return merged or stored presentation config for optional query `template` (resolved like export: query → CV `template_id` → `classic`)
- `PATCH` — upsert presentation config for the resolved template id

Handlers SHALL return 404 when the CV is not found or not owned by the caller.

#### Scenario: Presentation GET requires auth

- **WHEN** `GET /cv/:id/template-presentation` is called without a bearer token
- **THEN** the response SHALL be 401

#### Scenario: Export uses stored presentation

- **WHEN** a CV has stored presentation config for `tabular` and export is requested with `?template=tabular`
- **THEN** `GET /cv/:id/export/html` HTML SHALL reflect that config

### Requirement: Export routes SHALL accept an optional template query parameter

`GET /cv/:id/export/html` and `GET /cv/:id/export/pdf` SHALL accept optional query parameter `template`. Resolution order SHALL be: explicit query param, then CV stored `template_id`, then `classic`. PDF generation SHALL use the same template resolution and presentation config as HTML. The templates catalog SHALL list the four canonical visual template ids (`classic`, `modern`, `tabular`, `left`).

#### Scenario: Export with query override

- **WHEN** a CV has stored template `classic` and the client requests `GET /cv/:id/export/html?template=modern`
- **THEN** the response HTML SHALL be rendered with the modern visual template

#### Scenario: Invalid template id on export

- **WHEN** export is requested with `?template=capd-alum` (legacy id)
- **THEN** the API SHALL respond with 400

### Requirement: The API SHALL expose authenticated PDF import job endpoints

Under `/cv/import`, authenticated handlers SHALL provide:

- `POST /cv/import/pdf` — multipart PDF upload, returns `{ jobId }` with 202
- `POST /cv/import/markdown` — multipart Markdown upload, returns `{ jobId }` with 202
- `POST /cv/import/from-url` — JSON body `{ url }`; returns either `{ kind: 'json', data }` with 200 when the URL yields valid JSON Resume synchronously, or `{ kind: 'job', jobId }` with 200 when an agent job is started for HTML/non-JSON pages
- `GET /cv/import/:jobId` — job status for the owning user, including optional `previewData` on PDF, Markdown, and website import success before CV create

Handlers MUST use the caller's Supabase user client for ownership checks on created CVs. Async PDF, Markdown, and website import jobs SHALL NOT create a CV automatically; they SHALL populate `previewData` after `prepareImportedResume` and schema validation for client-side confirmation. The client SHALL create CVs via `POST /cv` using the same validation and meta rules as direct create. Agent-based imports (PDF, Markdown, HTML URL) SHALL require valid per-user LLM configuration per `import-llm-config`. Synchronous JSON URL import SHALL NOT require LLM configuration.

For `POST /cv/import/from-url`, when the URL host is `registry.jsonresume.org` and the pathname does not end with `.json`, the service SHALL fetch the URL with `.json` appended to the pathname before validation.

Under `/import/llm`, authenticated handlers SHALL provide:

- `GET /import/llm/providers` — supported providers with API key field labels
- `GET /import/llm/providers/:providerId/models` — allowlisted Mastra model ids for that provider
- `GET /import/llm/config` — current user config status (model id, configured flag; never raw API key)
- `PUT /import/llm/config` — save model + API key with catalog validation and key probe

Under `/web-scrape`, authenticated handlers SHALL provide web scrape configuration per `web-scrape-config`.

#### Scenario: PDF import returns preview without CV

- **WHEN** a PDF import job completes successfully
- **THEN** `GET /cv/import/:jobId` SHALL have `status: succeeded` and `previewData` set
- **AND** SHALL NOT include `cvId` until the client creates a CV separately

#### Scenario: Markdown import returns preview without CV

- **WHEN** a Markdown import job completes successfully
- **THEN** `GET /cv/import/:jobId` SHALL have `status: succeeded` and `previewData` set
- **AND** SHALL NOT include `cvId` until the client creates a CV separately

#### Scenario: Website import returns preview without CV

- **WHEN** a website import job completes successfully
- **THEN** `GET /cv/import/:jobId` SHALL have `status: succeeded` and `previewData` set
- **AND** SHALL NOT include `cvId` until the client creates a CV separately

#### Scenario: Client create after import preview

- **WHEN** a client calls `POST /cv` with data from import `previewData` after user confirmation
- **THEN** the persisted CV SHALL match the same meta, validation, and title derivation rules as direct `POST /cv`

#### Scenario: JSON URL import synchronous

- **WHEN** a client calls `POST /cv/import/from-url` with a URL returning valid JSON Resume
- **THEN** the API SHALL respond with `{ kind: 'json', data }` without enqueueing a job

#### Scenario: HTML URL starts agent job

- **WHEN** a client calls `POST /cv/import/from-url` with a URL returning HTML and the user has valid LLM configuration
- **THEN** the API SHALL respond with `{ kind: 'job', jobId }`

### Requirement: Media routes MUST inherit CV-grade authentication on upload and public read on stream

Nest SHALL classify **`POST /media/upload`** under `MediaController` guarded by the identical Supabase-derived authentication strategy used for `/cv`. **`GET /media/:id`** SHALL be public (no Bearer) and stream stored objects by registry id. Upload handlers MUST remain tenant-isolated via authenticated user id embedded in Storage paths and registry rows.

#### Scenario: Auth parity with CV fetch on upload

- **WHEN** a valid bearer used for `GET /cv/:id` is replayed onto `POST /media/upload`
- **THEN** Nest SHALL authorize identically modulo multipart validation errors

#### Scenario: Public media stream without token

- **WHEN** any client requests `GET /media/{valid_uuid}` without Authorization
- **THEN** Nest SHALL return the image stream when the registry row exists

### Requirement: The API SHALL expose item-scoped authenticated routes for CV resume content

Under `/cv/:cvId`, authenticated handlers SHALL provide create, update, and delete operations for each resume collection defined in `cv-item-crud`, plus `PATCH /cv/:cvId/basics` for the singleton basics object. Array-item update and delete routes SHALL use `:itemId` (row UUID) in the path instead of a numeric index. Handlers MUST read and write normalized section tables and basics columns on `cv` (not `cv.data`), validate entity DTOs, and assemble for schema validation when required. Handlers SHALL NOT read, write, or bump `cv.meta_*` columns.

Parent create and update payloads for work, volunteer, education, and projects SHALL accept full `highlights` and `courses` string arrays as jsonb fields on the parent row. The API SHALL NOT expose separate nested routes for individual highlight or course strings.

#### Scenario: Create work entry

- **WHEN** an authenticated client calls `POST /cv/:cvId/work` with a valid work payload
- **THEN** the service SHALL insert a row into `cv_work`, validate, persist, and return the created entry including its row `id`

#### Scenario: Update work entry by id

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/work/:itemId` with a valid work row uuid
- **THEN** the service SHALL update that row by primary key lookup and return the updated entry with the same `id`

#### Scenario: Update work entry with highlights array

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/work/:itemId` with a payload containing a full `highlights` string array
- **THEN** the service SHALL replace `cv_work.highlights` jsonb with that array atomically
- **AND** SHALL NOT require nested highlight sub-routes

#### Scenario: Update basics

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/basics` with partial basics fields
- **THEN** the service SHALL merge into the `cv` basics columns (including `location` jsonb) and persist without requiring `meta` or `version` in the request

#### Scenario: Create reference entry

- **WHEN** an authenticated client calls `POST /cv/:cvId/references` with a valid reference payload
- **THEN** the service SHALL insert into `cv_reference` with auto-assigned `sort`, validate, persist, and return the created entry including its row `id`

#### Scenario: Unauthorized item mutation

- **WHEN** a client calls an item route without a valid bearer token
- **THEN** the response SHALL be 401 from the auth guard

### Requirement: Item mutation responses SHALL include enough data for the client to refresh UI state

Successful item create and update responses SHALL include the affected entity (with stable row `id` for array items). Delete responses SHALL confirm removal. Reorder responses SHALL return the reordered section array. Responses SHALL NOT include `version` or `meta`. Clients SHALL match rows by `id`.

#### Scenario: Work item update response

- **WHEN** a client successfully patches a work entry by item id
- **THEN** the response SHALL include the updated work object with `id`

#### Scenario: Skill create includes row id

- **WHEN** a client successfully creates a skill
- **THEN** the response SHALL include the skill entity with its uuid `id`

### Requirement: CV title SHALL be computed from basics on read and after basics mutations

The API service SHALL compute `title` from `cv.name` and `cv.label` using the shared `deriveCvTitleFromBasics` function when assembling CV responses (`GET /cv`, `GET /cv/:id`, and mutation responses that return the CV header). The derived title SHALL NOT be persisted in the database. When `PATCH /cv/:cvId/basics` succeeds, the response SHALL include the newly derived `title` computed from the updated basics columns.

#### Scenario: Create response derives title from basics

- **WHEN** `POST /cv` includes basics with name `Alex` and label `Designer`
- **THEN** the response SHALL include `title` equal to `Alex — Designer`
- **AND** the `cv` row SHALL NOT contain a `title` column value

#### Scenario: Basics patch response includes derived title

- **WHEN** an authenticated client calls `PATCH /cv/:cvId/basics` changing `name` or `label`
- **THEN** the service SHALL merge basics into the `cv` row, validate, persist, and return the newly derived `title` in the response

#### Scenario: Empty basics yields default title

- **WHEN** a create or basics patch results in empty name and label after trim
- **THEN** the computed `title` in the response SHALL be `Untitled CV`

#### Scenario: Name-only basics

- **WHEN** basics contain name `Alex` and no label
- **THEN** the computed `title` SHALL be `Alex`

### Requirement: The API SHALL expose section-scoped GET routes for editor views

For each multi-valued resume section, the API SHALL provide `GET /cv/:cvId/{section}` (e.g. `work`, `skills`, `education`, `profiles`) returning an ordered JSON array of that section only, assembled from the corresponding normalized table. `GET /cv/:id` SHALL NOT load or return those section arrays; it SHALL return slim CV `data` with basics only for editor bootstrap. Clients SHALL use section routes or a future export endpoint for full JSON Resume documents.

#### Scenario: Fetch work section only

- **WHEN** an authenticated client calls `GET /cv/:cvId/work`
- **THEN** the response SHALL contain only the `work` array ordered by `start_date` descending without loading other sections from the client perspective

#### Scenario: Detail bootstrap excludes section arrays

- **WHEN** an authenticated client calls `GET /cv/:id` for editor bootstrap
- **THEN** the service SHALL return CV metadata and slim `data` containing basics from the `cv` header row only
- **AND** SHALL NOT query child section tables for that request
- **AND** the response `data` SHALL NOT contain section arrays such as `work` or `skills`

#### Scenario: Detail response excludes section arrays when rows exist

- **WHEN** a CV has work and skills rows in normalized tables
- **THEN** `GET /cv/:id` SHALL NOT include `data.work` or `data.skills`
- **AND** `GET /cv/:cvId/work` SHALL return the work array when the client needs it

### Requirement: Full CV reads SHALL assemble JSON Resume from normalized storage

`GET /cv` and `GET /cv/:id` SHALL build the response `data` field from the `cv` header row only: optional `basics` (name, label, image, email, phone, url, summary, location). The service SHALL NOT include `data.meta`. The service SHALL NOT call `fetchSections` or `assembleResume` for these routes unless a future export endpoint is defined separately.

#### Scenario: List returns slim data per CV

- **WHEN** an authenticated client calls `GET /cv` and multiple CVs exist
- **THEN** each item SHALL include id, user_id, computed `title`, timestamps, and slim `data` with basics only
- **AND** each item's `data` SHALL NOT include `meta`

#### Scenario: Detail response excludes meta and section arrays

- **WHEN** a client calls `GET /cv/:id`
- **THEN** the response `data` SHALL contain basics only
- **AND** SHALL NOT contain `meta`, `work`, `skills`, or other section arrays

### Requirement: The API SHALL expose reorder endpoints for sort-backed sections

Authenticated handlers under `/cv/:cvId` SHALL provide `PUT /cv/:cvId/profiles/reorder`, `PUT /cv/:cvId/skills/reorder`, `PUT /cv/:cvId/languages/reorder`, `PUT /cv/:cvId/interests/reorder`, and `PUT /cv/:cvId/references/reorder`. Each SHALL accept a body with `order` (array of row uuid strings). The service SHALL assign `sort = index` for each id and return the reordered section items. The body SHALL NOT require `version`.

#### Scenario: Reorder skills

- **WHEN** an authenticated client calls `PUT /cv/:cvId/skills/reorder` with a valid permutation of all skill row ids
- **THEN** each `cv_skill.sort` SHALL match the index in the request order
- **AND** the response SHALL include the skills array in the new order

#### Scenario: Invalid reorder permutation rejected

- **WHEN** the reorder request omits a row id or includes an id from another CV
- **THEN** the API SHALL respond with 400 and SHALL NOT modify any `sort` values

### Requirement: JSON Resume export SHALL own meta generation

When the JSON export endpoint is called, the API SHALL populate JSON Resume `meta` (`lastModified`, `version`, and optional `canonical`) at export time via `prepareExportedResume`. Management routes (`GET /cv`, `GET /cv/:id`, item CRUD, `POST /cv`) SHALL NOT populate or return `meta`.

#### Scenario: Management GET does not precompute export meta

- **WHEN** a client calls `GET /cv/:id` for dashboard or editor bootstrap
- **THEN** the response SHALL not include `data.meta`
- **AND** the client SHALL NOT require `meta` for editing or listing

#### Scenario: JSON export includes meta

- **WHEN** an authenticated user requests `GET /cv/:id/export/json` for a CV they own
- **THEN** the response body SHALL include a `meta` object with `lastModified` and `version`

### Requirement: The API SHALL expose authenticated resume export endpoints

Under `/cv/:id/export`, authenticated handlers SHALL provide:

- `GET /cv/:id/export/html` — returns a full HTML document for the CV (`Content-Type: text/html; charset=utf-8`)
- `GET /cv/:id/export/pdf` — returns PDF bytes (`Content-Type: application/pdf`) generated from the same HTML as the html endpoint
- `GET /cv/:id/export/json` — returns a schema-valid JSON Resume document (`Content-Type: application/json; charset=utf-8`) with `Content-Disposition: attachment` and a filename derived from the CV title or basics name

Handlers MUST use the caller's Supabase user client so RLS applies. Missing or non-owned CV ids SHALL yield 404 consistent with other `/cv/:id` routes.

#### Scenario: HTML export without token

- **WHEN** a client calls `GET /cv/:id/export/html` without a bearer token
- **THEN** the response SHALL be 401 from the auth guard

#### Scenario: HTML export for owned CV

- **WHEN** an authenticated user requests `GET /cv/:id/export/html` for a CV they own
- **THEN** the response status SHALL be 200
- **AND** the body SHALL be a complete HTML document including basics name

#### Scenario: PDF export for owned CV

- **WHEN** an authenticated user requests `GET /cv/:id/export/pdf` for a CV they own
- **THEN** the response status SHALL be 200
- **AND** the `Content-Type` SHALL be `application/pdf`
- **AND** the response SHALL include a `Content-Disposition` attachment filename derived from the CV title or basics name

#### Scenario: JSON export for owned CV

- **WHEN** an authenticated user requests `GET /cv/:id/export/json` for a CV they own
- **THEN** the response status SHALL be 200
- **AND** the `Content-Type` SHALL be `application/json; charset=utf-8`
- **AND** the response SHALL include a `Content-Disposition` attachment filename ending in `.json`
- **AND** the body SHALL parse as a JSON object with `basics` when the CV has basics data
- **AND** section items SHALL NOT include Resumind-internal row `id` fields

#### Scenario: JSON export without token

- **WHEN** a client calls `GET /cv/:id/export/json` without a bearer token
- **THEN** the response SHALL be 401 from the auth guard

#### Scenario: Export for non-owned CV

- **WHEN** an authenticated user requests export for a CV id that RLS excludes
- **THEN** the API SHALL respond with 404

### Requirement: The API SHALL expose authenticated job application routes

Under `/applications`, authenticated handlers SHALL provide:

- `POST /applications/prepare` — multipart intake (optional `url`, `text`, `message`, optional `sourceCvId`, file pdf|image max 5 MB each); returns `{ applicationId, status }` with `202` when queued
- `GET /applications` — list user's applications (summary fields, ordered by `updated_at` desc)
- `GET /applications/:id` — application detail including status, job metadata, `sourceCvId`, `tailoredCvId`, `coverLetter` Markdown, `selectionRationale`, and prepare progress while running
- `PATCH /applications/:id` — optional body `{ coverLetter: string }` for manual Markdown edits (no AI)
- `POST /applications/:id/promote-clone` — deep-clones the tailored CV as `kind = primary` with `source_cv_id` pointing at the clone
- `GET /applications/:id/export/letter/html` and `GET /applications/:id/export/letter/pdf` — cover letter export (Markdown rendered to HTML/PDF)

All routes SHALL require the same Supabase auth guard as `/cv`. Prepare SHALL require a valid **active AI agent account** per `ai-agent-accounts`.

#### Scenario: Prepare enqueues application job

- **WHEN** an authenticated user with a valid active AI agent account submits valid job intake
- **THEN** the API SHALL return `202` with an application id and queued status

#### Scenario: User-provided source CV honored

- **WHEN** prepare intake includes `sourceCvId` owned by the user
- **THEN** the workflow SHALL use that CV and skip AI ranking

#### Scenario: Oversize file rejected

- **WHEN** prepare intake includes a PDF or image file larger than 5 MB
- **THEN** the API SHALL return `400`

#### Scenario: Manual letter update

- **WHEN** an authenticated user PATCHes `coverLetter` on their application
- **THEN** the API SHALL persist the Markdown text without invoking AI

#### Scenario: Unauthorized application access

- **WHEN** a client requests an application id not owned by the user
- **THEN** the API SHALL respond with `404`

### Requirement: The API SHALL deep-clone a CV for application tailoring

The service SHALL expose an internal clone operation that copies the `cv` header row and all normalized child rows to a new `cv.id`, setting `source_cv_id` and `kind = application_clone`. The clone SHALL validate as JSON Resume after assembly. Child row order within each section SHALL be preserved so the UI can match clone entries to source entries by index.

#### Scenario: Clone preserves section content

- **WHEN** a base CV with work and skills rows is cloned
- **THEN** the new CV SHALL contain equivalent section rows with new primary keys in the same order

### Requirement: The API SHALL load sections from a source CV for preview and workflow

The service SHALL expose read helpers keyed by `source_cv_id` to fetch basics and Work/Volunteer/Project items from the original CV without mutating it. The application workspace SHALL load source sections via existing authenticated `GET /cv/:sourceCvId/...` routes using `sourceCvId` from application detail.

#### Scenario: Load source work items for preview

- **WHEN** the workspace requests work entries for the source CV id on an application
- **THEN** the API SHALL return the source CV's work rows unchanged
