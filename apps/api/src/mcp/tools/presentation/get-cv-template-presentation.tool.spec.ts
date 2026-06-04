import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { GetCvTemplatePresentationTool } from './get-cv-template-presentation.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('GetCvTemplatePresentationTool', () => {
  let tool: GetCvTemplatePresentationTool;
  let presentationService: { getPresentation: jest.Mock };

  beforeEach(() => {
    presentationService = { getPresentation: jest.fn() };
    tool = new GetCvTemplatePresentationTool(presentationService as never);
  });

  it('delegates to CvTemplatePresentationService.getPresentation with user, cvId, template', async () => {
    const config = { accentColor: '#fff' };
    presentationService.getPresentation.mockResolvedValue(config);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ cvId: 'cv-1', template: 'classic' });
    });

    expect(observed).toBe(user);
    expect(presentationService.getPresentation).toHaveBeenCalledWith(user, 'cv-1', 'classic');
    expect(await observable).toBe(config);
  });
});
