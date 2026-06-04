import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { ReplaceCvFromJsonresumeTool } from './replace-cv-from-jsonresume.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('ReplaceCvFromJsonresumeTool', () => {
  let tool: ReplaceCvFromJsonresumeTool;
  let jsonResumeSwapService: { replaceFromJsonResume: jest.Mock };

  beforeEach(() => {
    jsonResumeSwapService = { replaceFromJsonResume: jest.fn() };
    tool = new ReplaceCvFromJsonresumeTool(jsonResumeSwapService as never);
  });

  it('delegates to CvJsonResumeSwapService.replaceFromJsonResume and returns { cvId, cv }', async () => {
    const document = { basics: { name: 'Updated' } };
    const replaced = { id: 'cv-1', title: 'Updated' };
    jsonResumeSwapService.replaceFromJsonResume.mockResolvedValue(replaced);

    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ cvId: 'cv-1', document });
    });

    expect(observed).toBe(user);
    expect(jsonResumeSwapService.replaceFromJsonResume).toHaveBeenCalledWith(
      user,
      'cv-1',
      document,
    );
    expect(await observable).toEqual({ cvId: 'cv-1', cv: replaced });
  });
});
