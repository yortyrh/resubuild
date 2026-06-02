# import-social-profile-discovery Specification

## Purpose

TBD - created by archiving change import-social-profile-discovery. Update Purpose after archive.

## Requirements

### Requirement: Import SHALL discover social profiles from public web search when configured

When an agent import workflow produces a schema-valid draft with non-empty `basics.name` and the user has configured Tavily web scrape settings, the system SHALL search the public web for the candidate's profiles on supported social networks and merge validated results into `basics.profiles` before returning `previewData`. Supported networks SHALL include at minimum: LinkedIn, GitHub, X (Twitter), Instagram, Facebook, Dribbble, and Behance.

#### Scenario: Profiles discovered and merged

- **WHEN** a PDF import job completes with Tavily configured
- **AND** the draft has `basics.name` set and no LinkedIn profile
- **AND** web search returns a URL matching `linkedin.com/in/` for that candidate
- **THEN** `previewData.basics.profiles` SHALL include a LinkedIn entry with that URL
- **AND** the import job SHALL succeed

#### Scenario: Discovery skipped without Tavily

- **WHEN** an agent import job runs and the user has no Tavily web scrape configuration
- **THEN** social profile discovery SHALL be skipped
- **AND** the job MAY still succeed with LLM-extracted profiles only

#### Scenario: Existing profiles not overwritten

- **WHEN** the draft already contains a GitHub profile with URL `https://github.com/janedoe`
- **AND** web search returns a different GitHub URL
- **THEN** the existing GitHub profile SHALL be preserved
- **AND** the search result SHALL NOT replace it

#### Scenario: Invalid or off-platform URLs rejected

- **WHEN** web search returns a URL whose hostname does not match the target platform
- **THEN** that result SHALL NOT be added to `basics.profiles`

#### Scenario: Discovery failure does not fail import

- **WHEN** Tavily search errors or times out during profile discovery
- **THEN** the import job SHALL still succeed if the draft is schema-valid
- **AND** `errors` SHALL NOT include discovery failures as terminal errors

### Requirement: Profile discovery SHALL use bounded search per import job

The discovery step SHALL issue at most five platform-targeted search queries per import job. Each query SHALL request at most three results. Discovery SHALL stop searching a platform once one valid profile URL is accepted for that platform.

#### Scenario: Query budget respected

- **WHEN** discovery runs for a draft missing profiles on seven platforms
- **THEN** at most five Tavily search requests SHALL be made for that job

### Requirement: Discovered profiles SHALL conform to JSON Resume profile shape

Each merged profile entry SHALL include `network` (canonical platform label), `url` (valid HTTPS URI), and `username` (derived from URL path or search snippet when absent). Merged profiles SHALL pass JSON Resume schema validation as part of the existing verify step.

#### Scenario: Username derived from URL

- **WHEN** discovery accepts `https://github.com/janedoe` without a separate username
- **THEN** the merged entry SHALL include `username` equal to `janedoe`
- **AND** `network` equal to `GitHub`
