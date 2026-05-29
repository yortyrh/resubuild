## ADDED Requirements

### Requirement: The web app SHALL use TanStack Query for authenticated server state

The dashboard and CV editor client bundles SHALL manage server-fetched data through `@tanstack/react-query` v5. A shared `QueryClient` SHALL be provided to authenticated routes via `QueryClientProvider`. Low-level HTTP helpers in `src/lib/api.ts` and `src/lib/cv-item-api.ts` SHALL remain transport-only (Promise-returning functions) and SHALL NOT embed React hooks.

#### Scenario: Dashboard mounts with query provider

- **WHEN** a signed-in user enters any route under `/dashboard`
- **THEN** the React tree SHALL include `QueryClientProvider` with project defaults
- **AND** CV and import queries SHALL be able to read and write the shared cache

#### Scenario: Transport layer stays hook-free

- **WHEN** a developer imports `getCv` or `listCvs` from `api.ts`
- **THEN** those exports SHALL be plain async functions callable outside React
- **AND** SHALL NOT require a hook or query client instance at import time

### Requirement: Query keys SHALL follow a documented hierarchical convention

Query key factories SHALL live in a shared module (for example `src/lib/queries/keys.ts`) and SHALL use stable tuples:

- `['cv', 'list']` for the dashboard CV list
- `['cv', cvId]` for slim CV header reads
- `['cv', cvId, section]` for section-scoped GET routes (`work`, `skills`, `profiles`, etc.)
- `['ai', 'agents', 'accounts']`, `['ai', 'agents', 'active']`, `['ai', 'agents', 'providers']`, `['ai', 'agents', 'models', providerId]` for AI agent settings
- `['import', 'pdf', jobId]` for PDF import job status polling

#### Scenario: Section query key includes cv id and section slug

- **WHEN** the work section loads items for CV `abc`
- **THEN** the query key SHALL be `['cv', 'abc', 'work']` (or equivalent factory output with the same segments)

#### Scenario: List and detail keys are distinct

- **WHEN** both list and detail data are cached
- **THEN** invalidating `['cv', 'list']` SHALL NOT remove `['cv', cvId]` entries unless explicitly targeted

### Requirement: Mutations SHALL invalidate or update the query cache predictably

CV and item mutations SHALL use `useMutation` (or equivalent wrappers) and SHALL apply these cache rules:

- Create or delete CV → invalidate `['cv', 'list']`
- Item update → merge returned item into the matching section cache by `id` when the response includes the item
- Item create or delete or section reorder → refresh section ordering via updated cache data or invalidate the section query
- AI agent account create, update, delete, or set-active → invalidate `['ai', 'agents', 'accounts']` and `['ai', 'agents', 'active']`

#### Scenario: Dashboard delete refreshes list

- **WHEN** a user confirms CV delete and the API succeeds
- **THEN** the client SHALL invalidate the CV list query
- **AND** the dashboard SHALL show the updated list without a manual `useEffect` reload

#### Scenario: Item update merges by id

- **WHEN** a user saves an existing language entry
- **THEN** the mutation success handler SHALL update the languages section cache entry matching the item `id`
- **AND** SHALL NOT require a full section refetch for a successful update response

### Requirement: PDF import job polling SHALL use query refetch interval

While a PDF import job is `queued` or `running`, the client SHALL poll job status through a TanStack Query with `refetchInterval` (or equivalent) instead of ad hoc `setInterval` loops in the form component.

#### Scenario: Polling stops on terminal status

- **WHEN** job status becomes `succeeded` or `failed`
- **THEN** polling SHALL stop
- **AND** the UI SHALL navigate or show errors according to existing import UX

### Requirement: Query hooks SHALL be unit tested with an isolated QueryClient

Colocated Vitest tests for query hooks SHALL wrap hooks in `QueryClientProvider` using a fresh client per test with retries disabled. Tests SHALL mock API transport functions, not live HTTP.

#### Scenario: Hook test disables retry

- **WHEN** a query hook test simulates a failed fetch
- **THEN** the test QueryClient SHALL use `retry: false` so failures surface in one attempt
