import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { GetMediaUrlTool } from './get-media-url.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('GetMediaUrlTool', () => {
  let tool: GetMediaUrlTool;
  let mediaService: { getMediaMeta: jest.Mock; viewerUrlForId: jest.Mock };

  beforeEach(() => {
    mediaService = {
      getMediaMeta: jest.fn(),
      viewerUrlForId: jest.fn().mockReturnValue('https://viewer/m-1'),
    };
    tool = new GetMediaUrlTool(mediaService as never);
  });

  it('returns the meta + viewer URL envelope', async () => {
    mediaService.getMediaMeta.mockResolvedValue({
      contentType: 'image/png',
      crop: null,
      hasCropped: false,
    });
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ mediaId: 'm-1' });
    });

    expect(observed).toBe(user);
    expect(mediaService.getMediaMeta).toHaveBeenCalledWith(user.id, 'm-1');
    expect(await observable).toEqual({
      id: 'm-1',
      url: 'https://viewer/m-1',
      contentType: 'image/png',
      crop: null,
      hasCropped: false,
    });
  });
});
