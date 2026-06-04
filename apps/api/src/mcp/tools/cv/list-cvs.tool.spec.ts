import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { ListCvsTool } from './list-cvs.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('ListCvsTool', () => {
  let tool: ListCvsTool;
  let cvService: { findAll: jest.Mock };

  beforeEach(() => {
    cvService = { findAll: jest.fn() };
    tool = new ListCvsTool(cvService as never);
  });

  it('delegates to CvService.findAll with the current mcp auth user', async () => {
    cvService.findAll.mockReturnValue([{ id: 'cv-1' }]);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run();
    });

    expect(observed).toBe(user);
    expect(cvService.findAll).toHaveBeenCalledWith(user);
    expect(await observable).toEqual([{ id: 'cv-1' }]);
  });
});
