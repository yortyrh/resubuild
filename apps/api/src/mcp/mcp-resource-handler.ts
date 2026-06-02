/**
 * # MCP Resource Handler (`mcp-resource-handler.ts`)
 *
 * ## Overview
 *
 * Each MCP resource template (CV, Application, Media) is managed by a dedicated handler
 * class that encapsulates all resource-related logic: listing items for the current user,
 * constructing the resource URI, and reading individual resource contents.
 *
 * This decoupling keeps `McpToolsService` as a thin orchestrator and makes each resource
 * independently testable and maintainable.
 *
 * ## Architecture
 *
 * ```
 * McpToolsService
 *   ├── registerTools()     → 16 MCP tools (unchanged)
 *   │
 *   └── registerResources()
 *         ├── CvResourceHandler        → resumind://{cvId}/cv
 *         ├── ApplicationResourceHandler → resumind://{applicationId}/application
 *         └── MediaResourceHandler       → resumind://{mediaId}/media
 * ```
 *
 * ## Resource URI Design
 *
 * All resources follow the pattern `resumind://{entityId}/{entityType}`:
 *  - `resumind://{cvId}/cv`              — individual CV
 *  - `resumind://{applicationId}/application` — individual Application
 *  - `resumind://{mediaId}/media`        — individual Media item
 *
 * The `list` callback returns the full set of concrete URIs for the current user.
 * The `read` callback extracts the entity ID from the URI and fetches the record.
 *
 * ## User Scoping
 *
 * Every handler method calls `getMcpAuthUser()` to retrieve the authenticated user
 * from `AsyncLocalStorage`. This works because `McpToolsService.createServer()` is
 * only invoked within an active `mcpAuthStorage.run()` context set by the controller.
 * See `mcp-auth.context.ts` for the full design rationale.
 *
 * ## Interface Design
 *
 * `McpResourceHandler` is deliberately simple — each handler owns one resource
 * template. Adding a new resource type is a matter of:
 *  1. Creating a new handler implementing `McpResourceHandler`
 *  2. Registering it in `McpToolsService.registerResources()`
 *
 * No handler modification is needed when adding a new tool.
 */

import type {
  ListResourcesResult,
  ReadResourceResult,
  Request,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * A single resource entry returned by the `list` operation of a resource handler.
 * Mirrors the MCP `Resource` interface but simplified for internal use.
 */
export interface McpResourceEntry {
  /** Fully qualified MCP URI, e.g. `resumind://{id}/cv` */
  uri: string;
  /** Human-readable display name */
  name: string;
  /** Short description of the resource */
  description?: string;
  /** MIME type hint for clients reading the resource */
  mimeType?: string;
  /** Size in bytes (optional; not used for CVs/Applications) */
  size?: number;
}

/**
 * Result of a resource's `list` operation — the set of resources visible to the
 * current authenticated user.
 *
 * Note: `ListResourcesResult` (from the MCP spec) extends `Result` which has an
 * index signature `[key: string]: unknown`. This interface mirrors that contract
 * with a simplified `resources` field.
 */
export interface McpResourceListResult {
  /** The list of resource entries for the current user */
  resources: McpResourceEntry[];
  /** Opaque pagination cursor for future use */
  nextCursor?: string;
  /** Reserved MCP metadata */
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Result of a resource's `read` operation — the resource contents.
 */
export interface McpResourceReadResult {
  /** The URI that was read (echoed back to the MCP client) */
  uri: string;
  /** Serialized resource body as a string */
  text: string;
  /** MIME type of the serialized content */
  mimeType?: string;
  /** Reserved MCP metadata */
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Base interface for all MCP resource handlers.
 *
 * Each handler is responsible for one MCP resource template. The handler:
 *  - Provides a `list` callback used by the MCP SDK to enumerate available resources
 *  - Provides a `read` callback used by the MCP SDK to read a specific resource by URI
 *  - Reads the current user from `AsyncLocalStorage` via `getMcpAuthUser()`
 *
 * Handlers are instantiated once and registered once on the `McpServer`. The MCP SDK
 * holds a reference and calls the callbacks on each request.
 */
export interface McpResourceHandler {
  /**
   * Human-readable name for this resource type.
   * Used by the MCP SDK as the resource template `title` in server metadata.
   */
  readonly title: string;

  /**
   * Longer description of what this resource represents.
   * Used by the MCP SDK as the resource template `description` in server metadata.
   */
  readonly description: string;

  /**
   * The URI template pattern used by this resource.
   * Must match the pattern passed to `new ResourceTemplate(uriPattern, ...)`
   * during registration.
   *
   * Examples:
   *  - `resumind://{cvId}/cv`
   *  - `resumind://{applicationId}/application`
   *  - `resumind://{mediaId}/media`
   */
  readonly uriTemplate: string;

  /**
   * Default MIME type for resources of this type.
   * Individual resource entries may override this with their own MIME type.
   */
  readonly defaultMimeType: string;

  /**
   * List all resources visible to the current user.
   *
   * Called by the MCP SDK when a client invokes `resources/list`.
   * The handler reads `getMcpAuthUser()` to scope the query to the API key owner.
   *
   * @param _request - The MCP request (reserved; not used directly)
   * @returns A list of all resources belonging to the authenticated user
   *
   * @throws Errors from the underlying service (e.g., database errors) propagate up
   *          to the MCP SDK, which returns them as JSON-RPC errors to the client.
   */
  list(_request?: Request): Promise<McpResourceListResult>;

  /**
   * Read a single resource by its MCP URI.
   *
   * The URI is the one advertised in `list()`. Implementations parse the entity ID
   * from the URI path, then fetch the corresponding record for the current user.
   *
   * @param uri - The full MCP URI to read, e.g. `resumind://123e4567-e89b-12d3-a456-426614174000/cv`
   * @param _request - The MCP request (reserved; not used directly)
   * @returns The resource contents serialized as a string
   *
   * @throws NotFoundException - If the resource does not exist or does not belong
   *                            to the current user (caught by service layer)
   * @throws Errors from the underlying service propagate up to the MCP SDK.
   */
  read(uri: URL, _request?: Request): Promise<McpResourceReadResult>;
}
