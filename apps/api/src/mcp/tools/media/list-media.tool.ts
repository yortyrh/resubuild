import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { MediaService } from '../../../media/media.service';
import { getMcpAuthUser } from '../../mcp-auth.context';
import { MCP_TOOL_DEFINITIONS } from '../../tool-definitions';

@Injectable()
export class ListMediaTool {
  constructor(private readonly mediaService: MediaService) {}

  @Tool({
    name: 'list_media',
    description: MCP_TOOL_DEFINITIONS.list_media.description,
    annotations: { readOnlyHint: true },
  })
  async run() {
    const user = getMcpAuthUser();
    const mediaItems = await this.mediaService.listMediaForUser(user.id);
    return mediaItems.map((item) => ({
      ...item,
      url: this.mediaService.viewerUrlForId(item.id),
    }));
  }
}
