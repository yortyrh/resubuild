import { ListCvDesignsTool } from './list-cv-designs.tool';

describe('ListCvDesignsTool', () => {
  let tool: ListCvDesignsTool;
  let cvExportService: { listTemplateCatalog: jest.Mock };

  beforeEach(() => {
    cvExportService = { listTemplateCatalog: jest.fn() };
    tool = new ListCvDesignsTool(cvExportService as never);
  });

  it('returns the static template catalog (no auth user required)', async () => {
    cvExportService.listTemplateCatalog.mockReturnValue([{ id: 'classic' }]);
    const result = await tool.run();
    expect(result).toEqual([{ id: 'classic' }]);
  });
});
