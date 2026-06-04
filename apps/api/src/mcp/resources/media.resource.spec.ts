import { getMcpAuthUser, mcpAuthStorage } from '../mcp-auth.context';
import { MediaResource } from './media.resource';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('MediaResource', () => {
  let resource: MediaResource;
  let mediaService: { getMediaMeta: jest.Mock };

  beforeEach(() => {
    mediaService = { getMediaMeta: jest.fn() };
    resource = new MediaResource(mediaService as never);
  });

  it('returns ReadResourceResult with the media meta (mimeType from the meta)', async () => {
    const meta = { id: 'm-1', contentType: 'image/png', size: 1234, crop: null };
    mediaService.getMediaMeta.mockResolvedValue(meta);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return resource.handle({ mediaId: 'm-1' });
    });

    expect(observed).toBe(user);
    expect(mediaService.getMediaMeta).toHaveBeenCalledWith(user.id, 'm-1');
    expect(await observable).toEqual({
      contents: [
        {
          uri: 'resumind://m-1/media',
          text: JSON.stringify(meta, null, 2),
          mimeType: 'image/png',
        },
      ],
    });
  });
});
