## ADDED Requirements

### Requirement: Application workspace SHALL disclose saved-base-CV fallback state

The application detail and update UI SHALL display the effective base CV label from API metadata. When regeneration uses a saved snapshot because the original library CV was deleted, the UI SHALL clearly indicate that the base CV is a saved copy. The API client contract SHALL include `sourceCvTitle` and `sourceCvFromSnapshot` to support this disclosure.

#### Scenario: Update dialog shows saved-copy warning

- **WHEN** an application detail payload sets `sourceCvFromSnapshot=true`
- **THEN** the update dialog SHALL show the base CV label with deleted-source context
- **AND** users SHALL understand regeneration still uses the saved base CV copy

#### Scenario: Update request keeps base source immutable

- **WHEN** a user submits update instructions from the dialog
- **THEN** the client SHALL send only update instruction fields
- **AND** SHALL rely on server-side source resolution to reuse the original/saved base CV
