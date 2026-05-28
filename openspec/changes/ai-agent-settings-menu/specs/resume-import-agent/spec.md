## MODIFIED Requirements

### Requirement: The import agent SHALL run with user-scoped LLM credentials

The Mastra-based PDF import pipeline SHALL obtain `modelId` and `apiKey` from the user's **active AI agent account** via the API credential resolver. It SHALL NOT depend on server-wide default provider keys when a user active account exists. When credentials are missing or invalid, the API layer SHALL fail before enqueueing work.

#### Scenario: Agent receives active account model and key

- **WHEN** an import job runs for a user with active account `anthropic/claude-sonnet-4-6`
- **THEN** the worker SHALL scope the provider env var to that account's decrypted key for the duration of the Mastra run
- **AND** SHALL use the saved Mastra model id string

#### Scenario: Missing active account prevents agent start

- **WHEN** import is requested without an active account
- **THEN** the API SHALL reject the request before invoking `@resumind/import-agent` workflows
