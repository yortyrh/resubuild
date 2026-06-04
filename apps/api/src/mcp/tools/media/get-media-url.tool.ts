import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { MediaService } from '../../../media/media.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { mediaIdSchema } from '../_schemas';

@Injectable()
export class GetMediaUrlTool {
  constructor(private readonly mediaService: MediaService) {}

  @Tool({
    name: 'get_media_url',
    description: MCP_TOOL_DEFINITIONS.get_media_url.description,
    parameters: mediaIdSchema,
    annotations: { readOnlyHint: true },
  })
  async run(args: { mediaId: string }) {
    const user = getMcpAuthUser();
    const meta = await this.mediaService.getMediaMeta(user.id, args.mediaId);
    return {
      id: args.mediaId,
      url: this.mediaService.viewerUrlForId(args.mediaId),
      contentType: meta.contentType,
      crop: meta.crop,
      hasCropped: meta.hasCropped,
    };
  }
}
