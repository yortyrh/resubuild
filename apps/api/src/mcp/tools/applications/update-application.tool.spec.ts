import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { UpdateApplicationTool } from './update-application.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('UpdateApplicationTool', () => {
  let tool: UpdateApplicationTool;
  let applicationService: { patchApplicationMetadata: jest.Mock };

  beforeEach(() => {
    applicationService = { patchApplicationMetadata: jest.fn() };
    tool = new UpdateApplicationTool(applicationService as never);
  });

  it('strips applicationId and forwards the rest as the patch', async () => {
    applicationService.patchApplicationMetadata.mockResolvedValue({ id: 'app-1' });
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({
        applicationId: 'app-1',
        jobTitle: 'Engineer',
        jobCompany: 'Acme',
        jobRawText: '...',
        selectionRationale: 'match',
        coverLetterEmailSubject: 'Hi',
        userMessage: 'Hello',
      });
    });

    expect(observed).toBe(user);
    expect(applicationService.patchApplicationMetadata).toHaveBeenCalledWith(user, 'app-1', {
      jobTitle: 'Engineer',
      jobCompany: 'Acme',
      jobRawText: '...',
      selectionRationale: 'match',
      coverLetterEmailSubject: 'Hi',
      userMessage: 'Hello',
    });
    expect(await observable).toEqual({ id: 'app-1' });
  });
});
