# prepare-application-page-ui Specification

## Purpose

Define the user-facing layout and behavior of the Prepare Application intake page at `/dashboard/applications/new`. This page is the only entry point for creating a new `job_application` record and is reached from the Applications list. It must match the dashboard chrome (breadcrumb, surface styling) used elsewhere on `/dashboard/applications/*` and must give the user a richer authoring surface (Markdown editor) for the long-form text inputs.

## ADDED Requirements

### Requirement: Prepare Application page SHALL render a breadcrumb matching the application workspace

The page at `/dashboard/applications/new` SHALL render a `Breadcrumb` chrome with exactly two crumbs: `Applications` (linked to `/dashboard/applications`) and `Preparing application…` (current, no link). The page SHALL NOT also render a separate "← Back to applications" link. The breadcrumb is one of two navigation affordances back to the applications list — the other is the top-right Cancel button described in the next requirement.

#### Scenario: User opens Prepare Application page

- **WHEN** a signed-in user navigates to `/dashboard/applications/new`
- **THEN** the page SHALL show a `Breadcrumb` with `Applications` linked to `/dashboard/applications` and `Preparing application…` as the current page
- **AND** SHALL NOT show a separate "← Back to applications" link

#### Scenario: User clicks the Applications breadcrumb

- **WHEN** a signed-in user clicks the `Applications` breadcrumb on `/dashboard/applications/new`
- **THEN** the router SHALL navigate to `/dashboard/applications`

### Requirement: Prepare Application page SHALL provide a top-right Cancel button that returns to the applications list

The page at `/dashboard/applications/new` SHALL render a top-right Cancel button in the page header, next to the "Prepare application" title. The button SHALL be a shadcn `Button` (variant `outline`) with the label `Cancel`, and SHALL navigate to `/dashboard/applications` (matching the import page's top-right Cancel pattern in `apps/web/src/app/dashboard/cv/new/new-cv-layout-chrome.tsx`, but pointing at the applications list rather than `/dashboard`). The Cancel button SHALL be visible on initial render and SHALL remain visible while the prepare is in flight (it does not cancel the prepare, only navigates back). Activating Cancel SHALL NOT submit the prepare form.

#### Scenario: User clicks the top-right Cancel button

- **WHEN** a signed-in user clicks the top-right `Cancel` button on `/dashboard/applications/new`
- **THEN** the router SHALL navigate to `/dashboard/applications`
- **AND** the prepare form SHALL NOT be submitted

#### Scenario: Cancel button is visible on initial render

- **WHEN** a signed-in user opens `/dashboard/applications/new`
- **THEN** the top-right `Cancel` button SHALL be visible in the page header

#### Scenario: Cancel button is visible while a prepare is in flight

- **WHEN** a signed-in user has submitted the prepare form and a prepare job is queued or running
- **THEN** the top-right `Cancel` button SHALL remain visible
- **AND** clicking it SHALL navigate to `/dashboard/applications` (the in-flight job is left to run; this is a navigation affordance, not a job-cancel action)

### Requirement: Prepare Application page SHALL present the three Job source modes in a single segmented row

The Job source fieldset SHALL present the three modes — `URL`, `Text`, and `PDF or screenshot` — as a single segmented control (one row, three options) with the active mode visually distinguished. Exactly one mode SHALL be selected at a time. The matching input control (URL `Input`, Text Markdown editor, or styled file picker) SHALL render directly below the segmented row and SHALL update immediately when the user changes the mode.

#### Scenario: User changes Job source mode

- **WHEN** a signed-in user clicks a different mode in the Job source segmented control
- **THEN** the previously selected mode's input SHALL be hidden
- **AND** the newly selected mode's input SHALL become visible
- **AND** the segmented control SHALL mark the new mode as active

#### Scenario: All three modes are reachable

- **WHEN** a signed-in user opens the Prepare Application page
- **THEN** the page SHALL expose `URL`, `Text`, and `PDF or screenshot` as the only Job source options
- **AND** exactly one of them SHALL be the default selected mode

### Requirement: Prepare Application SHALL render the Job text and Optional instruction inputs as Markdown editors

The Text job description input and the Optional instruction input SHALL both use the project's `MarkdownEditor` component (variant `block`, with the standard block toolbar: block type, bold/italic/underline/strikethrough, code, link, lists). The Markdown emitted by the editor SHALL be the value submitted to `POST /applications/prepare` for the `text` and `message` fields. Submitting an empty editor SHALL send an empty string, matching the previous `<Textarea>` behavior.

#### Scenario: User authors the Job description in Markdown

- **WHEN** a signed-in user types or pastes content into the Text job description Markdown editor and submits the form
- **THEN** the client SHALL send the editor's Markdown string as the `text` field of the prepare request

#### Scenario: User authors the Optional instruction in Markdown

- **WHEN** a signed-in user types or pastes content into the Optional instruction Markdown editor and submits the form
- **THEN** the client SHALL send the editor's Markdown string as the `message` field of the prepare request

#### Scenario: User submits empty optional instruction

- **WHEN** a signed-in user leaves the Optional instruction editor empty and submits the form
- **THEN** the client SHALL send `message: undefined` (or empty string) to the prepare request, matching the previous behavior

### Requirement: Prepare Application SHALL provide a styled file picker for the PDF or screenshot mode

The PDF or screenshot mode SHALL render a single shadcn `Button` (variant `outline`) labeled `Choose file` that opens the native file picker, plus a region showing the selected file's name, size (human-readable, KB/MB), and MIME type, plus a Remove action when a file is selected. The picker SHALL accept `application/pdf`, `image/png`, `image/jpeg`, and `image/webp` files only. Files larger than 5 MB SHALL be rejected client-side with a toast and SHALL NOT be stored in component state. The page SHALL NOT render a raw `<input type="file">` element on the Prepare Application page.

#### Scenario: User selects a valid PDF

- **WHEN** a signed-in user is in `PDF or screenshot` mode and picks a `application/pdf` file smaller than 5 MB
- **THEN** the page SHALL show the file name, size, and MIME type
- **AND** SHALL expose a Remove action that clears the selection

#### Scenario: User selects an oversize file

- **WHEN** a signed-in user is in `PDF or screenshot` mode and picks a file larger than 5 MB
- **THEN** the page SHALL reject the file with a toast
- **AND** SHALL NOT update the file state
- **AND** SHALL leave the previous selection (if any) intact

#### Scenario: User picks an unsupported type

- **WHEN** a signed-in user is in `PDF or screenshot` mode and picks a file whose MIME type is not in `application/pdf`, `image/png`, `image/jpeg`, `image/webp`
- **THEN** the page SHALL reject the file with a toast
- **AND** SHALL NOT update the file state

#### Scenario: User removes the selected file

- **WHEN** a signed-in user clicks the Remove action on a selected file
- **THEN** the page SHALL clear the file state
- **AND** SHALL return to the empty state with the `Choose file` button
