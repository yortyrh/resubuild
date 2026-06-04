import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { GetCvTool } from './get-cv.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('GetCvTool', () => {
  let tool: GetCvTool;
  let cvService: { findOne: jest.Mock };

  beforeEach(() => {
    cvService = { findOne: jest.fn() };
    tool = new GetCvTool(cvService as never);
  });

  it('delegates to CvService.findOne with the current mcp auth user and cvId', async () => {
    cvService.findOne.mockResolvedValue({ id: 'cv-1', title: 'X' });
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ cvId: 'cv-1' });
    });

    expect(observed).toBe(user);
    expect(cvService.findOne).toHaveBeenCalledWith(user, 'cv-1');
    expect(await observable).toEqual({ id: 'cv-1', title: 'X' });
  });
});
