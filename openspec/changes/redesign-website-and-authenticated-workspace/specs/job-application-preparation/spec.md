## MODIFIED Requirements

### Requirement: The application preparation flow SHALL generate tailored application assets from job input and a base CV

The Prepare Application page MUST be presented as a four-step guided flow instead of a single long form:

1. **Job source** — choose URL, pasted text, or uploaded PDF/screenshot.
2. **Base CV** — choose between `Let Resubuild choose the best CV` and `Use a specific CV`.
3. **Tailoring instructions** — provide a focused textarea and quick instruction chips.
4. **Review** — summarize source, base CV, instructions, and expected outputs before generation.

The source selection SHOULD use cards with short explanatory copy rather than plain tabs. The optional instructions control SHOULD avoid a full rich-text editor unless formatting is necessary; a textarea plus chips is preferred.

#### Scenario: User prepares an application through the stepper

- **WHEN** a signed-in user opens `/dashboard/applications/new`
- **THEN** the page SHALL show a four-step flow with Job source, Base CV, Tailoring instructions, and Review
- **AND** the user SHALL be unable to submit generation until required source and base CV decisions are valid

#### Scenario: User reviews before generation

- **WHEN** the user reaches the Review step
- **THEN** the page SHALL show the selected job source, base CV decision, optional instructions, and expected generated outputs
- **AND** generation SHALL start only after the user confirms from this step

### Requirement: The Applications view SHALL present applications as actionable work items

The Applications view MUST present each application with:

- role and company;
- status badge (`Ready`, `Draft`, `Needs review`, `Failed`, or equivalent);
- last updated time;
- base CV name when available;
- match score or qualitative match indicator when available;
- generated output availability: Tailored CV, Cover letter, PDF/export;
- primary action: `Open workspace`;
- secondary actions such as `Export PDF`;
- destructive actions hidden behind a `More` menu.

The view MUST include search, status filtering, and sorting by date.

#### Scenario: Application cards show useful context

- **WHEN** applications are listed
- **THEN** each application item SHALL show role/company, status, base CV, output availability, and last updated metadata when available
- **AND** Delete SHALL NOT be displayed as the dominant visible row action

#### Scenario: User filters applications

- **WHEN** the user enters search text or selects a status filter
- **THEN** the list SHALL update to matching applications
- **AND** the empty filtered state SHALL explain that no applications match the current filters

### Requirement: The application workspace SHALL expose job details, match analysis, tailored CV, cover letter, and exports

The application workspace MUST use these tabs:

- `Job details`
- `Match analysis`
- `Tailored CV`
- `Cover letter`
- `Exports`

The previous `Job summary` label MUST be replaced by `Job details`. The previous `Update` action label MUST be replaced by `Regenerate` when the action reruns AI generation.

#### Scenario: Workspace renders the five-tab command center

- **WHEN** the user opens an application workspace
- **THEN** the workspace SHALL show Job details, Match analysis, Tailored CV, Cover letter, and Exports tabs
- **AND** the old three-tab set SHALL NOT be the primary workspace navigation

#### Scenario: Job details exposes extracted job information

- **WHEN** the user opens the Job details tab
- **THEN** the tab SHALL show title, company, source metadata, location, type/seniority when available, responsibilities, requirements, and keywords when available
- **AND** SHALL render a fallback when extraction metadata is unavailable

#### Scenario: Match analysis explains fit and gaps

- **WHEN** the user opens the Match analysis tab
- **THEN** the tab SHALL show an overall match score or qualitative indicator when available
- **AND** SHALL show strong evidence, weak or missing evidence, recommended edits, and keyword coverage when available
- **AND** SHALL render a clear fallback for older applications without structured analysis

#### Scenario: Tailored CV explains what changed

- **WHEN** the user opens the Tailored CV tab
- **THEN** the tab SHALL show the tailored CV preview and actions to edit, compare with base CV, and export when available
- **AND** SHALL show changes applied and reinforced keywords when available

#### Scenario: Cover letter shows evidence used

- **WHEN** the user opens the Cover letter tab
- **THEN** the tab SHALL show the cover-letter editor and actions to regenerate, copy, and export
- **AND** SHALL include an `Evidence used` panel when analysis metadata is available
- **AND** SHALL keep the editor usable when no evidence metadata exists

#### Scenario: Exports are grouped in one place

- **WHEN** the user opens the Exports tab
- **THEN** the tab SHALL group tailored CV PDF, cover letter PDF, JSON Resume, copy, print, and latest export metadata actions when available

## ADDED Requirements

### Requirement: Application generation SHALL persist optional structured analysis metadata

Application generation SHOULD produce and persist optional structured metadata for:

- extracted job details;
- match score or qualitative match;
- strong evidence;
- weak/missing evidence;
- recommended edits;
- present/missing/reinforced keywords;
- cover-letter evidence used;
- changes applied to the tailored CV;
- output availability and latest export metadata.

These fields MUST be additive and optional so existing application records continue to render.

#### Scenario: Existing application without analysis still renders

- **WHEN** an older application record does not include structured analysis metadata
- **THEN** the workspace SHALL still render Job details, Tailored CV, Cover letter, and Exports where existing data is available
- **AND** Match analysis SHALL show a non-blocking empty/fallback state
