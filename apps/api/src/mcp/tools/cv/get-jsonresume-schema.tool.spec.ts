import { GetJsonresumeSchemaTool } from './get-jsonresume-schema.tool';

describe('GetJsonresumeSchemaTool', () => {
  let tool: GetJsonresumeSchemaTool;

  beforeEach(() => {
    tool = new GetJsonresumeSchemaTool();
  });

  it('returns an envelope with the bundled JSON Resume schema', () => {
    const result = tool.run();

    expect(result).toMatchObject({
      $id: expect.any(String),
      schema: expect.any(Object),
    });
  });

  it('embeds the JSON Resume document shape (basics, work, education, skills, etc.)', () => {
    const { schema } = tool.run() as { schema: { properties?: Record<string, unknown> } };

    const properties = schema.properties ?? {};
    expect(Object.keys(properties)).toEqual(
      expect.arrayContaining([
        'basics',
        'work',
        'volunteer',
        'education',
        'awards',
        'certificates',
        'publications',
        'skills',
        'languages',
        'interests',
        'references',
        'projects',
        'meta',
      ]),
    );
  });

  it('exposes the iso8601 date definition referenced by startDate/endDate fields', () => {
    const { schema } = tool.run() as {
      schema: { definitions?: Record<string, unknown> };
    };

    expect(schema.definitions).toBeDefined();
    expect(schema.definitions).toHaveProperty('iso8601');
  });
});
