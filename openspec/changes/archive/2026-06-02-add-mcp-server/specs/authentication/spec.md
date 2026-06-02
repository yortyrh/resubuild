## ADDED Requirements

### Requirement: The API SHALL support MCP API key authentication on the MCP route

In addition to Supabase JWT validation on REST routes, the API SHALL validate opaque MCP API keys on the MCP HTTP endpoint. MCP keys SHALL NOT be validated via `auth.getUser`. Successful MCP authentication SHALL attach a user id to the request context suitable for user-scoped data access without a Supabase access token.

#### Scenario: REST routes continue to require Supabase JWT

- **WHEN** a client calls `GET /cv` with an MCP API key instead of a Supabase access token
- **THEN** the Supabase auth guard SHALL respond with 401

#### Scenario: MCP route accepts API key only

- **WHEN** a client calls the MCP endpoint with a valid MCP API key
- **THEN** the MCP guard SHALL authenticate the request without calling Supabase `auth.getUser`

#### Scenario: MCP route rejects Supabase JWT alone

- **WHEN** a client calls the MCP endpoint with only a Supabase access token and no registered MCP key matching that value
- **THEN** the MCP guard SHALL respond with 401
