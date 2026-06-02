import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApplicationService } from '../application/application.service';
import type { AuthUser } from '../auth/auth-user.types';
import type { CvService } from '../cv/cv.service';
import type { CvTemplatePresentationService } from '../cv/cv-template-presentation.service';
import type { CvExportService } from '../cv-export/cv-export.service';
import type { MediaService } from '../media/media.service';
import { CvJsonResumeSwapService } from './cv-json-resume-swap.service';
import { getMcpAuthUser } from './mcp-auth.context';
import { McpToolsService } from './mcp-tools.service';
import { MCP_TOOL_DEFINITIONS, MCP_TOOL_NAMES, type McpToolName } from './tool-definitions';

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
    listTemplateCatalog: jest.Mock;
    resolveTemplateId: jest.Mock;
  };
  let presentationService: { getPresentation: jest.Mock; upsertPresentation: jest.Mock };
  let applicationService: { findAll: jest.Mock; findOne: jest.Mock };
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
      listTemplateCatalog: jest.fn(),
      resolveTemplateId: jest.fn(),
    } as never;
    presentationService = { getPresentation: jest.fn(), upsertPresentation: jest.fn() };
    applicationService = { findAll: jest.fn(), findOne: jest.fn() } as never;
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
