## ADDED Requirements

### Requirement: The SPA SHALL expose Prepare Application routes and navigation

The App Router SHALL provide `/dashboard/applications` (list/history), `/dashboard/applications/new` (intake form: URL, text, file upload for PDF or screenshot, optional message), and `/dashboard/applications/[id]` (workspace with chat, letter, tailored CV links). The dashboard shell SHALL include navigation to Prepare Application. Intake SHALL require a valid active AI agent account per `ai-agent-accounts`, linking to AI agent settings or the user menu when missing.

#### Scenario: User starts prepare from dashboard

- **WHEN** a signed-in user with a valid active AI agent account opens Prepare Application
- **THEN** the UI SHALL present multimodal job intake and submit to `POST /applications/prepare`

#### Scenario: User without AI agent account sees setup prompt

- **WHEN** a signed-in user opens Prepare Application without an active AI agent account
- **THEN** the UI SHALL direct them to AI agent settings (`/dashboard/settings/ai-agent`) or the user menu before intake is enabled

#### Scenario: Prepare progress polling

- **WHEN** a prepare job is queued or running
- **THEN** the client SHALL poll `GET /applications/:id` until status is ready or failed, then render the workspace or error

### Requirement: Application list SHALL be separate from the CV library

The dashboard CV list SHALL continue to show only library-visible CVs from `GET /cv`. Application history SHALL load from `GET /applications` and SHALL NOT mix application clones into the CV list until promoted.

#### Scenario: CV list unchanged by application clones

- **WHEN** a user completes prepare application without promoting the clone
- **THEN** the dashboard CV list count SHALL remain unchanged

#### Scenario: Promoted clone appears in CV list

- **WHEN** a user promotes an application clone from the workspace
- **THEN** the clone SHALL appear on the next CV list refresh

### Requirement: Chat UI SHALL subscribe to Realtime when enabled

When Supabase Realtime is enabled for `job_application_message`, the application workspace chat SHALL subscribe to inserts for the open `applicationId` using the authenticated Supabase client pattern agreed for the web app (or fallback to refetch after each chat POST when Realtime is unavailable).

#### Scenario: Realtime subscription on workspace open

- **WHEN** a user opens `/dashboard/applications/[id]` with Realtime enabled
- **THEN** the client SHALL subscribe to new messages for that application id
