import { Injectable } from '@nestjs/common';
import { ResourceTemplate } from '@rekog/mcp-nest';
import { MediaService } from '../../media/media.service';
import { getMcpAuthUser } from '../mcp-auth.context';

/**
 * `resubuild://{mediaId}/media` — read one media item's metadata as JSON.
 * Replaces the prior `MediaResourceHandler` interface implementation.
 * Note: this returns metadata only, not the raw bytes — clients use
 * `GET /media/:id` to fetch the actual file.
 */
@Injectable()
export class MediaResource {
  constructor(private readonly mediaService: MediaService) {}

  @ResourceTemplate({
    uriTemplate: 'resubuild://{mediaId}/media',
    name: 'Media',
    description:
      'User uploaded media (images and documents) — returns metadata only, not raw bytes',
    mimeType: 'application/octet-stream',
  })
  async handle(params: { mediaId: string }) {
    const user = getMcpAuthUser();
    const meta = await this.mediaService.getMediaMeta(user.id, params.mediaId);
    return {
      contents: [
        {
          uri: `resubuild://${params.mediaId}/media`,
          text: JSON.stringify(meta, null, 2),
          mimeType: meta.contentType,
        },
      ],
    };
  }
}
