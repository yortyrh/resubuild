import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { CreateCvFromJsonresumeTool } from './create-cv-from-jsonresume.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('CreateCvFromJsonresumeTool', () => {
  let tool: CreateCvFromJsonresumeTool;
  let jsonResumeSwapService: { createFromJsonResume: jest.Mock };

  beforeEach(() => {
    jsonResumeSwapService = { createFromJsonResume: jest.fn() };
    tool = new CreateCvFromJsonresumeTool(jsonResumeSwapService as never);
  });

  it('delegates to CvJsonResumeSwapService.createFromJsonResume and returns { cvId, cv }', async () => {
    const document = { basics: { name: 'New' } };
    const created = { id: 'cv-2', title: 'New' };
    jsonResumeSwapService.createFromJsonResume.mockResolvedValue(created);

    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ document });
    });

    expect(observed).toBe(user);
    expect(jsonResumeSwapService.createFromJsonResume).toHaveBeenCalledWith(user, document);
    expect(await observable).toEqual({ cvId: 'cv-2', cv: created });
  });
});
