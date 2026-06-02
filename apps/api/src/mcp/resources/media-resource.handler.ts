/**
 * # Media Resource Handler (`media-resource.handler.ts`)
 *
 * Handles the `resumind://{mediaId}/media` MCP resource template.
 *
 * ## URI Pattern
 * `resumind://{mediaId}/media`
 *
 * ## `list` Behavior
 * Returns all media uploads belonging to the authenticated user (newest first).
 * Each entry includes the media's content type as the MIME type.
 *
 * ## `read` Behavior
 * Reads a single media item's metadata by ID. Returns the media's content type,
 * crop state, and whether a cropped derivative is available.
 *
 * Note: This does NOT return the raw media bytes — only metadata. Clients should
 * use the `/media/:id` REST endpoint to fetch the actual file bytes, which
 * supports thumbnails, cropping, and streaming.
 */

import type { Request } from '@modelcontextprotocol/sdk/types.js';
import { MediaService } from '../../media/media.service';
import { getMcpAuthUser } from '../mcp-auth.context';
import type {
  McpResourceHandler,
  McpResourceListResult,
  McpResourceReadResult,
} from '../mcp-resource-handler';

/**
 * Resource handler for Media resources.
 *
 * Each listed media item produces a `McpResourceEntry` with:
 *  - `uri`     — `resumind://{mediaId}/media`
 *  - `name`    — the media's `id` (opaque)
 *  - `description` — `"Media: {contentType}"` (e.g., `"Media: image/png"`)
 *  - `mimeType` — the actual media content type (e.g., `image/png`, `image/jpeg`)
 */
export class MediaResourceHandler implements McpResourceHandler {
  readonly uriTemplate = 'resumind://{mediaId}/media';
  readonly title = 'Media';
  readonly description =
    'User uploaded media (images and documents) — returns metadata only, not raw bytes';
  readonly defaultMimeType = 'application/octet-stream';

  constructor(private readonly mediaService: MediaService) {}

  /**
   * List all media items for the current user.
   *
   * `getMcpAuthUser()` reads the user from `AsyncLocalStorage`. This works because
   * this callback is only ever invoked within an active `mcpAuthStorage.run()` context
   * set by the controller before handling any MCP request.
   *
   * `MediaService.listMediaForUser(userId)` queries Supabase directly and filters
   * by `user_id` to return only the API key owner's media.
   */
  async list(_request?: Request): Promise<McpResourceListResult> {
    const user = getMcpAuthUser();
    const mediaItems = await this.mediaService.listMediaForUser(user.id);

    return {
      resources: mediaItems.map((item) => ({
        uri: `resumind://${item.id}/media`,
        name: item.id,
        description: `Media: ${item.contentType}`,
        mimeType: item.contentType,
      })),
    };
  }

  /**
   * Read a single media item's metadata by its MCP URI.
   *
   * The URI is expected to match `resumind://{mediaId}/media`. The handler extracts
   * `mediaId` from the pathname.
   *
   * Returns a JSON object with:
   *  - `id`          — the media UUID
   *  - `contentType` — MIME type (e.g., `image/png`)
   *  - `crop`        — crop rectangle or `null` if uncropped
   *  - `hasCropped`  — whether a cropped derivative exists in storage
   *
   * `MediaService.getMediaMeta(userId, mediaId)` enforces ownership — it throws
   * `ForbiddenException` if the media belongs to a different user.
   *
   * To fetch actual file bytes, clients should use `GET /media/{mediaId}` on the
   * REST API (which serves the cropped variant if available, otherwise the original).
   */
  async read(uri: URL, _request?: Request): Promise<McpResourceReadResult> {
    const segments = uri.pathname.split('/').filter(Boolean);
    const mediaId = segments[0] ?? '';

    const user = getMcpAuthUser();
    const meta = await this.mediaService.getMediaMeta(user.id, mediaId);

    return {
      uri: uri.href,
      text: JSON.stringify(meta, null, 2),
      mimeType: meta.contentType,
    };
  }
}
