## ADDED Requirements

### Requirement: The dashboard SHALL expose MCP settings for API key management

The web app SHALL provide `/dashboard/settings/mcp` accessible to signed-in users. The page SHALL allow toggling MCP access (via `PATCH /settings/mcp`), creating labeled API keys, displaying the new key secret once in a copy-friendly control, listing existing keys (prefix, label, dates), and revoking keys. The user menu SHALL include a link to MCP settings alongside existing settings entries.

#### Scenario: User creates an MCP key

- **WHEN** a signed-in user with MCP enabled creates a new key and confirms the dialog
- **THEN** the UI SHALL display the full secret once with copy guidance
- **AND** SHALL refresh the key list showing only the prefix thereafter

#### Scenario: User revokes a key

- **WHEN** a signed-in user revokes a key from the list
- **THEN** the UI SHALL remove the key from the active list after successful API response

#### Scenario: Navigation to MCP settings

- **WHEN** a signed-in user opens the user menu
- **THEN** a menu item SHALL navigate to `/dashboard/settings/mcp`

### Requirement: The web app SHALL document MCP client setup for users

The MCP settings page SHALL include a short configuration example showing the API base URL (`NEXT_PUBLIC_API_URL`), MCP path, and `Authorization: Bearer <your_api_key>` header suitable for Cursor, Claude Desktop, or other MCP clients supporting Streamable HTTP.

#### Scenario: User views connection instructions

- **WHEN** a user opens MCP settings
- **THEN** they SHALL see an example client snippet referencing their deployment's public API URL
