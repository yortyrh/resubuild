## ADDED Requirements

### Requirement: Dashboard CV list SHALL load through a TanStack Query hook

The dashboard CV list component SHALL fetch data via a shared query hook (for example `useCvList`) backed by `listCvs` instead of local `useEffect` + `useState` fetch logic. Loading and error UI SHALL derive from query status (`isPending`, `isError`, `error`).

#### Scenario: User opens dashboard

- **WHEN** a signed-in user loads the dashboard CV list
- **THEN** the UI SHALL show the existing list skeleton while the query is pending
- **AND** SHALL render cards from cached query data on success

#### Scenario: Returning to dashboard reuses cache

- **WHEN** a user navigates from a CV editor back to the dashboard within stale time
- **THEN** the list SHALL render cached data immediately
- **AND MAY** refetch in the background per QueryClient defaults

### Requirement: CV editor bootstrap SHALL load header data through a TanStack Query hook

`CvEditorProvider` (or equivalent bootstrap) SHALL use a query hook for `getCv(cvId)` instead of a manual mount effect. Editor local resume state SHALL still be initialized from the slim `data` payload merged with `createEmptyResume()` as today.

#### Scenario: Editor loads CV header

- **WHEN** a user opens `/dashboard/cv/[id]`
- **THEN** the provider SHALL expose loading and error state from the CV detail query
- **AND** SHALL initialize local editor state when the query succeeds

### Requirement: Managed array sections SHALL hydrate items through section query hooks

CV section components using `ManagedArraySection` SHALL obtain section rows from a section-scoped query hook when hydration is required (`sectionItemsNeedHydration` or section mount). Components SHALL NOT pass ad hoc `refetchItems` callbacks built by `createSectionRefetch`.

#### Scenario: Empty section fetches from API

- **WHEN** a user opens a section with no local items
- **THEN** the section query SHALL fetch `GET /cv/:cvId/{section}` via the hook
- **AND** SHALL show the section skeleton while pending

#### Scenario: Section with stable ids skips redundant fetch

- **WHEN** local section state already contains items with stable UUIDs and hydration is not required
- **THEN** the section query MAY remain disabled until mount or explicit invalidation
- **AND** the UI SHALL NOT flash unnecessary loading states

### Requirement: Import LLM settings SHALL use TanStack Query for catalog and config reads

The import LLM settings form SHALL load providers, models (per provider), and current config through query hooks instead of chained `useEffect` fetches. Saving config SHALL use a mutation that invalidates the config query on success.

#### Scenario: Provider change loads models via query

- **WHEN** a user selects a different LLM provider
- **THEN** the client SHALL fetch models through the models query keyed by `providerId`
- **AND** SHALL show loading state for the model selector while that query is pending
