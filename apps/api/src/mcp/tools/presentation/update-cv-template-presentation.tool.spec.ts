import { getMcpAuthUser, mcpAuthStorage } from '../../mcp-auth.context';
import { UpdateCvTemplatePresentationTool } from './update-cv-template-presentation.tool';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('UpdateCvTemplatePresentationTool', () => {
  let tool: UpdateCvTemplatePresentationTool;
  let presentationService: { upsertPresentation: jest.Mock };

  beforeEach(() => {
    presentationService = { upsertPresentation: jest.fn() };
    tool = new UpdateCvTemplatePresentationTool(presentationService as never);
  });

  it('delegates to CvTemplatePresentationService.upsertPresentation', async () => {
    const config = { accentColor: '#000' };
    const persisted = { ...config, updatedAt: '2024-01-01' };
    presentationService.upsertPresentation.mockResolvedValue(persisted);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return tool.run({ cvId: 'cv-1', template: 'classic', config });
    });

    expect(observed).toBe(user);
    expect(presentationService.upsertPresentation).toHaveBeenCalledWith(
      user,
      'cv-1',
      'classic',
      config,
    );
    expect(await observable).toBe(persisted);
  });
});
