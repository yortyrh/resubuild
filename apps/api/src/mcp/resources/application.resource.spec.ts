import { getMcpAuthUser, mcpAuthStorage } from '../mcp-auth.context';
import { ApplicationResource } from './application.resource';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('ApplicationResource', () => {
  let resource: ApplicationResource;
  let applicationService: { findOne: jest.Mock };

  beforeEach(() => {
    applicationService = { findOne: jest.fn() };
    resource = new ApplicationResource(applicationService as never);
  });

  it('returns ReadResourceResult with JSON-stringified application body', async () => {
    const application = { id: 'app-1', jobTitle: 'Engineer' };
    applicationService.findOne.mockResolvedValue(application);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return resource.handle({ applicationId: 'app-1' });
    });

    expect(observed).toBe(user);
    expect(applicationService.findOne).toHaveBeenCalledWith(user, 'app-1');
    expect(await observable).toEqual({
      contents: [
        {
          uri: 'resubuild://app-1/application',
          text: JSON.stringify(application, null, 2),
          mimeType: 'application/json',
        },
      ],
    });
  });
});
