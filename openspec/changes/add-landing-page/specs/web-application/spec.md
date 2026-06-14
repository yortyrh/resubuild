# web-application Specification (delta)

## Purpose

Update the existing web-application spec to reflect the new behavior of the root route `/`: it now renders a public marketing landing page for anonymous visitors (instead of redirecting to `/login`), while still redirecting signed-in visitors to `/dashboard`. Deep-links to auth and dashboard routes are unchanged.

## MODIFIED Requirements

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components. The root route `/` MUST render a marketing landing page for anonymous visitors and MUST redirect signed-in visitors to `/dashboard`. The landing page MUST be implemented inside a route group (e.g. `src/app/(marketing)/page.tsx`) so the URL stays at `/`. The per-CV editor SHALL organize authoring tabs per `cv-editor-ui`, use item-level persistence for resume content, and SHALL continue to upload profile photos through authenticated Nest **`POST /media/upload`** via `uploadResumeMedia`. Rich-text editors SHALL NOT expose separate image-upload tooling.

The new CV route (`/dashboard/cv/new`) SHALL NOT call `POST /cv` on page load. It SHALL default to **Import from file** at `/dashboard/cv/new/import/file`. Manual create remains at `/dashboard/cv/new/create`.

The new CV menu SHALL expose **Import from file**, **Import from URL** (`/dashboard/cv/new/import/url`), and **Create manually** only. Legacy paths `/dashboard/cv/new/import/json`, `/import/pdf`, and `/import/markdown` SHALL redirect to `/dashboard/cv/new/import/file`.

**Import from file** SHALL accept JSON, PDF, Markdown, Word (`.docx`), and résumé images (PNG/JPEG/WebP) and auto-detect format client-side. JSON is parsed locally; PDF, Markdown, Word, and images require Import LLM settings and agent jobs returning `previewData` before Save. **Import from URL** SHALL fetch JSON synchronously or start an HTML agent job with the same preview-then-Save UX per `import-preview-ui`.

All import paths SHALL converge on a client-side prepared JSON Resume before `createCv`. Manual create and all import paths SHALL NOT POST or start import until the user confirms Import or Save.

The per-CV editor bootstrap (`GET /cv/:id`) SHALL merge slim `data.basics` into local editor state and SHALL NOT depend on `data.meta` or `meta.version` for saves.

#### Scenario: Anonymous visitor lands on the marketing page

- **WHEN** an anonymous visitor navigates to `/`
- **THEN** the response SHALL be `200 OK` with HTML rendering the marketing landing page
- **AND** the page SHALL include a primary CTA linking to `https://app.resubuild.dev`
- **AND** the page SHALL NOT redirect to `/login`

#### Scenario: Signed-in visitor is redirected to the dashboard

- **WHEN** a visitor with a valid session in `sessionStorage` navigates to `/`
- **THEN** the page SHALL redirect to `/dashboard` via the existing `HomeRedirect` component

#### Scenario: User imports from unified file route

- **WHEN** a signed-in user uploads a PDF on `/dashboard/cv/new/import/file`
- **THEN** the client SHALL detect PDF, run the agent job, and enable Save after `previewData` is available
