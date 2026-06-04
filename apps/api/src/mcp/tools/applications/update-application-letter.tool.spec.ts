import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { UpdateApplicationLetterTool } from './update-application-letter.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('UpdateApplicationLetterTool', () => {
  let tool: UpdateApplicationLetterTool;
  let applicationService: { updateCoverLetter: jest.Mock };

  beforeEach(() => {
    applicationService = { updateCoverLetter: jest.fn() };
    tool = new UpdateApplicationLetterTool(applicationService as never);
  });

  it('delegates to ApplicationService.updateCoverLetter with user, applicationId, and coverLetter', async () => {
    applicationService.updateCoverLetter.mockResolvedValue({ id: 'app-1' });
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ applicationId: 'app-1', coverLetter: 'Dear Hiring Manager…' });
    });

    expect(observed).toBe(user);
    expect(applicationService.updateCoverLetter).toHaveBeenCalledWith(
      user,
      'app-1',
      'Dear Hiring Manager…',
    );
    expect(await observable).toEqual({ id: 'app-1' });
  });
});
