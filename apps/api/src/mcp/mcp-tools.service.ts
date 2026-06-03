/**
 * # MCP Tools Service (`mcp-tools.service.ts`)
 *
 * ## Overview
 *
 * `McpToolsService` is the NestJS-injectable service that owns the MCP server lifecycle.
 * It creates the `McpServer` instance, registers all tools and resource templates, and
 * exposes helper methods for introspecting registered capabilities.
 *
 * ## Architecture
 *
 * ```
 * McpController
 *   └── McpToolsService
 *         ├── createServer()  → McpServer (connected to StreamableHTTP transport)
 *         │
 *         ├── registerTools()   → 20 MCP tools (list_cvs, get_cv, export_cv_pdf, fetch_export_url, ...)
 *         │     └── each tool: handler + Zod schema + annotations (readOnlyHint, destructiveHint)
 *         │
 *         └── registerResources() → 3 resource templates
 *               ├── CvResourceHandler        → resumind://{cvId}/cv
 *               ├── ApplicationResourceHandler → resumind://{applicationId}/application
 *               └── MediaResourceHandler       → resumind://{mediaId}/media
 * ```
 *
 * ## Tool vs Resource Distinction
 *
 * **Tools** (`tools/call`) — LLM invokes these explicitly via the tool-use protocol.
 *  They accept named arguments, perform mutations, and return structured results.
 *  The MCP SDK routes tool calls to registered handlers by name.
 *
 * **Resources** (`resources/list` + `resources/read`) — LLM discovers these as
 *  read-only data that can be attached as context. The client (not the LLM directly)
 *  lists available resources and reads specific ones by URI. Resources are defined by a
 *  template URI pattern with variable substitution and a `list` + `read` handler pair.
 *
 * Both tools and resources are user-scoped via `getMcpAuthUser()`.
 *
 * ## User Scoping (Critical)
 *
 * Every tool handler and resource callback calls `getMcpAuthUser()` to retrieve the
 * authenticated user from `AsyncLocalStorage`. This works because the controller
 * wraps the entire MCP request handling in `mcpAuthStorage.run(req.user, callback)`:
 *
 * ```typescript
 * // mcp.controller.ts (simplified)
 * await mcpAuthStorage.run(req.user, async () => {
 *   await transport.handleRequest(req, res, req.body);
 * });
 * ```
 *
 * See `mcp-auth.context.ts` for the full design rationale for why this pattern
 * is necessary (vs NestJS's standard `@Req()` / `@CurrentUser()` injection).
 *
 * ## Adding a New Tool
 *
 * 1. Add the tool name to `MCP_TOOL_NAMES` in `tool-definitions.ts`
 * 2. Add the tool definition (description, annotations) to `MCP_TOOL_DEFINITIONS`
 * 3. Add a Zod schema for the tool's input arguments (already declared at top of file)
 * 4. Add a `register('toolName', async (args) => { ... })` call in `registerTools()`
 *
 * ## Adding a New Resource
 *
 * 1. Create a new handler implementing `McpResourceHandler` in `resources/`
 * 2. Inject the required service(s) in the handler constructor
 * 3. Add the handler instance to `this.resourceHandlers` in `McpToolsService` constructor
 * 4. No changes to `registerResources()` are needed — it iterates over handlers automatically
 *
 * No changes to existing handlers are required when adding new tools.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Injectable } from '@nestjs/common';
import type { CvTemplatePresentationConfig } from '@resumind/resume-template';
import { z } from 'zod';

import { ApplicationService } from '../application/application.service';
import { CvService } from '../cv/cv.service';
import { CvTemplatePresentationService } from '../cv/cv-template-presentation.service';
import { CvExportService } from '../cv-export/cv-export.service';
import { MediaService } from '../media/media.service';

import { CvJsonResumeSwapService } from './cv-json-resume-swap.service';
import { getMcpAuthUser } from './mcp-auth.context';
import { McpExportService } from './mcp-export.service';
import type { McpResourceHandler } from './mcp-resource-handler';
import { ApplicationResourceHandler, CvResourceHandler, MediaResourceHandler } from './resources';
import { MCP_TOOL_DEFINITIONS, MCP_TOOL_NAMES, type McpToolName } from './tool-definitions';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Input Schemas (Zod)
// ─────────────────────────────────────────────────────────────────────────────

const cvIdSchema = z.object({
  cvId: z.string().uuid(),
});

const templateOptionalSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string().optional(),
});

const screenshotSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string().optional(),
  mode: z.enum(['full_document', 'first_page']).optional(),
});

const presentationSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string(),
});

const presentationPatchSchema = z.object({
  cvId: z.string().uuid(),
  template: z.string(),
  config: z.record(z.string(), z.unknown()),
});

const jsonResumeCreateSchema = z.object({
  document: z.record(z.string(), z.unknown()),
});

const jsonResumeReplaceSchema = z.object({
  cvId: z.string().uuid(),
  document: z.record(z.string(), z.unknown()),
});

const applicationIdSchema = z.object({
  applicationId: z.string().uuid(),
});

const updateApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  jobTitle: z.string().nullable().optional(),
  jobCompany: z.string().nullable().optional(),
  jobRawText: z.string().nullable().optional(),
  selectionRationale: z.string().nullable().optional(),
  coverLetterEmailSubject: z.string().nullable().optional(),
  userMessage: z.string().nullable().optional(),
});

const updateLetterSchema = z.object({
  applicationId: z.string().uuid(),
  coverLetter: z.string(),
});

const mediaIdSchema = z.object({
  mediaId: z.string().uuid(),
});

const fetchExportUrlSchema = z.object({
  exportId: z.string().uuid(),
  ttlSeconds: z.number().int().min(60).max(86400).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MCP requires `structuredContent` to be a JSON object, not an array or primitive.
 * This helper wraps any result to ensure it is always an object.
 */
function toStructuredContent(result: unknown): Record<string, unknown> {
  if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }
  return { data: result };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class McpToolsService {
  /**
   * All resource handlers — each handles one MCP resource template.
   * Initialised in the constructor after all required services are injected.
   * `registerResources()` iterates over this array to register each handler.
   */
  private readonly resourceHandlers: McpResourceHandler[];

  constructor(
    private readonly cvService: CvService,
    private readonly cvExportService: CvExportService,
    private readonly presentationService: CvTemplatePresentationService,
    private readonly applicationService: ApplicationService,
    private readonly jsonResumeSwapService: CvJsonResumeSwapService,
    private readonly mediaService: MediaService,
    private readonly mcpExportService: McpExportService,
  ) {
    // Instantiate all resource handlers — each handles one MCP resource template.
    // They depend only on their respective service classes, not on each other.
    this.resourceHandlers = [
      new CvResourceHandler(this.cvService),
      new ApplicationResourceHandler(this.applicationService),
      new MediaResourceHandler(this.mediaService),
    ];
  }

  /**
   * Create and configure a new MCP server instance.
   *
   * The server is created fresh for each new MCP session (identified by a session ID
   * generated by `StreamableHTTPServerTransport`). This ensures a clean slate between
   * sessions and avoids state leakage.
   *
   * Callers (the controller) connect the returned `McpServer` to a
   * `StreamableHTTPServerTransport` before use.
   */
  createServer(): McpServer {
    const server = new McpServer({
      name: 'resumind',
      version: '1.0.0',
    });

    this.registerTools(server);
    this.registerResources(server);

    return server;
  }

  /**
   * Returns the list of all registered tool names.
   * Used by introspection endpoints (e.g., MCP settings controller).
   */
  listRegisteredToolNames(): McpToolName[] {
    return [...MCP_TOOL_NAMES];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Tool Registration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Register all MCP tool handlers with the server.
   *
   * Each tool is wrapped in a standard adapter that:
   *  1. Parses input arguments against the tool's Zod schema
   *  2. Calls the tool-specific handler (which calls `getMcpAuthUser()` internally)
   *  3. Wraps the result in the MCP `CallToolResult` shape with `structuredContent`
   *
   * The `register()` helper reduces boilerplate — each tool only needs:
   *  - A name (matching `MCP_TOOL_NAMES`)
   *  - An async handler function
   */
  private registerTools(server: McpServer): void {
    /**
     * Generic tool registration helper.
     * Registers a handler under `name` with metadata from `MCP_TOOL_DEFINITIONS`.
     *
     * @param name - Tool identifier (must be in `MCP_TOOL_NAMES`)
     * @param handler - Async function invoked when the tool is called by an MCP client.
     *                  Receives the parsed arguments object; returns the tool result.
     */
    const register = (
      name: McpToolName,
      inputSchema: z.ZodTypeAny | undefined,
      handler: (args: Record<string, unknown>) => Promise<unknown>,
    ) => {
      const meta = MCP_TOOL_DEFINITIONS[name];
      const annotations: { readOnlyHint?: boolean; destructiveHint?: boolean } = {
        readOnlyHint: meta.readOnlyHint,
        destructiveHint: meta.destructiveHint,
      };
      // The callback and the call to `server.registerTool` use `as any` to bypass
      // the SDK's deep generic instantiation (AnySchema = z3.ZodTypeAny | z4.$ZodType)
      // without sacrificing runtime behaviour — the handler is unchanged.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const run = (async (args: any) => {
        const result = await handler((args ?? {}) as Record<string, unknown>);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          structuredContent: toStructuredContent(result),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;
      if (inputSchema) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (server.registerTool as any)(
          name,
          { description: meta.description, inputSchema, annotations },
          run,
        );
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (server.registerTool as any)(name, { description: meta.description, annotations }, run);
      }
    };

    // ── CV CRUD ──────────────────────────────────────────────────────────────

    register('list_cvs', undefined, async () => {
      const user = getMcpAuthUser();
      return this.cvService.findAll(user);
    });

    register('get_cv', cvIdSchema, async (args) => {
      const { cvId } = cvIdSchema.parse(args);
      return this.cvService.findOne(getMcpAuthUser(), cvId);
    });

    register('delete_cv', cvIdSchema, async (args) => {
      const { cvId } = cvIdSchema.parse(args);
      await this.cvService.remove(getMcpAuthUser(), cvId);
      return { ok: true, cvId };
    });

    register('create_cv_from_jsonresume', jsonResumeCreateSchema, async (args) => {
      const { document } = jsonResumeCreateSchema.parse(args);
      const created = await this.jsonResumeSwapService.createFromJsonResume(
        getMcpAuthUser(),
        document,
      );
      return { cvId: created.id, cv: created };
    });

    register('replace_cv_from_jsonresume', jsonResumeReplaceSchema, async (args) => {
      const { cvId, document } = jsonResumeReplaceSchema.parse(args);
      const replaced = await this.jsonResumeSwapService.replaceFromJsonResume(
        getMcpAuthUser(),
        cvId,
        document,
      );
      return { cvId: replaced.id, cv: replaced };
    });

    // ── CV Export ───────────────────────────────────────────────────────────

    register('export_cv_jsonresume', cvIdSchema, async (args) => {
      const { cvId } = cvIdSchema.parse(args);
      const user = getMcpAuthUser();
      return this.mcpExportService.publishJsonResume(user, cvId);
    });

    register('export_cv_html', templateOptionalSchema, async (args) => {
      const { cvId, template } = templateOptionalSchema.parse(args);
      const user = getMcpAuthUser();
      return this.mcpExportService.publishHtml(user, cvId, template);
    });

    register('export_cv_screenshot', screenshotSchema, async (args) => {
      const { cvId, template, mode } = screenshotSchema.parse(args);
      const user = getMcpAuthUser();
      return this.mcpExportService.publishScreenshot(user, cvId, { template, mode });
    });

    register('export_cv_pdf', templateOptionalSchema, async (args) => {
      const { cvId, template } = templateOptionalSchema.parse(args);
      const user = getMcpAuthUser();
      return this.mcpExportService.publishPdf(user, cvId, template);
    });

    register('fetch_export_url', fetchExportUrlSchema, async (args) => {
      const { exportId, ttlSeconds } = fetchExportUrlSchema.parse(args);
      const user = getMcpAuthUser();
      return this.mcpExportService.refreshSignedUrl(user, exportId, ttlSeconds);
    });

    register('list_cv_designs', undefined, async () => {
      return this.cvExportService.listTemplateCatalog();
    });

    // ── CV Presentation ────────────────────────────────────────────────────

    register('get_cv_template_presentation', presentationSchema, async (args) => {
      const { cvId, template } = presentationSchema.parse(args);
      const user = getMcpAuthUser();
      return this.presentationService.getPresentation(user, cvId, template);
    });

    register('update_cv_template_presentation', presentationPatchSchema, async (args) => {
      const { cvId, template, config } = presentationPatchSchema.parse(args);
      const user = getMcpAuthUser();
      return this.presentationService.upsertPresentation(
        user,
        cvId,
        template,
        config as Partial<CvTemplatePresentationConfig>,
      );
    });

    // ── Applications ─────────────────────────────────────────────────────────

    register('list_applications', undefined, async () => {
      return this.applicationService.findAll(getMcpAuthUser());
    });

    register('get_application', applicationIdSchema, async (args) => {
      const { applicationId } = applicationIdSchema.parse(args);
      return this.applicationService.findOne(getMcpAuthUser(), applicationId);
    });

    register('update_application', updateApplicationSchema, async (args) => {
      const parsed = updateApplicationSchema.parse(args);
      const { applicationId, ...patch } = parsed;
      return this.applicationService.patchApplicationMetadata(getMcpAuthUser(), applicationId, {
        jobTitle: patch.jobTitle,
        jobCompany: patch.jobCompany,
        jobRawText: patch.jobRawText,
        selectionRationale: patch.selectionRationale,
        coverLetterEmailSubject: patch.coverLetterEmailSubject,
        userMessage: patch.userMessage,
      });
    });

    register('update_application_letter', updateLetterSchema, async (args) => {
      const { applicationId, coverLetter } = updateLetterSchema.parse(args);
      return this.applicationService.updateCoverLetter(
        getMcpAuthUser(),
        applicationId,
        coverLetter,
      );
    });

    // ── Media ────────────────────────────────────────────────────────────────

    register('list_media', undefined, async () => {
      const user = getMcpAuthUser();
      const mediaItems = await this.mediaService.listMediaForUser(user.id);
      return mediaItems.map((item) => ({
        ...item,
        url: this.mediaService.viewerUrlForId(item.id),
      }));
    });

    register('get_media_url', mediaIdSchema, async (args) => {
      const { mediaId } = mediaIdSchema.parse(args);
      const user = getMcpAuthUser();
      const meta = await this.mediaService.getMediaMeta(user.id, mediaId);
      return {
        id: mediaId,
        url: this.mediaService.viewerUrlForId(mediaId),
        contentType: meta.contentType,
        crop: meta.crop,
        hasCropped: meta.hasCropped,
      };
    });

    register('delete_media', mediaIdSchema, async (args) => {
      const { mediaId } = mediaIdSchema.parse(args);
      const user = getMcpAuthUser();
      await this.mediaService.deleteMedia(user.id, mediaId);
      return { ok: true, mediaId };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Resource Registration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Register all MCP resource templates with the server.
   *
   * Each resource is managed by a dedicated `McpResourceHandler` that owns the
   * `list` and `read` callbacks. This decoupling means:
   *  - Each handler is independently testable
   *  - Adding/removing resources does not affect tool registration
   *  - Resource logic stays out of `McpToolsService`
   *
   * All resources use the `resumind://` URI scheme and are scoped to the
   * authenticated user via `getMcpAuthUser()` in each handler's callbacks.
   *
   * The `ResourceTemplate` from the MCP SDK handles variable substitution in URIs
   * (e.g., `{cvId}` in `resumind://{cvId}/cv`). The `list` callback advertises
   * concrete URIs; the `read` callback handles the expansion by parsing the
   * received URI.
   */
  private registerResources(server: McpServer): void {
    for (const handler of this.resourceHandlers) {
      server.registerResource(
        handler.title.toLowerCase().replace(/\s+/g, '-'), // e.g. "CVs" → "cvs"
        new ResourceTemplate(handler.uriTemplate, {
          /**
           * The `list` callback is invoked by the MCP SDK when a client calls
           * `resources/list`. It returns all resource instances belonging to
           * the current user.
           */
          list: async () => {
            const result = await handler.list();
            return result;
          },
        }),
        {
          title: handler.title,
          description: handler.description,
          mimeType: handler.defaultMimeType,
        },
        /**
         * The `read` callback is invoked by the MCP SDK when a client calls
         * `resources/read` with a specific URI (one that was advertised by `list`).
         * The handler parses the entity ID from the URI and returns the record.
         */
        async (uri, _variables) => {
          const result = await handler.read(uri as URL);
          return {
            contents: [
              {
                uri: result.uri,
                text: result.text,
                mimeType: result.mimeType,
              },
            ],
          };
        },
      );
    }
  }
}
