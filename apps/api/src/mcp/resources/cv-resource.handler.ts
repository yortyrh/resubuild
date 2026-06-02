/**
 * # CV Resource Handler (`cv-resource.handler.ts`)
 *
 * Handles the `resumind://{cvId}/cv` MCP resource template.
 *
 * ## URI Pattern
 * `resumind://{cvId}/cv`
 *
 * ## `list` Behavior
 * Returns all primary CVs belonging to the authenticated user (newest first).
 * Excludes application clones and import staging rows (those have `kind != 'primary'`).
 *
 * ## `read` Behavior
 * Reads a single CV by ID. The CV must belong to the authenticated user
 * (enforced by `CvService.findOne` via RLS).
 */

import type { Request } from '@modelcontextprotocol/sdk/types.js';
import type { CvRecord } from '../../cv/cv.service';
import { CvService } from '../../cv/cv.service';
import { getMcpAuthUser } from '../mcp-auth.context';
import type {
  McpResourceHandler,
  McpResourceListResult,
  McpResourceReadResult,
} from '../mcp-resource-handler';

/**
 * Resource handler for CV resources.
 *
 * Each listed CV produces a `McpResourceEntry` with:
 *  - `uri`     — `resumind://{cvId}/cv`
 *  - `name`    — the CV's derived title (from basics.name + label)
 *  - `description` — `"CV: {title}"`
 *  - `mimeType` — always `application/json` (CVs are serialized as JSON)
 */
export class CvResourceHandler implements McpResourceHandler {
  readonly uriTemplate = 'resumind://{cvId}/cv';
  readonly title = 'CVs';
  readonly description = 'User CV library — primary CVs only (excludes application clones)';
  readonly defaultMimeType = 'application/json';

  constructor(private readonly cvService: CvService) {}

  /**
   * List all primary CVs for the current user.
   *
   * `getMcpAuthUser()` reads the user from `AsyncLocalStorage`. This works because
   * this callback is only ever invoked within an active `mcpAuthStorage.run()` context
   * set by the controller before handling any MCP request.
   */
  async list(_request?: Request): Promise<McpResourceListResult> {
    const user = getMcpAuthUser();
    const cvs = await this.cvService.findAll(user);

    return {
      resources: cvs.map((cv: CvRecord) => ({
        uri: `resumind://${cv.id}/cv`,
        name: cv.title,
        description: `CV: ${cv.title}`,
        mimeType: 'application/json',
      })),
    };
  }

  /**
   * Read a single CV by its MCP URI.
   *
   * The URI is expected to match `resumind://{cvId}/cv`. The handler extracts the
   * `cvId` from `uri.pathname` (e.g., `/123e4567-e89b-12d3-a456-426614174000/cv` → `123e...`).
   *
   * The service layer enforces that the CV belongs to the authenticated user
   * (Supabase RLS + explicit `user_id` checks in the repository).
   */
  async read(uri: URL, _request?: Request): Promise<McpResourceReadResult> {
    // Extract cvId from pathname: "/{cvId}/cv" → segments[0]
    const segments = uri.pathname.split('/').filter(Boolean);
    const cvId = segments[0] ?? '';

    const user = getMcpAuthUser();
    const cv = await this.cvService.findOne(user, cvId);

    return {
      uri: uri.href,
      text: JSON.stringify(cv, null, 2),
      mimeType: 'application/json',
    };
  }
}
