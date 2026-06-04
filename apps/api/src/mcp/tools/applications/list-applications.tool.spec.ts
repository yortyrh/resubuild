import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { ListApplicationsTool } from './list-applications.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('ListApplicationsTool', () => {
  let tool: ListApplicationsTool;
  let applicationService: { findAll: jest.Mock };

  beforeEach(() => {
    applicationService = { findAll: jest.fn() };
    tool = new ListApplicationsTool(applicationService as never);
  });

  it('delegates to ApplicationService.findAll with the current mcp auth user', async () => {
    applicationService.findAll.mockResolvedValue([{ id: 'app-1' }]);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run();
    });

    expect(observed).toBe(user);
    expect(applicationService.findAll).toHaveBeenCalledWith(user);
    expect(await observable).toEqual([{ id: 'app-1' }]);
  });
});
