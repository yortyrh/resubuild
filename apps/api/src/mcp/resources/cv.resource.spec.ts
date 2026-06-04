import { getMcpAuthUser, mcpAuthStorage } from '../mcp-auth.context';
import { CvResource } from './cv.resource';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const };

describe('CvResource', () => {
  let resource: CvResource;
  let cvService: { findOne: jest.Mock };

  beforeEach(() => {
    cvService = { findOne: jest.fn() };
    resource = new CvResource(cvService as never);
  });

  it('returns ReadResourceResult with JSON-stringified CV body', async () => {
    const cv = { id: 'cv-1', title: 'Software Engineer' };
    cvService.findOne.mockResolvedValue(cv);
    let observed: unknown;
    const observable = await mcpAuthStorage.run(user, async () => {
      observed = getMcpAuthUser();
      return resource.handle({ cvId: 'cv-1' });
    });

    expect(observed).toBe(user);
    expect(cvService.findOne).toHaveBeenCalledWith(user, 'cv-1');
    expect(await observable).toEqual({
      contents: [
        {
          uri: 'resumind://cv-1/cv',
          text: JSON.stringify(cv, null, 2),
          mimeType: 'application/json',
        },
      ],
    });
  });
});
