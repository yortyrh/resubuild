## ADDED Requirements

### Requirement: Application update SHALL create a hidden replacement draft before activation

When a user updates an existing application, the system SHALL keep the current application active and list-visible while creating a replacement draft linked to the original through `source_application_id`. The draft SHALL remain hidden from default application listing queries until update processing succeeds.

#### Scenario: Start update keeps original active

- **WHEN** a user starts update for an existing ready application
- **THEN** the original application SHALL remain list-visible and usable during processing
- **AND** a replacement draft SHALL be created with a reference to the original application
- **AND** the replacement draft SHALL be excluded from `GET /applications` default listing results

### Requirement: System SHALL keep at most one dangling replacement draft per original application

Before creating a new replacement draft, the system SHALL detect and remove any existing dangling draft that references the same original application and is not active. This cleanup SHALL happen automatically in the update start workflow.

#### Scenario: Existing dangling draft is replaced

- **WHEN** an update request starts for an original application that already has a non-active draft replacement
- **THEN** the system SHALL remove the existing dangling draft before creating the new replacement draft
- **AND** exactly one non-active draft replacement SHALL exist for that original application after the request is accepted

### Requirement: Successful update SHALL atomically swap active application records

After replacement generation succeeds, the system SHALL atomically activate the replacement draft and delete the original application in a single transaction so users never observe an unfinished replacement as active.

#### Scenario: Success swaps records in one step

- **WHEN** replacement generation for an update draft completes successfully
- **THEN** the replacement draft SHALL become active and list-visible
- **AND** the original application SHALL be deleted in the same transaction
- **AND** default listing queries SHALL return the replacement and SHALL NOT return the original

### Requirement: Failed update SHALL preserve the original active application

If replacement generation fails, times out, or is aborted before success, the original application SHALL remain active and list-visible. The system MAY keep or clean the failed draft according to cleanup policy, but SHALL NOT remove the original due to update failure.

#### Scenario: Processing failure keeps original

- **WHEN** update processing for a replacement draft fails before successful completion
- **THEN** the original application SHALL still be list-visible and accessible
- **AND** the failed or incomplete replacement draft SHALL remain non-active and excluded from default listing
