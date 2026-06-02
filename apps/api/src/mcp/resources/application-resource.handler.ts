/**
 * # Application Resource Handler (`application-resource.handler.ts`)
 *
 * Handles the `resumind://{applicationId}/application` MCP resource template.
 *
 * ## URI Pattern
 * `resumind://{applicationId}/application`
 *
 * ## `list` Behavior
 * Returns all job applications visible in the dashboard (active rows only).
 * Hidden update drafts (`is_list_visible === false`) are excluded.
 *
 * ## `read` Behavior
 * Reads a single application by ID. The application must belong to the
 * authenticated user (enforced by `ApplicationService.findOne` via RLS).
 */

import type { Request } from '@modelcontextprotocol/sdk/types.js';
import { ApplicationService } from '../../application/application.service';
import { getMcpAuthUser } from '../mcp-auth.context';
import type {
  McpResourceHandler,
  McpResourceListResult,
  McpResourceReadResult,
} from '../mcp-resource-handler';

/**
 * Resource handler for Application resources.
 *
 * Each listed application produces a `McpResourceEntry` with:
 *  - `uri`     — `resumind://{applicationId}/application`
 *  - `name`    — `"{$jobTitle} @ {$jobCompany}"` or the application ID if no title
 *  - `description` — `"Application: {jobTitle | id}"`
 *  - `mimeType` — always `application/json`
 */
export class ApplicationResourceHandler implements McpResourceHandler {
  readonly uriTemplate = 'resumind://{applicationId}/application';
  readonly title = 'Applications';
  readonly description = 'Job applications — active rows only; update drafts are excluded';
  readonly defaultMimeType = 'application/json';

  constructor(private readonly applicationService: ApplicationService) {}

  /**
   * List all active applications for the current user.
   *
   * `ApplicationService.findAll(user)` already filters to `is_list_visible !== false`
   * and scopes by `user.id` through RLS.
   *
   * `getMcpAuthUser()` reads the user from `AsyncLocalStorage`. This works because
   * this callback is only ever invoked within an active `mcpAuthStorage.run()` context
   * set by the controller before handling any MCP request.
   */
  async list(_request?: Request): Promise<McpResourceListResult> {
    const user = getMcpAuthUser();
    const applications = await this.applicationService.findAll(user);

    return {
      resources: applications.map((app) => ({
        uri: `resumind://${app.id}/application`,
        name: app.jobTitle ? `${app.jobTitle} @ ${app.jobCompany}` : app.id,
        description: `Application: ${app.jobTitle ?? app.id}`,
        mimeType: 'application/json',
      })),
    };
  }

  /**
   * Read a single application by its MCP URI.
   *
   * The URI is expected to match `resumind://{applicationId}/application`.
   * The handler extracts `applicationId` from the pathname.
   *
   * `ApplicationService.findOne` enforces ownership via RLS and throws
   * `NotFoundException` if the application is missing or belongs to another user.
   */
  async read(uri: URL, _request?: Request): Promise<McpResourceReadResult> {
    const segments = uri.pathname.split('/').filter(Boolean);
    const applicationId = segments[0] ?? '';

    const user = getMcpAuthUser();
    const app = await this.applicationService.findOne(user, applicationId);

    return {
      uri: uri.href,
      text: JSON.stringify(app, null, 2),
      mimeType: 'application/json',
    };
  }
}
