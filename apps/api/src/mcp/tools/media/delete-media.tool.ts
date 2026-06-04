import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { MediaService } from '../../../media/media.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';
import { mediaIdSchema } from '../_schemas';

@Injectable()
export class DeleteMediaTool {
  constructor(private readonly mediaService: MediaService) {}

  @Tool({
    name: 'delete_media',
    description: MCP_TOOL_DEFINITIONS.delete_media.description,
    parameters: mediaIdSchema,
    annotations: { destructiveHint: true },
  })
  async run(args: { mediaId: string }) {
    const user = getMcpAuthUser();
    await this.mediaService.deleteMedia(user.id, args.mediaId);
    return { ok: true, mediaId: args.mediaId };
  }
}
