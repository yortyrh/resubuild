import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthUser } from '../auth/auth-user.types';
import { getMcpAuthUser } from './mcp-auth.context';
import { McpToolsService } from './mcp-tools.service';
import { MCP_TOOL_DEFINITIONS, MCP_TOOL_NAMES } from './tool-definitions';

jest.mock('./mcp-auth.context');
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');

const mockGetMcpAuthUser = getMcpAuthUser as jest.MockedFunction<typeof getMcpAuthUser>;
const MockMcpServer = McpServer as jest.MockedClass<typeof McpServer>;

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const } as AuthUser;

describe('McpToolsService', () => {
  let cvService: { findAll: jest.Mock; findOne: jest.Mock; remove: jest.Mock; create: jest.Mock };
  let cvExportService: {
    renderJson: jest.Mock;
    renderHtml: jest.Mock;
    renderPdf: jest.Mock;
    renderScreenshot: jest.Mock;
    listTemplateCatalog: jest.Mock;
    resolveTemplateId: jest.Mock;
    toMcpBase64Payload: jest.Mock;
  };
  let presentationService: { getPresentation: jest.Mock; upsertPresentation: jest.Mock };
  let applicationService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    patchApplicationMetadata: jest.Mock;
    updateCoverLetter: jest.Mock;
  };
  let jsonResumeSwapService: { createFromJsonResume: jest.Mock; replaceFromJsonResume: jest.Mock };
  let mediaService: {
    listMediaForUser: jest.Mock;
    getMediaMeta: jest.Mock;
    viewerUrlForId: jest.Mock;
    deleteMedia: jest.Mock;
  };
  let service: McpToolsService;
  let mockServer: { registerTool: jest.Mock; registerResource: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    cvService = { findAll: jest.fn(), findOne: jest.fn(), remove: jest.fn(), create: jest.fn() };
    cvExportService = {
      renderJson: jest.fn(),
      renderHtml: jest.fn(),
      renderPdf: jest.fn(),
      renderScreenshot: jest.fn(),
      listTemplateCatalog: jest.fn(),
      resolveTemplateId: jest.fn(),
      toMcpBase64Payload: jest.fn(),
    } as never;
    presentationService = { getPresentation: jest.fn(), upsertPresentation: jest.fn() };
    applicationService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      patchApplicationMetadata: jest.fn(),
      updateCoverLetter: jest.fn(),
    } as never;
    jsonResumeSwapService = {
      createFromJsonResume: jest.fn(),
      replaceFromJsonResume: jest.fn(),
    } as never;
    mediaService = {
      listMediaForUser: jest.fn(),
      getMediaMeta: jest.fn(),
      viewerUrlForId: jest.fn(),
      deleteMedia: jest.fn(),
    } as never;

    mockServer = { registerTool: jest.fn(), registerResource: jest.fn() };
    MockMcpServer.mockImplementation(() => mockServer as unknown as McpServer);

    service = new McpToolsService(
      cvService as never,
      cvExportService as never,
      presentationService as never,
      applicationService as never,
      jsonResumeSwapService as never,
      mediaService as never,
    );
  });

  describe('createServer', () => {
    it('creates a McpServer with name and version', () => {
      const server = service.createServer();
      expect(MockMcpServer).toHaveBeenCalledWith({ name: 'resumind', version: '1.0.0' });
      expect(server).toBeDefined();
    });

    it('registers tools', () => {
      service.createServer();
      expect(mockServer.registerTool).toHaveBeenCalled();
    });

    it('registers resources', () => {
      service.createServer();
      expect(mockServer.registerResource).toHaveBeenCalled();
    });
  });

  describe('listRegisteredToolNames', () => {
    it('returns all tool names defined in the catalog', () => {
      const names = service.listRegisteredToolNames();
      expect(names).toEqual([...MCP_TOOL_NAMES]);
      expect(names.length).toBeGreaterThan(0);
    });
  });

  describe('tool registration', () => {
    beforeEach(() => {
      service.createServer();
      mockGetMcpAuthUser.mockReturnValue(user);
    });

    it('registers all tools from MCP_TOOL_NAMES with description and annotations', () => {
      for (const name of MCP_TOOL_NAMES) {
        expect(mockServer.registerTool).toHaveBeenCalledWith(
          name,
          expect.objectContaining({
            description: expect.any(String),
          }),
          expect.any(Function),
        );
      }
    });

    it('registers list_cvs handler that calls cvService.findAll', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'list_cvs');
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: { _?: unknown }) => Promise<unknown>;

      cvService.findAll.mockResolvedValue([{ id: 'cv-1' }]);
      const result = await handler({});

      expect(cvService.findAll).toHaveBeenCalledWith(user);
      expect(result).toMatchObject({
        content: expect.any(Array),
        structuredContent: expect.any(Object),
      });
    });

    it('registers get_cv handler that calls cvService.findOne', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'get_cv');
      const handler = calls[0][2] as (args: { cvId: string }) => Promise<unknown>;

      cvService.findOne.mockResolvedValue({ id: 'cv-1' });
      const result = await handler({ cvId: '11111111-1111-1111-1111-111111111111' });

      expect(cvService.findOne).toHaveBeenCalledWith(user, '11111111-1111-1111-1111-111111111111');
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers delete_cv handler that calls cvService.remove', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'delete_cv');
      const handler = calls[0][2] as (args: { cvId: string }) => Promise<unknown>;

      cvService.remove.mockResolvedValue(undefined as never);
      const result = await handler({ cvId: '11111111-1111-1111-1111-111111111111' });

      expect(cvService.remove).toHaveBeenCalledWith(user, '11111111-1111-1111-1111-111111111111');
      expect(result).toMatchObject({
        structuredContent: { ok: true, cvId: '11111111-1111-1111-1111-111111111111' },
      });
    });

    it('registers list_cv_designs handler that calls cvExportService.listTemplateCatalog', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'list_cv_designs');
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as unknown as (args?: unknown) => Promise<unknown>;

      cvExportService.listTemplateCatalog.mockReturnValue([{ id: 'classic' }]);
      const result = await handler({});

      expect(cvExportService.listTemplateCatalog).toHaveBeenCalled();
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers list_applications handler that calls applicationService.findAll', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'list_applications');
      const handler = calls[0][2] as unknown as (args?: unknown) => Promise<unknown>;

      applicationService.findAll.mockResolvedValue([{ id: 'app-1' }] as never);
      const result = await handler();

      expect(applicationService.findAll).toHaveBeenCalledWith(user);
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers list_media handler that calls mediaService.listMediaForUser', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'list_media');
      const handler = calls[0][2] as unknown as (args?: unknown) => Promise<unknown>;

      mediaService.listMediaForUser.mockResolvedValue([{ id: 'media-1' }] as never);
      mediaService.viewerUrlForId.mockReturnValue('http://localhost/media/1');
      const result = await handler();

      expect(mediaService.listMediaForUser).toHaveBeenCalledWith(user.id);
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers get_media_url handler that calls mediaService.getMediaMeta and viewerUrlForId', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'get_media_url');
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: { mediaId: string }) => Promise<unknown>;

      mediaService.getMediaMeta.mockResolvedValue({
        contentType: 'image/png',
        crop: null,
        hasCropped: false,
      } as never);
      mediaService.viewerUrlForId.mockReturnValue('http://localhost/media/1');

      const result = await handler({ mediaId: '11111111-1111-1111-1111-111111111111' });

      expect(mediaService.getMediaMeta).toHaveBeenCalledWith(
        user.id,
        '11111111-1111-1111-1111-111111111111',
      );
      expect(mediaService.viewerUrlForId).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
      );
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers delete_media handler that calls mediaService.deleteMedia', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'delete_media');
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: { mediaId: string }) => Promise<unknown>;

      mediaService.deleteMedia.mockResolvedValue(undefined as never);

      const result = await handler({ mediaId: '11111111-1111-1111-1111-111111111111' });

      expect(mediaService.deleteMedia).toHaveBeenCalledWith(
        user.id,
        '11111111-1111-1111-1111-111111111111',
      );
      expect(result).toMatchObject({
        structuredContent: { ok: true, mediaId: '11111111-1111-1111-1111-111111111111' },
      });
    });

    it('registers get_application handler that calls applicationService.findOne', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'get_application');
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: { applicationId: string }) => Promise<unknown>;

      applicationService.findOne.mockResolvedValue({ id: 'app-1' } as never);

      const result = await handler({ applicationId: '11111111-1111-1111-1111-111111111111' });

      expect(applicationService.findOne).toHaveBeenCalledWith(
        user,
        '11111111-1111-1111-1111-111111111111',
      );
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers update_application handler that calls applicationService.patchApplicationMetadata', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'update_application');
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: {
        applicationId: string;
        jobTitle: string;
      }) => Promise<unknown>;

      applicationService.patchApplicationMetadata = jest
        .fn()
        .mockResolvedValue({ id: 'app-1', jobTitle: 'Senior Engineer' } as never);

      const result = await handler({
        applicationId: '11111111-1111-1111-1111-111111111111',
        jobTitle: 'Senior Engineer',
      });

      expect(applicationService.patchApplicationMetadata).toHaveBeenCalledWith(
        user,
        '11111111-1111-1111-1111-111111111111',
        expect.objectContaining({ jobTitle: 'Senior Engineer' }),
      );
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers update_application_letter handler that calls applicationService.updateCoverLetter', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(
        ([n]) => n === 'update_application_letter',
      );
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: {
        applicationId: string;
        coverLetter: string;
      }) => Promise<unknown>;

      applicationService.updateCoverLetter = jest
        .fn()
        .mockResolvedValue({ id: 'app-1', coverLetter: 'Dear...' } as never);

      const result = await handler({
        applicationId: '11111111-1111-1111-1111-111111111111',
        coverLetter: 'Dear Hiring Manager',
      });

      expect(applicationService.updateCoverLetter).toHaveBeenCalledWith(
        user,
        '11111111-1111-1111-1111-111111111111',
        'Dear Hiring Manager',
      );
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers create_cv_from_jsonresume handler', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(
        ([n]) => n === 'create_cv_from_jsonresume',
      );
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: {
        document: Record<string, unknown>;
      }) => Promise<unknown>;

      jsonResumeSwapService.createFromJsonResume.mockResolvedValue({
        id: 'cv-new',
        title: 'New CV',
      } as never);

      const result = await handler({ document: { basics: { name: 'John' } } });

      expect(jsonResumeSwapService.createFromJsonResume).toHaveBeenCalledWith(user, {
        basics: { name: 'John' },
      });
      expect(result).toMatchObject({
        structuredContent: expect.objectContaining({ cvId: 'cv-new' }),
      });
    });

    it('registers replace_cv_from_jsonresume handler', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(
        ([n]) => n === 'replace_cv_from_jsonresume',
      );
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: {
        cvId: string;
        document: Record<string, unknown>;
      }) => Promise<unknown>;

      jsonResumeSwapService.replaceFromJsonResume.mockResolvedValue({
        id: 'cv-replaced',
        title: 'Replaced',
      } as never);

      const result = await handler({
        cvId: '11111111-1111-1111-1111-111111111111',
        document: { basics: { name: 'Jane' } },
      });

      expect(jsonResumeSwapService.replaceFromJsonResume).toHaveBeenCalledWith(
        user,
        '11111111-1111-1111-1111-111111111111',
        { basics: { name: 'Jane' } },
      );
      expect(result).toMatchObject({
        structuredContent: expect.objectContaining({ cvId: 'cv-replaced' }),
      });
    });

    it('registers export_cv_jsonresume handler', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(
        ([n]) => n === 'export_cv_jsonresume',
      );
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: { cvId: string }) => Promise<unknown>;

      cvExportService.renderJson.mockResolvedValue({
        body: '{"basics":{"name":"John"}}',
        filename: 'resume.json',
      });
      const result = await handler({ cvId: '11111111-1111-1111-1111-111111111111' });

      expect(cvExportService.renderJson).toHaveBeenCalledWith(
        user,
        '11111111-1111-1111-1111-111111111111',
      );
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers export_cv_html handler', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'export_cv_html');
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: {
        cvId: string;
        template?: string;
      }) => Promise<unknown>;

      cvExportService.renderHtml.mockResolvedValue('<html>...</html>');
      cvService.findOne.mockResolvedValue({ id: 'cv-1', templateId: 'classic' } as never);
      cvExportService.resolveTemplateId.mockReturnValue('classic');

      const result = await handler({
        cvId: '11111111-1111-1111-1111-111111111111',
        template: 'modern',
      });

      expect(cvExportService.renderHtml).toHaveBeenCalledWith(
        user,
        '11111111-1111-1111-1111-111111111111',
        'modern',
      );
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers export_cv_screenshot handler', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(
        ([n]) => n === 'export_cv_screenshot',
      );
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: {
        cvId: string;
        template?: string;
        mode?: string;
      }) => Promise<unknown>;

      cvExportService.renderScreenshot.mockResolvedValue({
        buffer: Buffer.from('fake-png'),
        filename: 'screenshot.png',
        mode: 'full_document' as const,
        templateId: 'classic',
      });
      cvExportService.toMcpBase64Payload.mockReturnValue({ data: 'base64encoded' });

      const result = await handler({ cvId: '11111111-1111-1111-1111-111111111111' });

      expect(cvExportService.renderScreenshot).toHaveBeenCalledWith(
        user,
        '11111111-1111-1111-1111-111111111111',
        { template: undefined, mode: undefined },
      );
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers export_cv_screenshot handler with mode parameter', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(
        ([n]) => n === 'export_cv_screenshot',
      );
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: {
        cvId: string;
        template?: string;
        mode?: string;
      }) => Promise<unknown>;

      cvExportService.renderScreenshot.mockResolvedValue({
        buffer: Buffer.from('fake-png'),
        filename: 'screenshot.png',
        mode: 'full_document' as const,
        templateId: 'classic',
      });
      cvExportService.toMcpBase64Payload.mockReturnValue({ data: 'base64encoded' });

      const result = await handler({
        cvId: '11111111-1111-1111-1111-111111111111',
        mode: 'full_document',
      });

      expect(cvExportService.renderScreenshot).toHaveBeenCalledWith(
        user,
        '11111111-1111-1111-1111-111111111111',
        { template: undefined, mode: 'full_document' },
      );
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers export_cv_pdf handler', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(([n]) => n === 'export_cv_pdf');
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: {
        cvId: string;
        template?: string;
      }) => Promise<unknown>;

      cvExportService.renderPdf.mockResolvedValue({
        buffer: Buffer.from('fake-pdf'),
        filename: 'resume.pdf',
      });
      cvExportService.toMcpBase64Payload.mockReturnValue({ data: 'base64encoded' });

      const result = await handler({ cvId: '11111111-1111-1111-1111-111111111111' });

      expect(cvExportService.renderPdf).toHaveBeenCalledWith(
        user,
        '11111111-1111-1111-1111-111111111111',
        undefined,
      );
      expect(cvExportService.toMcpBase64Payload).toHaveBeenCalledWith(
        Buffer.from('fake-pdf'),
        'application/pdf',
        'resume.pdf',
      );
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers get_cv_template_presentation handler', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(
        ([n]) => n === 'get_cv_template_presentation',
      );
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: { cvId: string; template: string }) => Promise<unknown>;

      presentationService.getPresentation.mockResolvedValue({ config: {} });

      const result = await handler({
        cvId: '11111111-1111-1111-1111-111111111111',
        template: 'classic',
      });

      expect(presentationService.getPresentation).toHaveBeenCalledWith(
        user,
        '11111111-1111-1111-1111-111111111111',
        'classic',
      );
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });

    it('registers update_cv_template_presentation handler', async () => {
      const calls = mockServer.registerTool.mock.calls.filter(
        ([n]) => n === 'update_cv_template_presentation',
      );
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[0][2] as (args: {
        cvId: string;
        template: string;
        config: Record<string, unknown>;
      }) => Promise<unknown>;

      presentationService.upsertPresentation.mockResolvedValue({ config: { fontSize: 12 } });

      const result = await handler({
        cvId: '11111111-1111-1111-1111-111111111111',
        template: 'classic',
        config: { fontSize: 12 },
      });

      expect(presentationService.upsertPresentation).toHaveBeenCalledWith(
        user,
        '11111111-1111-1111-1111-111111111111',
        'classic',
        { fontSize: 12 },
      );
      expect(result).toMatchObject({ structuredContent: expect.any(Object) });
    });
  });

  describe('resource registration', () => {
    beforeEach(() => {
      service.createServer();
    });

    it('registers three resource templates', () => {
      expect(mockServer.registerResource).toHaveBeenCalledTimes(3);
    });
  });

  describe('MCP_TOOL_DEFINITIONS', () => {
    it('has definitions for all tools in MCP_TOOL_NAMES', () => {
      for (const name of MCP_TOOL_NAMES) {
        expect(MCP_TOOL_DEFINITIONS).toHaveProperty(name);
        expect(MCP_TOOL_DEFINITIONS[name].description.length).toBeGreaterThan(0);
      }
    });

    it('all tools have a description', () => {
      for (const name of MCP_TOOL_NAMES) {
        expect(MCP_TOOL_DEFINITIONS[name].description.length).toBeGreaterThan(0);
      }
    });
  });
});
