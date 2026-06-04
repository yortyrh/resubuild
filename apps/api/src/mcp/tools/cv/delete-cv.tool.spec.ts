import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { DeleteCvTool } from './delete-cv.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('DeleteCvTool', () => {
  let tool: DeleteCvTool;
  let cvService: { remove: jest.Mock };

  beforeEach(() => {
    cvService = { remove: jest.fn() };
    tool = new DeleteCvTool(cvService as never);
  });

  it('delegates to CvService.remove and returns { ok, cvId }', async () => {
    cvService.remove.mockResolvedValue(undefined);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ cvId: 'cv-1' });
    });

    expect(observed).toBe(user);
    expect(cvService.remove).toHaveBeenCalledWith(user, 'cv-1');
    expect(await observable).toEqual({ ok: true, cvId: 'cv-1' });
  });
});
