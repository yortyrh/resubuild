# mcp-jsonresume-schema-tool Specification

## Purpose

TBD - created by archiving change mcp-key-and-import-improvements. Update Purpose after archive.

## Requirements

### Requirement: The MCP server SHALL expose the bundled JSON Resume schema as a read-only tool

The MCP server SHALL register a tool named `get_jsonresume_schema`
implemented as a single `@Tool({...})`-decorated method on an
`@Injectable()` provider under
`apps/api/src/mcp/tools/cv/get-jsonresume-schema.tool.ts`. The tool SHALL
return an envelope `{ $id, version, schema }` where `schema` is the
bundled `packages/schemas/resume.schema.json` JSON document, `$id` is the
schema's `$id` (defaulting to `https://jsonresume.org/schema/` when
absent), and `version` is the schema's `meta.version` when present and
`undefined` otherwise. The tool SHALL be marked `readOnlyHint: true` and
SHALL NOT make any database, network, or auth-context call. The schema
is bundled into the API build via the existing `nest-cli.json` `assets`
entry that copies `../../packages/schemas/resume.schema.json` into the
dist alongside the API entrypoint.

The tool's `description` in `MCP_TOOL_DEFINITIONS.get_jsonresume_schema`
SHALL instruct agents to call it BEFORE constructing a JSON Resume
document from non-JSON Resume source material (PDF text, DOCX text, image
OCR, scraped websites, free-form notes) so the target shape is known, and
SHALL mention that the response wraps the schema in
`{ schema, $id, version }`, is bundled into the build (no network
access), and is draft-07 JSON Schema with `$ref` to `#/definitions/iso8601`
for date fields (accepts `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`). The
description SHALL list the section keys (`summary`, `work`, `volunteer`,
`education`, `awards`, `certificates`, `publications`, `skills`,
`languages`, `interests`, `references`, `projects`) and the top-level
`basics` and `meta` keys.

#### Scenario: An MCP agent discovers the JSON Resume shape before composing a document

- **WHEN** an MCP client calls `tools/call` with `name: "get_jsonresume_schema"`
- **THEN** the response `structuredContent` is an object with keys `$id`, `version`, and `schema`
- **AND** `schema` is the bundled JSON Resume document (not a network-fetched copy)
- **AND** `schema.properties` includes the standard JSON Resume section keys
- **AND** `schema.definitions.iso8601` is present (referenced by date fields)

#### Scenario: The tool is read-only and auth-light

- **WHEN** the tool is invoked
- **THEN** the tool makes no mutation to user state, the database, or storage
- **AND** the response does not depend on the authenticated user (the schema is the same for every user)

#### Scenario: The tool is registered in the MCP tool catalog

- **WHEN** the MCP server boots
- **THEN** `MCP_TOOL_NAMES` includes the string `"get_jsonresume_schema"`
- **AND** `MCP_TOOL_DEFINITIONS.get_jsonresume_schema` is defined
- **AND** the `McpSettingsService` tool-catalog introspection lists the new tool
