import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { ListMediaTool } from './list-media.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('ListMediaTool', () => {
  let tool: ListMediaTool;
  let mediaService: { listMediaForUser: jest.Mock; viewerUrlForId: jest.Mock };

  beforeEach(() => {
    mediaService = {
      listMediaForUser: jest.fn(),
      viewerUrlForId: jest.fn().mockImplementation((id: string) => `https://viewer/${id}`),
    };
    tool = new ListMediaTool(mediaService as never);
  });

  it('maps each media item to include a viewer URL', async () => {
    mediaService.listMediaForUser.mockResolvedValue([{ id: 'm-1', name: 'A' }]);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run();
    });

    expect(observed).toBe(user);
    expect(mediaService.listMediaForUser).toHaveBeenCalledWith(user.id);
    expect(mediaService.viewerUrlForId).toHaveBeenCalledWith('m-1');
    expect(await observable).toEqual([{ id: 'm-1', name: 'A', url: 'https://viewer/m-1' }]);
  });
});
