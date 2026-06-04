import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { DeleteMediaTool } from './delete-media.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('DeleteMediaTool', () => {
  let tool: DeleteMediaTool;
  let mediaService: { deleteMedia: jest.Mock };

  beforeEach(() => {
    mediaService = { deleteMedia: jest.fn() };
    tool = new DeleteMediaTool(mediaService as never);
  });

  it('delegates to MediaService.deleteMedia and returns { ok, mediaId }', async () => {
    mediaService.deleteMedia.mockResolvedValue(undefined);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ mediaId: 'm-1' });
    });

    expect(observed).toBe(user);
    expect(mediaService.deleteMedia).toHaveBeenCalledWith(user.id, 'm-1');
    expect(await observable).toEqual({ ok: true, mediaId: 'm-1' });
  });
});
