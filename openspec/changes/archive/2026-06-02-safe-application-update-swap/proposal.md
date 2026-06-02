## Why

Updating an application currently replaces the existing record immediately, which can expose unfinished data in the list or leave users with no stable application when the process fails mid-flight. We need an atomic swap flow that preserves the current active application until the replacement is fully ready.

## What Changes

- Introduce a draft-update lifecycle for application updates so the current active application remains visible and usable during processing.
- Keep update-in-progress applications hidden from standard application listings until the update completes successfully.
- On successful completion, atomically activate the new application and remove the previous active one.
- Enforce a single dangling update draft per original application and clean stale dangling drafts before starting a new update.
- Persist a reference from the draft application to its source/original application to support cleanup and swap decisions.

## Capabilities

### New Capabilities

- `job-application-update-lifecycle`: Safe two-phase update workflow that stages replacement applications off-list, then swaps active records only after successful completion.

### Modified Capabilities

- `job-application-preparation`: Application update behavior changes from immediate replacement to staged draft + activation swap semantics.

## Impact

- Affected code: API application update orchestration, repository queries, CV cloning flow, and web application list/detail update interactions.
- Data model: add source/original application linkage and active/draft visibility semantics in `job_application`.
- APIs: update-related responses and list filters must respect hidden draft behavior.
- Testing: add and adjust API unit tests and integration coverage for successful swap, failure rollback behavior, and stale dangling cleanup.
