## MODIFIED Requirements

### Requirement: PDF import SHALL require configured AI credentials

PDF import SHALL remain gated on a valid **active AI agent account** (see `ai-agent-accounts`). Setup prompts in the PDF import UI SHALL reference **AI agent settings** (user menu or `/dashboard/settings/ai-agent`), not PDF-only wording. API error messages for missing configuration SHALL use neutral “AI agent” language.

#### Scenario: Unconfigured user sees AI setup prompt on PDF tab

- **WHEN** a signed-in user without an active AI agent account opens PDF import on `/dashboard/cv/new`
- **THEN** the UI SHALL show instructions to configure AI agent settings
- **AND** SHALL NOT enable file upload until configuration is complete

#### Scenario: Import job uses active account credentials

- **WHEN** `POST /cv/import/pdf` accepts a file for a user with an active account
- **THEN** the import worker SHALL resolve `model_id` and decrypted API key from the active account
- **AND** SHALL NOT read legacy `import_llm_config` directly
