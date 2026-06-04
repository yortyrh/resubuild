import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { GetApplicationTool } from './get-application.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('GetApplicationTool', () => {
  let tool: GetApplicationTool;
  let applicationService: { findOne: jest.Mock };

  beforeEach(() => {
    applicationService = { findOne: jest.fn() };
    tool = new GetApplicationTool(applicationService as never);
  });

  it('delegates to ApplicationService.findOne with user and applicationId', async () => {
    applicationService.findOne.mockResolvedValue({ id: 'app-1' });
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ applicationId: 'app-1' });
    });

    expect(observed).toBe(user);
    expect(applicationService.findOne).toHaveBeenCalledWith(user, 'app-1');
    expect(await observable).toEqual({ id: 'app-1' });
  });
});
